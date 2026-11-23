import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
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
import { GREY, NAVY, PURPLE, WHITE } from "../../../constant/color";
import {
    BANNER,
    CHECKIN,
    FIELDATTENDANCE,
    GRIVANCE,
    LOCATION,
    REPORTS,
    SUPERVISOR,
} from "../../../constant/imagePath";
import {
    GRIEVANCE_CATEGORY_OPTIONS,
    GRIEVANCE_ZONE_OPTIONS,
    categoryKeyFromLabel,
    fetchGrievances,
    toErrorText,
} from "../../../services/grievance/GrievanceService";

const FILTER_DEFS = [
    { key: "Open", status: "open", icon: REPORTS },
    { key: "Assigned", status: "assigned", icon: SUPERVISOR },
    { key: "In Progress", status: "in_progress", icon: FIELDATTENDANCE },
    { key: "Resolved", status: "resolved", icon: CHECKIN },
];

const CAT_STYLE = {
    "Street Lighting": { bg: "#E8F8EE", fg: "#15803D" },
    "Garbage / Waste": { bg: "#FFF4E5", fg: "#C2410C" },
    "Vendor Dispute": { bg: "#F3E8FF", fg: "#7C3AED" },
    Safety: { bg: "#E0F2FE", fg: "#0369A1" },
    Encroachment: { bg: "#FDECEC", fg: "#E11D48" },
    "Road Surface": { bg: "#F1F5F9", fg: "#475569" },
    "Water / Drainage": { bg: "#DBEAFE", fg: "#1763E8" },
};

export default function AuthorityViewerGrivanceScreen() {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("Open");
    const [category, setCategory] = useState("All categories");
    const [zone, setZone] = useState("All zones");
    const [menu, setMenu] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [counts, setCounts] = useState({ open: 0, assigned: 0, progress: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });

    const showToast = useCallback((message, type = "error") => {
        setToast({
            visible: true,
            message: toErrorText(message, type === "success" ? "Done" : "Something went wrong"),
            type,
        });
    }, []);

    const loadGrievances = useCallback(
        async ({ soft = false } = {}) => {
            if (!soft) setLoading(true);
            try {
                const res = await fetchGrievances({
                    page: 1,
                    limit: 50,
                    category:
                        category === "All categories"
                            ? undefined
                            : categoryKeyFromLabel(category),
                    zoneCode: zone === "All zones" ? undefined : zone,
                    q: query.trim() || undefined,
                });
                if (!res.ok) {
                    showToast(res.message || res.result, "error");
                    setTickets([]);
                    return;
                }
                setTickets(res.data || []);
                setCounts(res.counts || { open: 0, assigned: 0, progress: 0, resolved: 0 });
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load grievances"), "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [category, zone, query, showToast]
    );

    useEffect(() => {
        loadGrievances();
    }, [loadGrievances]);

    const filters = useMemo(
        () =>
            FILTER_DEFS.map((f) => ({
                ...f,
                count:
                    f.status === "in_progress"
                        ? counts.progress ?? counts.in_progress ?? 0
                        : counts[f.status] ?? 0,
            })),
        [counts]
    );

    const activeStatus = useMemo(() => {
        const found = FILTER_DEFS.find((f) => f.key === status);
        return found?.status || "open";
    }, [status]);

    const beyond = useMemo(
        () => tickets.filter((item) => item.sla?.breach && item.status !== "resolved").length,
        [tickets]
    );

    const data = useMemo(
        () => tickets.filter((item) => item.status === activeStatus),
        [tickets, activeStatus]
    );

    const categoryOptions = ["All categories", ...GRIEVANCE_CATEGORY_OPTIONS];
    const zoneOptions = ["All zones", ...GRIEVANCE_ZONE_OPTIONS];

    return (
        <View style={styles.root}>
            <MyHeader
                title="Grievance Management"
                subtitle=""
                height={48}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <View style={styles.tools}>
                <View style={styles.search}>
                    <Text allowFontScaling={false} style={styles.searchMark}>⌕</Text>
                    <TextInput
                        allowFontScaling={false}
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => loadGrievances()}
                        returnKeyType="search"
                        placeholder="Ticket / location / text..."
                        placeholderTextColor={GREY}
                    />
                </View>
                <Drop
                    label={category}
                    open={menu === "cat"}
                    onPress={() => setMenu((v) => (v === "cat" ? null : "cat"))}
                    options={categoryOptions}
                    onSelect={(value) => {
                        setCategory(value);
                        setMenu(null);
                    }}
                />
                <Drop
                    label={zone}
                    open={menu === "zone"}
                    onPress={() => setMenu((v) => (v === "zone" ? null : "zone"))}
                    options={zoneOptions}
                    onSelect={(value) => {
                        setZone(value);
                        setMenu(null);
                    }}
                />
            </View>

            <View style={styles.slaRow}>
                <View style={styles.slaPill}>
                    <Image source={GRIVANCE} style={styles.slaIcon} resizeMode="contain" />
                    <Text allowFontScaling={false} style={styles.slaTxt}>{beyond} beyond SLA</Text>
                </View>
            </View>

            <View style={styles.stats}>
                {filters.map((item) => (
                    <View key={item.key} style={styles.stat}>
                        <Image source={item.icon} style={styles.statIcon} resizeMode="contain" />
                        <Text allowFontScaling={false} style={styles.statValue}>{item.count}</Text>
                        <Text allowFontScaling={false} style={styles.statLabel}>{item.key}</Text>
                    </View>
                ))}
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chips}
            >
                {filters.map((item) => {
                    const active = status === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.85}
                            onPress={() => setStatus(item.key)}
                            style={[styles.chip, active && styles.chipOn]}
                        >
                            <Image source={item.icon} style={[styles.chipIcon, active && styles.chipIconOn]} resizeMode="contain" />
                            <Text allowFontScaling={false} style={[styles.chipTxt, active && styles.chipTxtOn]}>{item.key}</Text>
                            <View style={[styles.count, active && styles.countOn]}>
                                <Text allowFontScaling={false} style={[styles.countTxt, active && styles.countTxtOn]}>{item.count}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={NAVY} />
                </View>
            ) : (
                <FlatList
                    style={styles.listView}
                    data={data}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadGrievances({ soft: true });
                            }}
                            tintColor={NAVY}
                        />
                    }
                    ListEmptyComponent={
                        <Text allowFontScaling={false} style={styles.emptyTxt}>
                            No grievances found
                        </Text>
                    }
                    renderItem={({ item }) => {
                        const cat =
                            CAT_STYLE[item.categoryLabel] ||
                            { bg: `${item.categoryColor || "#64748B"}22`, fg: item.categoryColor || "#64748B" };
                        const breach = item.sla?.breach && item.status !== "resolved";
                        return (
                            <View style={styles.card}>
                                <Image
                                    source={item.photoUrl ? { uri: item.photoUrl } : BANNER}
                                    style={styles.thumb}
                                    resizeMode="cover"
                                />
                                <View style={styles.cardBody}>
                                <View style={styles.cardTop}>
                                    <Text allowFontScaling={false} style={styles.ticket}>
                                        {toErrorText(item.ticketNo, "—")}
                                    </Text>
                                    <View style={[styles.cat, { backgroundColor: cat.bg }]}>
                                        <Text allowFontScaling={false} style={[styles.catTxt, { color: cat.fg }]}>
                                            {toErrorText(item.categoryLabel, "").toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <Text allowFontScaling={false} style={styles.title}>
                                    {toErrorText(item.title || item.description, "")}
                                </Text>
                                <View style={styles.meta}>
                                    <Image source={LOCATION} style={styles.metaIcon} resizeMode="contain" />
                                    <Text allowFontScaling={false} style={styles.metaTxt} numberOfLines={1}>
                                        {toErrorText(item.zoneCode, "—")} · {toErrorText(item.locationName, "—")}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.ago}>
                                        {toErrorText(item.ago, "—")}
                                    </Text>
                                    {breach && (
                                        <View style={styles.breach}>
                                            <Text allowFontScaling={false} style={styles.breachTxt}>
                                                SLA breach · {toErrorText(item.sla?.text, "—")}
                                            </Text>
                                        </View>
                                    )}
                                    <Text allowFontScaling={false} style={styles.more}>···</Text>
                                    <Text allowFontScaling={false} style={styles.chev}>›</Text>
                                </View>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                setVisible={setToast}
                position="top"
            />
        </View>
    );
}

const Drop = ({ label, open, onPress, options, onSelect }) => (
    <View>
        <TouchableOpacity style={styles.drop} activeOpacity={0.85} onPress={onPress}>
            <Text allowFontScaling={false} style={styles.dropTxt} numberOfLines={1}>{label}</Text>
            <Text allowFontScaling={false} style={styles.caret}>▾</Text>
        </TouchableOpacity>
        {open && (
            <View style={styles.menu}>
                {options.map((option) => (
                    <TouchableOpacity key={option} style={styles.menuItem} onPress={() => onSelect(option)}>
                        <Text allowFontScaling={false} style={styles.menuTxt}>{option}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        )}
    </View>
);

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F4F7FB" },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyTxt: { color: GREY, textAlign: "center", marginTop: 24, fontSize: 12 },
    tools: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        marginTop: 8,
        zIndex: 20,
    },
    search: {
        flex: 1,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        marginRight: 6,
    },
    searchMark: { color: GREY, fontSize: 14, marginRight: 4 },
    searchInput: { flex: 1, color: NAVY, fontSize: 11, paddingVertical: 0 },
    drop: {
        height: 34,
        maxWidth: 108,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 8,
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 4,
    },
    dropTxt: { color: NAVY, fontSize: 11, fontWeight: "600", maxWidth: 78 },
    caret: { color: GREY, fontSize: 10, marginLeft: 4 },
    menu: {
        position: "absolute",
        top: 36,
        right: 0,
        width: 150,
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        zIndex: 30,
        elevation: 8,
        maxHeight: 200,
    },
    menuItem: { paddingHorizontal: 10, paddingVertical: 8 },
    menuTxt: { color: NAVY, fontSize: 12 },
    slaRow: { alignItems: "flex-end", paddingHorizontal: 12, marginTop: 8 },
    slaPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF1F2",
        borderRadius: 12,
        paddingHorizontal: 8,
        height: 24,
    },
    slaIcon: { width: 12, height: 12, marginRight: 4, tintColor: "#E11D48" },
    slaTxt: { color: "#E11D48", fontSize: 11, fontWeight: "700" },
    stats: { flexDirection: "row", paddingHorizontal: 10, marginTop: 8 },
    stat: {
        flex: 1,
        marginHorizontal: 3,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        alignItems: "center",
        paddingVertical: 8,
    },
    statIcon: { width: 14, height: 14, tintColor: PURPLE },
    statValue: { color: NAVY, fontSize: 16, fontWeight: "800", marginTop: 2 },
    statLabel: { color: GREY, fontSize: 9, marginTop: 1 },
    chipScroll: {
        flexGrow: 0,
        height: 46,
        marginTop: 6,
    },
    chips: {
        paddingHorizontal: 12,
        alignItems: "center",
    },
    chip: {
        height: 30,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E6EEF8",
        backgroundColor: WHITE,
        paddingHorizontal: 8,
        marginRight: 6,
        flexDirection: "row",
        alignItems: "center",
    },
    chipOn: { backgroundColor: NAVY, borderColor: NAVY },
    chipIcon: { width: 12, height: 12, marginRight: 4, tintColor: NAVY },
    chipIconOn: { tintColor: WHITE },
    chipTxt: { color: NAVY, fontSize: 11, fontWeight: "700" },
    chipTxtOn: { color: WHITE },
    count: {
        marginLeft: 5,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#EEF2F7",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 3,
    },
    countOn: { backgroundColor: "rgba(255,255,255,0.2)" },
    countTxt: { color: NAVY, fontSize: 10, fontWeight: "700" },
    countTxtOn: { color: WHITE },
    listView: { flex: 1, marginTop: 4 },
    list: { paddingHorizontal: 12, paddingBottom: 20 },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F3D5D8",
        borderLeftWidth: 3,
        borderLeftColor: "#F3A8B0",
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
        gap: 8,
    },
    thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#E8EEF5" },
    cardBody: { flex: 1 },
    cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    ticket: { color: NAVY, fontSize: 12, fontWeight: "800" },
    cat: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    catTxt: { fontSize: 9, fontWeight: "800" },
    title: { color: "#334155", fontSize: 12, marginTop: 3 },
    meta: { flexDirection: "row", alignItems: "center", marginTop: 6, flexWrap: "wrap" },
    metaIcon: { width: 11, height: 11, marginRight: 3, tintColor: GREY },
    metaTxt: { color: GREY, fontSize: 10, marginRight: 6, maxWidth: 140 },
    ago: { color: GREY, fontSize: 10, marginRight: 6 },
    breach: { backgroundColor: "#FFF1F2", borderRadius: 10, paddingHorizontal: 6, height: 18, justifyContent: "center", marginRight: 4 },
    breachTxt: { color: "#E11D48", fontSize: 9, fontWeight: "700" },
    more: { marginLeft: "auto", color: GREY, fontSize: 12, letterSpacing: 1 },
    chev: { color: GREY, fontSize: 14, marginLeft: 4 },
});