import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
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
import { MyAlert } from "../../../components/commonComponents/MyAlert";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    GREEN,
    GREY,
    LIGHTGREY,
    NAVY,
    ORANGE,
    WHITE,
} from "../../../constant/color";
import {
    BANNER,
    LOCATION,
    ZONE,
    CATAGORIES,
    CITIZENCONTACT,
    DESCRIPTION,
    PHOTO,
} from "../../../constant/imagePath";
import { openCamera } from "../../../utils/deviceServices";
import {
    GRIEVANCE_CATEGORIES,
    GRIEVANCE_ZONE_OPTIONS,
    categoryKeyFromLabel,
    createGrievance,
    deleteGrievance,
    fetchGrievances,
    toErrorText,
    updateGrievance,
} from "../../../services/grievance/GrievanceService";

const ZONES = GRIEVANCE_ZONE_OPTIONS;
const CATEGORIES = GRIEVANCE_CATEGORIES.map((c) => c.label);

const STATUS_FILTER_BASE = [
    { key: "all", label: "All", bg: NAVY, fg: WHITE, countBg: "rgba(255,255,255,0.22)" },
    { key: "open", label: "Open", bg: "#FEE2E2", fg: "#B91C1C", countBg: "#FECACA" },
    { key: "assigned", label: "Assigned", bg: "#DBEAFE", fg: "#1D4ED8", countBg: "#BFDBFE" },
    { key: "progress", label: "In Progress", bg: "#FFEDD5", fg: "#C2410C", countBg: "#FED7AA" },
    { key: "resolved", label: "Resolved", bg: "#DCFCE7", fg: "#15803D", countBg: "#BBF7D0" },
];

const FilterFunnel = () => (
    <View style={styles.funnelWrap}>
        <View style={styles.funnelTop} />
        <View style={styles.funnelMid} />
        <View style={styles.funnelStem} />
    </View>
);

const GridIcon = () => (
    <View style={styles.gridIcon}>
        <View style={styles.gridSq} />
        <View style={styles.gridSq} />
        <View style={styles.gridSq} />
        <View style={styles.gridSq} />
    </View>
);

const PinIcon = ({ color = GREY }) => (
    <View style={styles.pinWrap}>
        <View style={[styles.pinHead, { borderColor: color }]} />
        <View style={[styles.pinTip, { borderTopColor: color }]} />
    </View>
);

const ClockIcon = () => (
    <View style={styles.clockWrap}>
        <View style={styles.clockCircle} />
        <View style={styles.clockHand} />
    </View>
);

const TicketCard = ({ item, onPress }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
        <Image
            source={
                item.photoUrl
                    ? { uri: item.photoUrl }
                    : item.image || BANNER
            }
            style={styles.thumb}
            resizeMode="cover"
        />
        <View style={styles.cardBody}>
            <View style={styles.cardTop}>
                <Text allowFontScaling={false} style={styles.ticketId}>
                    {item.ticketNo}
                </Text>
                <View style={[styles.catBadge, { backgroundColor: item.catBg }]}>
                    <Text
                        allowFontScaling={false}
                        style={[styles.catTxt, { color: item.catFg }]}
                        numberOfLines={1}
                    >
                        {(item.categoryLabel || "").toUpperCase()}
                    </Text>
                </View>
            </View>

            <Text allowFontScaling={false} style={styles.desc} numberOfLines={2}>
                {item.desc}
            </Text>

            <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                    <PinIcon />
                    <Text allowFontScaling={false} style={styles.metaTxt} numberOfLines={1}>
                        {item.place}
                    </Text>
                </View>
                <View style={styles.metaRight}>
                    <ClockIcon />
                    <Text allowFontScaling={false} style={styles.metaTxt}>
                        {item.ago}
                    </Text>
                </View>
            </View>

            <View
                style={[
                    styles.slaRow,
                    item.sla?.type === "resolved" ? styles.slaResolved : styles.slaBreach,
                ]}
            >
                <Text allowFontScaling={false} style={styles.slaIcon}>
                    {item.sla?.type === "resolved" ? "✓" : "⚠"}
                </Text>
                <Text
                    allowFontScaling={false}
                    style={[
                        styles.slaTxt,
                        {
                            color:
                                item.sla?.type === "resolved" ? GREEN : "#B91C1C",
                        },
                    ]}
                >
                    {toErrorText(item.sla?.text, "—")}
                </Text>
            </View>
        </View>
        <Text allowFontScaling={false} style={styles.chevron}>
            ›
        </Text>
    </TouchableOpacity>
);

const FieldLabel = ({ icon, text }) => (
    <View style={styles.fieldLabelRow}>
        <Image source={icon} style={styles.fieldIcon} resizeMode="contain" />
        <Text allowFontScaling={false} style={styles.fieldLabel}>
            {text}
        </Text>
    </View>
);

const RegisterModal = ({ visible, onClose, onSubmit, saving }) => {
    const [location, setLocation] = useState("");
    const [zone, setZone] = useState("");
    const [category, setCategory] = useState("Garbage / Waste");
    const [contact, setContact] = useState("");
    const [description, setDescription] = useState("");
    const [photo, setPhoto] = useState(null);
    const [openDrop, setOpenDrop] = useState(null); // "zone" | "category" | null

    const resetAndClose = () => {
        setOpenDrop(null);
        setLocation("");
        setZone("");
        setCategory("Garbage / Waste");
        setContact("");
        setDescription("");
        setPhoto(null);
        onClose();
    };

    const pickPhoto = () => {
        openCamera({}, (result) => {
            if (result?.didCancel || result?.errorCode) return;
            const asset = result?.assets?.[0];
            if (!asset?.uri) return;
            setPhoto({
                uri: asset.uri,
                type: asset.type || "image/jpeg",
                fileName: asset.fileName || "grievance.jpg",
                name: asset.fileName || "grievance.jpg",
            });
        });
    };

    const handleRegister = () => {
        onSubmit?.({
            locationName: location,
            zoneCode: zone,
            categoryLabel: category,
            contactNumber: contact,
            description,
            photo,
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={resetAndClose}
        >
            <Pressable style={styles.modalBackdrop} onPress={resetAndClose}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text allowFontScaling={false} style={styles.modalTitle}>
                            Register grievance (internal)
                        </Text>
                        <TouchableOpacity
                            onPress={resetAndClose}
                            hitSlop={10}
                            style={styles.closeBtn}
                        >
                            <Text allowFontScaling={false} style={styles.closeTxt}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <FieldLabel icon={LOCATION} text="LOCATION" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder=""
                                    placeholderTextColor={GREY}
                                />
                            </View>
                            <View style={[styles.formCol, openDrop === "zone" && styles.formColOpen]}>
                                <FieldLabel icon={ZONE} text="ZONE" />
                                <TouchableOpacity
                                    style={styles.selectBox}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        setOpenDrop(openDrop === "zone" ? null : "zone")
                                    }
                                >
                                    <Text
                                        allowFontScaling={false}
                                        style={[
                                            styles.selectTxt,
                                            !zone && styles.selectPlaceholder,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {zone || "Select..."}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.selectArrow}>
                                        ▾
                                    </Text>
                                </TouchableOpacity>
                                {openDrop === "zone" && (
                                    <View style={styles.dropMenu}>
                                        {ZONES.map((z) => (
                                            <TouchableOpacity
                                                key={z}
                                                style={styles.dropItem}
                                                onPress={() => {
                                                    setZone(z);
                                                    setOpenDrop(null);
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
                        </View>

                        <View style={styles.formRow}>
                            <View
                                style={[
                                    styles.formCol,
                                    openDrop === "category" && styles.formColOpen,
                                ]}
                            >
                                <FieldLabel icon={CATAGORIES} text="CATEGORY" />
                                <TouchableOpacity
                                    style={styles.selectBox}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                        setOpenDrop(
                                            openDrop === "category" ? null : "category"
                                        )
                                    }
                                >
                                    <Text
                                        allowFontScaling={false}
                                        style={styles.selectTxt}
                                        numberOfLines={1}
                                    >
                                        {category}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.selectArrow}>
                                        ▾
                                    </Text>
                                </TouchableOpacity>
                                {openDrop === "category" && (
                                    <View style={styles.dropMenu}>
                                        {CATEGORIES.map((c) => (
                                            <TouchableOpacity
                                                key={c}
                                                style={styles.dropItem}
                                                onPress={() => {
                                                    setCategory(c);
                                                    setOpenDrop(null);
                                                }}
                                            >
                                                <Text
                                                    allowFontScaling={false}
                                                    style={styles.dropItemTxt}
                                                >
                                                    {c}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <View style={styles.formCol}>
                                <FieldLabel
                                    icon={CITIZENCONTACT}
                                    text="CITIZEN CONTACT (OPTIONAL)"
                                />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.input}
                                    value={contact}
                                    onChangeText={setContact}
                                    placeholder="10-digit mobile"
                                    placeholderTextColor={GREY}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        <View style={styles.formFull}>
                            <FieldLabel icon={DESCRIPTION} text="DESCRIPTION" />
                            <TextInput
                                allowFontScaling={false}
                                style={styles.textArea}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.formFull}>
                            <FieldLabel icon={PHOTO} text="PHOTO (OPTIONAL)" />
                            <TouchableOpacity
                                style={styles.photoPicker}
                                activeOpacity={0.85}
                                onPress={pickPhoto}
                            >
                                {photo?.uri ? (
                                    <Image
                                        source={{ uri: photo.uri }}
                                        style={styles.photoPreview}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text allowFontScaling={false} style={styles.photoHint}>
                                        Tap to capture photo
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.85}
                            onPress={resetAndClose}
                        >
                            <Text allowFontScaling={false} style={styles.cancelTxt}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.registerBtn, saving && { opacity: 0.6 }]}
                            activeOpacity={0.85}
                            disabled={!!saving}
                            onPress={handleRegister}
                        >
                            {saving ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <Text allowFontScaling={false} style={styles.registerTxt}>
                                    Register
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

const GrivancesScreen = () => {
    const [search, setSearch] = useState("");
    const [activeStatus, setActiveStatus] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [zoneFilter, setZoneFilter] = useState("");
    const [showRegister, setShowRegister] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [counts, setCounts] = useState({
        all: 0,
        open: 0,
        assigned: 0,
        progress: 0,
        resolved: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState({
        visible: false,
        message: "",
        type: "",
    });

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
                const statusParam =
                    activeStatus === "all"
                        ? undefined
                        : activeStatus === "progress"
                          ? "in_progress"
                          : activeStatus;
                const res = await fetchGrievances({
                    page: 1,
                    limit: 50,
                    status: statusParam,
                    category: categoryFilter
                        ? categoryKeyFromLabel(categoryFilter)
                        : undefined,
                    zoneCode: zoneFilter || undefined,
                    q: search.trim() || undefined,
                });
                if (!res.ok) {
                    showToast(res.message || res.result, "error");
                    setTickets([]);
                    return;
                }
                setTickets(res.data || []);
                if (res.counts) setCounts(res.counts);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load grievances"), "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [activeStatus, categoryFilter, zoneFilter, search, showToast]
    );

    useEffect(() => {
        loadGrievances();
    }, [loadGrievances]);

    const statusFilters = useMemo(
        () =>
            STATUS_FILTER_BASE.map((f) => ({
                ...f,
                count: counts[f.key] ?? 0,
            })),
        [counts]
    );

    const onRegister = async (form) => {
        if (!form.locationName || form.locationName.trim().length < 2) {
            showToast("Location must be at least 2 characters", "error");
            return;
        }
        if (!form.zoneCode) {
            showToast("Please select a zone", "error");
            return;
        }
        if (!form.description || form.description.trim().length < 5) {
            showToast("Description must be at least 5 characters", "error");
            return;
        }
        setSaving(true);
        try {
            const res = await createGrievance({
                locationName: form.locationName.trim(),
                zoneCode: form.zoneCode,
                categoryLabel: form.categoryLabel,
                contactNumber: form.contactNumber,
                description: form.description.trim(),
                photo: form.photo || null,
            });
            if (!res.ok) {
                showToast(res.message || res.result, "error");
                return;
            }
            showToast("Grievance registered", "success");
            setShowRegister(false);
            await loadGrievances({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to create grievance"), "error");
        } finally {
            setSaving(false);
        }
    };

    const onPatchGrievance = async (payload) => {
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
            await loadGrievances({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to update grievance"), "error");
        } finally {
            setSaving(false);
        }
    };

    const onConfirmDelete = async () => {
        if (!deleteTarget?.id) return;
        const id = deleteTarget.id;
        setDeleteTarget(null);
        setSelected(null);
        setSaving(true);
        try {
            const res = await deleteGrievance(id);
            if (!res.ok) {
                showToast(res.message || res.result, "error");
                return;
            }
            showToast("Grievance deleted", "success");
            await loadGrievances({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to delete grievance"), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.root}>
            <MyHeader
                title="Grievance Management"
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
                            placeholder="Ticket / location / keyword..."
                            placeholderTextColor={GREY}
                            value={search}
                            onChangeText={setSearch}
                            onSubmitEditing={() => loadGrievances()}
                            returnKeyType="search"
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.filterBtn}
                        activeOpacity={0.85}
                        onPress={() => loadGrievances()}
                    >
                        <FilterFunnel />
                    </TouchableOpacity>
                </View>

                <View style={styles.dropdownRow}>
                    <TouchableOpacity
                        style={styles.dropdown}
                        activeOpacity={0.85}
                        onPress={() => {
                            const idx = CATEGORIES.indexOf(categoryFilter);
                            const next =
                                idx < 0
                                    ? CATEGORIES[0]
                                    : idx >= CATEGORIES.length - 1
                                      ? ""
                                      : CATEGORIES[idx + 1];
                            setCategoryFilter(next);
                        }}
                    >
                        <GridIcon />
                        <Text allowFontScaling={false} style={styles.dropdownTxt} numberOfLines={1}>
                            {categoryFilter || "All categories"}
                        </Text>
                        <Text allowFontScaling={false} style={styles.dropdownArrow}>
                            ▾
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.dropdown}
                        activeOpacity={0.85}
                        onPress={() => {
                            const idx = ZONES.indexOf(zoneFilter);
                            const next =
                                idx < 0
                                    ? ZONES[0]
                                    : idx >= ZONES.length - 1
                                      ? ""
                                      : ZONES[idx + 1];
                            setZoneFilter(next);
                        }}
                    >
                        <PinIcon color={NAVY} />
                        <Text allowFontScaling={false} style={styles.dropdownTxt} numberOfLines={1}>
                            {zoneFilter || "All zones"}
                        </Text>
                        <Text allowFontScaling={false} style={styles.dropdownArrow}>
                            ▾
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                >
                    {statusFilters.map((f) => {
                        const active = activeStatus === f.key;
                        return (
                            <TouchableOpacity
                                key={f.key}
                                activeOpacity={0.85}
                                onPress={() => setActiveStatus(f.key)}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: active
                                            ? f.key === "all"
                                                ? NAVY
                                                : f.bg
                                            : f.key === "all"
                                              ? NAVY
                                              : f.bg,
                                        opacity: active || f.key === "all" ? 1 : 0.95,
                                        borderWidth: active && f.key !== "all" ? 1 : 0,
                                        borderColor: f.fg,
                                    },
                                ]}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[styles.chipTxt, { color: f.fg }]}
                                >
                                    {f.label}
                                </Text>
                                <View
                                    style={[
                                        styles.chipCount,
                                        { backgroundColor: f.countBg },
                                    ]}
                                >
                                    <Text
                                        allowFontScaling={false}
                                        style={[
                                            styles.chipCountTxt,
                                            { color: f.key === "all" ? WHITE : f.fg },
                                        ]}
                                    >
                                        {f.count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={NAVY} />
                </View>
            ) : (
                <FlatList
                    data={tickets}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <TicketCard item={item} onPress={() => setSelected(item)} />
                    )}
                    contentContainerStyle={styles.listContent}
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
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.9}
                onPress={() => setShowRegister(true)}
            >
                <Text allowFontScaling={false} style={styles.fabPlus}>
                    +
                </Text>
                <Text allowFontScaling={false} style={styles.fabLabel}>
                    New
                </Text>
            </TouchableOpacity>

            <RegisterModal
                visible={showRegister}
                onClose={() => setShowRegister(false)}
                onSubmit={onRegister}
                saving={saving}
            />

            <Modal
                visible={!!selected}
                transparent
                animationType="fade"
                onRequestClose={() => setSelected(null)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text allowFontScaling={false} style={styles.modalTitle}>
                                {selected?.ticketNo || "Grievance"}
                            </Text>
                            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={10}>
                                <Text allowFontScaling={false} style={styles.closeTxt}>
                                    ×
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {selected?.photoUrl ? (
                            <Image
                                source={{ uri: selected.photoUrl }}
                                style={styles.detailPhoto}
                                resizeMode="cover"
                            />
                        ) : null}
                        <Text allowFontScaling={false} style={{ color: GREY, marginBottom: 8 }}>
                            {toErrorText(selected?.description, "")}
                        </Text>
                        <Text allowFontScaling={false} style={{ color: NAVY, marginBottom: 12 }}>
                            {toErrorText(selected?.place, "")} ·{" "}
                            {toErrorText(selected?.statusLabel, "")}
                        </Text>
                        <View style={{ gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.registerBtn, { alignSelf: "stretch" }]}
                                disabled={saving}
                                onPress={() => onPatchGrievance({ status: "in_progress" })}
                            >
                                <Text allowFontScaling={false} style={styles.registerTxt}>
                                    Mark In Progress
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.registerBtn, { alignSelf: "stretch", backgroundColor: GREEN }]}
                                disabled={saving}
                                onPress={() =>
                                    onPatchGrievance({
                                        status: "resolved",
                                        resolutionNote: "Resolved from Super Admin panel.",
                                    })
                                }
                            >
                                <Text allowFontScaling={false} style={styles.registerTxt}>
                                    Resolve
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { alignSelf: "stretch", borderColor: ORANGE }]}
                                disabled={saving}
                                onPress={() => onPatchGrievance({ escalated: true })}
                            >
                                <Text allowFontScaling={false} style={[styles.cancelTxt, { color: ORANGE }]}>
                                    Escalate
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { alignSelf: "stretch", borderColor: "#B91C1C" }]}
                                disabled={saving}
                                onPress={() => setDeleteTarget(selected)}
                            >
                                <Text allowFontScaling={false} style={[styles.cancelTxt, { color: "#B91C1C" }]}>
                                    Delete
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            <MyAlert
                visible={!!deleteTarget}
                title="Delete grievance"
                message={`Delete ${deleteTarget?.ticketNo || "this grievance"} permanently?`}
                textLeft="Cancel"
                textRight="Delete"
                onPressLeft={() => setDeleteTarget(null)}
                onPressRight={onConfirmDelete}
                onRequestClose={() => setDeleteTarget(null)}
                backgroundColor="#B91C1C"
            />

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
        height: 38,
        borderRadius: 10,
        backgroundColor: LIGHTGREY,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
    },
    searchIcon: {
        fontSize: 12,
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        color: NAVY,
        fontSize: 12,
        paddingVertical: 0,
    },
    filterBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: LIGHTGREY,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
    funnelWrap: {
        alignItems: "center",
    },
    funnelTop: {
        width: 14,
        height: 2.5,
        backgroundColor: NAVY,
        borderRadius: 1,
    },
    funnelMid: {
        width: 0,
        height: 0,
        marginTop: 1,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 6,
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
    dropdown: {
        flex: 1,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
    },
    dropdownRow: {
        flexDirection: "row",
        marginBottom: 8,
        gap: 8,
    },
    dropdownTxt: {
        flex: 1,
        color: NAVY,
        fontSize: 11,
        fontWeight: "600",
        marginLeft: 6,
    },
    dropdownArrow: {
        color: GREY,
        fontSize: 10,
    },
    gridIcon: {
        width: 12,
        height: 12,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    gridSq: {
        width: 5,
        height: 5,
        borderRadius: 1,
        backgroundColor: NAVY,
        marginBottom: 2,
    },
    pinWrap: {
        width: 9,
        height: 11,
        alignItems: "center",
    },
    pinHead: {
        width: 7,
        height: 7,
        borderRadius: 4,
        borderWidth: 1.3,
        backgroundColor: "transparent",
    },
    pinTip: {
        width: 0,
        height: 0,
        marginTop: -1,
        borderLeftWidth: 2.5,
        borderRightWidth: 2.5,
        borderTopWidth: 3.5,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
    },
    chipsRow: {
        paddingRight: 4,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 9,
        marginRight: 6,
    },
    chipTxt: {
        fontSize: 11,
        fontWeight: "700",
    },
    chipCount: {
        marginLeft: 5,
        minWidth: 18,
        height: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    chipCountTxt: {
        fontSize: 9,
        fontWeight: "800",
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 90,
    },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: WHITE,
        borderRadius: 12,
        padding: 9,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#EEF1F5",
        elevation: 1,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
    thumb: {
        width: 52,
        height: 52,
        borderRadius: 8,
        backgroundColor: LIGHTGREY,
        marginRight: 9,
    },
    cardBody: {
        flex: 1,
        paddingRight: 4,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 3,
    },
    ticketId: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "800",
        flexShrink: 1,
        marginRight: 6,
    },
    catBadge: {
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        maxWidth: 110,
    },
    catTxt: {
        fontSize: 8,
        fontWeight: "800",
        letterSpacing: 0.2,
    },
    desc: {
        color: "#4B5563",
        fontSize: 11,
        lineHeight: 15,
        marginBottom: 5,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    metaLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        paddingRight: 6,
    },
    metaRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    metaTxt: {
        color: GREY,
        fontSize: 9,
        fontWeight: "500",
        marginLeft: 3,
    },
    clockWrap: {
        width: 10,
        height: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    clockCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.2,
        borderColor: GREY,
    },
    clockHand: {
        position: "absolute",
        width: 1.2,
        height: 3.5,
        backgroundColor: GREY,
        top: 2,
        left: 4.4,
    },
    slaRow: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    slaBreach: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    slaResolved: {
        backgroundColor: "#ECFDF5",
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    slaIcon: {
        fontSize: 9,
        marginRight: 4,
    },
    slaTxt: {
        fontSize: 9,
        fontWeight: "700",
    },
    chevron: {
        color: "#C0C7D2",
        fontSize: 18,
        fontWeight: "400",
        marginTop: 14,
        marginLeft: 2,
    },
    emptyTxt: {
        textAlign: "center",
        color: GREY,
        fontSize: 12,
        marginTop: 40,
    },
    fab: {
        position: "absolute",
        right: 16,
        bottom: 22,
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: ORANGE,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    fabPlus: {
        color: WHITE,
        fontSize: 20,
        fontWeight: "700",
        lineHeight: 22,
        marginTop: -2,
    },
    fabLabel: {
        color: WHITE,
        fontSize: 9,
        fontWeight: "700",
        marginTop: -1,
    },

    /* Register modal */
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    modalCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: WHITE,
        borderRadius: 12,
        overflow: "visible",
        elevation: 10,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    modalTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
        flex: 1,
        paddingRight: 8,
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
        fontWeight: "400",
        lineHeight: 24,
        marginTop: -2,
    },
    modalBody: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 4,
    },
    formRow: {
        flexDirection: "row",
        marginBottom: 10,
        gap: 10,
    },
    formCol: {
        flex: 1,
        zIndex: 1,
    },
    formColOpen: {
        zIndex: 30,
        elevation: 30,
    },
    formFull: {
        marginBottom: 6,
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
        marginLeft: 4,
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
    textArea: {
        minHeight: 88,
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
    photoPicker: {
        minHeight: 96,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        backgroundColor: LIGHTGREY,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    photoPreview: {
        width: "100%",
        height: 140,
    },
    photoHint: {
        color: GREY,
        fontSize: 12,
        fontWeight: "600",
    },
    detailPhoto: {
        width: "100%",
        height: 160,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: LIGHTGREY,
    },
    modalFooter: {
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
        paddingHorizontal: 16,
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
    registerBtn: {
        height: 34,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: NAVY,
        alignItems: "center",
        justifyContent: "center",
    },
    registerTxt: {
        color: WHITE,
        fontSize: 12,
        fontWeight: "700",
    },
});

export default GrivancesScreen;
