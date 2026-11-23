import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    GREEN,
    GREY,
    NAVY,
    ORANGE,
    RED,
    WHITE,
} from "../../../constant/color";
import {
    CHECKIN,
    CHECKOUT,
    DESCRIPTION,
    FIELDATTENDANCE,
    FIELDWORKER,
    LOCATION,
    REPORTS,
    SUPERVISOR,
} from "../../../constant/imagePath";
import {
    fetchAttendanceRegister,
    fetchAttendanceRoster,
    fetchAttendanceWorkers,
    formDateToIso,
    formDateTimeToIso,
    isoToDisplayDate,
    isoToFormDate,
    MANUAL_STATUS_OPTIONS,
    mapRegisterRecord,
    mapRosterGroup,
    mapWorkerOption,
    postManualAttendance,
    statusLabel,
    todayIsoIst,
    toErrorText,
} from "../../../services/attendance/AttendanceService";
import { requestAppPermissions } from "../../../utils/permissions";

const SCREEN = Dimensions.get("screen");

const MONTHS_LONG = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const AVATAR_COLORS = [
    "#16A34A",
    "#2563EB",
    "#7C3AED",
    "#DB2777",
    "#0F766E",
    "#EA5F0B",
    "#1F2937",
    "#DC2626",
];

const pad = (n) => String(n).padStart(2, "0");

const parseFormDate = (value) => {
    const [dd, mm, yyyy] = String(value || "").split("-").map(Number);
    if (!dd || !mm || !yyyy) return new Date();
    return new Date(yyyy, mm - 1, dd);
};

const toFormDate = (date) =>
    `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;

const toScreenDate = (iso) => {
    const display = isoToDisplayDate(iso);
    return display === "—" ? iso : display;
};

const nowFormDateTime = () => {
    const d = new Date();
    return `${toFormDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const avatarColorFor = (id, name) => {
    const seed = String(id ?? name ?? "0");
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const statusPillStyle = (statusKey) => {
    if (statusKey === "checked_in") {
        return { bg: "#E8F8EE", color: GREEN };
    }
    if (statusKey === "checked_out") {
        return { bg: "#EEF2FF", color: "#4338CA" };
    }
    if (statusKey === "absent") {
        return { bg: "#FFF4E5", color: ORANGE };
    }
    return { bg: "#FDECEC", color: RED };
};

const FieldLabel = ({ icon, text }) => (
    <View style={styles.fieldLabelRow}>
        <Image source={icon} style={styles.fieldIcon} resizeMode="contain" />
        <Text allowFontScaling={false} style={styles.fieldLabel}>
            {text}
        </Text>
    </View>
);

const Calendar = ({ value, onPick }) => {
    const current = parseFormDate(String(value).slice(0, 10));
    const [cursor, setCursor] = useState(
        new Date(current.getFullYear(), current.getMonth(), 1)
    );
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <View style={styles.calendar}>
            <View style={styles.calendarHead}>
                <TouchableOpacity onPress={() => setCursor(new Date(year, month - 1, 1))} hitSlop={8}>
                    <Text allowFontScaling={false} style={styles.calendarNav}>‹</Text>
                </TouchableOpacity>
                <Text allowFontScaling={false} style={styles.calendarTitle}>
                    {MONTHS_LONG[month]} {year}
                </Text>
                <TouchableOpacity onPress={() => setCursor(new Date(year, month + 1, 1))} hitSlop={8}>
                    <Text allowFontScaling={false} style={styles.calendarNav}>›</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.calendarGrid}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <Text key={`${d}-${i}`} allowFontScaling={false} style={styles.calendarDow}>
                        {d}
                    </Text>
                ))}
                {cells.map((day, i) => {
                    const selected =
                        day &&
                        current.getDate() === day &&
                        current.getMonth() === month &&
                        current.getFullYear() === year;
                    return (
                        <TouchableOpacity
                            key={`day-${i}`}
                            disabled={!day}
                            style={[styles.calendarDay, selected && styles.calendarDayOn]}
                            onPress={() => onPick(toFormDate(new Date(year, month, day)))}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[styles.calendarDayTxt, selected && styles.calendarDayTxtOn]}
                            >
                                {day || ""}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const AttendanceModal = ({
    visible,
    onClose,
    onSubmit,
    workers,
    defaultDutyDate,
    saving,
}) => {
    const [workerId, setWorkerId] = useState("");
    const [dutyDate, setDutyDate] = useState(isoToFormDate(defaultDutyDate) || isoToFormDate(todayIsoIst()));
    const [status, setStatus] = useState(MANUAL_STATUS_OPTIONS[0].key);
    const [checkInAt, setCheckInAt] = useState(nowFormDateTime());
    const [checkOutAt, setCheckOutAt] = useState("");
    const [note, setNote] = useState("");
    const [workerOpen, setWorkerOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [dutyOpen, setDutyOpen] = useState(false);
    const [checkInOpen, setCheckInOpen] = useState(false);
    const [checkOutOpen, setCheckOutOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setWorkerId("");
        setDutyDate(isoToFormDate(defaultDutyDate) || isoToFormDate(todayIsoIst()));
        setStatus(MANUAL_STATUS_OPTIONS[0].key);
        setCheckInAt(nowFormDateTime());
        setCheckOutAt("");
        setNote("");
        setWorkerOpen(false);
        setStatusOpen(false);
        setDutyOpen(false);
        setCheckInOpen(false);
        setCheckOutOpen(false);
    }, [visible, defaultDutyDate]);

    const worker = workers.find((item) => String(item.id) === String(workerId));
    const statusOption = MANUAL_STATUS_OPTIONS.find((item) => item.key === status);

    const closeMenus = () => {
        setWorkerOpen(false);
        setStatusOpen(false);
        setDutyOpen(false);
        setCheckInOpen(false);
        setCheckOutOpen(false);
    };

    const close = () => {
        closeMenus();
        onClose();
    };

    const applyDateKeepTime = (current, nextDate) => {
        const time = String(current || "").slice(11).trim() || "09:00";
        return `${nextDate} ${time}`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={close}
        >
            <Pressable style={styles.modalRoot} onPress={close}>
                <Pressable style={styles.formCard} onPress={() => {}}>
                    <View style={styles.formHeader}>
                        <Text allowFontScaling={false} style={styles.formTitle}>
                            Add worker attendance
                        </Text>
                        <TouchableOpacity onPress={close} hitSlop={10}>
                            <Text allowFontScaling={false} style={styles.formClose}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={styles.formBody}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <FieldLabel icon={FIELDWORKER} text="FIELD WORKER" />
                        <TouchableOpacity
                            style={styles.dropField}
                            activeOpacity={0.85}
                            onPress={() => {
                                setWorkerOpen((v) => !v);
                                setStatusOpen(false);
                                setDutyOpen(false);
                                setCheckInOpen(false);
                                setCheckOutOpen(false);
                            }}
                        >
                            <Image source={FIELDWORKER} style={styles.dropIcon} resizeMode="contain" />
                            <Text
                                allowFontScaling={false}
                                style={[styles.dropValue, !worker && styles.placeholder]}
                                numberOfLines={1}
                            >
                                {worker ? worker.name : "Select worker..."}
                            </Text>
                            <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                        </TouchableOpacity>
                        {workerOpen && (
                            <View style={styles.menu}>
                                {workers.length === 0 ? (
                                    <Text allowFontScaling={false} style={styles.menuEmpty}>
                                        No workers available
                                    </Text>
                                ) : (
                                    workers.map((item) => (
                                        <TouchableOpacity
                                            key={String(item.id)}
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setWorkerId(String(item.id));
                                                setWorkerOpen(false);
                                            }}
                                        >
                                            <Image source={FIELDWORKER} style={styles.menuIcon} resizeMode="contain" />
                                            <View style={styles.menuTextWrap}>
                                                <Text allowFontScaling={false} style={styles.menuTxt}>
                                                    {item.name}
                                                </Text>
                                                <Text allowFontScaling={false} style={styles.menuSub}>
                                                    {item.zone}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <FieldLabel icon={FIELDATTENDANCE} text="DUTY DATE" />
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setDutyOpen((v) => !v);
                                        setWorkerOpen(false);
                                        setStatusOpen(false);
                                        setCheckInOpen(false);
                                        setCheckOutOpen(false);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.dropValue}>
                                        {dutyDate}
                                    </Text>
                                    <Image source={FIELDATTENDANCE} style={styles.dropIcon} resizeMode="contain" />
                                </TouchableOpacity>
                                {dutyOpen && (
                                    <Calendar
                                        value={dutyDate}
                                        onPick={(next) => {
                                            setDutyDate(next);
                                            setDutyOpen(false);
                                        }}
                                    />
                                )}
                            </View>
                            <View style={styles.col}>
                                <FieldLabel icon={REPORTS} text="STATUS" />
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setStatusOpen((v) => !v);
                                        setWorkerOpen(false);
                                        setDutyOpen(false);
                                        setCheckInOpen(false);
                                        setCheckOutOpen(false);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.dropValue} numberOfLines={1}>
                                        {statusOption?.label || statusLabel(status)}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                                </TouchableOpacity>
                                {statusOpen && (
                                    <View style={styles.menu}>
                                        {MANUAL_STATUS_OPTIONS.map((item) => (
                                            <TouchableOpacity
                                                key={item.key}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setStatus(item.key);
                                                    setStatusOpen(false);
                                                    if (item.key === "checked_out" && !checkOutAt) {
                                                        setCheckOutAt(nowFormDateTime());
                                                    }
                                                }}
                                            >
                                                <Text allowFontScaling={false} style={styles.menuTxt}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <FieldLabel icon={CHECKIN} text="CHECK-IN TIME (OPTIONAL)" />
                        <TouchableOpacity
                            style={styles.dropField}
                            activeOpacity={0.85}
                            onPress={() => {
                                setCheckInOpen((v) => !v);
                                setWorkerOpen(false);
                                setStatusOpen(false);
                                setDutyOpen(false);
                                setCheckOutOpen(false);
                            }}
                        >
                            <Text allowFontScaling={false} style={styles.dropValue}>
                                {checkInAt || "Select check-in date"}
                            </Text>
                            <Image source={CHECKIN} style={styles.dropIcon} resizeMode="contain" />
                        </TouchableOpacity>
                        {checkInOpen && (
                            <Calendar
                                value={checkInAt || dutyDate}
                                onPick={(next) => {
                                    setCheckInAt(applyDateKeepTime(checkInAt || nowFormDateTime(), next));
                                    setCheckInOpen(false);
                                }}
                            />
                        )}
                        <TextInput
                            allowFontScaling={false}
                            style={[styles.input, styles.timeInput]}
                            value={checkInAt}
                            onChangeText={setCheckInAt}
                            placeholder="dd-mm-yyyy HH:mm"
                            placeholderTextColor={GREY}
                        />

                        {status === "checked_out" && (
                            <>
                                <FieldLabel icon={CHECKOUT} text="CHECK-OUT TIME" />
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setCheckOutOpen((v) => !v);
                                        setWorkerOpen(false);
                                        setStatusOpen(false);
                                        setDutyOpen(false);
                                        setCheckInOpen(false);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.dropValue}>
                                        {checkOutAt || "Select check-out date"}
                                    </Text>
                                    <Image source={CHECKOUT} style={styles.dropIcon} resizeMode="contain" />
                                </TouchableOpacity>
                                {checkOutOpen && (
                                    <Calendar
                                        value={checkOutAt || dutyDate}
                                        onPick={(next) => {
                                            setCheckOutAt(
                                                applyDateKeepTime(checkOutAt || nowFormDateTime(), next)
                                            );
                                            setCheckOutOpen(false);
                                        }}
                                    />
                                )}
                                <TextInput
                                    allowFontScaling={false}
                                    style={[styles.input, styles.timeInput]}
                                    value={checkOutAt}
                                    onChangeText={setCheckOutAt}
                                    placeholder="dd-mm-yyyy HH:mm"
                                    placeholderTextColor={GREY}
                                />
                            </>
                        )}

                        <FieldLabel icon={DESCRIPTION} text="NOTE (OPTIONAL)" />
                        <TextInput
                            allowFontScaling={false}
                            style={styles.input}
                            value={note}
                            onChangeText={setNote}
                            placeholder="e.g. Worker reported for morning duty."
                            placeholderTextColor={GREY}
                        />
                    </ScrollView>

                    <View style={styles.formFooter}>
                        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.85} onPress={close}>
                            <Text allowFontScaling={false} style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                            activeOpacity={0.85}
                            disabled={saving}
                            onPress={() =>
                                onSubmit({
                                    workerId,
                                    dutyDate,
                                    status,
                                    checkInAt,
                                    checkOutAt,
                                    note: note.trim(),
                                })
                            }
                        >
                            {saving ? (
                                <ActivityIndicator color={WHITE} size="small" />
                            ) : (
                                <Text allowFontScaling={false} style={styles.saveTxt}>Save attendance</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const PunchRow = ({ icon, label, value }) => (
    <View style={styles.punch}>
        <Image source={icon} style={styles.punchIcon} resizeMode="contain" />
        <View style={styles.punchTextWrap}>
            <Text allowFontScaling={false} style={styles.punchLabel}>{label}</Text>
            <Text allowFontScaling={false} style={styles.punchValue} numberOfLines={2}>
                {value || "—"}
            </Text>
        </View>
    </View>
);

const Stat = ({ icon, tint, bg, value, label }) => (
    <View style={styles.stat}>
        <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
            <Image source={icon} style={[styles.statIcon, { tintColor: tint }]} resizeMode="contain" />
        </View>
        <Text allowFontScaling={false} style={styles.statValue}>{value}</Text>
        <Text allowFontScaling={false} style={styles.statLabel}>{label}</Text>
    </View>
);

export default function AdminAttendanceScreen() {
    const [selectedDate, setSelectedDate] = useState(todayIsoIst());
    const [dateOpen, setDateOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState({
        supervisors: 0,
        workers: 0,
        present: 0,
        absent: 0,
    });
    const [rosterWorkers, setRosterWorkers] = useState([]);
    const [workerOptions, setWorkerOptions] = useState([]);
    const [registerRecords, setRegisterRecords] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [statusOpen, setStatusOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState({
        visible: false,
        msg: "",
        type: "",
    });

    const showToast = (msg, type) =>
        setToastMessage({ visible: true, msg: toErrorText(msg, "Done"), type });

    const load = useCallback(
        async ({ soft = false, date = selectedDate } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const [rosterRes, workersRes, registerRes] = await Promise.all([
                    fetchAttendanceRoster({ date }),
                    fetchAttendanceWorkers(),
                    fetchAttendanceRegister({ date, page: 1, limit: 50 }),
                ]);

                if (!rosterRes.ok) {
                    showToast(
                        toErrorText(rosterRes.result, "Failed to load attendance roster"),
                        "error"
                    );
                }
                if (!workersRes.ok) {
                    showToast(
                        toErrorText(workersRes.result, "Failed to load workers"),
                        "error"
                    );
                }
                if (!registerRes.ok) {
                    showToast(
                        toErrorText(registerRes.result, "Failed to load attendance register"),
                        "error"
                    );
                }

                const groups = (rosterRes.groups || []).map(mapRosterGroup);
                const flatWorkers = groups.flatMap((group) =>
                    (group.workers || []).map((worker) => ({
                        ...worker,
                        supervisorId: group.id,
                        supervisorName: group.name,
                        zone: group.zone,
                        zoneCode: group.zoneCode,
                        color: group.color || avatarColorFor(worker.id, worker.name),
                        letter: String(worker.name || "?").charAt(0).toUpperCase(),
                    }))
                );

                setSummary({
                    supervisors: rosterRes.summary?.supervisors ?? groups.length,
                    workers: rosterRes.summary?.workers ?? flatWorkers.length,
                    present: rosterRes.summary?.present ?? rosterRes.summary?.onDuty ?? 0,
                    absent: rosterRes.summary?.absent ?? 0,
                });
                setRosterWorkers(flatWorkers);
                setWorkerOptions((workersRes.data || []).map(mapWorkerOption));
                setRegisterRecords((registerRes.data || []).map(mapRegisterRecord));
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load attendance"), "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [selectedDate]
    );

    useEffect(() => {
        requestAppPermissions();
    }, []);

    useEffect(() => {
        load({ date: selectedDate });
    }, [selectedDate, load]);

    const filteredRegister = useMemo(() => {
        if (statusFilter === "all") return registerRecords;
        return registerRecords.filter((item) => item.status === statusFilter);
    }, [registerRecords, statusFilter]);

    const filterOptions = useMemo(
        () => [
            { key: "all", label: "All statuses" },
            ...MANUAL_STATUS_OPTIONS,
            { key: "absent", label: "Absent" },
        ],
        []
    );

    const handleSubmit = async (data) => {
        if (!data.workerId) {
            showToast("Please select a field worker", "error");
            return;
        }
        const dutyIso = formDateToIso(data.dutyDate);
        if (!dutyIso) {
            showToast("Please select a valid duty date", "error");
            return;
        }

        const payload = {
            userId: Number(data.workerId),
            dutyDate: dutyIso,
            status: data.status,
        };

        if (data.checkInAt?.trim()) {
            const checkInIso = formDateTimeToIso(data.checkInAt);
            if (!checkInIso) {
                showToast("Check-in time must be dd-mm-yyyy HH:mm", "error");
                return;
            }
            payload.checkInAt = checkInIso;
        }

        if (data.status === "checked_out") {
            if (!data.checkOutAt?.trim()) {
                showToast("Please enter check-out time", "error");
                return;
            }
            const checkOutIso = formDateTimeToIso(data.checkOutAt);
            if (!checkOutIso) {
                showToast("Check-out time must be dd-mm-yyyy HH:mm", "error");
                return;
            }
            payload.checkOutAt = checkOutIso;
        }

        if (data.note) payload.notes = data.note;

        setSaving(true);
        try {
            const res = await postManualAttendance(payload);
            if (!res.ok) {
                showToast(
                    toErrorText(res.result?.error || res.result, "Failed to save attendance"),
                    "error"
                );
                return;
            }
            showToast("Attendance saved", "success");
            setFormOpen(false);
            setSelectedDate(dutyIso);
            await load({ soft: true, date: dutyIso });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to save attendance"), "error");
        } finally {
            setSaving(false);
        }
    };

    const renderWorkerCard = ({ item }) => {
        const pill = statusPillStyle(item.statusKey);
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: item.color }]}>
                        <Text allowFontScaling={false} style={styles.avatarTxt}>
                            {item.letter}
                        </Text>
                    </View>
                    <View style={styles.cardBody}>
                        <Text allowFontScaling={false} style={styles.workerName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text allowFontScaling={false} style={styles.workerZone} numberOfLines={1}>
                            {item.supervisorName ? `${item.supervisorName} • ${item.zone}` : item.zone}
                        </Text>
                    </View>
                    <View style={[styles.markPill, { backgroundColor: pill.bg }]}>
                        <Text allowFontScaling={false} style={[styles.markTxt, { color: pill.color }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.punchRow}>
                    <PunchRow icon={CHECKIN} label="Check In" value={item.checkIn} />
                    <PunchRow icon={CHECKOUT} label="Check Out" value={item.checkOut} />
                    <PunchRow icon={LOCATION} label="Location" value={item.loginLocation} />
                </View>
            </View>
        );
    };

    return (
        <View style={styles.root}>
            <MyHeader
                title="Field Attendance"
                subtitle=""
                height={52}
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
                <FlatList
                    data={filteredRegister}
                    keyExtractor={(item) => String(item.id)}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => load({ soft: true, date: selectedDate })}
                            tintColor={NAVY}
                        />
                    }
                    ListHeaderComponent={
                        <View>
                            <View style={styles.placeRow}>
                                <Image source={LOCATION} style={styles.placeIcon} resizeMode="contain" />
                                <Text allowFontScaling={false} style={styles.placeTxt}>
                                    Bhudan Chhak to Chandrabhaga & beyond
                                </Text>
                            </View>

                            <View style={styles.statsRow}>
                                <Stat
                                    icon={SUPERVISOR}
                                    tint="#2563EB"
                                    bg="#E8F1FF"
                                    value={String(summary.supervisors ?? 0)}
                                    label="Supervisors"
                                />
                                <Stat
                                    icon={FIELDWORKER}
                                    tint="#7C3AED"
                                    bg="#F3E8FF"
                                    value={String(summary.workers ?? 0)}
                                    label="Workers Listed"
                                />
                                <Stat
                                    icon={CHECKIN}
                                    tint={GREEN}
                                    bg="#E8F8EE"
                                    value={String(summary.present ?? 0)}
                                    label="Present"
                                />
                                <Stat
                                    icon={CHECKOUT}
                                    tint={ORANGE}
                                    bg="#FFF4E5"
                                    value={String(summary.absent ?? 0)}
                                    label="Absent / Not Marked"
                                />
                            </View>

                            <View style={styles.actionRow}>
                                <View style={styles.dateWrap}>
                                    <TouchableOpacity
                                        style={styles.dateBtn}
                                        activeOpacity={0.85}
                                        onPress={() => {
                                            setDateOpen((v) => !v);
                                            setStatusOpen(false);
                                        }}
                                    >
                                        <Image source={FIELDATTENDANCE} style={styles.dateIcon} resizeMode="contain" />
                                        <Text allowFontScaling={false} style={styles.dateTxt}>
                                            {toScreenDate(selectedDate)}
                                        </Text>
                                        <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                                    </TouchableOpacity>
                                    {dateOpen && (
                                        <View style={styles.dateMenu}>
                                            <Calendar
                                                value={isoToFormDate(selectedDate)}
                                                onPick={(next) => {
                                                    const iso = formDateToIso(next);
                                                    if (iso) setSelectedDate(iso);
                                                    setDateOpen(false);
                                                }}
                                            />
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setFormOpen(true);
                                        setDateOpen(false);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.addBtnTxt}>
                                        +  Add Worker Attendance
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.sectionHead}>
                                <Text allowFontScaling={false} style={styles.sectionTitle}>
                                    Duty roster
                                </Text>
                                <Text allowFontScaling={false} style={styles.sectionSub}>
                                    Workers for {toScreenDate(selectedDate)}
                                </Text>
                            </View>

                            {rosterWorkers.length === 0 ? (
                                <View style={styles.emptyWrapCompact}>
                                    <Text allowFontScaling={false} style={styles.emptyTitle}>
                                        No workers on roster
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.emptySub}>
                                        Try another date, or add attendance manually.
                                    </Text>
                                </View>
                            ) : (
                                rosterWorkers.map((worker) => (
                                    <View key={`roster-${worker.id}`}>
                                        {renderWorkerCard({ item: worker })}
                                    </View>
                                ))
                            )}

                            <View style={styles.recordsHead}>
                                <View>
                                    <Text allowFontScaling={false} style={styles.recordsTitle}>
                                        Attendance register
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.recordsSub}>
                                        Detailed punch log for the selected date
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.filterWrap}>
                                <TouchableOpacity
                                    style={styles.filterBtn}
                                    activeOpacity={0.85}
                                    onPress={() => setStatusOpen((v) => !v)}
                                >
                                    <Image source={REPORTS} style={styles.filterIcon} resizeMode="contain" />
                                    <Text allowFontScaling={false} style={styles.filterTxt}>
                                        {filterOptions.find((o) => o.key === statusFilter)?.label || "All statuses"}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.chevron}>▾</Text>
                                </TouchableOpacity>
                                {statusOpen && (
                                    <View style={styles.filterMenu}>
                                        {filterOptions.map((item) => (
                                            <TouchableOpacity
                                                key={item.key}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setStatusFilter(item.key);
                                                    setStatusOpen(false);
                                                }}
                                            >
                                                <Text allowFontScaling={false} style={styles.menuTxt}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const pill = statusPillStyle(item.status);
                        return (
                            <View style={styles.recordCard}>
                                <View style={[styles.avatar, { backgroundColor: item.color || avatarColorFor(item.id, item.name) }]}>
                                    <Text allowFontScaling={false} style={styles.avatarTxt}>{item.letter}</Text>
                                </View>
                                <View style={styles.cardBody}>
                                    <Text allowFontScaling={false} style={styles.workerName}>{item.name}</Text>
                                    <Text allowFontScaling={false} style={styles.workerZone} numberOfLines={1}>
                                        {item.notes || item.zone}
                                    </Text>
                                    <View style={styles.recordMeta}>
                                        <Image source={CHECKIN} style={styles.recordIcon} resizeMode="contain" />
                                        <Text allowFontScaling={false} style={styles.recordMetaTxt}>
                                            {item.checkIn || "—"}
                                        </Text>
                                        <Image source={REPORTS} style={styles.recordIcon} resizeMode="contain" />
                                        <Text
                                            allowFontScaling={false}
                                            style={[styles.recordMetaTxt, { color: pill.color }]}
                                        >
                                            {item.statusLabel || statusLabel(item.status)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconWrap}>
                                <Image source={FIELDATTENDANCE} style={styles.emptyIcon} resizeMode="contain" />
                            </View>
                            <Text allowFontScaling={false} style={styles.emptyTitle}>
                                No attendance records
                            </Text>
                            <Text allowFontScaling={false} style={styles.emptySub}>
                                Field staff check in, or a supervisor adds a worker's attendance.
                            </Text>
                        </View>
                    }
                />
            )}

            <AttendanceModal
                visible={formOpen}
                onClose={() => setFormOpen(false)}
                onSubmit={handleSubmit}
                workers={workerOptions}
                defaultDutyDate={selectedDate}
                saving={saving}
            />

            {toastMessage.visible && (
                <ToastMessage
                    message={toastMessage.msg}
                    visible={toastMessage.visible}
                    setVisible={({ visible }) =>
                        setToastMessage((prev) => ({ ...prev, visible }))
                    }
                    bacgroundColor={toastMessage.type === "success" ? GREEN : RED}
                    textColor={WHITE}
                    type={toastMessage.type}
                    duration={2500}
                    position="bottom"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F4F7FB",
    },
    loadingWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    listContent: {
        paddingBottom: 28,
    },
    placeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
    },
    placeIcon: {
        width: 14,
        height: 14,
        marginRight: 6,
        tintColor: GREY,
    },
    placeTxt: {
        color: GREY,
        fontSize: 12,
    },
    statsRow: {
        flexDirection: "row",
        paddingHorizontal: 12,
        marginTop: 12,
    },
    stat: {
        flex: 1,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginHorizontal: 3,
    },
    statIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    statIcon: {
        width: 15,
        height: 15,
    },
    statValue: {
        marginTop: 6,
        color: NAVY,
        fontSize: 16,
        fontWeight: "700",
    },
    statLabel: {
        marginTop: 2,
        color: GREY,
        fontSize: 9,
        textAlign: "center",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 14,
        marginTop: 14,
        marginBottom: 8,
    },
    dateWrap: {
        marginRight: 8,
        zIndex: 20,
    },
    dateBtn: {
        height: 42,
        borderRadius: 12,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    dateIcon: {
        width: 14,
        height: 14,
        marginRight: 6,
    },
    dateTxt: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "600",
        marginRight: 6,
    },
    dateMenu: {
        position: "absolute",
        top: 46,
        left: 0,
        width: 280,
        backgroundColor: WHITE,
        borderRadius: 12,
        elevation: 8,
        zIndex: 30,
    },
    addBtn: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        backgroundColor: NAVY,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
    },
    addBtnTxt: {
        color: WHITE,
        fontSize: 12,
        fontWeight: "700",
    },
    sectionHead: {
        paddingHorizontal: 16,
        marginTop: 4,
        marginBottom: 8,
    },
    sectionTitle: {
        color: NAVY,
        fontSize: 15,
        fontWeight: "700",
    },
    sectionSub: {
        color: GREY,
        fontSize: 12,
        marginTop: 2,
    },
    card: {
        marginHorizontal: 14,
        marginBottom: 10,
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 12,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    avatarTxt: {
        color: WHITE,
        fontWeight: "700",
        fontSize: 14,
    },
    cardBody: {
        flex: 1,
    },
    workerName: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
    },
    workerZone: {
        color: GREY,
        fontSize: 11,
        marginTop: 2,
    },
    markPill: {
        borderRadius: 20,
        backgroundColor: "#FDECEC",
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 6,
        maxWidth: 120,
    },
    markTxt: {
        color: RED,
        fontSize: 11,
        fontWeight: "700",
    },
    punchRow: {
        flexDirection: "row",
        marginTop: 12,
    },
    punch: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-start",
    },
    punchTextWrap: {
        flex: 1,
        paddingRight: 4,
    },
    punchIcon: {
        width: 14,
        height: 14,
        marginRight: 6,
        marginTop: 2,
        tintColor: GREY,
    },
    punchLabel: {
        color: "#64748B",
        fontSize: 10,
    },
    punchValue: {
        color: NAVY,
        fontSize: 11,
        marginTop: 1,
    },
    recordsHead: {
        marginTop: 8,
        paddingHorizontal: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#E8EEF5",
    },
    recordsTitle: {
        color: NAVY,
        fontSize: 16,
        fontWeight: "700",
    },
    recordsSub: {
        color: GREY,
        fontSize: 12,
        marginTop: 2,
    },
    filterWrap: {
        marginHorizontal: 14,
        marginTop: 12,
        marginBottom: 12,
        zIndex: 12,
    },
    filterBtn: {
        alignSelf: "flex-start",
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    filterIcon: {
        width: 14,
        height: 14,
        marginRight: 6,
    },
    filterTxt: {
        color: NAVY,
        fontSize: 13,
        fontWeight: "600",
    },
    filterMenu: {
        marginTop: 4,
        alignSelf: "flex-start",
        minWidth: 190,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        elevation: 6,
    },
    emptyWrap: {
        alignItems: "center",
        paddingHorizontal: 36,
        paddingVertical: 36,
    },
    emptyWrapCompact: {
        alignItems: "center",
        paddingHorizontal: 28,
        paddingVertical: 18,
        marginHorizontal: 14,
        marginBottom: 10,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
    },
    emptyIconWrap: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#E8F1FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    emptyIcon: {
        width: 24,
        height: 24,
        tintColor: "#60A5FA",
    },
    emptyTitle: {
        color: NAVY,
        fontSize: 16,
        fontWeight: "700",
    },
    emptySub: {
        marginTop: 6,
        color: GREY,
        fontSize: 13,
        textAlign: "center",
        lineHeight: 18,
    },
    recordCard: {
        marginHorizontal: 14,
        marginBottom: 10,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    recordMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        flexWrap: "wrap",
    },
    recordIcon: {
        width: 12,
        height: 12,
        marginRight: 4,
    },
    recordMetaTxt: {
        color: "#64748B",
        fontSize: 11,
        marginRight: 10,
    },
    modalRoot: {
        width: SCREEN.width,
        height: SCREEN.height,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        paddingHorizontal: 18,
    },
    formCard: {
        width: "100%",
        maxHeight: SCREEN.height * 0.82,
        backgroundColor: WHITE,
        borderRadius: 18,
        overflow: "hidden",
    },
    formHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 6,
    },
    formTitle: {
        color: NAVY,
        fontSize: 18,
        fontWeight: "700",
    },
    formClose: {
        color: GREY,
        fontSize: 26,
        lineHeight: 28,
    },
    formScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },
    formBody: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    fieldLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 6,
    },
    fieldIcon: {
        width: 14,
        height: 14,
        marginRight: 6,
    },
    fieldLabel: {
        color: "#64748B",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.4,
    },
    dropField: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
    },
    dropIcon: {
        width: 16,
        height: 16,
        marginRight: 8,
    },
    dropValue: {
        flex: 1,
        color: NAVY,
        fontSize: 14,
    },
    placeholder: {
        color: GREY,
    },
    chevron: {
        color: GREY,
        fontSize: 12,
        marginLeft: 6,
    },
    menu: {
        marginTop: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        overflow: "hidden",
        maxHeight: 220,
    },
    menuEmpty: {
        color: GREY,
        fontSize: 13,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    menuIcon: {
        width: 14,
        height: 14,
        marginRight: 8,
    },
    menuTextWrap: {
        flex: 1,
    },
    menuTxt: {
        color: NAVY,
        fontSize: 13,
        flexShrink: 1,
    },
    menuSub: {
        color: GREY,
        fontSize: 11,
        marginTop: 2,
    },
    twoCol: {
        flexDirection: "row",
        marginHorizontal: -6,
    },
    col: {
        flex: 1,
        paddingHorizontal: 6,
    },
    input: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
        color: NAVY,
        fontSize: 14,
    },
    timeInput: {
        marginTop: 8,
    },
    calendar: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 8,
        backgroundColor: WHITE,
    },
    calendarHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    calendarTitle: {
        color: NAVY,
        fontWeight: "700",
        fontSize: 13,
    },
    calendarNav: {
        color: NAVY,
        fontSize: 22,
        paddingHorizontal: 8,
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    calendarDow: {
        width: "14.28%",
        textAlign: "center",
        color: GREY,
        fontSize: 11,
        marginBottom: 4,
    },
    calendarDay: {
        width: "14.28%",
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    calendarDayOn: {
        backgroundColor: NAVY,
    },
    calendarDayTxt: {
        color: NAVY,
        fontSize: 12,
    },
    calendarDayTxtOn: {
        color: WHITE,
        fontWeight: "700",
    },
    formFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        backgroundColor: "#F8FAFC",
    },
    cancelBtn: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
    },
    cancelTxt: {
        color: NAVY,
        fontSize: 13,
        fontWeight: "600",
    },
    saveBtn: {
        borderRadius: 10,
        backgroundColor: NAVY,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minWidth: 140,
        alignItems: "center",
        justifyContent: "center",
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveTxt: {
        color: WHITE,
        fontSize: 13,
        fontWeight: "700",
    },
});
