import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import DateModal from "../../../components/dateComponents/Date";
import { BLUE, GREEN, GREY, NAVY, RED, WHITE } from "../../../constant/color";
import {
    MANUAL_STATUS_OPTIONS,
    fetchAttendanceRegister,
    fetchAttendanceRoster,
    fetchAttendanceWorkers,
    fetchTodayAttendance,
    formDateTimeToIso,
    formDateToIso,
    getCurrentCoords,
    isoToFormDate,
    mapRegisterRecord,
    mapRosterGroup,
    mapWorkerOption,
    placeKey,
    postCheckIn,
    postCheckOut,
    postManualAttendance,
    resolvePlaceNames,
    statusLabel,
    toErrorText,
    todayIsoIst,
} from "../../../services/attendance/AttendanceService";
import { requestAppPermissions } from "../../../utils/permissions";

const STATUS_FILTERS = [
    { key: "all", label: "All statuses" },
    { key: "checked_in", label: "On duty (checked in)" },
    { key: "checked_out", label: "Checked out" },
];

const pad = (n) => String(n).padStart(2, "0");

const isoToDate = (iso) => {
    const raw = String(iso || "").slice(0, 10);
    const [y, m, d] = raw.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
};

const dateToIso = (date) => {
    const d = date instanceof Date ? date : new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nowFormDateTime = (isoDate) => {
    const base = isoToFormDate(isoDate || todayIsoIst()) || isoToFormDate(todayIsoIst());
    const now = new Date();
    return `${base} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const MetricCard = ({ item }) => (
    <View style={styles.metricCard}>
        <View style={[styles.metricIcon, { backgroundColor: item.bg }]}>
            <Text style={[styles.metricGlyph, { color: item.color }]}>{item.icon}</Text>
        </View>
        <Text numberOfLines={1} style={styles.metricLabel}>
            {item.label}
        </Text>
        <Text style={styles.metricValue}>{item.value}</Text>
    </View>
);

const StatusPill = ({ statusKey, label }) => {
    const tone =
        statusKey === "checked_in"
            ? styles.pillOnDuty
            : statusKey === "checked_out"
              ? styles.pillCheckedOut
              : styles.notMarked;
    const textTone =
        statusKey === "checked_in"
            ? styles.pillOnDutyText
            : statusKey === "checked_out"
              ? styles.pillCheckedOutText
              : styles.notMarkedText;
    return (
        <View style={tone}>
            <Text style={textTone} numberOfLines={2}>
                {label || "Not marked"}
            </Text>
        </View>
    );
};

const WorkerAttendanceCard = ({ worker }) => (
    <View style={styles.workerCard}>
        <View style={styles.workerCardTop}>
            <View style={styles.workerCardIdentity}>
                <Text style={styles.workerCardName} numberOfLines={1}>
                    {worker.name}
                </Text>
                <Text style={styles.workerCardMeta} numberOfLines={1}>
                    {worker.role} · {worker.phone}
                </Text>
            </View>
            <StatusPill statusKey={worker.statusKey} label={worker.status} />
        </View>

        <View style={styles.punchGrid}>
            <View style={styles.punchBlock}>
                <Text style={styles.punchLabel}>CHECK IN</Text>
                <Text style={styles.punchTime}>{worker.checkIn || "—"}</Text>
                <Text style={styles.punchPlace} numberOfLines={3}>
                    {worker.loginLocationName || worker.loginLocation || "—"}
                </Text>
            </View>
            <View style={styles.punchDivider} />
            <View style={styles.punchBlock}>
                <Text style={styles.punchLabel}>CHECK OUT</Text>
                <Text style={styles.punchTime}>{worker.checkOut || "—"}</Text>
                <Text style={styles.punchPlace} numberOfLines={3}>
                    {worker.logoutLocationName || worker.logoutLocation || "—"}
                </Text>
            </View>
        </View>
    </View>
);

const ManualAttendanceModal = ({
    visible,
    workers,
    defaultDateIso,
    busy,
    onClose,
    onSubmit,
}) => {
    const [workerId, setWorkerId] = useState(null);
    const [statusKey, setStatusKey] = useState("checked_in");
    const [dutyDateIso, setDutyDateIso] = useState(defaultDateIso || todayIsoIst());
    const [checkInText, setCheckInText] = useState(nowFormDateTime(defaultDateIso));
    const [checkOutText, setCheckOutText] = useState("");
    const [notes, setNotes] = useState("");
    const [workerOpen, setWorkerOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setWorkerId(null);
        setStatusKey("checked_in");
        setDutyDateIso(defaultDateIso || todayIsoIst());
        setCheckInText(nowFormDateTime(defaultDateIso));
        setCheckOutText("");
        setNotes("");
        setWorkerOpen(false);
        setStatusOpen(false);
        setDateOpen(false);
    }, [visible, defaultDateIso]);

    const selectedWorker = workers.find((w) => w.id === workerId);
    const statusOption =
        MANUAL_STATUS_OPTIONS.find((o) => o.key === statusKey) || MANUAL_STATUS_OPTIONS[0];

    const closeMenus = () => {
        setWorkerOpen(false);
        setStatusOpen(false);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalRoot} onPress={onClose}>
                <Pressable style={styles.formCard} onPress={closeMenus}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>Add worker attendance</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={10}>
                            <Text style={styles.formClose}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={styles.formBody}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.fieldLabel}>FIELD WORKER</Text>
                        <TouchableOpacity
                            style={styles.dropField}
                            activeOpacity={0.85}
                            onPress={() => {
                                setWorkerOpen((v) => !v);
                                setStatusOpen(false);
                            }}
                        >
                            <Text
                                style={[styles.dropValue, !selectedWorker && styles.placeholder]}
                                numberOfLines={1}
                            >
                                {selectedWorker ? selectedWorker.name : "Select worker..."}
                            </Text>
                            <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                        </TouchableOpacity>
                        {workerOpen && (
                            <View style={styles.menu}>
                                {workers.length === 0 ? (
                                    <Text style={styles.menuEmpty}>No workers available</Text>
                                ) : (
                                    workers.map((item) => (
                                        <TouchableOpacity
                                            key={String(item.id)}
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setWorkerId(item.id);
                                                setWorkerOpen(false);
                                            }}
                                        >
                                            <Text style={styles.menuTxt}>{item.name}</Text>
                                            <Text style={styles.menuSub}>
                                                {item.phone} · {item.zone}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <Text style={styles.fieldLabel}>DUTY DATE</Text>
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        closeMenus();
                                        setDateOpen(true);
                                    }}
                                >
                                    <Text style={styles.dropValue}>
                                        {isoToFormDate(dutyDateIso)}
                                    </Text>
                                    <SimpleIcon
                                        name="calendar-blank-outline"
                                        size={16}
                                        color="#1454C4"
                                    />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.fieldLabel}>STATUS</Text>
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setStatusOpen((v) => !v);
                                        setWorkerOpen(false);
                                    }}
                                >
                                    <Text style={styles.dropValue} numberOfLines={1}>
                                        {statusOption.label}
                                    </Text>
                                    <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                                </TouchableOpacity>
                                {statusOpen && (
                                    <View style={styles.menu}>
                                        {MANUAL_STATUS_OPTIONS.map((item) => (
                                            <TouchableOpacity
                                                key={item.key}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setStatusKey(item.key);
                                                    setStatusOpen(false);
                                                }}
                                            >
                                                <Text style={styles.menuTxt}>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <Text style={styles.fieldLabel}>CHECK-IN TIME</Text>
                        <TextInput
                            style={styles.input}
                            value={checkInText}
                            onChangeText={setCheckInText}
                            placeholder="dd-mm-yyyy HH:mm"
                            placeholderTextColor="#8A94A6"
                        />

                        {statusKey === "checked_out" ? (
                            <>
                                <Text style={styles.fieldLabel}>CHECK-OUT TIME</Text>
                                <TextInput
                                    style={styles.input}
                                    value={checkOutText}
                                    onChangeText={setCheckOutText}
                                    placeholder="dd-mm-yyyy HH:mm"
                                    placeholderTextColor="#8A94A6"
                                />
                            </>
                        ) : null}

                        <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
                        <TextInput
                            style={styles.input}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="e.g. Marked by supervisor on site"
                            placeholderTextColor="#8A94A6"
                        />
                    </ScrollView>

                    <View style={styles.formFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.85}
                            onPress={onClose}
                            disabled={busy}
                        >
                            <Text style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, busy && styles.buttonBusy]}
                            activeOpacity={0.85}
                            disabled={busy}
                            onPress={() =>
                                onSubmit({
                                    workerId,
                                    dutyDateIso,
                                    statusKey,
                                    checkInText,
                                    checkOutText,
                                    notes: notes.trim(),
                                })
                            }
                        >
                            {busy ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <Text style={styles.saveTxt}>Save attendance</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>

            <DateModal
                mode="date"
                open={dateOpen}
                date={isoToDate(dutyDateIso)}
                onConfirm={(picked) => {
                    const nextIso = dateToIso(picked);
                    setDutyDateIso(nextIso);
                    setCheckInText((prev) => {
                        const timePart = String(prev).split(/\s+/).slice(1).join(" ") || "09:00";
                        return `${isoToFormDate(nextIso)} ${timePart}`;
                    });
                    setDateOpen(false);
                }}
                onCancel={() => setDateOpen(false)}
            />
        </Modal>
    );
};

export default function SupervisorAttendanceScreen() {
    const [selectedDate, setSelectedDate] = useState(todayIsoIst());
    const [today, setToday] = useState(null);
    const [summary, setSummary] = useState({
        supervisors: 0,
        workers: 0,
        present: 0,
        onDuty: 0,
        absent: 0,
    });
    const [groups, setGroups] = useState([]);
    const [records, setRecords] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [manualBusy, setManualBusy] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [toast, setToast] = useState({
        visible: false,
        msg: "",
        type: "",
        key: 0,
    });

    const showToast = (msg, type = "error") => {
        const text = toErrorText(msg, type === "success" ? "Done" : "Something went wrong");
        console.log(`[Attendance ${type}]`, text);
        setToast({
            visible: true,
            msg: text,
            type,
            key: Date.now(),
        });
    };

    const loadDayData = useCallback(
        async (dateIso, { soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const statusParam = statusFilter === "all" ? undefined : statusFilter;
                const [todayRes, rosterRes, registerRes, workersRes] = await Promise.all([
                    fetchTodayAttendance(),
                    fetchAttendanceRoster({ date: dateIso }),
                    fetchAttendanceRegister({
                        page: 1,
                        limit: 50,
                        date: dateIso,
                        status: statusParam,
                    }),
                    fetchAttendanceWorkers(),
                ]);

                if (!todayRes.ok && todayRes.result?.error) {
                    showToast(
                        toErrorText(todayRes.result, "Failed to load today's attendance"),
                        "error"
                    );
                }
                setToday(todayRes.data);

                let nextGroups = [];
                let nextRecords = [];

                if (rosterRes.ok) {
                    setSummary(rosterRes.summary || {});
                    nextGroups = (rosterRes.groups || []).map(mapRosterGroup);
                    if (rosterRes.dutyDate) setSelectedDate(rosterRes.dutyDate);
                } else {
                    showToast(
                        toErrorText(rosterRes.result, "Failed to load roster"),
                        "error"
                    );
                }

                if (registerRes.ok) {
                    nextRecords = (registerRes.data || []).map(mapRegisterRecord);
                } else {
                    showToast(
                        toErrorText(registerRes.result, "Failed to load register"),
                        "error"
                    );
                }

                // Show coords immediately, then upgrade to place names
                setGroups(nextGroups);
                setRecords(nextRecords);

                const points = [];
                nextGroups.forEach((g) => {
                    (g.workers || []).forEach((w) => {
                        points.push({ lat: w.checkInLat, lng: w.checkInLng });
                        points.push({ lat: w.checkOutLat, lng: w.checkOutLng });
                    });
                });
                nextRecords.forEach((r) => {
                    points.push({ lat: r.checkInLat, lng: r.checkInLng });
                    points.push({ lat: r.checkOutLat, lng: r.checkOutLng });
                });

                try {
                    const placeMap = await resolvePlaceNames(points);
                    const applyName = (lat, lng, fallback) => {
                        const key = placeKey(lat, lng);
                        if (!key) return fallback || "—";
                        return placeMap[key] || fallback || "—";
                    };
                    setGroups(
                        nextGroups.map((g) => ({
                            ...g,
                            workers: (g.workers || []).map((w) => ({
                                ...w,
                                loginLocationName: applyName(
                                    w.checkInLat,
                                    w.checkInLng,
                                    w.loginLocation
                                ),
                                logoutLocationName: applyName(
                                    w.checkOutLat,
                                    w.checkOutLng,
                                    w.logoutLocation
                                ),
                            })),
                        }))
                    );
                    setRecords(
                        nextRecords.map((r) => ({
                            ...r,
                            loginLocationName: applyName(
                                r.checkInLat,
                                r.checkInLng,
                                r.loginLocation
                            ),
                            logoutLocationName: applyName(
                                r.checkOutLat,
                                r.checkOutLng,
                                r.logoutLocation
                            ),
                        }))
                    );
                } catch (geoErr) {
                    console.log("Place name resolve skipped:", geoErr?.message || geoErr);
                }

                if (workersRes.ok) {
                    setWorkers((workersRes.data || []).map(mapWorkerOption));
                } else {
                    setWorkers([]);
                }
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load attendance"), "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [statusFilter]
    );

    useEffect(() => {
        let cancelled = false;
        requestAppPermissions().finally(() => {
            if (!cancelled) loadDayData(selectedDate);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const statusFilterReady = useRef(false);
    useEffect(() => {
        if (!statusFilterReady.current) {
            statusFilterReady.current = true;
            return;
        }
        loadDayData(selectedDate, { soft: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const status = today?.status || null;
    const checkedIn = status === "checked_in";
    const completed = status === "checked_out";

    const areaLabel = useMemo(() => {
        if (groups.length && groups[0]?.zone) return groups[0].zone;
        return "Field attendance area";
    }, [groups]);

    const metrics = useMemo(
        () => [
            {
                icon: "♧",
                label: "Supervisors",
                value: String(summary.supervisors ?? 0),
                color: "#2161E8",
                bg: "#EAF2FF",
            },
            {
                icon: "♙",
                label: "Workers Listed",
                value: String(summary.workers ?? 0),
                color: "#07965A",
                bg: "#E9FBF2",
            },
            {
                icon: "♙",
                label: "Present",
                value: String(summary.present ?? summary.onDuty ?? 0),
                color: "#2161E8",
                bg: "#EAF2FF",
            },
            {
                icon: "♙",
                label: "Absent / Not Marked",
                value: String(summary.absent ?? 0),
                color: "#E73547",
                bg: "#FFF0F2",
            },
        ],
        [summary]
    );

    const filterLabel =
        STATUS_FILTERS.find((f) => f.key === statusFilter)?.label || "All statuses";

    const onCheckAction = async () => {
        if (busy || completed) return;
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
                console.log("Check-out API response:", res?.result || res);
                if (!res.ok && !res.alreadyDone) {
                    showToast(res.message || res.result, "error");
                } else {
                    showToast(
                        res.message ||
                            (res.alreadyDone
                                ? "Already checked out for today"
                                : "Checked out successfully"),
                        "success"
                    );
                    await loadDayData(selectedDate, { soft: true });
                }
            } else {
                const res = await postCheckIn(payload);
                console.log("Check-in API response:", res?.result || res);
                if (!res.ok) {
                    showToast(res.message || res.result, "error");
                    if (res.data) setToday(res.data);
                } else {
                    showToast(res.message || "Checked in successfully", "success");
                    await loadDayData(selectedDate, { soft: true });
                }
            }
        } catch (e) {
            console.log("Attendance action error:", e);
            showToast(e?.message || e, "error");
        } finally {
            setBusy(false);
        }
    };

    const onManualSubmit = async ({
        workerId,
        dutyDateIso,
        statusKey,
        checkInText,
        checkOutText,
        notes,
    }) => {
        if (!workerId) {
            showToast("Please select a worker", "error");
            return;
        }
        const checkInAt = formDateTimeToIso(checkInText);
        if (!checkInAt) {
            showToast("Enter check-in as dd-mm-yyyy HH:mm", "error");
            return;
        }
        const payload = {
            userId: workerId,
            dutyDate: dutyDateIso || formDateToIso(String(checkInText).slice(0, 10)),
            status: statusKey,
            checkInAt,
        };
        if (notes) payload.notes = notes;
        if (statusKey === "checked_out") {
            const checkOutAt = formDateTimeToIso(checkOutText || checkInText);
            if (!checkOutAt) {
                showToast("Enter check-out as dd-mm-yyyy HH:mm", "error");
                return;
            }
            payload.checkOutAt = checkOutAt;
        }

        setManualBusy(true);
        try {
            const res = await postManualAttendance(payload);
            if (!res.ok) {
                showToast(toErrorText(res.result, "Failed to save attendance"), "error");
                return;
            }
            showToast("Attendance saved", "success");
            setManualOpen(false);
            const nextDate = dutyDateIso || selectedDate;
            setSelectedDate(nextDate);
            await loadDayData(nextDate, { soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to save attendance"), "error");
        } finally {
            setManualBusy(false);
        }
    };

    const actionLabel = completed ? "Duty completed" : checkedIn ? "Check Out" : "Check In";

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Field Attendance"
                subtitle=""
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={NAVY} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadDayData(selectedDate, { soft: true })}
                            tintColor={NAVY}
                        />
                    }
                >
                    <View style={styles.areaSelector}>
                        <SimpleIcon name="map-marker-outline" size={20} color="#1454C4" />
                        <Text numberOfLines={1} style={styles.areaText}>
                            {areaLabel}
                        </Text>
                    </View>

                    <View style={styles.checkInCard}>
                        <View style={styles.checkIntro}>
                            <View style={styles.locationIcon}>
                                <SimpleIcon name="map-marker-outline" size={20} color="#F47700" />
                            </View>
                            <View style={styles.checkCopy}>
                                <Text style={styles.checkTitle}>Daily attendance</Text>
                                <Text style={styles.checkSub}>
                                    {completed
                                        ? "You have completed today's duty."
                                        : checkedIn
                                          ? "You are checked in. Check out to finish your duty."
                                          : "Check in captures your current GPS as the login location"}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.checkButton,
                                checkedIn && styles.checkOutButton,
                                (busy || completed) && styles.buttonBusy,
                            ]}
                            activeOpacity={0.85}
                            disabled={busy || completed}
                            onPress={onCheckAction}
                        >
                            {busy ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <>
                                    <Text style={styles.checkArrow}>
                                        {checkedIn ? "↗" : "⇥"}
                                    </Text>
                                    <Text style={styles.checkText}>{actionLabel}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metricsRow}>
                        {metrics.map((item) => (
                            <MetricCard key={item.label} item={item} />
                        ))}
                    </View>

                    <View style={styles.teamCard}>
                        <View style={styles.teamHeader}>
                            <View style={styles.teamIcon}>
                                <Text style={styles.teamIconText}>♧</Text>
                            </View>
                            <View style={styles.teamIntro}>
                                <Text style={styles.sectionTitle}>Supervisor Teams</Text>
                                <Text style={styles.sectionSub}>
                                    Each block is one supervisor and the workers under them
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setDateOpen(true)}
                            >
                                <SimpleIcon
                                    name="calendar-blank-outline"
                                    size={17}
                                    color="#1454C4"
                                />
                                <View style={styles.dateDivider} />
                                <Text style={styles.dateText}>
                                    {isoToFormDate(selectedDate)}
                                </Text>
                                <SimpleIcon name="chevron-down" size={15} color={NAVY} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.addButton}
                            activeOpacity={0.85}
                            onPress={() => setManualOpen(true)}
                        >
                            <Text style={styles.addButtonText}>+ Add Worker Attendance</Text>
                        </TouchableOpacity>

                        {groups.length === 0 ? (
                            <View style={styles.emptyInline}>
                                <Text style={styles.emptyTitle}>No team roster</Text>
                                <Text style={styles.emptySub}>
                                    No supervisors or workers found for this date.
                                </Text>
                            </View>
                        ) : (
                            groups.map((group) => (
                                <View key={String(group.id)} style={styles.groupBlock}>
                                    <View style={styles.supervisorBanner}>
                                        <View
                                            style={[
                                                styles.supervisorAvatar,
                                                { backgroundColor: group.color || "#3155EB" },
                                            ]}
                                        >
                                            <Text style={styles.supervisorInitial}>
                                                {group.initial}
                                            </Text>
                                        </View>
                                        <View style={styles.supervisorCopy}>
                                            <Text style={styles.supervisorName}>{group.name}</Text>
                                            <Text numberOfLines={1} style={styles.supervisorPlace}>
                                                {group.zone}
                                            </Text>
                                        </View>
                                        <View style={styles.teamCounts}>
                                            <Text style={styles.teamCountStrong}>
                                                {group.present} present
                                            </Text>
                                            <Text style={styles.teamCountSub}>
                                                {group.absent} not marked · {group.workers.length}{" "}
                                                workers
                                            </Text>
                                        </View>
                                    </View>

                                    {group.workers.length === 0 ? (
                                        <View style={styles.emptyInline}>
                                            <Text style={styles.emptySub}>
                                                No workers under this supervisor
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.workerCardList}>
                                            {group.workers.map((worker) => (
                                                <WorkerAttendanceCard
                                                    key={String(worker.id)}
                                                    worker={worker}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </View>

                    <View style={styles.recordsCard}>
                        <View style={styles.recordsHeader}>
                            <View style={styles.recordsIcon}>
                                <Text style={styles.recordsGlyph}>▤</Text>
                            </View>
                            <View style={styles.recordsTitleWrap}>
                                <Text style={styles.sectionTitle}>All marked records</Text>
                                <Text style={styles.sectionSub}>Detailed punch log</Text>
                            </View>
                            <View style={styles.statusWrap}>
                                <TouchableOpacity
                                    style={styles.recordsDropdown}
                                    onPress={() => setStatusOpen((open) => !open)}
                                >
                                    <Text style={styles.recordsDropdownText}>{filterLabel}</Text>
                                    <SimpleIcon name="chevron-down" size={15} color={NAVY} />
                                </TouchableOpacity>
                                {statusOpen && (
                                    <View style={styles.statusMenu}>
                                        {STATUS_FILTERS.map((value) => (
                                            <TouchableOpacity
                                                key={value.key}
                                                style={styles.statusOption}
                                                onPress={() => {
                                                    setStatusFilter(value.key);
                                                    setStatusOpen(false);
                                                }}
                                            >
                                                <Text style={styles.statusOptionText}>
                                                    {value.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        {records.length === 0 ? (
                            <View style={styles.emptyRecords}>
                                <View style={styles.emptyIcon}>
                                    <SimpleIcon
                                        name="calendar-check-outline"
                                        size={35}
                                        color="#6485AE"
                                    />
                                </View>
                                <Text style={styles.emptyTitle}>No attendance records</Text>
                                <Text style={styles.emptySub}>
                                    Field staff check in, or a supervisor adds a worker's
                                    attendance.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.recordList}>
                                {records.map((record) => (
                                    <View
                                        key={String(record.id)}
                                        style={styles.recordCard}
                                    >
                                        <View style={styles.workerCardTop}>
                                            <View
                                                style={[
                                                    styles.recordAvatar,
                                                    {
                                                        backgroundColor:
                                                            record.color || "#2563EB",
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.recordLetter}>
                                                    {record.letter}
                                                </Text>
                                            </View>
                                            <View style={styles.workerCardIdentity}>
                                                <Text
                                                    style={styles.workerCardName}
                                                    numberOfLines={1}
                                                >
                                                    {record.name}
                                                </Text>
                                                <Text
                                                    style={styles.workerCardMeta}
                                                    numberOfLines={1}
                                                >
                                                    {record.dutyDateDisplay} · {record.zone}
                                                </Text>
                                            </View>
                                            <StatusPill
                                                statusKey={record.status}
                                                label={
                                                    record.statusLabel ||
                                                    statusLabel(record.status)
                                                }
                                            />
                                        </View>
                                        <View style={styles.punchGrid}>
                                            <View style={styles.punchBlock}>
                                                <Text style={styles.punchLabel}>CHECK IN</Text>
                                                <Text style={styles.punchTime}>
                                                    {record.checkIn || "—"}
                                                </Text>
                                                <Text style={styles.punchPlace} numberOfLines={3}>
                                                    {record.loginLocationName ||
                                                        record.loginLocation ||
                                                        "—"}
                                                </Text>
                                            </View>
                                            <View style={styles.punchDivider} />
                                            <View style={styles.punchBlock}>
                                                <Text style={styles.punchLabel}>CHECK OUT</Text>
                                                <Text style={styles.punchTime}>
                                                    {record.checkOut || "—"}
                                                </Text>
                                                <Text style={styles.punchPlace} numberOfLines={3}>
                                                    {record.logoutLocationName ||
                                                        record.logoutLocation ||
                                                        "—"}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}

            <ManualAttendanceModal
                visible={manualOpen}
                workers={workers}
                defaultDateIso={selectedDate}
                busy={manualBusy}
                onClose={() => !manualBusy && setManualOpen(false)}
                onSubmit={onManualSubmit}
            />

            <DateModal
                mode="date"
                open={dateOpen}
                date={isoToDate(selectedDate)}
                onConfirm={(picked) => {
                    const next = dateToIso(picked);
                    setDateOpen(false);
                    setSelectedDate(next);
                    loadDayData(next, { soft: true });
                }}
                onCancel={() => setDateOpen(false)}
            />

            <ToastMessage
                key={toast.key}
                message={toast.msg}
                visible={toast.visible}
                setVisible={({ visible }) =>
                    setToast((prev) => ({ ...prev, visible: !!visible }))
                }
                bacgroundColor={toast.type === "success" ? GREEN : RED}
                textColor={WHITE}
                type={toast.type || "error"}
                duration={4500}
                position="bottom"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5FAFF" },
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 120 },
    workerCardList: { gap: 8 },
    areaSelector: {
        height: 43,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 13,
        paddingHorizontal: 10,
        marginBottom: 9,
    },
    areaText: { flex: 1, color: "#123D8B", fontSize: 11, fontWeight: "500" },
    checkInCard: {
        padding: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E1EAF5",
        borderRadius: 15,
        marginBottom: 9,
    },
    checkIntro: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    locationIcon: {
        width: 39,
        height: 39,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF2E9",
    },
    checkCopy: { flex: 1 },
    checkTitle: { color: NAVY, fontSize: 15, fontWeight: "800" },
    checkSub: { color: "#7286A9", fontSize: 10, marginTop: 3 },
    checkButton: {
        height: 43,
        borderRadius: 12,
        backgroundColor: "#EA5F0B",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
    },
    checkOutButton: { backgroundColor: BLUE },
    buttonBusy: { opacity: 0.7 },
    checkArrow: { color: WHITE, fontSize: 19, fontWeight: "700" },
    checkText: { color: WHITE, fontSize: 14, fontWeight: "700" },
    metricsRow: { flexDirection: "row", gap: 6, marginBottom: 9 },
    metricCard: {
        flex: 1,
        minWidth: 0,
        height: 93,
        padding: 8,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E1EAF5",
        borderRadius: 13,
    },
    metricIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    metricGlyph: { fontSize: 18, fontWeight: "700" },
    metricLabel: { color: "#7186AE", fontSize: 9 },
    metricValue: { color: NAVY, fontSize: 17, fontWeight: "800", marginTop: 3 },
    teamCard: {
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E1EAF5",
        borderRadius: 15,
        padding: 9,
        marginBottom: 10,
    },
    teamHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 9 },
    teamIcon: {
        width: 35,
        height: 35,
        borderRadius: 11,
        backgroundColor: "#F0F1FF",
        alignItems: "center",
        justifyContent: "center",
    },
    teamIconText: { color: "#264EE0", fontSize: 18 },
    teamIntro: { flex: 1, minWidth: 0 },
    sectionTitle: { color: "#0A174A", fontSize: 14, fontWeight: "800" },
    sectionSub: { color: "#7286A9", fontSize: 9, marginTop: 3 },
    dateButton: {
        height: 38,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 11,
        paddingHorizontal: 7,
    },
    dateDivider: { width: 1, height: 30, backgroundColor: "#E1EAF5" },
    dateText: { color: NAVY, fontSize: 10 },
    addButton: {
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#C9DAF5",
        backgroundColor: "#F3F8FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    addButtonText: { color: "#1454C4", fontSize: 12, fontWeight: "700" },
    groupBlock: { marginBottom: 10 },
    supervisorBanner: {
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#102D4C",
        borderRadius: 10,
        paddingHorizontal: 8,
        gap: 8,
        marginBottom: 5,
    },
    supervisorAvatar: {
        width: 43,
        height: 43,
        borderRadius: 10,
        backgroundColor: "#3155EB",
        alignItems: "center",
        justifyContent: "center",
    },
    supervisorInitial: { color: WHITE, fontSize: 20, fontWeight: "800" },
    supervisorCopy: { flex: 1, minWidth: 0 },
    supervisorName: { color: WHITE, fontSize: 12, fontWeight: "700" },
    supervisorPlace: { color: "#C4D1E1", fontSize: 9, marginTop: 4 },
    teamCounts: { alignItems: "flex-end" },
    teamCountStrong: { color: WHITE, fontSize: 10, fontWeight: "600" },
    teamCountSub: { color: "#C4D1E1", fontSize: 8, marginTop: 5 },
    cardSep: { height: 8 },
    workerCard: {
        backgroundColor: "#F7FAFD",
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 12,
        padding: 10,
    },
    recordCard: {
        backgroundColor: "#F7FAFD",
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 12,
        padding: 10,
    },
    workerCardTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
    },
    workerCardIdentity: { flex: 1, minWidth: 0 },
    workerCardName: { color: NAVY, fontSize: 13, fontWeight: "800" },
    workerCardMeta: { color: "#7A8FB5", fontSize: 10, marginTop: 2 },
    punchGrid: { flexDirection: "row", alignItems: "stretch" },
    punchBlock: { flex: 1, minWidth: 0 },
    punchDivider: {
        width: 1,
        backgroundColor: "#E2EAF5",
        marginHorizontal: 10,
    },
    punchLabel: {
        color: "#7486A6",
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.3,
        marginBottom: 3,
    },
    punchTime: { color: NAVY, fontSize: 12, fontWeight: "700", marginBottom: 4 },
    punchPlace: { color: "#52658B", fontSize: 11, lineHeight: 15 },
    notMarked: {
        backgroundColor: "#EFF4FA",
        borderRadius: 15,
        paddingHorizontal: 9,
        paddingVertical: 6,
        maxWidth: 110,
    },
    notMarkedText: { color: "#52658B", fontSize: 9, textAlign: "center" },
    pillOnDuty: {
        backgroundColor: "#E9FBF2",
        borderRadius: 15,
        paddingHorizontal: 9,
        paddingVertical: 6,
        maxWidth: 110,
    },
    pillOnDutyText: { color: "#07965A", fontSize: 9, textAlign: "center", fontWeight: "700" },
    pillCheckedOut: {
        backgroundColor: "#EAF2FF",
        borderRadius: 15,
        paddingHorizontal: 9,
        paddingVertical: 6,
        maxWidth: 110,
    },
    pillCheckedOutText: {
        color: "#2161E8",
        fontSize: 9,
        textAlign: "center",
        fontWeight: "700",
    },
    recordsCard: {
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E1EAF5",
        borderRadius: 15,
        overflow: "visible",
    },
    recordsHeader: {
        minHeight: 62,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        gap: 8,
        borderBottomWidth: 1,
        borderColor: "#E8EEF6",
    },
    recordsIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0F1FF",
    },
    recordsGlyph: { color: "#162C60", fontSize: 17 },
    recordsTitleWrap: { flex: 1 },
    statusWrap: { position: "relative", zIndex: 2 },
    recordsDropdown: {
        minWidth: 114,
        height: 38,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 10,
        paddingHorizontal: 8,
    },
    recordsDropdownText: { color: NAVY, fontSize: 10, flexShrink: 1 },
    statusMenu: {
        position: "absolute",
        right: 0,
        top: 41,
        minWidth: 140,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 10,
        elevation: 5,
    },
    statusOption: { paddingHorizontal: 9, paddingVertical: 8 },
    statusOptionText: { color: NAVY, fontSize: 9 },
    emptyRecords: {
        minHeight: 160,
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
    },
    emptyInline: { paddingVertical: 16, alignItems: "center" },
    emptyIcon: {
        width: 66,
        height: 66,
        borderRadius: 34,
        backgroundColor: "#EEF5FB",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    emptyTitle: { color: "#0A174A", fontSize: 13, fontWeight: "700" },
    emptySub: { color: "#778BAE", fontSize: 10, textAlign: "center", marginTop: 5 },
    recordList: { paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
    recordRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF2F7",
    },
    recordAvatar: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    recordLetter: { color: WHITE, fontSize: 14, fontWeight: "800" },
    recordDetails: { flex: 1, minWidth: 0 },
    recordTitle: { color: NAVY, fontSize: 12, fontWeight: "700" },
    recordSub: { color: "#74819A", fontSize: 9, marginTop: 2 },
    modalRoot: {
        flex: 1,
        backgroundColor: "rgba(8, 18, 40, 0.45)",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    formCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        maxHeight: "86%",
        overflow: "hidden",
    },
    formHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E8EEF6",
    },
    formTitle: { color: NAVY, fontSize: 15, fontWeight: "800" },
    formClose: { color: "#7186AE", fontSize: 24, lineHeight: 24 },
    formScroll: { maxHeight: 420 },
    formBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16 },
    fieldLabel: {
        color: "#7186AE",
        fontSize: 10,
        fontWeight: "700",
        marginBottom: 6,
        marginTop: 8,
    },
    dropField: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 10,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        backgroundColor: "#FBFCFE",
    },
    dropValue: { flex: 1, color: NAVY, fontSize: 12 },
    placeholder: { color: "#8A94A6" },
    menu: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 10,
        backgroundColor: WHITE,
        overflow: "hidden",
    },
    menuItem: { paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F0F4FA" },
    menuTxt: { color: NAVY, fontSize: 12, fontWeight: "600" },
    menuSub: { color: "#7A8FB5", fontSize: 9, marginTop: 2 },
    menuEmpty: { color: "#7A8FB5", fontSize: 11, padding: 12, textAlign: "center" },
    twoCol: { flexDirection: "row", gap: 8 },
    col: { flex: 1 },
    input: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 10,
        paddingHorizontal: 10,
        color: NAVY,
        fontSize: 12,
        backgroundColor: "#FBFCFE",
    },
    formFooter: {
        flexDirection: "row",
        gap: 8,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#E8EEF6",
    },
    cancelBtn: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        alignItems: "center",
        justifyContent: "center",
    },
    cancelTxt: { color: NAVY, fontSize: 13, fontWeight: "600" },
    saveBtn: {
        flex: 1.3,
        height: 42,
        borderRadius: 10,
        backgroundColor: "#1454C4",
        alignItems: "center",
        justifyContent: "center",
    },
    saveTxt: { color: WHITE, fontSize: 13, fontWeight: "700" },
});
