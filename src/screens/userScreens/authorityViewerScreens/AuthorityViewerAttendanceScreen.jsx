import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { BLUE, GREEN, NAVY, WHITE } from "../../../constant/color";
import {
    CHECKIN,
    CHECKOUT,
    FIELDATTENDANCE,
    FIELDWORKER,
    REPORTS,
    SUPERVISOR,
} from "../../../constant/imagePath";
import {
    fetchAttendanceRegister,
    fetchAttendanceRoster,
    formatPunchTime,
    isoToDisplayDate,
    mapRegisterRecord,
    mapRosterGroup,
    statusLabel,
    toErrorText,
    todayIsoIst,
} from "../../../services/attendance/AttendanceService";

const STATUS_FILTERS = ["All", "Present", "Absent", "Not marked", "On duty"];
const RECORD_STATUS_FILTERS = [
    "All statuses",
    "On duty (checked in)",
    "Checked out",
    "Absent",
    "Not marked",
];

const pad = (n) => String(n).padStart(2, "0");

const buildRecentDates = (count = 14) => {
    const today = todayIsoIst();
    const [y, m, d] = String(today).split("-").map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const dates = [];
    for (let i = 0; i < count; i += 1) {
        const dt = new Date(base);
        dt.setUTCDate(base.getUTCDate() - i);
        dates.push(
            `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
        );
    }
    return dates;
};

const roleLabel = (role) => {
    if (!role) return "—";
    return String(role)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

const matchesRosterStatus = (worker, filter) => {
    if (filter === "All") return true;
    const key = worker?.statusKey || null;
    if (filter === "Present") return !!key;
    if (filter === "On duty") return key === "checked_in";
    if (filter === "Absent" || filter === "Not marked") return !key;
    return worker?.status === filter;
};

const statusPillStyle = (statusKey) => {
    if (statusKey === "checked_in") {
        return { wrap: styles.presentPill, text: styles.presentPillText };
    }
    if (statusKey === "checked_out") {
        return { wrap: styles.checkedOutPill, text: styles.checkedOutPillText };
    }
    return { wrap: styles.notMarkedPill, text: styles.notMarkedText };
};

const SupervisorCard = ({ supervisor, expanded, onToggle, workers }) => (
    <View style={styles.supervisorCard}>
        <Pressable style={styles.supervisorHeader} onPress={onToggle} accessibilityRole="button">
            <View style={[styles.supervisorInitial, { backgroundColor: supervisor.color }]}>
                <Text style={styles.initialText}>{supervisor.initial}</Text>
            </View>
            <View style={styles.supervisorInfo}>
                <Text style={styles.supervisorName} numberOfLines={1}>{supervisor.name}</Text>
                <Text style={styles.supervisorZone} numberOfLines={1}>{supervisor.zone}</Text>
            </View>
            <Text style={styles.workerCount}>
                {supervisor.present ?? 0} present · {workers.length}{" "}
                {workers.length === 1 ? "worker" : "workers"}
            </Text>
            <Text style={styles.expandGlyph}>{expanded ? "⌃" : "⌄"}</Text>
        </Pressable>
        {expanded && (
            <View>
                {workers.map((worker) => {
                    const pill = statusPillStyle(worker.statusKey);
                    return (
                        <View key={String(worker.id)} style={styles.workerRow}>
                            <View style={styles.workerInfo}>
                                <Text style={styles.workerName} numberOfLines={1}>{worker.name}</Text>
                                <Text style={styles.workerDetails} numberOfLines={1}>
                                    {roleLabel(worker.role)}  ·  {worker.phone || "—"}
                                </Text>
                                {!!worker.statusKey && (
                                    <Text style={styles.workerPunch} numberOfLines={1}>
                                        In {worker.checkIn}
                                        {worker.statusKey === "checked_out" ? ` · Out ${worker.checkOut}` : ""}
                                    </Text>
                                )}
                            </View>
                            <View style={pill.wrap}>
                                <Text style={pill.text}>{worker.status || "Not marked"}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        )}
    </View>
);

const MarkedRecordRow = ({ record }) => {
    const pill = statusPillStyle(record.status);
    return (
        <View style={styles.recordRow}>
            <View style={[styles.recordAvatar, { backgroundColor: record.color || BLUE }]}>
                <Text style={styles.recordAvatarText}>{record.letter}</Text>
            </View>
            <View style={styles.recordInfo}>
                <Text style={styles.recordName} numberOfLines={1}>{record.name}</Text>
                <Text style={styles.recordMeta} numberOfLines={1}>
                    {record.zone} · {record.dutyDateDisplay || isoToDisplayDate(record.dutyDate)}
                </Text>
                <Text style={styles.recordPunch} numberOfLines={2}>
                    In {record.checkIn || formatPunchTime(null)}
                    {" · "}
                    Out {record.checkOut || formatPunchTime(null)}
                </Text>
            </View>
            <View style={pill.wrap}>
                <Text style={pill.text}>{record.statusLabel || statusLabel(record.status)}</Text>
            </View>
        </View>
    );
};

const MarkedRecordsPanel = ({
    status,
    statusOpen,
    onToggleStatus,
    onSelectStatus,
    records,
}) => (
    <View style={styles.recordsPanel}>
        <View style={styles.recordsHeader}>
            <Text style={styles.recordsTitle}>All marked records</Text>
            <Text style={styles.recordsSubtitle}>Detailed punch log</Text>
        </View>
        <View style={styles.recordsFilterRow}>
            <View style={styles.recordsStatusWrap}>
                <Pressable style={styles.recordsStatusButton} onPress={onToggleStatus}>
                    <Text style={styles.recordsStatusText} numberOfLines={1}>{status}</Text>
                    <Text style={styles.recordsStatusChevron}>⌄</Text>
                </Pressable>
                {statusOpen && (
                    <View style={styles.recordsStatusMenu}>
                        {RECORD_STATUS_FILTERS.map((item) => (
                            <Pressable key={item} style={styles.recordsMenuItem} onPress={() => onSelectStatus(item)}>
                                <Text style={[styles.recordsMenuText, status === item && styles.recordsSelectedText]}>
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        </View>
        {records.length === 0 ? (
            <View style={styles.recordsEmptyState}>
                <View style={styles.recordsEmptyIconWrap}>
                    <Image source={CHECKIN} style={styles.recordsEmptyIcon} resizeMode="contain" />
                </View>
                <Text style={styles.recordsEmptyTitle}>No attendance records</Text>
                <Text style={styles.recordsEmptySubtitle}>
                    Field staff check in, or a supervisor adds a worker&apos;s attendance.
                </Text>
            </View>
        ) : (
            <View>
                {records.map((record) => (
                    <MarkedRecordRow key={String(record.id)} record={record} />
                ))}
            </View>
        )}
    </View>
);

export default function AuthorityViewerAttendanceScreen() {
    const dateOptions = useMemo(() => buildRecentDates(14), []);
    const [selectedDate, setSelectedDate] = useState(() => todayIsoIst());
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const [recordsStatus, setRecordsStatus] = useState("All statuses");
    const [recordsStatusOpen, setRecordsStatusOpen] = useState(false);
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [groups, setGroups] = useState([]);
    const [summary, setSummary] = useState({
        supervisors: 0,
        workers: 0,
        present: 0,
        absent: 0,
    });
    const [register, setRegister] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toastMessage, setToastMessage] = useState({
        visible: false,
        msg: "",
        type: "",
    });

    const showToast = useCallback((msg, type = "error") => {
        setToastMessage({
            visible: true,
            msg: toErrorText(msg, "Something went wrong"),
            type,
        });
    }, []);

    const load = useCallback(
        async ({ soft = false, date = selectedDate } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const [rosterRes, registerRes] = await Promise.all([
                    fetchAttendanceRoster({ date }),
                    fetchAttendanceRegister({ date, page: 1, limit: 100 }),
                ]);

                if (!rosterRes.ok) {
                    showToast(
                        toErrorText(rosterRes.result, "Failed to load attendance roster"),
                        "error"
                    );
                    setGroups([]);
                    setSummary({ supervisors: 0, workers: 0, present: 0, absent: 0 });
                } else {
                    const mapped = (rosterRes.groups || []).map(mapRosterGroup);
                    setGroups(mapped);
                    setSummary({
                        supervisors: rosterRes.summary?.supervisors ?? mapped.length,
                        workers: rosterRes.summary?.workers ?? 0,
                        present: rosterRes.summary?.present ?? 0,
                        absent: rosterRes.summary?.absent ?? 0,
                    });
                    setExpandedGroups((prev) => {
                        const next = { ...prev };
                        mapped.forEach((g) => {
                            if (next[g.id] === undefined) next[g.id] = true;
                        });
                        return next;
                    });
                    if (rosterRes.dutyDate && rosterRes.dutyDate !== date) {
                        setSelectedDate(rosterRes.dutyDate);
                    }
                }

                if (!registerRes.ok) {
                    showToast(
                        toErrorText(registerRes.result, "Failed to load attendance register"),
                        "error"
                    );
                    setRegister([]);
                } else {
                    setRegister((registerRes.data || []).map(mapRegisterRecord));
                }
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load attendance"), "error");
                setGroups([]);
                setRegister([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [selectedDate, showToast]
    );

    useEffect(() => {
        load({ date: selectedDate });
    }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const summaryCards = useMemo(
        () => [
            {
                label: "Supervisors",
                value: String(summary.supervisors ?? 0),
                image: SUPERVISOR,
                background: "#E8F0FF",
            },
            {
                label: "Workers Listed",
                value: String(summary.workers ?? 0),
                image: FIELDWORKER,
                background: "#F2EAFE",
            },
            {
                label: "Present",
                value: String(summary.present ?? 0),
                image: CHECKIN,
                background: "#E6F8EE",
            },
            {
                label: "Absent",
                value: String(summary.absent ?? 0),
                image: CHECKOUT,
                background: "#FDEBED",
            },
        ],
        [summary]
    );

    const filteredSupervisors = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return groups
            .map((supervisor) => ({
                ...supervisor,
                filteredWorkers: (supervisor.workers || []).filter((worker) => {
                    if (!matchesRosterStatus(worker, statusFilter)) return false;
                    if (!normalizedQuery) return true;
                    const searchable = `${worker.name} ${worker.role} ${worker.phone} ${supervisor.name} ${supervisor.zone}`.toLowerCase();
                    return searchable.includes(normalizedQuery);
                }),
            }))
            .filter((supervisor) => supervisor.filteredWorkers.length > 0);
    }, [groups, query, statusFilter]);

    const filteredRecords = useMemo(() => {
        if (recordsStatus === "All statuses") return register;
        if (recordsStatus === "On duty (checked in)") {
            return register.filter((r) => r.status === "checked_in");
        }
        if (recordsStatus === "Checked out") {
            return register.filter((r) => r.status === "checked_out");
        }
        if (recordsStatus === "Absent" || recordsStatus === "Not marked") {
            return register.filter((r) => !r.status);
        }
        return register.filter((r) => r.statusLabel === recordsStatus);
    }, [register, recordsStatus]);

    const toggleGroup = (id) => {
        setExpandedGroups((current) => ({ ...current, [id]: !current[id] }));
    };

    const onSelectDate = (iso) => {
        setDateMenuOpen(false);
        setStatusMenuOpen(false);
        setRecordsStatusOpen(false);
        setSelectedDate(iso);
    };

    return (
        <View style={styles.screen}>
            <MyHeader
                title="Field Attendance"
                subtitle=""
                height={58}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />
            {loading && !refreshing ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={BLUE} />
                    <Text style={styles.loadingText}>Loading attendance…</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredSupervisors}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <SupervisorCard
                            supervisor={item}
                            workers={item.filteredWorkers}
                            expanded={!!expandedGroups[item.id]}
                            onToggle={() => toggleGroup(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => load({ soft: true, date: selectedDate })}
                            colors={[BLUE]}
                            tintColor={BLUE}
                        />
                    }
                    ListHeaderComponent={(
                        <View>
                            <View style={styles.titleRow}>
                                <View style={styles.titleBlock}>
                                    <Text style={styles.pageTitle}>Field Attendance</Text>
                                    <Text style={styles.pageSubtitle}>
                                        Workers present under each supervisor – login / logout location and duty status
                                    </Text>
                                </View>
                                <View style={styles.dateControlWrap}>
                                    <Pressable
                                        style={styles.dateButton}
                                        onPress={() => {
                                            setDateMenuOpen(!dateMenuOpen);
                                            setStatusMenuOpen(false);
                                            setRecordsStatusOpen(false);
                                        }}
                                    >
                                        <Image source={FIELDATTENDANCE} style={styles.dateIcon} resizeMode="contain" />
                                        <Text style={styles.dateText}>{isoToDisplayDate(selectedDate)}</Text>
                                        <Text style={styles.dateChevron}>⌄</Text>
                                    </Pressable>
                                    {dateMenuOpen && (
                                        <View style={styles.dateMenu}>
                                            {dateOptions.map((iso) => (
                                                <Pressable
                                                    key={iso}
                                                    style={styles.menuItem}
                                                    onPress={() => onSelectDate(iso)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.menuText,
                                                            selectedDate === iso && styles.selectedMenuText,
                                                        ]}
                                                    >
                                                        {isoToDisplayDate(iso)}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.summaryRow}>
                                {summaryCards.map((item) => (
                                    <View key={item.label} style={styles.summaryCard}>
                                        <View style={[styles.summaryIconWrap, { backgroundColor: item.background }]}>
                                            <Image source={item.image} style={styles.summaryIcon} resizeMode="contain" />
                                        </View>
                                        <Text style={[styles.summaryValue, { color: NAVY }]}>{item.value}</Text>
                                        <Text style={styles.summaryLabel} numberOfLines={1}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.searchFilterRow}>
                                <View style={styles.searchBox}>
                                    <Text style={styles.searchGlyph}>⌕</Text>
                                    <TextInput
                                        value={query}
                                        onChangeText={setQuery}
                                        placeholder="Search supervisor or worker..."
                                        placeholderTextColor="#8798B6"
                                        style={styles.searchInput}
                                        returnKeyType="search"
                                    />
                                </View>
                                <View style={styles.statusControlWrap}>
                                    <Pressable
                                        style={styles.statusButton}
                                        onPress={() => {
                                            setStatusMenuOpen(!statusMenuOpen);
                                            setDateMenuOpen(false);
                                            setRecordsStatusOpen(false);
                                        }}
                                    >
                                        <Image source={REPORTS} style={styles.statusFilterIcon} resizeMode="contain" />
                                        <Text style={styles.statusButtonText} numberOfLines={1}>{statusFilter}</Text>
                                        <Text style={styles.dateChevron}>⌄</Text>
                                    </Pressable>
                                    {statusMenuOpen && (
                                        <View style={styles.statusMenu}>
                                            {STATUS_FILTERS.map((item) => (
                                                <Pressable
                                                    key={item}
                                                    style={styles.menuItem}
                                                    onPress={() => {
                                                        setStatusFilter(item);
                                                        setStatusMenuOpen(false);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.menuText,
                                                            statusFilter === item && styles.selectedMenuText,
                                                        ]}
                                                    >
                                                        {item}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No attendance records match your search.</Text>
                    }
                    ListFooterComponent={(
                        <MarkedRecordsPanel
                            status={recordsStatus}
                            statusOpen={recordsStatusOpen}
                            onToggleStatus={() => {
                                setRecordsStatusOpen((open) => !open);
                                setDateMenuOpen(false);
                                setStatusMenuOpen(false);
                            }}
                            onSelectStatus={(value) => {
                                setRecordsStatus(value);
                                setRecordsStatusOpen(false);
                            }}
                            records={filteredRecords}
                        />
                    )}
                />
            )}
            <ToastMessage
                message={toastMessage.msg}
                visible={toastMessage.visible}
                type={toastMessage.type}
                bacgroundColor={WHITE}
                setVisible={({ visible }) =>
                    setToastMessage((prev) => ({ ...prev, visible }))
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F5F8FC" },
    content: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    loadingText: { color: "#7B8DAC", fontSize: 12 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 14 },
    titleBlock: { flex: 1, paddingTop: 1 },
    pageTitle: { color: "#101B45", fontSize: 20, fontWeight: "700", lineHeight: 25 },
    pageSubtitle: { color: "#7B8DAC", fontSize: 11, lineHeight: 15, marginTop: 2, maxWidth: 260 },
    dateControlWrap: { position: "relative", zIndex: 4 },
    dateButton: {
        height: 38,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 9,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE5F2",
        borderRadius: 9,
    },
    dateIcon: { width: 16, height: 16 },
    dateText: { color: NAVY, fontSize: 10, fontWeight: "600" },
    dateChevron: { color: NAVY, fontSize: 17, marginLeft: 1, marginTop: -5 },
    dateMenu: {
        position: "absolute",
        top: 42,
        right: 0,
        minWidth: 120,
        maxHeight: 260,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE5F2",
        borderRadius: 8,
        elevation: 5,
        zIndex: 20,
    },
    menuItem: { paddingHorizontal: 11, paddingVertical: 9 },
    menuText: { color: NAVY, fontSize: 11 },
    selectedMenuText: { color: BLUE, fontWeight: "700" },
    summaryRow: { flexDirection: "row", gap: 7, marginBottom: 10 },
    summaryCard: {
        flex: 1,
        minWidth: 0,
        height: 90,
        paddingHorizontal: 9,
        paddingTop: 8,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E0E8F2",
        borderRadius: 10,
    },
    summaryIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 3 },
    summaryIcon: { width: 16, height: 16 },
    summaryValue: { fontSize: 17, lineHeight: 20, fontWeight: "700" },
    summaryLabel: { color: "#596D8C", fontSize: 9, marginTop: 1 },
    searchFilterRow: { flexDirection: "row", gap: 7, marginBottom: 9 },
    searchBox: {
        flex: 1,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE5F2",
        borderRadius: 9,
    },
    searchGlyph: { color: NAVY, fontSize: 23, lineHeight: 26, marginRight: 7 },
    searchInput: { flex: 1, padding: 0, color: NAVY, fontSize: 11 },
    statusControlWrap: { position: "relative", zIndex: 3 },
    statusButton: {
        width: 96,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE5F2",
        borderRadius: 9,
    },
    statusFilterIcon: { width: 15, height: 15 },
    statusButtonText: { color: NAVY, fontSize: 11, flex: 1, marginLeft: 5 },
    statusMenu: {
        position: "absolute",
        top: 44,
        right: 0,
        minWidth: 112,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE5F2",
        borderRadius: 8,
        elevation: 5,
        zIndex: 20,
    },
    supervisorCard: {
        marginBottom: 8,
        overflow: "hidden",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2EAF4",
        borderRadius: 10,
        elevation: 1,
    },
    supervisorHeader: {
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: NAVY,
    },
    supervisorInitial: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    initialText: { color: WHITE, fontSize: 13, fontWeight: "700" },
    supervisorInfo: { flex: 1, minWidth: 0, marginLeft: 9 },
    supervisorName: { color: WHITE, fontSize: 11, fontWeight: "700" },
    supervisorZone: { color: "#C2D0E2", fontSize: 9, marginTop: 2 },
    workerCount: { color: "#D3DEEC", fontSize: 8, marginLeft: 5, maxWidth: 88, textAlign: "right" },
    expandGlyph: { color: WHITE, fontSize: 17, width: 18, textAlign: "right", marginLeft: 6 },
    workerRow: {
        minHeight: 43,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#EDF1F6",
    },
    workerInfo: { flex: 1, minWidth: 0, marginRight: 8 },
    workerName: { color: "#162444", fontSize: 10, fontWeight: "600" },
    workerDetails: { color: "#8797B4", fontSize: 9, marginTop: 2 },
    workerPunch: { color: "#5B6F8F", fontSize: 8, marginTop: 2 },
    notMarkedPill: {
        minWidth: 68,
        height: 25,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        backgroundColor: "#F1F5FB",
        borderWidth: 1,
        borderColor: "#D3DEEE",
        borderRadius: 14,
    },
    notMarkedText: { color: "#334B70", fontSize: 9 },
    presentPill: {
        minWidth: 68,
        height: 25,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        backgroundColor: "#E6F8EE",
        borderWidth: 1,
        borderColor: "#B7E5C8",
        borderRadius: 14,
    },
    presentPillText: { color: GREEN, fontSize: 9, fontWeight: "600" },
    checkedOutPill: {
        minWidth: 68,
        height: 25,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        backgroundColor: "#EEF3FF",
        borderWidth: 1,
        borderColor: "#C5D4F5",
        borderRadius: 14,
    },
    checkedOutPillText: { color: BLUE, fontSize: 9, fontWeight: "600" },
    recordsPanel: {
        marginTop: 3,
        marginBottom: 8,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE5F0",
        borderRadius: 10,
        overflow: "visible",
        elevation: 1,
    },
    recordsHeader: { paddingHorizontal: 11, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
    recordsTitle: { color: NAVY, fontSize: 13, fontWeight: "700" },
    recordsSubtitle: { color: "#7183A0", fontSize: 10, marginTop: 2 },
    recordsFilterRow: {
        minHeight: 42,
        justifyContent: "center",
        paddingHorizontal: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        zIndex: 2,
    },
    recordsStatusWrap: { position: "relative", alignSelf: "flex-start" },
    recordsStatusButton: {
        minWidth: 112,
        maxWidth: 180,
        height: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 9,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#CBD7E7",
        borderRadius: 8,
        gap: 6,
    },
    recordsStatusText: { color: NAVY, fontSize: 10, flexShrink: 1 },
    recordsStatusChevron: { color: NAVY, fontSize: 16, marginTop: -5 },
    recordsStatusMenu: {
        position: "absolute",
        top: 35,
        left: 0,
        minWidth: 150,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE5F2",
        borderRadius: 8,
        elevation: 5,
        zIndex: 5,
    },
    recordsMenuItem: { paddingHorizontal: 10, paddingVertical: 8 },
    recordsMenuText: { color: NAVY, fontSize: 10 },
    recordsSelectedText: { color: BLUE, fontWeight: "700" },
    recordsEmptyState: {
        minHeight: 175,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 18,
    },
    recordsEmptyIconWrap: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0F5FB",
        marginBottom: 7,
    },
    recordsEmptyIcon: { width: 23, height: 23 },
    recordsEmptyTitle: { color: NAVY, fontSize: 12, fontWeight: "600" },
    recordsEmptySubtitle: { color: "#7183A0", fontSize: 10, textAlign: "center", marginTop: 5 },
    recordRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#EDF1F6",
        gap: 8,
    },
    recordAvatar: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    recordAvatarText: { color: WHITE, fontSize: 12, fontWeight: "700" },
    recordInfo: { flex: 1, minWidth: 0 },
    recordName: { color: "#162444", fontSize: 11, fontWeight: "600" },
    recordMeta: { color: "#8797B4", fontSize: 9, marginTop: 2 },
    recordPunch: { color: "#5B6F8F", fontSize: 8, marginTop: 2 },
    emptyText: { color: "#7D8DA7", fontSize: 11, textAlign: "center", paddingVertical: 24 },
});
