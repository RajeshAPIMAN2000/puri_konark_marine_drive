import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
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
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { NAVY, WHITE } from "../../../constant/color";
import { BANNER } from "../../../constant/imagePath";
import {
    GRIEVANCE_CATEGORY_OPTIONS,
    GRIEVANCE_STATUS_LABEL,
    GRIEVANCE_ZONE_OPTIONS,
    categoryKeyFromLabel,
    fetchGrievances,
    groupGrievancesByStatus,
    toErrorText,
} from "../../../services/grievance/GrievanceService";

const FILTER_CATEGORIES = ["All categories", ...GRIEVANCE_CATEGORY_OPTIONS];
const FILTER_ZONES = ["All zones", ...GRIEVANCE_ZONE_OPTIONS];

const statusGroupTitle = (key) => GRIEVANCE_STATUS_LABEL[key] || key;

const CATEGORY_COLORS = {
    "Garbage / Waste": "#E77A00",
    "Road Surface": "#40566F",
    "Water / Drainage": "#1763E8",
    "Vendor Dispute": "#7C24E8",
    "Street Lighting": "#07869A",
    Safety: "#E11D48",
    Encroachment: "#DE298B",
};

export default function FieldStaffGrivanceScreen() {
    const [tickets, setTickets] = useState([]);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All categories");
    const [zone, setZone] = useState("All zones");
    const [openDropdown, setOpenDropdown] = useState("");
    const [expanded, setExpanded] = useState({
        open: true,
        assigned: true,
        in_progress: true,
        resolved: true,
    });
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

    const groups = useMemo(() => groupGrievancesByStatus(tickets), [tickets]);

    const breachedCount = useMemo(
        () => tickets.filter((t) => t.status !== "resolved" && t.sla?.breach).length,
        [tickets]
    );

    const renderDropdown = (key, value, options, onSelect) => (
        <View style={[styles.dropdownWrap, key === "category" ? styles.categoryWrap : styles.zoneWrap]}>
            <TouchableOpacity style={styles.selectButton} activeOpacity={0.8} onPress={() => setOpenDropdown(openDropdown === key ? "" : key)}>
                <Text numberOfLines={1} style={styles.selectText}>{value}</Text>
                <Text style={styles.chevron}>⌄</Text>
            </TouchableOpacity>
            {openDropdown === key && (
                <View style={styles.dropdown}>
                    <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={styles.dropdownItem}
                                onPress={() => {
                                    onSelect(option);
                                    setOpenDropdown("");
                                }}
                            >
                                <Text style={styles.dropdownText}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Grievance Management"
                subtitle="Citizen complaints · SLA: 48 hours to resolution"
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
                height={58}
            />

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={NAVY} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
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
                >
                    <View style={styles.filtersCard}>
                        <View style={styles.searchWrap}>
                            <Text style={styles.searchIcon}>⌕</Text>
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                onSubmitEditing={() => loadGrievances()}
                                returnKeyType="search"
                                style={styles.searchInput}
                                placeholder="Ticket / location / text..."
                                placeholderTextColor="#8495B0"
                            />
                        </View>
                        <View style={styles.filterRow}>
                            {renderDropdown("category", category, FILTER_CATEGORIES, setCategory)}
                            {renderDropdown("zone", zone, FILTER_ZONES, setZone)}
                        </View>
                        <View style={styles.slaRow}>
                            <View style={styles.slaPill}>
                                <Text style={styles.slaIcon}>⚠</Text>
                                <Text style={styles.slaText}>{breachedCount} beyond SLA</Text>
                            </View>
                        </View>
                    </View>

                    {groups.map((group) => {
                        const isOpen = expanded[group.key] !== false;
                        const title = statusGroupTitle(group.key);
                        return (
                            <View key={group.key} style={styles.groupCard}>
                                <TouchableOpacity
                                    style={styles.groupHeader}
                                    onPress={() =>
                                        setExpanded((current) => ({
                                            ...current,
                                            [group.key]: !current[group.key],
                                        }))
                                    }
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.groupTitle}>{title.toUpperCase()}</Text>
                                    <View style={styles.groupRight}>
                                        <Text style={styles.countBadge}>{group.count}</Text>
                                        <Text style={styles.groupChevron}>{isOpen ? "⌃" : "⌄"}</Text>
                                    </View>
                                </TouchableOpacity>
                                {isOpen && (
                                    <View style={styles.ticketList}>
                                        {group.items.length === 0 ? (
                                            <Text style={styles.noneText}>None</Text>
                                        ) : (
                                            group.items.map((ticket) => {
                                                const resolved = ticket.status === "resolved";
                                                const pillColor =
                                                    CATEGORY_COLORS[ticket.categoryLabel] ||
                                                    ticket.categoryColor ||
                                                    "#52657D";
                                                const assigneeName =
                                                    ticket.assignee?.name ||
                                                    ticket.assignee?.fullName ||
                                                    (typeof ticket.assignee === "string"
                                                        ? ticket.assignee
                                                        : "");
                                                return (
                                                    <View key={String(ticket.id)} style={styles.ticketCard}>
                                                        <View style={styles.ticketRow}>
                                                            <Image
                                                                source={
                                                                    ticket.photoUrl
                                                                        ? { uri: ticket.photoUrl }
                                                                        : BANNER
                                                                }
                                                                style={styles.thumb}
                                                                resizeMode="cover"
                                                            />
                                                            <View style={styles.ticketBody}>
                                                        <View style={styles.ticketHeading}>
                                                            <Text style={styles.ticketId}>
                                                                {toErrorText(ticket.ticketNo, "—")}
                                                            </Text>
                                                            <View
                                                                style={[
                                                                    styles.categoryPill,
                                                                    { backgroundColor: pillColor },
                                                                ]}
                                                            >
                                                                <Text numberOfLines={1} style={styles.categoryText}>
                                                                    {toErrorText(ticket.categoryLabel, "").toUpperCase()}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text style={styles.summary}>
                                                            {toErrorText(ticket.summary || ticket.description, "")}
                                                        </Text>
                                                        <View style={styles.ticketMeta}>
                                                            <Text style={styles.location}>
                                                                {toErrorText(ticket.zoneCode, "—")} ·{" "}
                                                                {toErrorText(ticket.locationName, "—")}
                                                            </Text>
                                                            <Text style={styles.date}>
                                                                {toErrorText(ticket.dateLabel, "—")}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={[
                                                                styles.slaTicket,
                                                                resolved && styles.resolvedTicket,
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.slaTicketText,
                                                                    resolved && styles.resolvedText,
                                                                ]}
                                                            >
                                                                {toErrorText(ticket.sla?.text, "—")}
                                                            </Text>
                                                        </View>
                                                        {!!assigneeName && (
                                                            <Text style={styles.assignee}>
                                                                → {toErrorText(assigneeName, "")}
                                                            </Text>
                                                        )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
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

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
    filtersCard: { zIndex: 5, backgroundColor: "#F9FBFE", padding: 9, borderRadius: 15, marginBottom: 8 },
    searchWrap: { height: 46, flexDirection: "row", alignItems: "center", backgroundColor: WHITE, borderWidth: 1, borderColor: "#CFDAE9", borderRadius: 10, paddingHorizontal: 12 },
    searchIcon: { fontSize: 24, color: "#667A98", marginRight: 8 },
    searchInput: { flex: 1, color: NAVY, fontSize: 14, paddingVertical: 0 },
    filterRow: { flexDirection: "row", gap: 9, marginTop: 9 },
    dropdownWrap: { zIndex: 10 },
    categoryWrap: { flex: 1.05 },
    zoneWrap: { flex: 1 },
    selectButton: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: WHITE, borderWidth: 1, borderColor: "#CFDAE9", borderRadius: 10, paddingHorizontal: 12 },
    selectText: { flex: 1, color: NAVY, fontSize: 13 },
    chevron: { color: NAVY, fontSize: 21, marginLeft: 6, marginTop: -6 },
    dropdown: { position: "absolute", top: 47, left: 0, right: 0, borderWidth: 1, borderColor: "#D5DFEC", borderRadius: 9, backgroundColor: WHITE, elevation: 8, zIndex: 20 },
    dropdownScroll: { maxHeight: 210 },
    dropdownItem: { minHeight: 39, justifyContent: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#EDF1F6" },
    dropdownText: { color: NAVY, fontSize: 13 },
    slaRow: { alignItems: "center", paddingTop: 10, paddingBottom: 1 },
    slaPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#FF8585", backgroundColor: "#FFF3F3" },
    slaIcon: { color: "#D81919", fontSize: 14, fontWeight: "800" },
    slaText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
    groupCard: { backgroundColor: "#F9FBFE", borderWidth: 1, borderColor: "#CFDCEC", borderRadius: 15, marginTop: 8, overflow: "visible", elevation: 1 },
    groupHeader: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: "#DCE5F0" },
    groupTitle: { color: NAVY, fontSize: 14, fontWeight: "800" },
    groupRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    countBadge: { minWidth: 29, height: 29, paddingHorizontal: 7, borderRadius: 16, overflow: "hidden", textAlign: "center", textAlignVertical: "center", color: NAVY, backgroundColor: "#E7EEF9", fontSize: 13, fontWeight: "700" },
    groupChevron: { width: 18, color: NAVY, fontSize: 20, fontWeight: "700", textAlign: "center" },
    ticketList: { padding: 9, gap: 8 },
    ticketCard: { minHeight: 138, backgroundColor: WHITE, borderWidth: 1, borderColor: "#DCE6F2", borderRadius: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 9, elevation: 1 },
    ticketRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    thumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: "#E8EEF5" },
    ticketBody: { flex: 1 },
    ticketHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 },
    categoryPill: { maxWidth: "55%", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
    categoryText: { color: WHITE, fontSize: 9, fontWeight: "800" },
    ticketId: { flex: 1, color: NAVY, fontSize: 14, fontWeight: "800" },
    summary: { color: "#253B59", fontSize: 13, lineHeight: 18, paddingRight: 5 },
    ticketMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 5 },
    location: { flex: 1, color: "#71829D", fontSize: 11 },
    date: { color: "#71829D", fontSize: 11 },
    slaTicket: { alignSelf: "flex-start", backgroundColor: "#FFF0F0", borderWidth: 1, borderColor: "#FFB2B2", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 18, marginTop: 7 },
    slaTicketText: { color: "#C52626", fontSize: 11, fontWeight: "700" },
    resolvedTicket: { backgroundColor: "#EAFBF0", borderColor: "#A4E8B8" },
    resolvedText: { color: "#078541" },
    assignee: { color: NAVY, fontSize: 12, fontWeight: "600", marginTop: 5 },
    noneText: { color: "#71829D", textAlign: "center", fontSize: 13, paddingVertical: 20 },
});