import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
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
import { MyAlert } from "../../../components/commonComponents/MyAlert";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    GREEN,
    GREY,
    LIGHTGREY,
    NAVY,
    RED,
    WHITE,
} from "../../../constant/color";
import {
    CATAGORIES,
    DELETE,
    DESCRIPTION,
    FIELDATTENDANCE,
    REPORTS,
    SUPERVISOR,
    VIEW,
    ZONE,
} from "../../../constant/imagePath";
import {
    WORK_STATUS_LABEL,
    WORK_STATUS_OPTIONS,
    createActivity,
    deleteActivity,
    fetchActivities,
    fetchSupervisorOptions,
    formDateToIso,
    resolveDefaultSupervisorId,
    toErrorText,
} from "../../../services/activities/ActivityService";

const SCREEN = Dimensions.get("screen");

const MONTHS_LONG = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");

const toFormDate = (date) =>
    `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;

const parseFormDate = (value) => {
    const [dd, mm, yyyy] = String(value || "").split("-").map(Number);
    if (!dd || !mm || !yyyy) return new Date();
    return new Date(yyyy, mm - 1, dd);
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
    const current = parseFormDate(value);
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
                <TouchableOpacity
                    onPress={() => setCursor(new Date(year, month - 1, 1))}
                    hitSlop={8}
                >
                    <Text allowFontScaling={false} style={styles.calendarNav}>
                        ‹
                    </Text>
                </TouchableOpacity>
                <Text allowFontScaling={false} style={styles.calendarTitle}>
                    {MONTHS_LONG[month]} {year}
                </Text>
                <TouchableOpacity
                    onPress={() => setCursor(new Date(year, month + 1, 1))}
                    hitSlop={8}
                >
                    <Text allowFontScaling={false} style={styles.calendarNav}>
                        ›
                    </Text>
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
                            key={`d-${i}`}
                            style={[styles.calendarDay, selected && styles.calendarDayOn]}
                            disabled={!day}
                            onPress={() => onPick(toFormDate(new Date(year, month, day)))}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.calendarDayTxt,
                                    selected && styles.calendarDayTxtOn,
                                ]}
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

const LogActivityModal = ({
    visible,
    initial,
    supervisors,
    defaultSupervisorId,
    saving,
    onClose,
    onSubmit,
}) => {
    const [supervisorId, setSupervisorId] = useState(
        initial?.supervisorId != null
            ? String(initial.supervisorId)
            : defaultSupervisorId != null
              ? String(defaultSupervisorId)
              : ""
    );
    const [workStatus, setWorkStatus] = useState(
        initial?.workStatus || "in_progress"
    );
    const [manpower, setManpower] = useState(initial?.manpower || "5");
    const [date, setDate] = useState(initial?.formDate || toFormDate(new Date()));
    const [material, setMaterial] = useState(initial?.material || "");
    const [notes, setNotes] = useState(initial?.notes || "");
    const [supervisorOpen, setSupervisorOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setSupervisorId(
            initial?.supervisorId != null
                ? String(initial.supervisorId)
                : defaultSupervisorId != null
                  ? String(defaultSupervisorId)
                  : ""
        );
        setWorkStatus(initial?.workStatus || "in_progress");
        setManpower(initial?.manpower && initial.manpower !== "—" ? String(initial.manpower) : "5");
        setDate(initial?.formDate || toFormDate(new Date()));
        setMaterial(initial?.material || "");
        setNotes(initial?.notes || "");
        setSupervisorOpen(false);
        setStatusOpen(false);
        setDateOpen(false);
    }, [visible, initial, defaultSupervisorId]);

    const selectedSupervisor = supervisors.find(
        (s) => String(s.id) === String(supervisorId)
    );
    const statusLabel = WORK_STATUS_LABEL[workStatus] || workStatus;

    const close = () => {
        if (saving) return;
        setSupervisorOpen(false);
        setStatusOpen(false);
        setDateOpen(false);
        onClose();
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
                            Log field activity
                        </Text>
                        <TouchableOpacity onPress={close} hitSlop={10} disabled={saving}>
                            <Text allowFontScaling={false} style={styles.formClose}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.formScroll}
                        contentContainerStyle={styles.formBody}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <FieldLabel icon={SUPERVISOR} text="SUPERVISOR ID" />
                        {supervisors.length > 0 ? (
                            <View style={styles.dropWrap}>
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setSupervisorOpen((v) => !v);
                                        setStatusOpen(false);
                                        setDateOpen(false);
                                    }}
                                >
                                    <Image
                                        source={SUPERVISOR}
                                        style={styles.dropFieldIcon}
                                        resizeMode="contain"
                                    />
                                    <Text
                                        allowFontScaling={false}
                                        style={[
                                            styles.dropValue,
                                            !selectedSupervisor && styles.placeholder,
                                        ]}
                                    >
                                        {selectedSupervisor
                                            ? `${selectedSupervisor.name}${
                                                  selectedSupervisor.zoneCode
                                                      ? ` (${selectedSupervisor.zoneCode})`
                                                      : ""
                                              }`
                                            : "Select supervisor..."}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.chevron}>
                                        ▾
                                    </Text>
                                </TouchableOpacity>
                                {supervisorOpen && (
                                    <View style={styles.menu}>
                                        {supervisors.map((s) => (
                                            <TouchableOpacity
                                                key={s.id}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setSupervisorId(String(s.id));
                                                    setSupervisorOpen(false);
                                                }}
                                            >
                                                <Text
                                                    allowFontScaling={false}
                                                    style={styles.menuTxt}
                                                >
                                                    {s.name}
                                                    {s.zoneCode ? ` · ${s.zoneCode}` : ""}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TextInput
                                allowFontScaling={false}
                                style={styles.input}
                                value={supervisorId}
                                onChangeText={setSupervisorId}
                                keyboardType="number-pad"
                                placeholder="e.g. 12"
                                placeholderTextColor={GREY}
                            />
                        )}

                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <FieldLabel icon={REPORTS} text="WORK STATUS" />
                                <TouchableOpacity
                                    style={styles.dropField}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setStatusOpen((v) => !v);
                                        setSupervisorOpen(false);
                                        setDateOpen(false);
                                    }}
                                >
                                    <Image
                                        source={REPORTS}
                                        style={styles.dropFieldIcon}
                                        resizeMode="contain"
                                    />
                                    <Text allowFontScaling={false} style={styles.dropValue}>
                                        {statusLabel}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.chevron}>
                                        ▾
                                    </Text>
                                </TouchableOpacity>
                                {statusOpen && (
                                    <View style={styles.menu}>
                                        {WORK_STATUS_OPTIONS.map((s) => (
                                            <TouchableOpacity
                                                key={s.key}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setWorkStatus(s.key);
                                                    setStatusOpen(false);
                                                }}
                                            >
                                                <Text
                                                    allowFontScaling={false}
                                                    style={styles.menuTxt}
                                                >
                                                    {s.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <View style={styles.col}>
                                <FieldLabel icon={SUPERVISOR} text="MANPOWER COUNT" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={manpower}
                                    onChangeText={setManpower}
                                    keyboardType="number-pad"
                                    placeholder="0–500"
                                    placeholderTextColor={GREY}
                                />
                            </View>
                        </View>

                        <FieldLabel icon={FIELDATTENDANCE} text="ACTIVITY DATE" />
                        <TouchableOpacity
                            style={styles.dropField}
                            activeOpacity={0.85}
                            onPress={() => {
                                setDateOpen((v) => !v);
                                setSupervisorOpen(false);
                                setStatusOpen(false);
                            }}
                        >
                            <Text allowFontScaling={false} style={styles.dropValue}>
                                {date}
                            </Text>
                            <Image
                                source={FIELDATTENDANCE}
                                style={styles.dateIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        {dateOpen && (
                            <Calendar
                                value={date}
                                onPick={(next) => {
                                    setDate(next);
                                    setDateOpen(false);
                                }}
                            />
                        )}

                        <FieldLabel icon={CATAGORIES} text="MATERIAL USAGE (OPTIONAL)" />
                        <TextInput
                            allowFontScaling={false}
                            style={styles.input}
                            value={material}
                            onChangeText={setMaterial}
                            maxLength={500}
                            placeholder="e.g. Cement, sand and construction materials"
                            placeholderTextColor={GREY}
                        />

                        <FieldLabel icon={DESCRIPTION} text="NOTES (OPTIONAL)" />
                        <TextInput
                            allowFontScaling={false}
                            style={[styles.input, styles.notesInput]}
                            value={notes}
                            onChangeText={setNotes}
                            maxLength={1000}
                            placeholder=""
                            placeholderTextColor={GREY}
                            multiline
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    <View style={styles.formFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.85}
                            onPress={close}
                            disabled={saving}
                        >
                            <Text allowFontScaling={false} style={styles.cancelTxt}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                            activeOpacity={0.85}
                            disabled={saving}
                            onPress={() =>
                                onSubmit({
                                    supervisorId,
                                    workStatus,
                                    manpower,
                                    date,
                                    material: material.trim(),
                                    notes: notes.trim(),
                                })
                            }
                        >
                            {saving ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <Text allowFontScaling={false} style={styles.saveTxt}>
                                    Save log
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const isPositiveStatus = (status) => {
    const s = String(status || "").toLowerCase();
    return (
        s.includes("progress") ||
        s.includes("track") ||
        s.includes("complete") ||
        s === "pending"
    );
};

const ActivityCard = ({ item, onEdit, onDelete }) => {
    const onTrack = isPositiveStatus(item.status) && !String(item.status).toLowerCase().includes("delay");
    return (
        <View style={styles.card}>
            <View style={styles.dateCol}>
                <Text allowFontScaling={false} style={styles.dateDay}>
                    {String(item.date || "").replace(/ \d{4}$/, "")}
                </Text>
                <Text allowFontScaling={false} style={styles.dateYear}>
                    {String(item.date || "").slice(-4)}
                </Text>
                <View style={styles.zoneBadge}>
                    <Text allowFontScaling={false} style={styles.zoneLetter}>
                        {item.letter}
                    </Text>
                </View>
                <Text allowFontScaling={false} style={styles.zoneCode}>
                    {item.zoneCode}
                </Text>
            </View>

            <View style={styles.cardMain}>
                <View style={styles.cardTop}>
                    <View style={styles.nameRow}>
                        <View style={styles.avatar}>
                            <Text allowFontScaling={false} style={styles.avatarTxt}>
                                {item.letter}
                            </Text>
                        </View>
                        <Text allowFontScaling={false} style={styles.name} numberOfLines={1}>
                            {item.name}
                        </Text>
                    </View>
                    <View style={styles.topActions}>
                        <View
                            style={[
                                styles.statusPill,
                                onTrack ? styles.statusOn : styles.statusDelay,
                            ]}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.statusTxt,
                                    onTrack ? styles.statusOnTxt : styles.statusDelayTxt,
                                ]}
                            >
                                {item.status}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            activeOpacity={0.8}
                            onPress={onEdit}
                        >
                            <Image source={VIEW} style={styles.actionIcon} resizeMode="contain" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            activeOpacity={0.8}
                            onPress={onDelete}
                        >
                            <Image
                                source={DELETE}
                                style={[styles.actionIcon, styles.deleteIcon]}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text allowFontScaling={false} style={styles.cardTitle}>
                    {item.title}
                </Text>
                {!!item.subtitle && (
                    <Text allowFontScaling={false} style={styles.cardSub} numberOfLines={2}>
                        {item.subtitle}
                    </Text>
                )}

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Image source={SUPERVISOR} style={styles.metaIcon} resizeMode="contain" />
                        <Text allowFontScaling={false} style={styles.metaStrong}>
                            {item.manpower}
                        </Text>
                        <Text allowFontScaling={false} style={styles.metaMuted}>
                            manpower
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Image source={CATAGORIES} style={styles.metaIcon} resizeMode="contain" />
                        <Text
                            allowFontScaling={false}
                            style={styles.metaMuted}
                            numberOfLines={1}
                        >
                            {item.material || "—"}
                        </Text>
                    </View>
                    {!!item.time && (
                        <Text allowFontScaling={false} style={styles.timeTxt}>
                            {item.time}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
};

export default function ActivityLogsScreen() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState("All statuses");
    const [zoneFilter, setZoneFilter] = useState("All zones");
    const [dateFilter, setDateFilter] = useState("Date");
    const [openMenu, setOpenMenu] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [supervisors, setSupervisors] = useState([]);
    const [defaultSupervisorId, setDefaultSupervisorId] = useState(null);
    const [toastMessage, setToastMessage] = useState({
        visible: false,
        msg: "",
        type: "",
    });

    const showToast = (msg, type) =>
        setToastMessage({ visible: true, msg: toErrorText(msg, "Done"), type });

    const loadActivities = useCallback(async ({ soft = false } = {}) => {
        if (soft) setRefreshing(true);
        else setLoading(true);
        try {
            const { list, result, ok } = await fetchActivities();
            if (!ok && !list.length) {
                showToast(
                    toErrorText(result?.message || result, "Failed to load activities"),
                    "error"
                );
                setLogs([]);
            } else {
                setLogs(list);
            }
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to load activities"), "error");
            setLogs([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadActivities();
        (async () => {
            const [opts, defaultId] = await Promise.all([
                fetchSupervisorOptions(),
                resolveDefaultSupervisorId(),
            ]);
            setSupervisors(opts);
            setDefaultSupervisorId(defaultId);
        })();
    }, [loadActivities]);

    const statusOptions = useMemo(() => {
        const labels = new Set(Object.values(WORK_STATUS_LABEL));
        logs.forEach((item) => {
            if (item.status) labels.add(item.status);
        });
        return ["All statuses", ...Array.from(labels)];
    }, [logs]);

    const zoneOptions = useMemo(() => {
        const zones = [];
        logs.forEach((item) => {
            if (item.zoneCode && !zones.includes(item.zoneCode)) {
                zones.push(item.zoneCode);
            }
        });
        return zones;
    }, [logs]);

    const filtered = useMemo(
        () =>
            logs.filter((item) => {
                if (statusFilter !== "All statuses" && item.status !== statusFilter) {
                    return false;
                }
                if (zoneFilter !== "All zones" && item.zoneCode !== zoneFilter) {
                    return false;
                }
                if (dateFilter !== "Date" && item.date !== dateFilter) {
                    return false;
                }
                return true;
            }),
        [logs, statusFilter, zoneFilter, dateFilter]
    );

    const dateOptions = useMemo(() => {
        const unique = [];
        logs.forEach((item) => {
            if (item.date && !unique.includes(item.date)) unique.push(item.date);
        });
        return ["Date", ...unique];
    }, [logs]);

    const confirmDelete = async () => {
        const id = deleteId;
        setDeleteId(null);
        if (id == null) return;
        try {
            const { ok, result } = await deleteActivity(id);
            if (!ok) {
                showToast(
                    toErrorText(result?.message || result, "Failed to delete activity log"),
                    "error"
                );
                return;
            }
            setLogs((prev) => prev.filter((item) => String(item.id) !== String(id)));
            showToast("Activity log deleted", "success");
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to delete activity log"), "error");
        }
    };

    const handleSubmit = async (data) => {
        const activityDate = formDateToIso(data.date);
        if (!activityDate) {
            showToast("Please select a valid activity date", "error");
            return;
        }
        if (!WORK_STATUS_LABEL[data.workStatus]) {
            showToast("Please select a valid work status", "error");
            return;
        }
        const manpowerCount = Number(data.manpower);
        if (
            data.manpower === "" ||
            !Number.isInteger(manpowerCount) ||
            manpowerCount < 0 ||
            manpowerCount > 500
        ) {
            showToast("Manpower count must be an integer between 0 and 500", "error");
            return;
        }

        let supervisorId = Number(data.supervisorId);
        if (!Number.isInteger(supervisorId) || supervisorId <= 0) {
            if (defaultSupervisorId != null) {
                supervisorId = Number(defaultSupervisorId);
            }
        }
        if (!Number.isInteger(supervisorId) || supervisorId <= 0) {
            showToast("Supervisor ID is required", "error");
            return;
        }

        const materialUsage = String(data.material || "").slice(0, 500);
        const notes = String(data.notes || "").slice(0, 1000);

        const payload = {
            supervisorId,
            workStatus: data.workStatus,
            manpowerCount,
            activityDate,
            ...(materialUsage ? { materialUsage } : {}),
            ...(notes ? { notes } : {}),
        };

        setSaving(true);
        try {
            const { ok, result } = await createActivity(payload);
            if (!ok) {
                showToast(
                    toErrorText(result?.message || result, "Failed to save activity log"),
                    "error"
                );
                return;
            }
            setFormOpen(false);
            setEditing(null);
            showToast(
                toErrorText(result?.message, "Activity log saved"),
                "success"
            );
            await loadActivities({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to save activity log"), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.root}>
            <MyHeader
                title="Field Activity Logs"
                subtitle=""
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <View style={styles.banner}>
                <View style={styles.bannerIconWrap}>
                    <Image source={REPORTS} style={styles.bannerIcon} resizeMode="contain" />
                </View>
                <Text allowFontScaling={false} style={styles.bannerTxt}>
                    Work status, manpower deployment{"\n"}and material usage per road segment.
                </Text>
                <TouchableOpacity
                    style={styles.logBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                        setEditing(null);
                        setFormOpen(true);
                        setOpenMenu(null);
                    }}
                >
                    <Text allowFontScaling={false} style={styles.logBtnTxt}>
                        +  Log Activity
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filters}>
                <View style={styles.filterCol}>
                    <TouchableOpacity
                        style={styles.filterBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                            setOpenMenu((v) => (v === "status" ? null : "status"))
                        }
                    >
                        <Text allowFontScaling={false} style={styles.filterTxt} numberOfLines={1}>
                            {statusFilter}
                        </Text>
                        <Text allowFontScaling={false} style={styles.chevron}>
                            ▾
                        </Text>
                    </TouchableOpacity>
                    {openMenu === "status" && (
                        <View style={styles.filterMenu}>
                            {statusOptions.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setStatusFilter(s);
                                        setOpenMenu(null);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.menuTxt}>
                                        {s}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={[styles.filterCol, styles.filterGrow]}>
                    <TouchableOpacity
                        style={styles.filterBtn}
                        activeOpacity={0.85}
                        onPress={() => setOpenMenu((v) => (v === "zone" ? null : "zone"))}
                    >
                        <Image source={ZONE} style={styles.filterIcon} resizeMode="contain" />
                        <Text
                            allowFontScaling={false}
                            style={[styles.filterTxt, styles.filterTxtFlex]}
                            numberOfLines={1}
                        >
                            {zoneFilter === "All zones" ? "All zones" : zoneFilter}
                        </Text>
                        <Text allowFontScaling={false} style={styles.chevron}>
                            ▾
                        </Text>
                    </TouchableOpacity>
                    {openMenu === "zone" && (
                        <View style={styles.filterMenu}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setZoneFilter("All zones");
                                    setOpenMenu(null);
                                }}
                            >
                                <Image source={ZONE} style={styles.menuIcon} resizeMode="contain" />
                                <Text allowFontScaling={false} style={styles.menuTxt}>
                                    All zones
                                </Text>
                            </TouchableOpacity>
                            {zoneOptions.map((z) => (
                                <TouchableOpacity
                                    key={z}
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setZoneFilter(z);
                                        setOpenMenu(null);
                                    }}
                                >
                                    <Image
                                        source={ZONE}
                                        style={styles.menuIcon}
                                        resizeMode="contain"
                                    />
                                    <Text allowFontScaling={false} style={styles.menuTxt}>
                                        {z}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.filterCol}>
                    <TouchableOpacity
                        style={styles.dateFilterBtn}
                        activeOpacity={0.85}
                        onPress={() => setOpenMenu((v) => (v === "date" ? null : "date"))}
                    >
                        <Image
                            source={FIELDATTENDANCE}
                            style={styles.filterIcon}
                            resizeMode="contain"
                        />
                        <Text allowFontScaling={false} style={styles.filterTxt}>
                            Date
                        </Text>
                    </TouchableOpacity>
                    {openMenu === "date" && (
                        <View style={[styles.filterMenu, styles.dateMenu]}>
                            {dateOptions.map((d) => (
                                <TouchableOpacity
                                    key={d}
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setDateFilter(d);
                                        setOpenMenu(null);
                                    }}
                                >
                                    <Text allowFontScaling={false} style={styles.menuTxt}>
                                        {d === "Date" ? "All dates" : d}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.sectionHead}>
                <Text allowFontScaling={false} style={styles.sectionTitle}>
                    Recent Activity
                </Text>
                <Text allowFontScaling={false} style={styles.sectionCount}>
                    {filtered.length} record{filtered.length === 1 ? "" : "s"}
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={NAVY} />
                </View>
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadActivities({ soft: true })}
                            tintColor={NAVY}
                        />
                    }
                >
                    {filtered.map((item) => (
                        <ActivityCard
                            key={String(item.id)}
                            item={item}
                            onEdit={() => {
                                setEditing(item);
                                setFormOpen(true);
                                setOpenMenu(null);
                            }}
                            onDelete={() => setDeleteId(item.id)}
                        />
                    ))}
                    {filtered.length === 0 && (
                        <Text allowFontScaling={false} style={styles.emptyTxt}>
                            No activity logs found
                        </Text>
                    )}
                </ScrollView>
            )}

            <LogActivityModal
                key={editing?.id || "new"}
                visible={formOpen}
                initial={editing}
                supervisors={supervisors}
                defaultSupervisorId={defaultSupervisorId}
                saving={saving}
                onClose={() => {
                    setFormOpen(false);
                    setEditing(null);
                }}
                onSubmit={handleSubmit}
            />

            <MyAlert
                visible={!!deleteId}
                title="Delete Activity"
                message="Are you sure you want to delete this activity log?"
                textRight="Yes"
                textLeft="No"
                backgroundColor={NAVY}
                color={WHITE}
                onPressRight={confirmDelete}
                onPressLeft={() => setDeleteId(null)}
                onRequestClose={() => setDeleteId(null)}
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
                    duration={3000}
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
    banner: {
        marginHorizontal: 14,
        marginTop: 12,
        backgroundColor: "#F3F7FF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E6EEF8",
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    bannerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#E7F0FF",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    bannerIcon: {
        width: 18,
        height: 18,
    },
    bannerTxt: {
        flex: 1,
        color: "#64748B",
        fontSize: 12,
        lineHeight: 16,
        marginRight: 8,
    },
    logBtn: {
        backgroundColor: NAVY,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    logBtnTxt: {
        color: WHITE,
        fontSize: 12,
        fontWeight: "700",
    },
    filters: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 14,
        marginTop: 12,
        zIndex: 20,
    },
    filterCol: {
        marginRight: 8,
        zIndex: 20,
    },
    filterGrow: {
        flex: 1,
    },
    filterBtn: {
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    dateFilterBtn: {
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 10,
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
        fontSize: 12,
        fontWeight: "600",
    },
    filterTxtFlex: {
        flex: 1,
    },
    filterMenu: {
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        minWidth: 150,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingVertical: 4,
        elevation: 8,
        zIndex: 30,
    },
    dateMenu: {
        right: 0,
        left: undefined,
        width: 160,
    },
    sectionHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        color: NAVY,
        fontSize: 16,
        fontWeight: "700",
    },
    sectionCount: {
        color: GREY,
        fontSize: 12,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 14,
        paddingBottom: 24,
    },
    emptyTxt: {
        textAlign: "center",
        color: GREY,
        marginTop: 30,
    },
    card: {
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
    },
    dateCol: {
        width: 52,
        alignItems: "center",
        marginRight: 8,
    },
    dateDay: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "700",
        textAlign: "center",
    },
    dateYear: {
        color: GREY,
        fontSize: 11,
        marginTop: 1,
    },
    zoneBadge: {
        marginTop: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#EAF1FB",
        alignItems: "center",
        justifyContent: "center",
    },
    zoneLetter: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
    },
    zoneCode: {
        marginTop: 4,
        color: "#7C8BA1",
        fontSize: 10,
        fontWeight: "600",
    },
    cardMain: {
        flex: 1,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
    },
    nameRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        marginRight: 6,
    },
    avatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#EEF2F7",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
    },
    avatarTxt: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "700",
    },
    name: {
        flex: 1,
        color: NAVY,
        fontSize: 13,
        fontWeight: "700",
    },
    topActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusPill: {
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 4,
    },
    statusOn: {
        backgroundColor: "#E8F8EE",
    },
    statusDelay: {
        backgroundColor: "#FDECEC",
    },
    statusTxt: {
        fontSize: 11,
        fontWeight: "700",
    },
    statusOnTxt: {
        color: GREEN,
    },
    statusDelayTxt: {
        color: RED,
    },
    actionBtn: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: LIGHTGREY,
        marginLeft: 4,
    },
    actionIcon: {
        width: 14,
        height: 14,
    },
    deleteIcon: {
        tintColor: RED,
    },
    cardTitle: {
        marginTop: 6,
        color: NAVY,
        fontSize: 13.5,
        fontWeight: "700",
    },
    cardSub: {
        marginTop: 2,
        color: "#64748B",
        fontSize: 12,
        lineHeight: 16,
    },
    metaRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 10,
        flexShrink: 1,
    },
    metaIcon: {
        width: 12,
        height: 12,
        marginRight: 4,
    },
    metaStrong: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
        marginRight: 4,
    },
    metaMuted: {
        color: "#64748B",
        fontSize: 11,
        flexShrink: 1,
    },
    timeTxt: {
        marginLeft: "auto",
        color: GREY,
        fontSize: 11,
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
        maxHeight: SCREEN.height * 0.78,
        alignSelf: "center",
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
        paddingBottom: 8,
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
    dropWrap: {
        zIndex: 5,
    },
    dropField: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    dropFieldIcon: {
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
    menuTxt: {
        color: NAVY,
        fontSize: 13,
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
        backgroundColor: WHITE,
    },
    notesInput: {
        minHeight: 90,
        paddingTop: 10,
    },
    dateIcon: {
        width: 16,
        height: 16,
    },
    calendar: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 8,
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
        alignItems: "center",
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
        minWidth: 90,
        alignItems: "center",
        justifyContent: "center",
    },
    saveTxt: {
        color: WHITE,
        fontSize: 13,
        fontWeight: "700",
    },
});
