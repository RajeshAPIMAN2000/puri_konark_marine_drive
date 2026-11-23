import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import StaticCrmMap from "../../../components/map/StaticCrmMap";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    BLUE,
    GREEN,
    GREY,
    NAVY,
    WHITE,
} from "../../../constant/color";
import {
    CITIZENCONTACT,
    LONGITUTE,
    REPORTS,
    SUPERVISOR,
    VENDOR,
    ZONE,
} from "../../../constant/imagePath";
import {
    fetchVendors,
    fetchVendorsMap,
    toErrorText,
} from "../../../services/vendor/VendorService";

const Badge = ({ letter, color }) => (
    <View style={[styles.badge, { backgroundColor: color }]}>
        <Text allowFontScaling={false} style={styles.badgeTxt}>
            {letter}
        </Text>
    </View>
);

export default function AuthorityViewerMapScreen() {
    const [tab, setTab] = useState("map");
    const [query, setQuery] = useState("");
    const [shopQuery, setShopQuery] = useState("");
    const [flagged, setFlagged] = useState(true);
    const [zoneFilter, setZoneFilter] = useState("All supervisors");
    const [statusFilter, setStatusFilter] = useState("All statuses");
    const [openMenu, setOpenMenu] = useState(null);
    const [zones, setZones] = useState([]);
    const [shops, setShops] = useState([]);
    const [flaggedCount, setFlaggedCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });

    const showToast = useCallback((message, type = "error") => {
        setToast({
            visible: true,
            message: toErrorText(message, type === "success" ? "Done" : "Something went wrong"),
            type,
        });
    }, []);

    const loadMapData = useCallback(async () => {
        setLoading(true);
        try {
            const [mapRes, listRes] = await Promise.all([
                fetchVendorsMap(),
                fetchVendors({ page: 1, limit: 100 }),
            ]);
            if (!mapRes.ok && !listRes.ok) {
                showToast(mapRes.message || listRes.message, "error");
                return;
            }

            const zoneList = (mapRes.zones || []).map((z) => {
                const lat = Number(z.centroid?.lat);
                const lng = Number(z.centroid?.lng);
                return {
                    id: z.code || "?",
                    color: z.color || BLUE,
                    name: z.supervisor?.name || z.name || "Supervisor",
                    segment: z.name || "",
                    full: z.name || "",
                    coords:
                        Number.isFinite(lat) && Number.isFinite(lng)
                            ? `${lat}, ${lng}`
                            : "—",
                    lat: Number.isFinite(lat) ? lat : null,
                    lng: Number.isFinite(lng) ? lng : null,
                    shops: Number(z.vendorCount || 0),
                    unverified: Number(z.unverifiedCount || 0),
                    phone: z.supervisor?.mobile || "—",
                };
            });
            setZones(zoneList);

            const vendors =
                mapRes.ok && mapRes.vendors?.length
                    ? mapRes.vendors
                    : listRes.data || [];
            setShops(
                vendors.map((v) => ({
                    id: String(v.id),
                    zone: v.zoneCode || "?",
                    shop: v.shopName || v.name,
                    owner: v.ownerName || "—",
                    mobile: v.mobileNumber || "—",
                    status:
                        String(v.status || "active").charAt(0).toUpperCase() +
                        String(v.status || "active").slice(1),
                    coords: v.coords || "—",
                    range: v.supervisorName || "—",
                    place: v.roadSegment || v.zone || "—",
                    latitude: v.latitude,
                    longitude: v.longitude,
                    flagged: !!v.flagged,
                    color: v.color,
                }))
            );
            setFlaggedCount(
                Number(
                    mapRes.flaggedCount ||
                        vendors.filter((v) => v.flagged || v.status === "unverified")
                            .length
                )
            );
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to load vendor map"), "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadMapData();
    }, [loadMapData]);

    const filteredZones = useMemo(() => {
        const q = query.trim().toLowerCase();
        return zones.filter((item) => {
            if (!q) return true;
            return (
                String(item.name || "").toLowerCase().includes(q) ||
                String(item.segment || "").toLowerCase().includes(q)
            );
        });
    }, [query, zones]);

    const filteredShops = useMemo(() => {
        const q = shopQuery.trim().toLowerCase();
        return shops.filter((item) => {
            if (zoneFilter !== "All supervisors" && item.range !== zoneFilter) return false;
            if (statusFilter !== "All statuses" && item.status !== statusFilter) return false;
            if (!q) return true;
            return (
                String(item.shop || "").toLowerCase().includes(q) ||
                String(item.owner || "").toLowerCase().includes(q) ||
                String(item.mobile || "").includes(q)
            );
        });
    }, [shopQuery, zoneFilter, statusFilter, shops]);

    const quality = zones.filter((item) => item.unverified > 0);

    const mapMarkers = useMemo(() => {
        const vendorPins = shops
            .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
            .filter((s) => !flagged || s.flagged || s.status === "Unverified")
            .map((s) => ({
                id: `v-${s.id}`,
                latitude: s.latitude,
                longitude: s.longitude,
                label: String(s.zone || "V").charAt(0),
                color: s.flagged ? "#e11d48" : s.color || NAVY,
            }));
        if (vendorPins.length) return vendorPins;
        return zones
            .filter((z) => Number.isFinite(z.lat) && Number.isFinite(z.lng))
            .map((z) => ({
                id: z.id,
                latitude: z.lat,
                longitude: z.lng,
                label: z.id,
                color: z.color,
            }));
    }, [flagged, shops, zones]);

    return (
        <View style={styles.root}>
            <MyHeader
                title="Vendor Map & Registry"
                subtitle=""
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <View style={styles.tabs}>
                <Tab icon={ZONE} label="Zone Map" active={tab === "map"} onPress={() => setTab("map")} />
                <Tab icon={VENDOR} label="Vendor List" active={tab === "list"} onPress={() => setTab("list")} />
                <Tab icon={REPORTS} label="Data Quality" active={tab === "quality"} onPress={() => setTab("quality")} />
            </View>

            {loading && !zones.length && !shops.length ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={NAVY} />
                </View>
            ) : null}

            {tab === "map" && (
                <View style={styles.flex}>
                    <View style={styles.searchRow}>
                        <View style={styles.searchBox}>
                            <Image source={VENDOR} style={styles.searchIcon} resizeMode="contain" />
                            <TextInput
                                allowFontScaling={false}
                                style={styles.searchInput}
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search shop or owner..."
                                placeholderTextColor={GREY}
                            />
                        </View>
                        <TouchableOpacity style={styles.filterBtn} onPress={loadMapData}>
                            <Image source={ZONE} style={styles.smallIcon} resizeMode="contain" />
                            <Text allowFontScaling={false} style={styles.filterTxt}>
                                Refresh
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mapWrap}>
                        <StaticCrmMap style={styles.map} markers={mapMarkers} showZoom />
                        <View style={styles.zonePill}>
                            <Text allowFontScaling={false} style={styles.zonePillTxt}>
                                All {zones.length} zones
                            </Text>
                            <Text allowFontScaling={false} style={styles.caret}>
                                ▾
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summary}>
                        <Text allowFontScaling={false} style={styles.vendorCount}>
                            {shops.length} vendors
                            {flaggedCount ? ` · ${flaggedCount} flagged` : ""}
                        </Text>
                        <TouchableOpacity
                            style={styles.checkRow}
                            onPress={() => setFlagged((v) => !v)}
                        >
                            <View style={[styles.box, flagged && styles.boxOn]}>
                                {flagged && (
                                    <Text allowFontScaling={false} style={styles.tick}>
                                        ✓
                                    </Text>
                                )}
                            </View>
                            <Text allowFontScaling={false} style={styles.checkTxt}>
                                Show flagged / unverified pins
                            </Text>
                        </TouchableOpacity>
                        <Text allowFontScaling={false} style={styles.nearest}>
                            Nearest ▾
                        </Text>
                    </View>

                    <FlatList
                        data={filteredZones}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listPad}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => <ZoneCard item={item} />}
                        ListEmptyComponent={
                            <Text allowFontScaling={false} style={styles.emptyTxt}>
                                No zones found
                            </Text>
                        }
                    />
                </View>
            )}

            {tab === "list" && (
                <View style={styles.flex}>
                    <Text allowFontScaling={false} style={styles.registryTitle}>
                        Vendor Map & Registry
                    </Text>
                    <Text allowFontScaling={false} style={styles.registrySub}>
                        {zones.length} supervisor zones · Puri-Konark Marine Drive corridor
                    </Text>
                    <FlatList
                        data={filteredShops}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listPad}
                        ListHeaderComponent={
                            <View>
                                <FlatList
                                    horizontal
                                    data={zones}
                                    keyExtractor={(item) => item.id}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.zoneStrip}
                                    renderItem={({ item }) => (
                                        <View style={styles.zoneMini}>
                                            <View style={styles.miniTop}>
                                                <Badge letter={item.id} color={item.color} />
                                                <View style={styles.miniNameWrap}>
                                                    <Text
                                                        allowFontScaling={false}
                                                        style={styles.miniName}
                                                        numberOfLines={1}
                                                    >
                                                        {item.name}
                                                    </Text>
                                                </View>
                                                <Text allowFontScaling={false} style={styles.miniShops}>
                                                    {item.shops} shops
                                                </Text>
                                            </View>
                                            <Text
                                                allowFontScaling={false}
                                                style={styles.miniSeg}
                                                numberOfLines={1}
                                            >
                                                {item.full}
                                            </Text>
                                            <Text allowFontScaling={false} style={styles.miniCoords}>
                                                {item.coords}
                                            </Text>
                                        </View>
                                    )}
                                />
                                <View style={styles.searchRow}>
                                    <View style={styles.searchBox}>
                                        <Image
                                            source={VENDOR}
                                            style={styles.searchIcon}
                                            resizeMode="contain"
                                        />
                                        <TextInput
                                            allowFontScaling={false}
                                            style={styles.searchInput}
                                            value={shopQuery}
                                            onChangeText={setShopQuery}
                                            placeholder="Search shop, owner, mobile..."
                                            placeholderTextColor={GREY}
                                        />
                                    </View>
                                </View>
                                <View style={styles.dropRow}>
                                    <Drop
                                        label={zoneFilter}
                                        open={openMenu === "zone"}
                                        onPress={() =>
                                            setOpenMenu((v) => (v === "zone" ? null : "zone"))
                                        }
                                        options={[
                                            "All supervisors",
                                            ...zones.map((z) => z.name),
                                        ]}
                                        onSelect={(value) => {
                                            setZoneFilter(value);
                                            setOpenMenu(null);
                                        }}
                                    />
                                    <Drop
                                        label={statusFilter}
                                        open={openMenu === "status"}
                                        onPress={() =>
                                            setOpenMenu((v) =>
                                                v === "status" ? null : "status"
                                            )
                                        }
                                        options={[
                                            "All statuses",
                                            "Active",
                                            "Inactive",
                                            "Unverified",
                                        ]}
                                        onSelect={(value) => {
                                            setStatusFilter(value);
                                            setOpenMenu(null);
                                        }}
                                    />
                                </View>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <ShopCard item={item} zones={zones} />
                        )}
                        ListEmptyComponent={
                            <Text allowFontScaling={false} style={styles.emptyTxt}>
                                No vendors found
                            </Text>
                        }
                    />
                </View>
            )}

            {tab === "quality" && (
                <FlatList
                    data={quality}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listPad}
                    ListHeaderComponent={
                        <Text allowFontScaling={false} style={styles.qualityIntro}>
                            Flagged and unverified pins by supervisor zone
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Badge letter={item.id} color={item.color} />
                            <View style={styles.cardBody}>
                                <Text allowFontScaling={false} style={styles.cardName}>
                                    {item.name}
                                </Text>
                                <Text allowFontScaling={false} style={styles.cardSeg}>
                                    {item.segment}
                                </Text>
                                <Text allowFontScaling={false} style={styles.unverified}>
                                    {item.unverified} unverified
                                </Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text allowFontScaling={false} style={styles.emptyTxt}>
                            No data quality issues
                        </Text>
                    }
                />
            )}

            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast((t) => ({ ...t, visible: false }))}
            />
        </View>
    );
}

const Tab = ({ icon, label, active, onPress }) => (
    <TouchableOpacity
        style={[styles.tab, active && styles.tabOn]}
        activeOpacity={0.85}
        onPress={onPress}
    >
        <Image
            source={icon}
            style={[styles.tabIcon, active && styles.tabIconOn]}
            resizeMode="contain"
        />
        <Text
            allowFontScaling={false}
            style={[styles.tabTxt, active && styles.tabTxtOn]}
            numberOfLines={1}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

const ZoneCard = ({ item }) => (
    <View style={styles.card}>
        <Badge letter={item.id} color={item.color} />
        <View style={styles.cardBody}>
            <Text allowFontScaling={false} style={styles.cardName}>
                {item.name}
            </Text>
            <Text allowFontScaling={false} style={styles.cardSeg}>
                {item.segment}
            </Text>
            <View style={styles.metaLine}>
                <Image source={LONGITUTE} style={styles.metaIcon} resizeMode="contain" />
                <Text allowFontScaling={false} style={styles.coordsTxt} numberOfLines={1}>
                    {item.coords}
                </Text>
            </View>
            <Text allowFontScaling={false} style={styles.unverified}>
                {item.unverified} unverified
            </Text>
        </View>
        <View style={styles.cardRight}>
            <View style={styles.shopPill}>
                <Text allowFontScaling={false} style={styles.shopPillTxt}>
                    {item.shops} shops
                </Text>
            </View>
            <View style={styles.phoneRow}>
                <Image source={CITIZENCONTACT} style={styles.metaIcon} resizeMode="contain" />
                <Text allowFontScaling={false} style={styles.metaTxt}>
                    {item.phone}
                </Text>
                <Text allowFontScaling={false} style={styles.chev}>
                    ›
                </Text>
            </View>
        </View>
    </View>
);

const ShopCard = ({ item, zones = [] }) => {
    const zone = zones.find((z) => z.id === item.zone);
    return (
        <View style={styles.shopCard}>
            <View style={styles.shopTop}>
                <Badge letter={item.zone} color={zone?.color || NAVY} />
                <Text allowFontScaling={false} style={styles.shopName}>
                    {item.shop}
                </Text>
                <View
                    style={[
                        styles.statusPill,
                        item.status !== "Active" && styles.statusWarn,
                    ]}
                >
                    <Text
                        allowFontScaling={false}
                        style={[
                            styles.statusTxt,
                            item.status !== "Active" && styles.statusWarnTxt,
                        ]}
                    >
                        {item.status}
                    </Text>
                </View>
            </View>
            <Row icon={SUPERVISOR} label="Owner" value={item.owner} />
            <Row icon={CITIZENCONTACT} label="Mobile" value={item.mobile} />
            <Row icon={LONGITUTE} label="Coordinates" value={item.coords} />
            <Row
                icon={ZONE}
                label="Range / Supervisor"
                value={`${item.range} · ${item.place}`}
            />
        </View>
    );
};

const Row = ({ icon, label, value }) => (
    <View style={styles.row}>
        <Image source={icon} style={styles.metaIcon} resizeMode="contain" />
        <Text allowFontScaling={false} style={styles.rowLabel}>
            {label}
        </Text>
        <Text allowFontScaling={false} style={styles.rowValue} numberOfLines={2}>
            {value}
        </Text>
    </View>
);

const Drop = ({ label, open, onPress, options, onSelect }) => (
    <View style={styles.dropWrap}>
        <TouchableOpacity style={styles.dropBtn} activeOpacity={0.85} onPress={onPress}>
            <Text allowFontScaling={false} style={styles.dropTxt} numberOfLines={1}>
                {label}
            </Text>
            <Text allowFontScaling={false} style={styles.caret}>
                ▾
            </Text>
        </TouchableOpacity>
        {open && (
            <View style={styles.menu}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={styles.menuItem}
                        onPress={() => onSelect(option)}
                    >
                        <Text allowFontScaling={false} style={styles.menuTxt}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        )}
    </View>
);

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5F7FA" },
    flex: { flex: 1 },
    loader: { paddingVertical: 24, alignItems: "center" },
    emptyTxt: { textAlign: "center", color: GREY, marginTop: 24, fontSize: 13 },
    tabs: {
        flexDirection: "row",
        backgroundColor: WHITE,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E5E7EB",
        paddingHorizontal: 8,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabOn: { borderBottomColor: NAVY },
    tabIcon: { width: 16, height: 16, tintColor: GREY },
    tabIconOn: { tintColor: NAVY },
    tabTxt: { fontSize: 12, color: GREY, fontWeight: "600" },
    tabTxtOn: { color: NAVY },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 10,
        height: 42,
    },
    searchIcon: { width: 16, height: 16, tintColor: GREY, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 13, color: NAVY, padding: 0 },
    filterBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 10,
        height: 42,
    },
    smallIcon: { width: 14, height: 14, tintColor: NAVY },
    filterTxt: { fontSize: 12, color: NAVY, fontWeight: "600" },
    mapWrap: {
        marginHorizontal: 12,
        marginTop: 6,
        height: 220,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#E5E7EB",
    },
    map: { flex: 1 },
    zonePill: {
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: WHITE,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    zonePillTxt: { fontSize: 12, color: NAVY, fontWeight: "700" },
    caret: { fontSize: 11, color: GREY },
    summary: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
        flexWrap: "wrap",
    },
    vendorCount: { fontSize: 13, color: NAVY, fontWeight: "700" },
    checkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    box: {
        width: 16,
        height: 16,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: GREY,
        alignItems: "center",
        justifyContent: "center",
    },
    boxOn: { backgroundColor: NAVY, borderColor: NAVY },
    tick: { color: WHITE, fontSize: 10, fontWeight: "700" },
    checkTxt: { fontSize: 12, color: "#4B5563" },
    nearest: { marginLeft: "auto", fontSize: 12, color: GREY },
    listPad: { paddingHorizontal: 12, paddingBottom: 24 },
    card: {
        flexDirection: "row",
        backgroundColor: WHITE,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    badge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    badgeTxt: { color: WHITE, fontWeight: "800", fontSize: 14 },
    cardBody: { flex: 1, minWidth: 0 },
    cardName: { fontSize: 14, fontWeight: "700", color: NAVY },
    cardSeg: { fontSize: 12, color: GREY, marginTop: 2 },
    metaLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    metaIcon: { width: 12, height: 12, tintColor: GREY },
    coordsTxt: { fontSize: 11, color: GREY, flex: 1 },
    unverified: { fontSize: 11, color: "#EA5F0B", marginTop: 4, fontWeight: "600" },
    cardRight: { alignItems: "flex-end", justifyContent: "space-between" },
    shopPill: {
        backgroundColor: "#EEF2FF",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    shopPillTxt: { fontSize: 11, color: NAVY, fontWeight: "700" },
    phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
    metaTxt: { fontSize: 11, color: GREY },
    chev: { fontSize: 16, color: GREY },
    registryTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: NAVY,
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    registrySub: {
        fontSize: 12,
        color: GREY,
        paddingHorizontal: 14,
        paddingBottom: 8,
    },
    zoneStrip: { paddingVertical: 8, gap: 8 },
    zoneMini: {
        width: 220,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 10,
        marginRight: 8,
    },
    miniTop: { flexDirection: "row", alignItems: "center", gap: 6 },
    miniNameWrap: { flex: 1, minWidth: 0 },
    miniName: { fontSize: 12, fontWeight: "700", color: NAVY },
    miniShops: { fontSize: 11, color: NAVY, fontWeight: "700" },
    miniSeg: { fontSize: 11, color: GREY, marginTop: 4 },
    miniCoords: { fontSize: 10, color: GREY, marginTop: 2 },
    dropRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    dropWrap: { flex: 1, zIndex: 20 },
    dropBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 10,
        height: 40,
    },
    dropTxt: { flex: 1, fontSize: 12, color: NAVY },
    menu: {
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        zIndex: 30,
        elevation: 4,
    },
    menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
    menuTxt: { fontSize: 12, color: NAVY },
    shopCard: {
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        marginBottom: 8,
    },
    shopTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    shopName: { flex: 1, fontSize: 14, fontWeight: "700", color: NAVY },
    statusPill: {
        backgroundColor: "#ECFDF5",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusWarn: { backgroundColor: "#FFF7ED" },
    statusTxt: { fontSize: 11, color: GREEN, fontWeight: "700" },
    statusWarnTxt: { color: "#EA5F0B" },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 6 },
    rowLabel: { width: 88, fontSize: 11, color: GREY },
    rowValue: { flex: 1, fontSize: 12, color: NAVY },
    qualityIntro: {
        fontSize: 13,
        color: GREY,
        marginBottom: 10,
        paddingTop: 12,
    },
});
