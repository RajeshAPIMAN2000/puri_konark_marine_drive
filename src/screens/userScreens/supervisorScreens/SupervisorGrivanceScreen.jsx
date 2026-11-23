import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
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
import { GREEN, NAVY, ORANGE, WHITE, BUTTON} from "../../../constant/color";
import { BANNER } from "../../../constant/imagePath";
import {
    GRIEVANCE_CATEGORY_OPTIONS,
    GRIEVANCE_STATUS_LABEL,
    GRIEVANCE_ZONE_OPTIONS,
    categoryKeyFromLabel,
    fetchGrievances,
    toErrorText,
    updateGrievance,
} from "../../../services/grievance/GrievanceService";

const STATUS_TILES = [
    { label: "Open", countKey: "open", icon: "▤", active: true },
    { label: "Assigned", countKey: "assigned", icon: "♙", tone: "blue" },
    { label: "In Progress", countKey: "progress", icon: "◷", tone: "orange" },
    { label: "Resolved", countKey: "resolved", icon: "✓", tone: "green" },
];

const statusApiKey = (label) => {
    if (label === "In Progress") return "in_progress";
    return (label || "").toLowerCase();
};

const DropDown = ({ label, open, onPress, items, onSelect }) => (
    <View style={styles.dropdownWrap}>
        <TouchableOpacity style={styles.dropdown} onPress={onPress}>
            <Text numberOfLines={1} style={styles.dropdownText}>{label}</Text>
            <SimpleIcon name="chevron-down" color={NAVY} size={15} />
        </TouchableOpacity>
        {open && (
            <View style={styles.dropdownMenu}>
                {items.map((item) => (
                    <TouchableOpacity key={item} style={styles.dropdownOption} onPress={() => onSelect(item)}>
                        <Text style={styles.dropdownOptionText}>{item}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        )}
    </View>
);

const GrievanceCard = ({ item, onPress }) => {
    const showSlaBreach = item.sla?.breach && item.status !== "resolved";
    return (
        <TouchableOpacity activeOpacity={0.8} style={styles.grievanceCard} onPress={() => onPress?.(item)}>
            <View style={styles.cardMain}>
                <Image
                    source={item.photoUrl ? { uri: item.photoUrl } : BANNER}
                    style={styles.thumb}
                    resizeMode="cover"
                />
                <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                        <Text style={styles.ticketId}>{toErrorText(item.ticketNo, "—")}</Text>
                        <View style={[styles.categoryBadge, { backgroundColor: item.categoryColor || "#64748B" }]}>
                            <Text numberOfLines={1} style={styles.categoryText}>
                                {toErrorText(item.categoryLabel, "").toUpperCase()}
                            </Text>
                        </View>
                        {showSlaBreach && (
                            <View style={styles.slaBadge}>
                                <Text style={styles.warning}>!</Text>
                                <Text style={styles.slaText}>SLA breach · {toErrorText(item.sla?.text, "—")}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.descriptionRow}>
                        <Text numberOfLines={1} style={styles.description}>{toErrorText(item.detail, "")}</Text>
                        <Text style={styles.cardChevron}>›</Text>
                    </View>
                    <View style={styles.cardBottom}>
                        <Text style={styles.locationLabel}>{toErrorText(item.place, "")}</Text>
                        <Text style={styles.age}>{toErrorText(item.ago, "—")}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function SupervisorGrivanceScreen() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All categories");
    const [zone, setZone] = useState("All zones");
    const [openMenu, setOpenMenu] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("Open");
    const [tickets, setTickets] = useState([]);
    const [counts, setCounts] = useState({ open: 0, assigned: 0, progress: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(null);
    const [resolutionNote, setResolutionNote] = useState("");
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
                    q: search.trim() || undefined,
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
        [category, zone, search, showToast]
    );

    useEffect(() => {
        loadGrievances();
    }, [loadGrievances]);

    const filtered = useMemo(() => {
        const want = statusApiKey(selectedStatus);
        return tickets.filter((item) => item.status === want);
    }, [tickets, selectedStatus]);

    const slaBeyond = useMemo(
        () => tickets.filter((item) => item.sla?.breach && item.status !== "resolved").length,
        [tickets]
    );

    const statusTiles = useMemo(
        () =>
            STATUS_TILES.map((tile) => ({
                ...tile,
                count: String(counts[tile.countKey] ?? 0),
            })),
        [counts]
    );

    const onPatch = async (payload) => {
        if (!selected?.id) return;
        setSaving(true);
        try {
            const res = await updateGrievance(selected.id, payload);
            if (!res.ok) {
                showToast(res.message || res.result, "error");
                return;
            }
            showToast("Grievance updated", "success");
            setSelected(null);
            setResolutionNote("");
            await loadGrievances({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to update grievance"), "error");
        } finally {
            setSaving(false);
        }
    };

    const openTicket = (item) => {
        setResolutionNote("");
        setSelected(item);
    };

    const categoryOptions = ["All categories", ...GRIEVANCE_CATEGORY_OPTIONS];
    const zoneOptions = ["All zones", ...GRIEVANCE_ZONE_OPTIONS];

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader title="Grievance Management" subtitle="" showMenu={false} showNotification={false} showProfile={false} titleAlign="center" />
            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={NAVY} />
                </View>
            ) : (
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
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
                    <TouchableOpacity style={styles.areaSelector}>
                        <SimpleIcon name="map-marker-outline" size={21} color="#123D8B" />
                        <Text numberOfLines={1} style={styles.areaText}>Bhudan Chhak - Chandrabhaga (Puri End)</Text>
                        <SimpleIcon name="chevron-down" size={17} color={NAVY} />
                    </TouchableOpacity>
                    <View style={styles.searchRow}>
                        <View style={styles.searchBox}>
                            <SimpleIcon name="magnify" size={23} color={NAVY} />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                onSubmitEditing={() => loadGrievances()}
                                returnKeyType="search"
                                placeholder="Search ticket / location / text..."
                                placeholderTextColor="#91A2C3"
                                style={styles.searchInput}
                            />
                        </View>
                        <TouchableOpacity style={styles.filterButton} onPress={() => loadGrievances()}>
                            <Text style={styles.filterGlyph}>☷</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.filtersRow}>
                        <DropDown
                            label={category}
                            open={openMenu === "category"}
                            onPress={() => setOpenMenu(openMenu === "category" ? "" : "category")}
                            items={categoryOptions}
                            onSelect={(value) => {
                                setCategory(value);
                                setOpenMenu("");
                            }}
                        />
                        <DropDown
                            label={zone}
                            open={openMenu === "zone"}
                            onPress={() => setOpenMenu(openMenu === "zone" ? "" : "zone")}
                            items={zoneOptions}
                            onSelect={(value) => {
                                setZone(value);
                                setOpenMenu("");
                            }}
                        />
                        <View style={styles.slaSummary}>
                            <Text style={styles.warning}>!</Text>
                            <Text style={styles.slaSummaryText}>{slaBeyond} beyond SLA</Text>
                        </View>
                    </View>
                    <View style={styles.statusRow}>
                        {statusTiles.map((tile) => (
                            <TouchableOpacity
                                key={tile.label}
                                onPress={() => setSelectedStatus(tile.label)}
                                style={[
                                    styles.statusTile,
                                    selectedStatus === tile.label && styles.statusTileActive,
                                    tile.tone === "blue" && selectedStatus !== tile.label && styles.statusBlue,
                                    tile.tone === "orange" && selectedStatus !== tile.label && styles.statusOrange,
                                    tile.tone === "green" && selectedStatus !== tile.label && styles.statusGreen,
                                ]}
                            >
                                <View style={styles.statusLabelRow}>
                                    <Text
                                        style={[
                                            styles.statusIcon,
                                            selectedStatus === tile.label && styles.statusIconActive,
                                        ]}
                                    >
                                        {tile.icon}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.statusLabel,
                                            selectedStatus === tile.label && styles.statusLabelActive,
                                        ]}
                                    >
                                        {tile.label}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.statusCount,
                                        selectedStatus === tile.label && styles.statusCountActive,
                                    ]}
                                >
                                    {tile.count}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.list}>
                        {filtered.map((item) => (
                            <GrievanceCard key={String(item.id)} item={item} onPress={openTicket} />
                        ))}
                        {filtered.length === 0 && (
                            <Text style={styles.emptyList}>No grievances in this status.</Text>
                        )}
                    </View>
                </ScrollView>
            )}

            <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
                    <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{toErrorText(selected?.ticketNo, "Grievance")}</Text>
                            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={10}>
                                <Text style={styles.closeTxt}>×</Text>
                            </TouchableOpacity>
                        </View>
                        {selected?.photoUrl ? (
                            <Image
                                source={{ uri: selected.photoUrl }}
                                style={styles.detailPhoto}
                                resizeMode="cover"
                            />
                        ) : null}
                        <Text style={styles.modalDesc}>{toErrorText(selected?.description, "")}</Text>
                        <Text style={styles.modalMeta}>
                            {toErrorText(selected?.place, "")} ·{" "}
                            {toErrorText(selected?.statusLabel || GRIEVANCE_STATUS_LABEL[selected?.status], "")}
                        </Text>
                        <TextInput
                            value={resolutionNote}
                            onChangeText={setResolutionNote}
                            placeholder="Resolution note (for Resolve)..."
                            placeholderTextColor="#91A2C3"
                            style={styles.noteInput}
                            multiline
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                disabled={saving}
                                onPress={() => onPatch({ status: "in_progress" })}
                            >
                                <Text style={styles.actionBtnText}>Mark In Progress</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: GREEN }]}
                                disabled={saving}
                                onPress={() =>
                                    onPatch({
                                        status: "resolved",
                                        resolutionNote:
                                            resolutionNote.trim() || "Resolved by supervisor.",
                                    })
                                }
                            >
                                <Text style={styles.actionBtnText}>Resolve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtnOutline, { borderColor: ORANGE }]}
                                disabled={saving}
                                onPress={() => onPatch({ escalated: true })}
                            >
                                <Text style={[styles.actionBtnOutlineText, { color: ORANGE }]}>Escalate</Text>
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
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5FAFF" },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 28 },
    areaSelector: { height: 46, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 14, paddingHorizontal: 11, marginBottom: 10 },
    areaText: { flex: 1, color: "#123D8B", fontSize: 12, fontWeight: "500" },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 9 },
    searchBox: { flex: 1, height: 47, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 14, paddingHorizontal: 11 },
    searchInput: { flex: 1, color: NAVY, fontSize: 12, padding: 0 },
    filterButton: { width: 48, height: 47, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 13 },
    filterGlyph: { color: NAVY, fontSize: 23, fontWeight: "700" },
    filtersRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
    dropdownWrap: { flex: 1, position: "relative", zIndex: 2 },
    dropdown: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 13, paddingHorizontal: 9 },
    dropdownText: { color: NAVY, fontSize: 11, flexShrink: 1 },
    dropdownMenu: { position: "absolute", top: 45, left: 0, right: 0, backgroundColor: WHITE, borderRadius: 12, borderWidth: 1, borderColor: "#E2EAF5", elevation: 5, maxHeight: 200 },
    dropdownOption: { paddingHorizontal: 9, paddingVertical: 9 },
    dropdownOptionText: { color: NAVY, fontSize: 10 },
    slaSummary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFF0F0", borderColor: "#FFABAB", borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, height: 38 },
    warning: { width: 15, height: 15, textAlign: "center", textAlignVertical: "center", borderRadius: 8, overflow: "hidden", color: WHITE, backgroundColor: "#F04444", fontSize: 11, fontWeight: "800" },
    slaSummaryText: { color: "#D82020", fontSize: 10, fontWeight: "600" },
    statusRow: { flexDirection: "row", gap: 6, marginBottom: 9 },
    statusTile: { flex: 1, minHeight: 74, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderWidth: 1, borderColor: "#E5EDF6", borderRadius: 14 },
    statusTileActive: { backgroundColor: "#0D2A49", borderColor: "#0D2A49" },
    statusBlue: { backgroundColor: "#F0F6FF" },
    statusOrange: { backgroundColor: "#FFF8EF" },
    statusGreen: { backgroundColor: "#F0FBF5" },
    statusLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusIcon: { color: "#1763E8", fontSize: 16, fontWeight: "700" },
    statusIconActive: { color: WHITE },
    statusLabel: { color: NAVY, fontSize: 10, fontWeight: "500" },
    statusLabelActive: { color: WHITE },
    statusCount: { color: NAVY, fontSize: 17, fontWeight: "700", marginTop: 3 },
    statusCountActive: { color: WHITE },
    list: { gap: 8 },
    emptyList: { color: "#879ABC", fontSize: 12, textAlign: "center", marginTop: 12 },
    grievanceCard: { minHeight: 108, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: WHITE, borderWidth: 1, borderColor: "#E1EAF5", borderRadius: 16, elevation: 1 },
    cardMain: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    thumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: "#E8EEF5" },
    cardBody: { flex: 1 },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    ticketId: { color: "#081748", fontSize: 13, fontWeight: "800" },
    categoryBadge: { maxWidth: 127, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
    categoryText: { color: WHITE, fontSize: 8, fontWeight: "800" },
    slaBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFE4E4", borderRadius: 16, paddingHorizontal: 7, paddingVertical: 5 },
    slaText: { color: "#CB2020", fontSize: 8, fontWeight: "700" },
    descriptionRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    description: { flex: 1, color: "#344C70", fontSize: 12 },
    cardChevron: { color: "#0A2A52", fontSize: 25, lineHeight: 26, marginLeft: 6 },
    cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
    locationLabel: { color: "#879ABC", fontSize: 10, flex: 1 },
    age: { color: "#879ABC", fontSize: 10 },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(15,33,55,0.45)", justifyContent: "center", paddingHorizontal: 20 },
    modalCard: { backgroundColor: WHITE, borderRadius: 14, padding: 14 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    modalTitle: { color: NAVY, fontSize: 14, fontWeight: "800", flex: 1 },
    closeTxt: { color: NAVY, fontSize: 22, lineHeight: 24 },
    detailPhoto: { width: "100%", height: 140, borderRadius: 10, marginBottom: 8, backgroundColor: "#E8EEF5" },
    modalDesc: { color: "#344C70", fontSize: 11, marginBottom: 6 },
    modalMeta: { color: NAVY, fontSize: 10, marginBottom: 10 },
    noteInput: { borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 10, padding: 8, color: NAVY, fontSize: 11, minHeight: 56, textAlignVertical: "top", marginBottom: 10 },
    modalActions: { gap: 8 },
    actionBtn: { backgroundColor: BUTTON, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
    actionBtnText: { color: WHITE, fontSize: 12, fontWeight: "700" },
    actionBtnOutline: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
    actionBtnOutlineText: { fontSize: 12, fontWeight: "700" },
});