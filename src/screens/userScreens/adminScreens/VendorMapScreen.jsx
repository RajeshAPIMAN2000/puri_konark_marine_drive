import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
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
import {
    WHITE,
    NAVY,
    GREY,
    LIGHTGREY,
    GREEN,
    ORANGE,
    BLUE,
    TEAL,
    PURPLE,
    PINK,
} from "../../../constant/color";
import StaticCrmMap from "../../../components/map/StaticCrmMap";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    fetchImportIssues,
    fixImportIssueCoordinates,
    isValidOdishaCoords,
    resolveImportIssue,
    toErrorText,
} from "../../../services/vendor/ImportIssuesService";
import {
    fetchVendors,
    fetchVendorsMap,
} from "../../../services/vendor/VendorService";

const { height: SCREEN_H } = Dimensions.get("window");
const STATUS_TOP = StatusBar.currentHeight || (Platform.OS === "ios" ? 44 : 0);

const FILTER_BASE = [
    { key: "all", label: "All", type: "all" },
    { key: "verified", label: "Verified", type: "verified" },
    { key: "unverified", label: "Unverified", type: "unverified" },
    { key: "flagged", label: "Flagged", type: "flagged" },
    { key: "import", label: "Import Issues", type: "import" },
];

const PhoneIcon = () => (
    <View style={styles.phoneIcon}>
        <View style={styles.phoneBody} />
    </View>
);

const parseCoords = (coords) => {
    const parts = String(coords || "").split(",").map((v) => parseFloat(v.trim()));
    if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
    return { latitude: parts[0], longitude: parts[1] };
};

const VendorMapScreen = () => {
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [vendors, setVendors] = useState([]);
    const [flaggedCount, setFlaggedCount] = useState(0);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [issues, setIssues] = useState([]);
    const [openIssueCount, setOpenIssueCount] = useState(0);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [issuesRefreshing, setIssuesRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [coordIssue, setCoordIssue] = useState(null);
    const [coordLat, setCoordLat] = useState("");
    const [coordLng, setCoordLng] = useState("");
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });

    const showToast = useCallback((message, type = "error") => {
        setToast({
            visible: true,
            message: toErrorText(
                message,
                type === "success" ? "Done" : "Something went wrong"
            ),
            type,
        });
    }, []);

    const loadVendorsMap = useCallback(async () => {
        setVendorsLoading(true);
        try {
            const [mapRes, listRes] = await Promise.all([
                fetchVendorsMap(),
                fetchVendors({ page: 1, limit: 100 }),
            ]);
            const list =
                mapRes.ok && mapRes.vendors?.length
                    ? mapRes.vendors
                    : listRes.ok
                      ? listRes.data || []
                      : [];
            if (!mapRes.ok && !listRes.ok) {
                showToast(mapRes.message || listRes.message, "error");
            }
            setVendors(
                list.map((v) => ({
                    id: String(v.id),
                    initial: v.initial || "V",
                    color: v.color || BLUE,
                    name: v.shopName || v.name,
                    place: v.roadSegment || v.zone || v.supervisorName || "—",
                    coords: v.coords || "—",
                    shops: 1,
                    verified: v.status === "active",
                    flagged: !!v.flagged,
                    status: v.status,
                    latitude: v.latitude,
                    longitude: v.longitude,
                    owner: v.ownerName,
                    mobile: v.mobileNumber,
                }))
            );
            setFlaggedCount(
                Number(
                    mapRes.flaggedCount ||
                        list.filter((v) => v.flagged || v.status === "unverified").length
                )
            );
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to load vendors"), "error");
        } finally {
            setVendorsLoading(false);
        }
    }, [showToast]);

    const loadImportIssues = useCallback(
        async ({ soft = false } = {}) => {
            if (!soft) setIssuesLoading(true);
            try {
                const res = await fetchImportIssues({
                    status: "open",
                    page: 1,
                    limit: 30,
                });
                if (!res.ok) {
                    showToast(res.message || res.result, "error");
                    setIssues([]);
                    return;
                }
                setIssues(res.data || []);
                setOpenIssueCount((res.data || []).filter((i) => i.isOpen).length);
            } catch (e) {
                showToast(
                    toErrorText(e?.message || e, "Failed to load import issues"),
                    "error"
                );
            } finally {
                setIssuesLoading(false);
                setIssuesRefreshing(false);
            }
        },
        [showToast]
    );

    useEffect(() => {
        loadVendorsMap();
        loadImportIssues();
    }, [loadImportIssues, loadVendorsMap]);

    useEffect(() => {
        if (activeFilter === "import") {
            loadImportIssues();
        }
    }, [activeFilter, loadImportIssues]);

    const verifiedCount = vendors.filter((v) => v.verified).length;
    const unverifiedCount = vendors.filter((v) => !v.verified).length;

    const filteredVendors = vendors.filter((v) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
            !q ||
            String(v.name || "").toLowerCase().includes(q) ||
            String(v.place || "").toLowerCase().includes(q) ||
            String(v.owner || "").toLowerCase().includes(q) ||
            String(v.mobile || "").includes(q);
        if (!matchesSearch) return false;
        if (activeFilter === "verified") return v.verified;
        if (activeFilter === "unverified") return !v.verified;
        if (activeFilter === "flagged") return v.flagged || !v.verified;
        if (activeFilter === "import") return false;
        return true;
    });

    const filteredIssues = issues.filter((item) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            String(item.name || "").toLowerCase().includes(q) ||
            String(item.supervisorName || "").toLowerCase().includes(q) ||
            String(item.zoneCode || "").toLowerCase().includes(q) ||
            String(item.type || "").toLowerCase().includes(q)
        );
    });

    const onResolve = async (item) => {
        if (!item?.id || saving) return;
        setSaving(true);
        try {
            const res = await resolveImportIssue(item.id);
            if (!res.ok) {
                showToast(res.message || res.result, "error");
                return;
            }
            showToast("Import issue resolved", "success");
            await loadImportIssues({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to resolve"), "error");
        } finally {
            setSaving(false);
        }
    };

    const openFixCoords = (item) => {
        setCoordIssue(item);
        setCoordLat(
            item?.latitude != null && Number.isFinite(item.latitude)
                ? String(item.latitude)
                : ""
        );
        setCoordLng(
            item?.longitude != null && Number.isFinite(item.longitude)
                ? String(item.longitude)
                : ""
        );
    };

    const onFixCoords = async () => {
        if (!coordIssue?.id || saving) return;
        if (!isValidOdishaCoords(coordLat, coordLng)) {
            showToast(
                "Coordinates must be within Odisha (lat 17.5–22.5, lng 81.5–87.5)",
                "error"
            );
            return;
        }
        setSaving(true);
        try {
            const res = await fixImportIssueCoordinates(
                coordIssue.id,
                coordLat,
                coordLng
            );
            if (!res.ok) {
                showToast(res.message || res.result, "error");
                return;
            }
            showToast("Coordinates fixed · vendor activated", "success");
            setCoordIssue(null);
            await loadImportIssues({ soft: true });
        } catch (e) {
            showToast(
                toErrorText(e?.message || e, "Failed to fix coordinates"),
                "error"
            );
        } finally {
            setSaving(false);
        }
    };

    const renderVendor = ({ item }) => (
        <View style={styles.vendorRow}>
            <View style={[styles.avatar, { backgroundColor: item.color }]}>
                <Text allowFontScaling={false} style={styles.avatarTxt}>
                    {item.initial}
                </Text>
            </View>
            <View style={styles.vendorInfo}>
                <Text allowFontScaling={false} style={styles.vendorName} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text allowFontScaling={false} style={styles.vendorPlace} numberOfLines={1}>
                    {item.place}
                </Text>
                <Text allowFontScaling={false} style={styles.vendorCoords}>
                    {item.coords}
                </Text>
            </View>
            <View style={styles.vendorMeta}>
                <View style={styles.shopsPill}>
                    <Text allowFontScaling={false} style={styles.shopsTxt}>
                        {item.shops} shops
                    </Text>
                </View>
                <Text
                    allowFontScaling={false}
                    style={[
                        styles.statusTxt,
                        { color: item.verified ? GREEN : ORANGE },
                    ]}
                >
                    {item.verified ? "✓ Verified" : "⚠ Unverified"}
                </Text>
            </View>
            <TouchableOpacity style={styles.callBtn} activeOpacity={0.8}>
                <PhoneIcon />
            </TouchableOpacity>
        </View>
    );

    const renderIssue = ({ item }) => (
        <View style={styles.issueRow}>
            <View style={[styles.avatar, { backgroundColor: NAVY }]}>
                <Text allowFontScaling={false} style={styles.avatarTxt}>
                    {toErrorText(item.zone, "?").slice(0, 1)}
                </Text>
            </View>
            <View style={styles.vendorInfo}>
                <View style={styles.issueTop}>
                    <Text allowFontScaling={false} style={styles.vendorName} numberOfLines={1}>
                        {toErrorText(item.name, "Vendor")}
                    </Text>
                    <Text
                        allowFontScaling={false}
                        style={[
                            styles.issueStatus,
                            { color: item.isOpen ? ORANGE : GREEN },
                        ]}
                    >
                        {item.isOpen ? "open" : "resolved"}
                    </Text>
                </View>
                <Text allowFontScaling={false} style={styles.issueType}>
                    {toErrorText(item.type, "Import issue")}
                </Text>
                <Text allowFontScaling={false} style={styles.vendorPlace} numberOfLines={1}>
                    {toErrorText(item.supervisorName, "—")} ·{" "}
                    {toErrorText(item.zoneCode, "—")}
                </Text>
                <Text allowFontScaling={false} style={styles.vendorCoords} numberOfLines={1}>
                    {toErrorText(item.location, "--, --")}
                </Text>
                <Text allowFontScaling={false} style={styles.issueDetail} numberOfLines={2}>
                    {toErrorText(item.detail, "")}
                </Text>
                {item.isOpen ? (
                    <View style={styles.issueActions}>
                        {item.needsCoords ? (
                            <TouchableOpacity
                                style={styles.issueBtn}
                                disabled={saving}
                                onPress={() => openFixCoords(item)}
                            >
                                <Text allowFontScaling={false} style={styles.issueBtnTxt}>
                                    Fix coordinates
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={[styles.issueBtn, styles.issueBtnResolve]}
                            disabled={saving}
                            onPress={() => onResolve(item)}
                        >
                            <Text allowFontScaling={false} style={styles.issueBtnTxt}>
                                Mark resolved
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>
        </View>
    );

    const filters = FILTER_BASE.map((f) => {
        if (f.key === "all") return { ...f, label: `All (${vendors.length})` };
        if (f.key === "verified") return { ...f, label: `Verified (${verifiedCount})` };
        if (f.key === "unverified")
            return { ...f, label: `Unverified (${unverifiedCount})` };
        if (f.key === "flagged") return { ...f, label: `Flagged (${flaggedCount})` };
        if (f.key === "import")
            return { ...f, label: `Import Issues (${openIssueCount})` };
        return f;
    });

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={WHITE} translucent />

            {/* Header — title only (no menu / notification) */}
            <View style={[styles.header, { paddingTop: STATUS_TOP + 8 }]}>
                <Text allowFontScaling={false} style={styles.title}>
                    PURI-KONARK MARINE DRIVE
                </Text>
                <Text allowFontScaling={false} style={styles.subtitle}>
                    Bhudan Chhak to Chandrabhaga & beyond
                </Text>

                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Text allowFontScaling={false} style={styles.searchIcon}>
                            🔍
                        </Text>
                        <TextInput
                            allowFontScaling={false}
                            style={styles.searchInput}
                            placeholder={
                                activeFilter === "import"
                                    ? "Search import issue..."
                                    : "Search shop or owner..."
                            }
                            placeholderTextColor={GREY}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                >
                    {filters.map((f) => {
                        const active = activeFilter === f.key;
                        return (
                            <TouchableOpacity
                                key={f.key}
                                activeOpacity={0.85}
                                onPress={() => setActiveFilter(f.key)}
                                style={[
                                    styles.chip,
                                    f.type === "all" && !active && styles.chipAllIdle,
                                    f.type === "all" && active && styles.chipAllActive,
                                    f.type === "verified" && styles.chipVerified,
                                    f.type === "unverified" && styles.chipUnverified,
                                    f.type === "flagged" && styles.chipFlagged,
                                    f.type === "import" && styles.chipImport,
                                    f.type === "import" && active && styles.chipImportActive,
                                ]}
                            >
                                {f.type === "verified" && <View style={styles.dotGreen} />}
                                {f.type === "unverified" && <View style={styles.dotOrange} />}
                                {f.type === "flagged" && (
                                    <Text allowFontScaling={false} style={styles.flagIcon}>
                                        ⚠
                                    </Text>
                                )}
                                {f.type === "import" && (
                                    <Text allowFontScaling={false} style={styles.flagIcon}>
                                        ☰
                                    </Text>
                                )}
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        styles.chipTxt,
                                        f.type === "all" && active && styles.chipTxtWhite,
                                        f.type === "verified" && { color: "#4B5563" },
                                        f.type === "unverified" && { color: "#4B5563" },
                                        f.type === "flagged" && { color: ORANGE },
                                        f.type === "import" && {
                                            color: active ? WHITE : NAVY,
                                        },
                                    ]}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* MapLibre native map */}
            <View style={styles.mapWrap}>
                <StaticCrmMap
                    style={styles.map}
                    polygons={[
                        {
                            id: "corridor",
                            coordinates: [
                                [19.95, 85.78],
                                [19.95, 86.12],
                                [19.8, 86.12],
                                [19.8, 85.78],
                            ],
                            color: "#DC2626",
                            fillColor: "#DC2626",
                            fillOpacity: 0.04,
                            dashArray: "8 6",
                            weight: 2,
                        },
                    ]}
                    markers={
                        activeFilter === "import"
                            ? filteredIssues
                                  .filter(
                                      (i) =>
                                          Number.isFinite(i.latitude) &&
                                          Number.isFinite(i.longitude)
                                  )
                                  .map((i) => ({
                                      id: String(i.id),
                                      latitude: i.latitude,
                                      longitude: i.longitude,
                                      label: "!",
                                      color: ORANGE,
                                  }))
                            : filteredVendors
                                  .map((v) => {
                                      const lat = Number.isFinite(v.latitude)
                                          ? v.latitude
                                          : parseCoords(v.coords)?.latitude;
                                      const lng = Number.isFinite(v.longitude)
                                          ? v.longitude
                                          : parseCoords(v.coords)?.longitude;
                                      if (!Number.isFinite(lat) || !Number.isFinite(lng))
                                          return null;
                                      return {
                                          id: v.id,
                                          latitude: lat,
                                          longitude: lng,
                                          label: v.initial,
                                          color: v.color,
                                      };
                                  })
                                  .filter(Boolean)
                    }
                    showZoom
                />
                <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text allowFontScaling={false} style={styles.liveTxt}>
                        Live
                    </Text>
                </View>
            </View>

            {/* Vendors / Import issues sheet */}
            <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                    <Text allowFontScaling={false} style={styles.sheetTitle}>
                        {activeFilter === "import"
                            ? `Vendor Import Issues (${filteredIssues.length})`
                            : `Vendors Nearby (${filteredVendors.length})`}
                    </Text>
                    <Text allowFontScaling={false} style={styles.sortTxt}>
                        {activeFilter === "import" ? "Open · Review" : "Sort by: Nearest ▾"}
                    </Text>
                </View>

                {activeFilter === "import" ? (
                    issuesLoading && !issuesRefreshing ? (
                        <View style={styles.issueLoader}>
                            <ActivityIndicator color={NAVY} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredIssues}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={renderIssue}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                            refreshControl={
                                <RefreshControl
                                    refreshing={issuesRefreshing}
                                    onRefresh={() => {
                                        setIssuesRefreshing(true);
                                        loadImportIssues({ soft: true });
                                    }}
                                    tintColor={NAVY}
                                />
                            }
                            ListEmptyComponent={
                                <Text allowFontScaling={false} style={styles.emptyTxt}>
                                    No import issues found
                                </Text>
                            }
                        />
                    )
                ) : vendorsLoading ? (
                    <View style={styles.issueLoader}>
                        <ActivityIndicator color={NAVY} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredVendors}
                        keyExtractor={(item) => item.id}
                        renderItem={renderVendor}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={vendorsLoading}
                                onRefresh={loadVendorsMap}
                                tintColor={NAVY}
                            />
                        }
                        ListEmptyComponent={
                            <Text allowFontScaling={false} style={styles.emptyTxt}>
                                No vendors found
                            </Text>
                        }
                    />
                )}
            </View>

            <Modal
                visible={!!coordIssue}
                transparent
                animationType="fade"
                onRequestClose={() => setCoordIssue(null)}
            >
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={() => setCoordIssue(null)}
                >
                    <Pressable
                        style={styles.modalCard}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text allowFontScaling={false} style={styles.modalTitle}>
                            Fix coordinates
                        </Text>
                        <Text allowFontScaling={false} style={styles.modalSub}>
                            {toErrorText(coordIssue?.name, "Vendor")} · Odisha bounds
                            only
                        </Text>
                        <TextInput
                            allowFontScaling={false}
                            style={styles.modalInput}
                            value={coordLat}
                            onChangeText={setCoordLat}
                            placeholder="Latitude (17.5 – 22.5)"
                            placeholderTextColor={GREY}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            allowFontScaling={false}
                            style={styles.modalInput}
                            value={coordLng}
                            onChangeText={setCoordLng}
                            placeholder="Longitude (81.5 – 87.5)"
                            placeholderTextColor={GREY}
                            keyboardType="decimal-pad"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setCoordIssue(null)}
                            >
                                <Text allowFontScaling={false} style={styles.modalCancelTxt}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSave, saving && { opacity: 0.6 }]}
                                disabled={saving}
                                onPress={onFixCoords}
                            >
                                {saving ? (
                                    <ActivityIndicator color={WHITE} />
                                ) : (
                                    <Text allowFontScaling={false} style={styles.modalSaveTxt}>
                                        Save & activate
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                setVisible={setToast}
                position="top"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: WHITE,
    },
    header: {
        backgroundColor: WHITE,
        paddingHorizontal: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
        zIndex: 5,
    },
    title: {
        color: NAVY,
        fontSize: 15,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: 0.4,
    },
    subtitle: {
        color: GREY,
        fontSize: 11,
        textAlign: "center",
        marginTop: 3,
        marginBottom: 12,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    searchBox: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        backgroundColor: LIGHTGREY,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    searchIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: NAVY,
        fontSize: 13,
        paddingVertical: 0,
    },
    chipsRow: {
        paddingRight: 8,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginRight: 8,
    },
    chipAllIdle: {
        backgroundColor: WHITE,
        borderColor: "#E2E8F0",
    },
    chipAllActive: {
        backgroundColor: NAVY,
        borderColor: NAVY,
    },
    chipVerified: {
        borderColor: "#86EFAC",
    },
    chipUnverified: {
        borderColor: "#FDBA74",
    },
    chipFlagged: {
        backgroundColor: "#FFF7ED",
        borderColor: "#FDBA74",
    },
    chipImport: {
        backgroundColor: "#EEF2FF",
        borderColor: "#C7D2FE",
    },
    chipImportActive: {
        backgroundColor: NAVY,
        borderColor: NAVY,
    },
    chipTxt: {
        color: GREY,
        fontSize: 12,
        fontWeight: "600",
    },
    chipTxtWhite: {
        color: WHITE,
    },
    dotGreen: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: GREEN,
        marginRight: 6,
    },
    dotOrange: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: ORANGE,
        marginRight: 6,
    },
    flagIcon: {
        fontSize: 11,
        color: ORANGE,
        marginRight: 4,
    },
    issueRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        gap: 10,
    },
    issueTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
    },
    issueStatus: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
    },
    issueType: {
        color: ORANGE,
        fontSize: 10,
        fontWeight: "700",
        marginTop: 2,
    },
    issueDetail: {
        color: GREY,
        fontSize: 10,
        marginTop: 4,
        lineHeight: 14,
    },
    issueActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 8,
    },
    issueBtn: {
        backgroundColor: NAVY,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    issueBtnResolve: {
        backgroundColor: GREEN,
    },
    issueBtnTxt: {
        color: WHITE,
        fontSize: 10,
        fontWeight: "700",
    },
    issueLoader: {
        paddingVertical: 28,
        alignItems: "center",
    },
    emptyTxt: {
        textAlign: "center",
        color: GREY,
        fontSize: 12,
        marginTop: 18,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15,33,55,0.45)",
        justifyContent: "center",
        paddingHorizontal: 22,
    },
    modalCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        padding: 16,
    },
    modalTitle: {
        color: NAVY,
        fontSize: 15,
        fontWeight: "800",
    },
    modalSub: {
        color: GREY,
        fontSize: 11,
        marginTop: 4,
        marginBottom: 12,
    },
    modalInput: {
        height: 42,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 12,
        color: NAVY,
        marginBottom: 8,
        fontSize: 13,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 8,
    },
    modalCancel: {
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
    },
    modalCancelTxt: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
    },
    modalSave: {
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: NAVY,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 120,
    },
    modalSaveTxt: {
        color: WHITE,
        fontSize: 12,
        fontWeight: "700",
    },
    mapWrap: {
        flex: 1,
        minHeight: SCREEN_H * 0.26,
        backgroundColor: "#E8EEF5",
    },
    map: {
        flex: 1,
        backgroundColor: "transparent",
    },
    locateBtn: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    locateIcon: {
        color: NAVY,
        fontSize: 20,
        fontWeight: "700",
    },
    livePill: {
        position: "absolute",
        right: 12,
        bottom: 128,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: GREEN,
        marginRight: 6,
    },
    liveTxt: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
    },
    zoomStack: {
        position: "absolute",
        right: 12,
        bottom: 56,
        borderRadius: 10,
        overflow: "hidden",
        elevation: 4,
        backgroundColor: WHITE,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    zoomBtn: {
        width: 40,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    zoomBtnBottom: {
        borderBottomWidth: 0,
    },
    zoomTxt: {
        color: NAVY,
        fontSize: 20,
        fontWeight: "600",
        lineHeight: 22,
    },
    layersBtn: {
        position: "absolute",
        right: 12,
        bottom: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    layersIcon: {
        width: 18,
        height: 16,
    },
    layerSq: {
        position: "absolute",
        width: 12,
        height: 10,
        borderWidth: 1.5,
        borderColor: NAVY,
        borderRadius: 2,
        backgroundColor: WHITE,
    },
    layerSq1: {
        top: 0,
        left: 0,
    },
    layerSq2: {
        top: 4,
        left: 4,
    },
    satBtn: {
        position: "absolute",
        left: 12,
        bottom: 10,
        backgroundColor: WHITE,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
        elevation: 4,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    satThumb: {
        width: 54,
        height: 36,
        borderRadius: 6,
        overflow: "hidden",
        backgroundColor: "#1E3A5F",
        marginBottom: 4,
    },
    satThumbInner: {
        flex: 1,
        backgroundColor: "#2D5A87",
        opacity: 0.85,
        borderBottomWidth: 10,
        borderBottomColor: "#0B1F3A",
    },
    satTxt: {
        color: NAVY,
        fontSize: 10,
        fontWeight: "700",
    },
    sheet: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 14,
        paddingBottom: Platform.OS === "ios" ? 22 : 12,
        maxHeight: SCREEN_H * 0.4,
        minHeight: SCREEN_H * 0.32,
        elevation: 12,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
        marginTop: -14,
    },
    sheetHandle: {
        alignSelf: "center",
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#D1D5DB",
        marginTop: 8,
        marginBottom: 10,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    sheetTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
    },
    sortTxt: {
        color: GREY,
        fontSize: 12,
        fontWeight: "600",
    },
    listContent: {
        paddingBottom: 8,
    },
    vendorRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F4F8",
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    avatarTxt: {
        color: WHITE,
        fontSize: 16,
        fontWeight: "700",
    },
    vendorInfo: {
        flex: 1,
        paddingRight: 6,
    },
    vendorName: {
        color: NAVY,
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 2,
    },
    vendorPlace: {
        color: GREY,
        fontSize: 11,
        marginBottom: 1,
    },
    vendorCoords: {
        color: "#A0AAB8",
        fontSize: 10,
    },
    vendorMeta: {
        alignItems: "flex-end",
        marginRight: 8,
    },
    shopsPill: {
        backgroundColor: NAVY,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginBottom: 4,
    },
    shopsTxt: {
        color: WHITE,
        fontSize: 10,
        fontWeight: "700",
    },
    statusTxt: {
        fontSize: 10,
        fontWeight: "700",
    },
    callBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#E8F1FB",
        alignItems: "center",
        justifyContent: "center",
    },
    phoneIcon: {
        width: 14,
        height: 14,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate: "-25deg" }],
    },
    phoneBody: {
        width: 10,
        height: 14,
        borderRadius: 2,
        borderWidth: 1.8,
        borderColor: NAVY,
        backgroundColor: "transparent",
    },
});

export default VendorMapScreen;
