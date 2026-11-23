import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
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
    WHITE, BUTTON} from "../../../constant/color";
import {
    BANNER,
    LOCATION,
    ZONE,
    TITLE,
    DESCRIPTION,
    LONGITUTE,
    VIEW,
    DELETE,
    PHOTO,
} from "../../../constant/imagePath";
import {
    createFieldReport,
    deleteFieldReport,
    fetchFieldReports,
    markMineReports,
    toErrorText,
    toZoneCode,
} from "../../../services/reports/ReportsService";
import {
    ensureCameraPermission,
    ensureLocationPermission,
    requestAppPermissions,
} from "../../../utils/permissions";
import { getCurrentPosition, openCamera as launchDeviceCamera, ensureDeviceLocationOn } from "../../../utils/deviceServices";

const ZONES = ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F"];
const ZONE_FILTERS = ["All zones", ...ZONES];

const ZONE_COORDS = {
    "Zone A": { lat: "19.813410", lng: "85.831220", code: "ZA" },
    "Zone B": { lat: "19.820000", lng: "85.860000", code: "ZB" },
    "Zone C": { lat: "19.829000", lng: "85.870400", code: "ZC" },
    "Zone D": { lat: "19.866120", lng: "86.110450", code: "ZD" },
    "Zone E": { lat: "19.850000", lng: "85.950000", code: "ZE" },
    "Zone F": { lat: "19.840000", lng: "86.000000", code: "ZF" },
};

const FILTERS = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "mine", label: "Mine" },
];

const STATUS_META = {
    submitted: { label: "Submitted", bg: "#DBEAFE", fg: "#1D4ED8", icon: "✓" },
    completed: { label: "Completed", bg: "#16A34A", fg: WHITE, icon: "✓" },
    progress: { label: "In Progress", bg: "#DBEAFE", fg: "#1D4ED8", icon: "…" },
    pending: { label: "Pending", bg: "#FFEDD5", fg: "#C2410C", icon: "◷" },
};

const FilterFunnel = () => (
    <View style={styles.funnelWrap}>
        <View style={styles.funnelTop} />
        <View style={styles.funnelMid} />
        <View style={styles.funnelStem} />
    </View>
);

const PinIcon = ({ color = GREY, size = 10 }) => (
    <View style={{ width: size, height: size + 2, alignItems: "center" }}>
        <View
            style={{
                width: size * 0.7,
                height: size * 0.7,
                borderRadius: size * 0.4,
                borderWidth: 1.3,
                borderColor: color,
            }}
        />
        <View
            style={{
                width: 0,
                height: 0,
                marginTop: -1,
                borderLeftWidth: size * 0.28,
                borderRightWidth: size * 0.28,
                borderTopWidth: size * 0.35,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: color,
            }}
        />
    </View>
);

const FieldLabel = ({ icon, text }) => (
    <View style={styles.fieldLabelRow}>
        {icon ? (
            <Image source={icon} style={styles.fieldIcon} resizeMode="contain" />
        ) : null}
        <Text allowFontScaling={false} style={styles.fieldLabel}>
            {text}
        </Text>
    </View>
);

const SubmitReportModal = ({ visible, onClose, onSubmit, onToast }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [zone, setZone] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [zoneOpen, setZoneOpen] = useState(false);
    const [photoUri, setPhotoUri] = useState(null);
    const [gpsAccuracy, setGpsAccuracy] = useState("");
    const [gpsLoading, setGpsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setTitle("");
        setDescription("");
        setZone("");
        setLat("");
        setLng("");
        setZoneOpen(false);
        setPhotoUri(null);
        setGpsAccuracy("");
        setGpsLoading(false);
        setSubmitting(false);
    };

    const close = () => {
        reset();
        onClose();
    };

    const useGps = async () => {
        const ok = await ensureLocationPermission();
        if (!ok) {
            onToast?.("Location permission is required", "error");
            return;
        }
        setGpsLoading(true);
        try {
            // Shows system Turn-on dialog when device location is off
            const locationOn = await ensureDeviceLocationOn();
            if (!locationOn) {
                setGpsLoading(false);
                onToast?.("Please turn on device location", "error");
                return;
            }
        } catch (e) {
            setGpsLoading(false);
            onToast?.("Please turn on device location", "error");
            return;
        }

        getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude.toFixed(6));
                setLng(pos.coords.longitude.toFixed(6));
                if (pos.coords.accuracy != null) {
                    setGpsAccuracy(String(Math.round(pos.coords.accuracy)));
                }
                setGpsLoading(false);
                onToast?.("GPS location fetched", "success");
            },
            (err) => {
                setGpsLoading(false);
                onToast?.(
                    err?.message ||
                        "Unable to fetch GPS. Turn on device location.",
                    "error"
                );
            },
            { skipLocationPrompt: true }
        );
    };

    const useZoneRef = () => {
        const ref = ZONE_COORDS[zone];
        if (!ref) {
            onToast?.("Select a zone first", "error");
            return;
        }
        setLat(ref.lat);
        setLng(ref.lng);
        onToast?.("Zone reference coordinates applied", "success");
    };

    const handleOpenCamera = async () => {
        const camOk = await ensureCameraPermission();
        if (!camOk) {
            onToast?.("Camera permission is required", "error");
            return;
        }

        const locOk = await ensureLocationPermission();
        if (locOk && (!lat || !lng)) {
            getCurrentPosition(
                (pos) => {
                    setLat(pos.coords.latitude.toFixed(6));
                    setLng(pos.coords.longitude.toFixed(6));
                },
                () => {}
            );
        }

        launchDeviceCamera({}, (res) => {
            if (res?.didCancel) return;
            if (res?.errorCode) {
                onToast?.(
                    res?.errorMessage || "Camera error. Please try again.",
                    "error"
                );
                return;
            }
            const uri = res?.assets?.[0]?.uri;
            if (uri) {
                setPhotoUri(uri);
                onToast?.("Photo attached", "success");
            }
        });
    };

    const submit = async () => {
        if (submitting) return;
        if (description.trim().length < 5) {
            onToast?.("Description must be at least 5 characters", "error");
            return;
        }
        setSubmitting(true);
        try {
            const ok = await onSubmit({
                title: title.trim(),
                description: description.trim(),
                zone,
                lat,
                lng,
                gpsAccuracy,
                photoUri,
            });
            if (ok) reset();
        } finally {
            setSubmitting(false);
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.modalRoot} pointerEvents="box-none">
            <Pressable style={styles.modalBackdrop} onPress={close}>
                <Pressable style={styles.submitCard} onPress={() => {}}>
                    <View style={styles.submitHeader}>
                        <Text allowFontScaling={false} style={styles.submitTitle}>
                            Submit field report
                        </Text>
                        <TouchableOpacity onPress={close} hitSlop={10} style={styles.closeBtn}>
                            <Text allowFontScaling={false} style={styles.closeTxt}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.submitScroll}
                        contentContainerStyle={styles.submitBody}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.formField}>
                            <FieldLabel icon={TITLE} text="TITLE (OPTIONAL)" />
                            <TextInput
                                allowFontScaling={false}
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="e.g. Morning cleanup — Pipili"
                                placeholderTextColor={GREY}
                            />
                        </View>

                        <View style={styles.formField}>
                            <FieldLabel icon={DESCRIPTION} text="DESCRIPTION" />
                            <TextInput
                                allowFontScaling={false}
                                style={styles.textArea}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="What was done, observations, manpower, issues seen..."
                                placeholderTextColor={GREY}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={[styles.formField, zoneOpen && styles.formFieldOpen]}>
                            <FieldLabel icon={ZONE} text="ZONE" />
                            <TouchableOpacity
                                style={[styles.selectBox, zoneOpen && styles.selectFocus]}
                                activeOpacity={0.85}
                                onPress={() => setZoneOpen((v) => !v)}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        styles.selectTxt,
                                        !zone && styles.selectPlaceholder,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {zone || "Select zone..."}
                                </Text>
                                <Text allowFontScaling={false} style={styles.selectArrow}>
                                    ▾
                                </Text>
                            </TouchableOpacity>
                            {zoneOpen && (
                                <View style={styles.dropMenu}>
                                    {ZONES.map((z) => (
                                        <TouchableOpacity
                                            key={z}
                                            style={styles.dropItem}
                                            onPress={() => {
                                                setZone(z);
                                                setZoneOpen(false);
                                            }}
                                        >
                                            <Text
                                                allowFontScaling={false}
                                                style={styles.dropItemTxt}
                                            >
                                                {z}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.formField}>
                            <FieldLabel icon={LONGITUTE} text="LATITUDE & LONGITUDE" />
                            <View style={styles.coordRow}>
                                <TextInput
                                    allowFontScaling={false}
                                    style={[styles.input, styles.coordInput]}
                                    value={lat}
                                    onChangeText={setLat}
                                    placeholder="19.85..."
                                    placeholderTextColor={GREY}
                                    keyboardType="decimal-pad"
                                />
                                <TextInput
                                    allowFontScaling={false}
                                    style={[styles.input, styles.coordInput]}
                                    value={lng}
                                    onChangeText={setLng}
                                    placeholder="85.96..."
                                    placeholderTextColor={GREY}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={styles.gpsRow}>
                                <TouchableOpacity
                                    style={styles.gpsBtn}
                                    activeOpacity={0.85}
                                    onPress={useGps}
                                    disabled={gpsLoading}
                                >
                                    <Image
                                        source={LOCATION}
                                        style={styles.gpsIcon}
                                        resizeMode="contain"
                                    />
                                    <Text allowFontScaling={false} style={styles.gpsTxt}>
                                        {gpsLoading ? "Fetching..." : "Use my GPS"}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.gpsBtn}
                                    activeOpacity={0.85}
                                    onPress={useZoneRef}
                                >
                                    <Image
                                        source={ZONE}
                                        style={styles.gpsIcon}
                                        resizeMode="contain"
                                    />
                                    <Text allowFontScaling={false} style={styles.gpsTxt}>
                                        Use zone reference
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.formField}>
                            <FieldLabel icon={PHOTO} text="PHOTO (GEO-STAMPED)" />
                            <TouchableOpacity
                                style={styles.photoBox}
                                activeOpacity={0.85}
                                onPress={handleOpenCamera}
                            >
                                {photoUri ? (
                                    <Image
                                        source={{ uri: photoUri }}
                                        style={styles.photoPreview}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <>
                                        <Image
                                            source={PHOTO}
                                            style={styles.photoIcon}
                                            resizeMode="contain"
                                        />
                                        <Text allowFontScaling={false} style={styles.photoTxt}>
                                            Tap to open camera (JPG/PNG, max 5 MB)
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    <View style={styles.submitFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.85}
                            onPress={close}
                        >
                            <Text allowFontScaling={false} style={styles.cancelTxt}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
                            activeOpacity={0.85}
                            onPress={submit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <>
                                    <Image
                                        source={PHOTO}
                                        style={styles.primaryIcon}
                                        resizeMode="contain"
                                    />
                                    <Text allowFontScaling={false} style={styles.primaryTxt}>
                                        Submit report
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </View>
    );
};

const ReportCard = ({ item, onView, onDelete }) => {
    const st = STATUS_META[item.status] || STATUS_META.submitted;
    const thumbSource = item.image || (item.photoUrl ? { uri: item.photoUrl } : BANNER);
    return (
        <View style={styles.card}>
            <View style={styles.thumbWrap}>
                <Image source={thumbSource} style={styles.thumb} resizeMode="cover" />
                <View style={styles.zoneBadge}>
                    <Text allowFontScaling={false} style={styles.zoneBadgeTxt}>
                        {item.zone}
                    </Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                    <Text allowFontScaling={false} style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <View style={styles.metaTop}>
                        <Text allowFontScaling={false} style={styles.agoTxt}>
                            {item.ago}
                        </Text>
                        <Text allowFontScaling={false} style={styles.mediaTxt}>
                            🖼 {item.media}
                        </Text>
                    </View>
                </View>

                <Text allowFontScaling={false} style={styles.cardDesc} numberOfLines={2}>
                    {item.desc}
                </Text>

                <View style={styles.cardBottom}>
                    <View style={styles.reporterRow}>
                        <Text allowFontScaling={false} style={styles.personIcon}>
                            👤
                        </Text>
                        <Text allowFontScaling={false} style={styles.reporterTxt} numberOfLines={1}>
                            {item.reporter}
                        </Text>
                    </View>
                    <View style={styles.coordsRow}>
                        <PinIcon color={GREY} size={9} />
                        <Text allowFontScaling={false} style={styles.coordsTxt}>
                            {item.coords}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardActions}>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                        <Text allowFontScaling={false} style={[styles.statusTxt, { color: st.fg }]}>
                            {st.icon} {st.label}
                        </Text>
                    </View>
                    <View style={styles.iconActions}>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            activeOpacity={0.8}
                            onPress={onView}
                        >
                            <Image source={VIEW} style={styles.actionIcon} resizeMode="contain" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconBtn}
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
            </View>
        </View>
    );
};

const FieldReportScreen = () => {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [zoneFilter, setZoneFilter] = useState("All zones");
    const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitOpen, setSubmitOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [toastMessage, setToastMessage] = useState({
        visible: false,
        msg: "",
        type: "",
    });

    const showToast = useCallback((msg, type) => {
        setToastMessage({ visible: true, msg: toErrorText(msg, String(msg || "")), type });
    }, []);

    const loadReports = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const zoneCode = toZoneCode(zoneFilter);
                const res = await fetchFieldReports({
                    page: 1,
                    limit: 50,
                    zoneCode,
                });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setReports([]);
                    return;
                }
                const marked = await markMineReports(res.data || []);
                setReports(marked);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load reports"), "error");
                setReports([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [zoneFilter, showToast]
    );

    useEffect(() => {
        requestAppPermissions();
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const counts = useMemo(
        () => ({
            all: reports.length,
            today: reports.filter((r) => r.period === "today").length,
            week: reports.filter((r) => r.period === "week" || r.period === "today").length,
            mine: reports.filter((r) => r.mine).length,
        }),
        [reports]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return reports.filter((r) => {
            const matchFilter =
                filter === "all" ||
                (filter === "today" && r.period === "today") ||
                (filter === "week" && (r.period === "week" || r.period === "today")) ||
                (filter === "mine" && r.mine);
            const matchSearch =
                !q ||
                String(r.title || "").toLowerCase().includes(q) ||
                String(r.desc || "").toLowerCase().includes(q) ||
                String(r.reporter || "").toLowerCase().includes(q) ||
                String(r.supervisor || "").toLowerCase().includes(q) ||
                String(r.coords || "").toLowerCase().includes(q) ||
                String(r.zone || "").toLowerCase().includes(q);
            return matchFilter && matchSearch;
        });
    }, [reports, search, filter]);

    const confirmDelete = async () => {
        if (!deleteId) return;
        const id = deleteId;
        setDeleteId(null);
        try {
            const res = await deleteFieldReport(id);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setReports((prev) => prev.filter((r) => String(r.id) !== String(id)));
            showToast("Report deleted successfully", "success");
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to delete report"), "error");
        }
    };

    const handleSubmit = async (data) => {
        try {
            const res = await createFieldReport({
                title: data.title,
                description: data.description,
                latitude: data.lat,
                longitude: data.lng,
                gpsAccuracy: data.gpsAccuracy,
                photoUri: data.photoUri,
            });
            if (!res.ok) {
                showToast(res.message, "error");
                return false;
            }
            setSubmitOpen(false);
            showToast("Field report submitted successfully", "success");
            await loadReports({ soft: true });
            return true;
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to submit report"), "error");
            return false;
        }
    };

    return (
        <View style={styles.root}>
            <MyHeader
                title="Field Reports & Mobile Submissions"
                subtitle=""
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <View style={styles.toolbar}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Text allowFontScaling={false} style={styles.searchIcon}>
                            🔍
                        </Text>
                        <TextInput
                            allowFontScaling={false}
                            style={styles.searchInput}
                            placeholder="Search reports, location or reporter..."
                            placeholderTextColor={GREY}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85}>
                        <FilterFunnel />
                    </TouchableOpacity>
                </View>

                <View style={[styles.actionRow, zoneMenuOpen && styles.actionRowOpen]}>
                    <View style={styles.zoneDropWrap}>
                        <TouchableOpacity
                            style={styles.zoneDrop}
                            activeOpacity={0.85}
                            onPress={() => setZoneMenuOpen((v) => !v)}
                        >
                            <Image
                                source={ZONE}
                                style={styles.zoneDropIcon}
                                resizeMode="contain"
                            />
                            <Text
                                allowFontScaling={false}
                                style={styles.zoneDropTxt}
                                numberOfLines={1}
                            >
                                {zoneFilter}
                            </Text>
                            <Text allowFontScaling={false} style={styles.zoneDropArrow}>
                                ▾
                            </Text>
                        </TouchableOpacity>
                        {zoneMenuOpen && (
                            <View style={styles.zoneMenu}>
                                {ZONE_FILTERS.map((z) => (
                                    <TouchableOpacity
                                        key={z}
                                        style={styles.dropItem}
                                        onPress={() => {
                                            setZoneFilter(z);
                                            setZoneMenuOpen(false);
                                        }}
                                    >
                                        <Text
                                            allowFontScaling={false}
                                            style={styles.dropItemTxt}
                                        >
                                            {z}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.newBtn}
                        activeOpacity={0.85}
                        onPress={() => setSubmitOpen(true)}
                    >
                        <Text allowFontScaling={false} style={styles.newBtnTxt}>
                            + New Report
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                >
                    {FILTERS.map((f) => {
                        const active = filter === f.key;
                        return (
                            <TouchableOpacity
                                key={f.key}
                                activeOpacity={0.85}
                                onPress={() => setFilter(f.key)}
                                style={[styles.chip, active && styles.chipActive]}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        styles.chipTxt,
                                        active && styles.chipTxtActive,
                                    ]}
                                >
                                    {f.label}
                                </Text>
                                <View
                                    style={[
                                        styles.chipCount,
                                        active && styles.chipCountActive,
                                    ]}
                                >
                                    <Text
                                        allowFontScaling={false}
                                        style={[
                                            styles.chipCountTxt,
                                            active && styles.chipCountTxtActive,
                                        ]}
                                    >
                                        {counts[f.key]}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading && !reports.length ? (
                <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadReports({ soft: true })}
                        />
                    }
                    renderItem={({ item }) => (
                        <ReportCard
                            item={item}
                            onView={() =>
                                showToast(
                                    `${item.title}\n${item.supervisor !== "—" ? `Supervisor: ${item.supervisor}` : ""}\nGPS: ${item.coords}`,
                                    "success"
                                )
                            }
                            onDelete={() => setDeleteId(item.id)}
                        />
                    )}
                    ListEmptyComponent={
                        <Text allowFontScaling={false} style={styles.emptyTxt}>
                            No field reports found
                        </Text>
                    }
                />
            )}

            <SubmitReportModal
                visible={submitOpen}
                onClose={() => setSubmitOpen(false)}
                onSubmit={handleSubmit}
                onToast={showToast}
            />

            <MyAlert
                visible={!!deleteId}
                title="Delete Report"
                message="Are you sure you want to delete this field report?"
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
                    bacgroundColor={
                        toastMessage.type === "success" ? GREEN : "#DC2626"
                    }
                    textColor={WHITE}
                    type={toastMessage.type}
                    duration={3000}
                    position="bottom"
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F5F7FA",
    },
    toolbar: {
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    searchBox: {
        flex: 1,
        height: 36,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
    },
    searchIcon: {
        fontSize: 11,
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        color: NAVY,
        fontSize: 11,
        paddingVertical: 0,
    },
    filterBtn: {
        width: 36,
        height: 36,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
        backgroundColor: WHITE,
    },
    funnelWrap: { alignItems: "center" },
    funnelTop: {
        width: 13,
        height: 2.5,
        backgroundColor: NAVY,
        borderRadius: 1,
    },
    funnelMid: {
        width: 0,
        height: 0,
        marginTop: 1,
        borderLeftWidth: 6.5,
        borderRightWidth: 6.5,
        borderTopWidth: 5.5,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: NAVY,
    },
    funnelStem: {
        width: 2.5,
        height: 5,
        backgroundColor: NAVY,
        marginTop: -1,
        borderRadius: 1,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 8,
        gap: 8,
        zIndex: 1,
    },
    actionRowOpen: {
        zIndex: 40,
        elevation: 40,
        marginBottom: 8,
    },
    zoneDropWrap: {
        flex: 1,
        zIndex: 2,
    },
    zoneDrop: {
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
    },
    zoneDropIcon: {
        width: 12,
        height: 12,
        tintColor: NAVY,
        marginRight: 6,
    },
    zoneDropTxt: {
        flex: 1,
        color: NAVY,
        fontSize: 11,
        fontWeight: "600",
    },
    zoneDropArrow: {
        color: GREY,
        fontSize: 10,
    },
    zoneMenu: {
        position: "absolute",
        top: 36,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        zIndex: 50,
        elevation: 8,
        overflow: "hidden",
        maxHeight: 200,
    },
    newBtn: {
        height: 34,
        borderRadius: 8,
        backgroundColor: NAVY,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "flex-start",
    },
    newBtnTxt: {
        color: WHITE,
        fontSize: 11,
        fontWeight: "700",
    },
    chipsRow: {
        paddingRight: 4,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        backgroundColor: "#EEF2F7",
    },
    chipActive: {
        backgroundColor: NAVY,
    },
    chipTxt: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "700",
    },
    chipTxtActive: {
        color: WHITE,
    },
    chipCount: {
        marginLeft: 5,
        minWidth: 16,
        height: 15,
        borderRadius: 8,
        backgroundColor: "rgba(11,31,58,0.12)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    chipCountActive: {
        backgroundColor: "rgba(255,255,255,0.22)",
    },
    chipCountTxt: {
        color: NAVY,
        fontSize: 9,
        fontWeight: "800",
    },
    chipCountTxtActive: {
        color: WHITE,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 28,
    },
    card: {
        flexDirection: "row",
        backgroundColor: WHITE,
        borderRadius: 11,
        padding: 9,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#EEF1F5",
    },
    thumbWrap: {
        width: 56,
        height: 56,
        marginRight: 9,
    },
    thumb: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: LIGHTGREY,
    },
    zoneBadge: {
        position: "absolute",
        left: 3,
        bottom: 3,
        minWidth: 22,
        height: 18,
        borderRadius: 9,
        backgroundColor: "rgba(11,31,58,0.85)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    zoneBadgeTxt: {
        color: WHITE,
        fontSize: 8,
        fontWeight: "800",
    },
    cardBody: {
        flex: 1,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 3,
    },
    cardTitle: {
        flex: 1,
        color: NAVY,
        fontSize: 12,
        fontWeight: "800",
        paddingRight: 6,
    },
    metaTop: {
        alignItems: "flex-end",
    },
    agoTxt: {
        color: GREY,
        fontSize: 9,
        fontWeight: "600",
    },
    mediaTxt: {
        color: GREY,
        fontSize: 9,
        marginTop: 2,
    },
    cardDesc: {
        color: "#6B7280",
        fontSize: 10,
        lineHeight: 14,
        marginBottom: 5,
    },
    cardBottom: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    reporterRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        paddingRight: 6,
    },
    personIcon: {
        fontSize: 10,
        marginRight: 3,
    },
    reporterTxt: {
        color: GREY,
        fontSize: 10,
        fontWeight: "500",
        flex: 1,
    },
    coordsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    coordsTxt: {
        color: GREY,
        fontSize: 9,
        marginLeft: 3,
        fontWeight: "500",
    },
    cardActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    statusPill: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusTxt: {
        fontSize: 9,
        fontWeight: "800",
    },
    iconActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: LIGHTGREY,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 6,
    },
    actionIcon: {
        width: 14,
        height: 14,
        tintColor: NAVY,
    },
    deleteIcon: {
        tintColor: "#DC2626",
    },
    emptyTxt: {
        textAlign: "center",
        color: GREY,
        fontSize: 12,
        marginTop: 40,
    },

    /* Submit overlay (View, not RN Modal — so system location dialog can show) */
    modalRoot: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        elevation: 100,
        justifyContent: "center",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    submitCard: {
        width: "100%",
        maxWidth: 420,
        maxHeight: "90%",
        backgroundColor: WHITE,
        borderRadius: 12,
        overflow: "hidden",
        elevation: 10,
    },
    submitHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    submitTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
        flex: 1,
    },
    closeBtn: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    closeTxt: {
        color: "#A0AAB8",
        fontSize: 22,
        lineHeight: 24,
    },
    submitScroll: {
        maxHeight: 420,
    },
    submitBody: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 8,
    },
    formField: {
        marginBottom: 11,
        zIndex: 1,
    },
    formFieldOpen: {
        zIndex: 40,
        elevation: 40,
    },
    fieldLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 5,
    },
    fieldIcon: {
        width: 12,
        height: 12,
        marginRight: 5,
        tintColor: GREY,
    },
    fieldLabel: {
        color: GREY,
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 0.4,
    },
    input: {
        height: 36,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        paddingHorizontal: 10,
        color: NAVY,
        fontSize: 12,
        backgroundColor: WHITE,
    },
    textArea: {
        minHeight: 78,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 8,
        color: NAVY,
        fontSize: 12,
        backgroundColor: WHITE,
    },
    selectBox: {
        height: 36,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
    },
    selectFocus: {
        borderColor: "#93C5FD",
    },
    selectTxt: {
        flex: 1,
        color: NAVY,
        fontSize: 12,
        fontWeight: "500",
    },
    selectPlaceholder: {
        color: GREY,
        fontWeight: "400",
    },
    selectArrow: {
        color: GREY,
        fontSize: 11,
    },
    dropMenu: {
        position: "absolute",
        top: 56,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        zIndex: 50,
        elevation: 8,
        overflow: "hidden",
    },
    dropItem: {
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F4F8",
    },
    dropItemTxt: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "500",
    },
    coordRow: {
        flexDirection: "row",
        gap: 8,
    },
    coordInput: {
        flex: 1,
    },
    gpsRow: {
        flexDirection: "row",
        marginTop: 8,
        gap: 8,
    },
    gpsBtn: {
        flex: 1,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    gpsIcon: {
        width: 12,
        height: 12,
        marginRight: 5,
        tintColor: NAVY,
    },
    gpsTxt: {
        color: NAVY,
        fontSize: 10,
        fontWeight: "700",
    },
    photoBox: {
        minHeight: 72,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: "#CBD5E1",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#FAFBFC",
        overflow: "hidden",
    },
    photoIcon: {
        width: 22,
        height: 22,
        tintColor: GREY,
        marginBottom: 6,
    },
    photoPreview: {
        width: "100%",
        height: 120,
        borderRadius: 8,
    },
    photoTxt: {
        color: GREY,
        fontSize: 10,
        textAlign: "center",
        fontWeight: "500",
    },
    submitFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#EEF1F5",
        gap: 8,
    },
    cancelBtn: {
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelTxt: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
    },
    primaryBtn: {
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: BUTTON,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    primaryIcon: {
        width: 13,
        height: 13,
        tintColor: WHITE,
        marginRight: 6,
    },
    primaryTxt: {
        color: WHITE,
        fontSize: 12,
        fontWeight: "700",
    },
});

export default FieldReportScreen;
