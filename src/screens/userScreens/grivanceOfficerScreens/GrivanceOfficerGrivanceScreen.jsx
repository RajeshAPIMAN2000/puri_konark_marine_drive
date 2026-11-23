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
import { BANNER } from "../../../constant/imagePath";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { GREEN, NAVY, ORANGE, WHITE, BUTTON} from "../../../constant/color";
import {
    GRIEVANCE_CATEGORY_OPTIONS,
    GRIEVANCE_ZONE_OPTIONS,
    categoryKeyFromLabel,
    fetchGrievances,
    groupGrievancesByStatus,
    toErrorText,
    updateGrievance,
} from "../../../services/grievance/GrievanceService";

const CATEGORY_OPTIONS = ["All categories", ...GRIEVANCE_CATEGORY_OPTIONS];
const ZONE_OPTIONS = ["All zones", ...GRIEVANCE_ZONE_OPTIONS];

const TicketCard = ({ item, onPress }) => {
    const resolved = item.status === "resolved";
    const slaText = toErrorText(item.sla?.text, "—");
    return (
        <TouchableOpacity activeOpacity={0.8} style={styles.ticketCard} onPress={() => onPress?.(item)}>
            <View style={styles.ticketRow}>
                <Image
                    source={item.photoUrl ? { uri: item.photoUrl } : BANNER}
                    style={styles.thumb}
                    resizeMode="cover"
                />
                <View style={styles.ticketBody}>
            <View style={styles.ticketTop}>
                <Text style={styles.ticketId}>{toErrorText(item.ticketNo, "—")}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: item.categoryColor || "#64748B" }]}>
                    <Text numberOfLines={1} style={styles.categoryText}>
                        {toErrorText(item.categoryLabel, "").toUpperCase()}
                    </Text>
                </View>
            </View>
            <Text numberOfLines={2} style={styles.description}>{toErrorText(item.description, "")}</Text>
            <View style={styles.ticketMeta}>
                <SimpleIcon name="map-marker-outline" size={12} color="#6F86A8" />
                <Text numberOfLines={1} style={styles.metaText}>
                    {toErrorText(item.zoneCode, "—")} · {toErrorText(item.locationName, "—")}
                </Text>
                <SimpleIcon name="calendar-blank-outline" size={12} color="#6F86A8" />
                <Text style={styles.metaText}>{toErrorText(item.dateLabel, "—")}</Text>
            </View>
            <View style={[styles.resolutionBadge, resolved && styles.resolutionComplete]}>
                <Text style={[styles.alertSymbol, resolved && styles.completeSymbol]}>{resolved ? "✓" : "!"}</Text>
                <Text style={[styles.resolutionText, resolved && styles.completeText]}>
                    {item.sla?.breach && !resolved ? `SLA breach · ${slaText}` : slaText}
                </Text>
            </View>
                </View>
            </View>
            <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
    );
};

const Dropdown = ({ label, name, open, setOpen, options, onSelect }) => (
    <View style={styles.dropWrap}>
        <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(open === name ? "" : name)}>
            <Text numberOfLines={1} style={styles.dropdownText}>{label}</Text>
            <SimpleIcon name="chevron-down" size={15} color={NAVY} />
        </TouchableOpacity>
        {open === name && (
            <View style={styles.menu}>
                {options.map((option) => (
                    <TouchableOpacity key={option} style={styles.menuItem} onPress={() => onSelect(option)}>
                        <Text style={styles.menuText}>{option}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        )}
    </View>
);

export default function GrivanceOfficerGrivanceScreen() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All categories");
    const [zone, setZone] = useState("All zones");
    const [openMenu, setOpenMenu] = useState("");
    const [tickets, setTickets] = useState([]);
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

    const visibleGroups = useMemo(
        () => groupGrievancesByStatus(tickets).filter((group) => group.items.length > 0),
        [tickets]
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

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Grievance Management"
                subtitle="Citizen complaints across all zones · SLA: 48 hours to resolution"
                height={62}
                showMenu={false}
                showNotification={false}
                showProfile={false}
            />
            <View style={styles.searchFilters}>
                <View style={styles.searchBox}>
                    <SimpleIcon name="magnify" size={18} color="#91A2C3" />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={() => loadGrievances()}
                        returnKeyType="search"
                        placeholder="Ticket / location / text..."
                        placeholderTextColor="#91A2C3"
                        style={styles.searchInput}
                    />
                </View>
                <Dropdown
                    label={category}
                    name="category"
                    open={openMenu}
                    setOpen={setOpenMenu}
                    options={CATEGORY_OPTIONS}
                    onSelect={(value) => {
                        setCategory(value);
                        setOpenMenu("");
                    }}
                />
                <Dropdown
                    label={zone}
                    name="zone"
                    open={openMenu}
                    setOpen={setOpenMenu}
                    options={ZONE_OPTIONS}
                    onSelect={(value) => {
                        setZone(value);
                        setOpenMenu("");
                    }}
                />
            </View>
            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={NAVY} />
                </View>
            ) : (
                <ScrollView
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
                    {visibleGroups.map((group) => (
                        <View key={group.key} style={styles.group}>
                            <View style={styles.groupHeader}>
                                <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                                <Text style={styles.groupTitle}>{group.title}</Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{group.count}</Text>
                                </View>
                            </View>
                            <View style={styles.groupItems}>
                                {group.items.map((item) => (
                                    <TicketCard key={String(item.id)} item={item} onPress={openTicket} />
                                ))}
                            </View>
                        </View>
                    ))}
                    {visibleGroups.length === 0 && (
                        <Text style={styles.empty}>No grievances match these filters.</Text>
                    )}
                </ScrollView>
            )}

            <Modal
                visible={!!selected}
                transparent
                animationType="fade"
                onRequestClose={() => setSelected(null)}
            >
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
                            {toErrorText(selected?.place, "")} · {toErrorText(selected?.statusLabel, "")}
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
                                            resolutionNote.trim() || "Resolved by grievance officer.",
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
    root: { flex: 1, backgroundColor: "#F4F8FD" },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    searchFilters: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 7, zIndex: 3 },
    searchBox: { flex: 1.35, height: 42, flexDirection: "row", alignItems: "center", paddingHorizontal: 9, gap: 6, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D9E4F1", borderRadius: 12 },
    searchInput: { flex: 1, color: NAVY, fontSize: 10, padding: 0 },
    dropWrap: { flex: 1, position: "relative", zIndex: 4 },
    dropdown: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, paddingHorizontal: 8, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D9E4F1", borderRadius: 12 },
    dropdownText: { flex: 1, color: "#263D5E", fontSize: 10 },
    menu: { position: "absolute", top: 45, left: 0, right: 0, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D9E4F1", borderRadius: 10, elevation: 5, maxHeight: 180 },
    menuItem: { paddingHorizontal: 8, paddingVertical: 8 },
    menuText: { color: NAVY, fontSize: 9 },
    content: { paddingHorizontal: 12, paddingBottom: 18 },
    group: { backgroundColor: "#F8FBFE", borderWidth: 1, borderColor: "#E0E9F4", borderRadius: 14, marginBottom: 8, overflow: "visible" },
    groupHeader: { height: 35, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 6, borderBottomWidth: 1, borderColor: "#E5EDF6" },
    groupDot: { width: 9, height: 9, borderRadius: 5 },
    groupTitle: { flex: 1, color: "#183252", fontSize: 12, fontWeight: "800" },
    countBadge: { minWidth: 23, height: 23, borderRadius: 12, backgroundColor: "#EAF1FA", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
    countText: { color: "#173454", fontSize: 10, fontWeight: "700" },
    groupItems: { padding: 6, gap: 6 },
    ticketCard: { minHeight: 96, backgroundColor: WHITE, borderWidth: 1, borderColor: "#E1EAF4", borderRadius: 12, padding: 8, paddingRight: 27, elevation: 1 },
    ticketRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#E8EEF5" },
    ticketBody: { flex: 1 },
    ticketTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    ticketId: { color: "#19334F", fontSize: 10, fontWeight: "800" },
    categoryBadge: { maxWidth: 132, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
    categoryText: { color: WHITE, fontSize: 8, fontWeight: "800" },
    description: { color: "#4B627F", fontSize: 10, lineHeight: 14, marginTop: 4 },
    ticketMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
    metaText: { color: "#8396B1", fontSize: 8, marginRight: 5, flexShrink: 1 },
    resolutionBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF0F0", borderWidth: 1, borderColor: "#FFC5C5", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3, marginTop: 5 },
    alertSymbol: { width: 12, height: 12, textAlign: "center", textAlignVertical: "center", overflow: "hidden", borderRadius: 7, backgroundColor: "#E54848", color: WHITE, fontSize: 9, fontWeight: "800" },
    resolutionText: { color: "#C53030", fontSize: 8, fontWeight: "700" },
    resolutionComplete: { backgroundColor: "#EAFBF1", borderColor: "#B8EBCB" },
    completeSymbol: { backgroundColor: "#15A05A" },
    completeText: { color: "#158044" },
    arrow: { position: "absolute", right: 7, top: "42%", color: "#526985", fontSize: 22 },
    empty: { color: "#778BA8", fontSize: 12, textAlign: "center", marginTop: 35 },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(15,33,55,0.45)", justifyContent: "center", paddingHorizontal: 20 },
    modalCard: { backgroundColor: WHITE, borderRadius: 14, padding: 14 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    modalTitle: { color: NAVY, fontSize: 14, fontWeight: "800", flex: 1 },
    closeTxt: { color: NAVY, fontSize: 22, lineHeight: 24 },
    detailPhoto: { width: "100%", height: 140, borderRadius: 10, marginBottom: 8, backgroundColor: "#E8EEF5" },
    modalDesc: { color: "#4B627F", fontSize: 11, marginBottom: 6 },
    modalMeta: { color: NAVY, fontSize: 10, marginBottom: 10 },
    noteInput: { borderWidth: 1, borderColor: "#D9E4F1", borderRadius: 10, padding: 8, color: NAVY, fontSize: 11, minHeight: 56, textAlignVertical: "top", marginBottom: 10 },
    modalActions: { gap: 8 },
    actionBtn: { backgroundColor: BUTTON, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
    actionBtnText: { color: WHITE, fontSize: 12, fontWeight: "700" },
    actionBtnOutline: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
    actionBtnOutlineText: { fontSize: 12, fontWeight: "700" },
});