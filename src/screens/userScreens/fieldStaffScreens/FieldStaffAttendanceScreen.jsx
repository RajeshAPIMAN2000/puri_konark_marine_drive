import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { BLUE, GREEN, NAVY, ORANGE, RED, WHITE } from "../../../constant/color";
import { requestAppPermissions } from "../../../utils/permissions";
import {
    fetchAttendanceRegister,
    fetchTodayAttendance,
    formatCoords,
    formatPunchTime,
    getCurrentCoords,
    isoToDisplayDate,
    postCheckIn,
    postCheckOut,
    statusLabel,
    toErrorText,
} from "../../../services/attendance/AttendanceService";

const FieldStaffAttendanceScreen = () => {
    const [today, setToday] = useState(null);
    const [dutyDate, setDutyDate] = useState("");
    const [records, setRecords] = useState([]);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toast, setToast] = useState({ visible: false, msg: "", type: "" });

    const showToast = (msg, type) =>
        setToast({ visible: true, msg: toErrorText(msg, "Done"), type });

    const load = useCallback(async ({ soft = false } = {}) => {
        if (soft) setRefreshing(true);
        else setLoading(true);
        try {
            const [todayRes, historyRes] = await Promise.all([
                fetchTodayAttendance(),
                fetchAttendanceRegister({ page: 1, limit: 30 }),
            ]);
            if (!todayRes.ok && todayRes.result?.error) {
                showToast(toErrorText(todayRes.result, "Failed to load today's attendance"), "error");
            }
            setToday(todayRes.data);
            setDutyDate(todayRes.dutyDate || "");
            if (historyRes.ok) {
                setRecords(historyRes.data || []);
            } else {
                setRecords([]);
            }
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to load attendance"), "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        requestAppPermissions().finally(() => load());
    }, [load]);

    const status = today?.status || null;
    const checkedIn = status === "checked_in";
    const completed = status === "checked_out";

    const onAction = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const coords = await getCurrentCoords();
            if (!coords?.ok) {
                showToast(
                    coords?.error || "Please allow location and turn on GPS",
                    "error"
                );
                return;
            }
            const payload = {
                latitude: coords.latitude,
                longitude: coords.longitude,
            };
            if (coords.accuracy != null) payload.accuracy = coords.accuracy;

            if (checkedIn) {
                payload.source = "self";
                const res = await postCheckOut(payload);
                if (!res.ok && !res.alreadyDone) {
                    showToast(
                        toErrorText(res.message || res.result, "Check-out failed"),
                        "error"
                    );
                } else {
                    showToast(
                        res.alreadyDone
                            ? "Already checked out for today"
                            : "Checked out successfully",
                        "success"
                    );
                    await load({ soft: true });
                }
            } else if (completed) {
                showToast("Attendance for today is already completed", "error");
            } else {
                const res = await postCheckIn(payload);
                if (!res.ok) {
                    showToast(
                        toErrorText(res.message || res.result, "Check-in failed"),
                        "error"
                    );
                    if (res.data) setToday(res.data);
                } else {
                    showToast("Checked in successfully", "success");
                    await load({ soft: true });
                }
            }
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Attendance action failed"), "error");
        } finally {
            setBusy(false);
        }
    };

    const actionLabel = completed
        ? "Duty completed"
        : checkedIn
          ? "Check out"
          : "Check in";

    return (
        <View style={styles.screen}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Field Attendance"
                subtitle="Mark your duty with login and logout location"
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
                height={58}
            />

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={NAVY} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => load({ soft: true })}
                            tintColor={NAVY}
                        />
                    }
                >
                    <View style={styles.attendanceCard}>
                        <Text style={styles.sectionTitle}>Daily attendance</Text>
                        <Text style={styles.description}>
                            {dutyDate
                                ? `Duty date (IST): ${isoToDisplayDate(dutyDate)}`
                                : "Today's duty"}
                            {"\n"}
                            {completed
                                ? "You have completed today's duty."
                                : checkedIn
                                  ? "You are checked in. Check out to finish your duty."
                                  : "Check in captures your current GPS as the login location"}
                        </Text>
                        {today ? (
                            <Text style={styles.statusLine}>
                                Status: {statusLabel(today.status)}
                                {today.checkInAt
                                    ? ` · In ${formatPunchTime(today.checkInAt)}`
                                    : ""}
                                {today.checkOutAt
                                    ? ` · Out ${formatPunchTime(today.checkOutAt)}`
                                    : ""}
                            </Text>
                        ) : null}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={busy || completed}
                            onPress={onAction}
                            style={[
                                styles.actionButton,
                                checkedIn && styles.checkOutButton,
                                (busy || completed) && styles.buttonBusy,
                            ]}
                        >
                            {busy ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <>
                                    <Text style={styles.actionIcon}>
                                        {checkedIn ? "↗" : "⇥"}
                                    </Text>
                                    <Text style={styles.actionText}>{actionLabel}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {checkedIn && (
                            <Text style={styles.checkedInLabel}>●  Currently on duty</Text>
                        )}
                    </View>

                    <View style={styles.historyCard}>
                        <View style={styles.historyHeading}>
                            <Text style={styles.sectionTitle}>My attendance history</Text>
                            <Text style={styles.description}>Detailed punch log</Text>
                        </View>

                        {records.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.calendarCircle}>
                                    <Text style={styles.calendarIcon}>▣</Text>
                                </View>
                                <Text style={styles.emptyTitle}>No attendance records</Text>
                                <Text style={styles.emptyDescription}>
                                    Field staff check in, or a supervisor adds a worker's attendance.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.recordList}>
                                {records.map((record) => (
                                    <View key={String(record.id)} style={styles.recordRow}>
                                        <View
                                            style={[
                                                styles.recordMark,
                                                record.status === "checked_in"
                                                    ? styles.inMark
                                                    : styles.outMark,
                                            ]}
                                        >
                                            <Text style={styles.recordMarkText}>
                                                {record.status === "checked_in" ? "IN" : "OUT"}
                                            </Text>
                                        </View>
                                        <View style={styles.recordDetails}>
                                            <Text style={styles.recordTitle}>
                                                {statusLabel(record.status)} ·{" "}
                                                {isoToDisplayDate(record.dutyDate)}
                                            </Text>
                                            <Text style={styles.recordSub}>
                                                In {formatPunchTime(record.checkInAt)} · GPS{" "}
                                                {formatCoords(
                                                    record.checkInLat,
                                                    record.checkInLng
                                                )}
                                            </Text>
                                            {record.checkOutAt ? (
                                                <Text style={styles.recordSub}>
                                                    Out {formatPunchTime(record.checkOutAt)} · GPS{" "}
                                                    {formatCoords(
                                                        record.checkOutLat,
                                                        record.checkOutLng
                                                    )}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            {toast.visible && (
                <ToastMessage
                    message={toast.msg}
                    visible={toast.visible}
                    setVisible={({ visible }) =>
                        setToast((prev) => ({ ...prev, visible }))
                    }
                    bacgroundColor={toast.type === "success" ? GREEN : RED}
                    textColor={WHITE}
                    type={toast.type}
                    duration={3000}
                    position="bottom"
                />
            )}
        </View>
    );
};

export default FieldStaffAttendanceScreen;

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F2F7FD" },
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 130 },
    attendanceCard: {
        backgroundColor: WHITE,
        borderRadius: 18,
        padding: 16,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: "#DCE8F7",
        elevation: 3,
        shadowColor: NAVY,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    sectionTitle: { color: NAVY, fontSize: 19, fontWeight: "700" },
    description: { color: "#66738D", fontSize: 13, lineHeight: 19, marginTop: 4 },
    statusLine: { color: NAVY, fontSize: 12, fontWeight: "600", marginTop: 8 },
    actionButton: {
        minHeight: 54,
        marginTop: 16,
        borderRadius: 12,
        backgroundColor: ORANGE,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    checkOutButton: { backgroundColor: BLUE },
    buttonBusy: { opacity: 0.7 },
    actionIcon: { color: WHITE, fontSize: 23, fontWeight: "700", marginRight: 10 },
    actionText: { color: WHITE, fontSize: 17, fontWeight: "700" },
    checkedInLabel: { color: GREEN, fontSize: 12, fontWeight: "600", marginTop: 10 },
    historyCard: {
        flex: 1,
        minHeight: 390,
        backgroundColor: WHITE,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#DCE8F7",
        elevation: 3,
        shadowColor: NAVY,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        overflow: "hidden",
    },
    historyHeading: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E7EDF5" },
    emptyState: { flex: 1, minHeight: 290, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
    calendarCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#EEF6FF", alignItems: "center", justifyContent: "center", marginBottom: 18 },
    calendarIcon: { color: "#67A4E8", fontSize: 38, fontWeight: "600" },
    emptyTitle: { color: NAVY, fontSize: 18, fontWeight: "700", textAlign: "center" },
    emptyDescription: { color: "#66738D", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10 },
    recordList: { paddingHorizontal: 15 },
    recordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
    recordMark: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
    inMark: { backgroundColor: "#E8F8EF" },
    outMark: { backgroundColor: "#EAF1FF" },
    recordMarkText: { fontSize: 11, fontWeight: "800", color: NAVY },
    recordDetails: { flex: 1 },
    recordTitle: { color: NAVY, fontSize: 14, fontWeight: "700" },
    recordSub: { color: "#74819A", fontSize: 11, marginTop: 4 },
});
