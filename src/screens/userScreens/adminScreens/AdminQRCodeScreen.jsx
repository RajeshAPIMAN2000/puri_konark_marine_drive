import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
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
import { useNavigation } from "@react-navigation/native";
import { ExportReportSheet } from "../../../components/commonComponents/ExportReportSheet";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    BLUE,
    GREEN,
    GREY,
    LIGHTGREY,
    NAVY,
    ORANGE,
    WHITE,
} from "../../../constant/color";
import {
    DEACTIVATE,
    DELETE,
    DESCRIPTION,
    DOWNLOAD,
    LOCATION,
    PRINT,
    QRCODES,
    ZONE,
} from "../../../constant/imagePath";
import {
    createQrCode,
    deleteQrCode,
    fetchQrCodes,
    toErrorText,
    updateQrCode,
} from "../../../services/qr/QrService";
import { printQrSheet } from "../../../utils/printQrSheet";

const DEFAULT_ZONES = ["A", "B", "C", "D", "E", "F", "G", "BBSR"];

const FieldLabel = ({ icon, text }) => (
    <View style={styles.fieldLabelRow}>
        {icon ? <Image source={icon} style={styles.fieldLabelIcon} resizeMode="contain" /> : null}
        <Text allowFontScaling={false} style={styles.fieldLabel}>
            {text}
        </Text>
    </View>
);

const GenerateQrModal = ({
    visible,
    onClose,
    zones,
    submitting,
    onSubmit,
    createdCode,
}) => {
    const [locationName, setLocationName] = useState("");
    const [zone, setZone] = useState("");
    const [notes, setNotes] = useState("");
    const [zoneOpen, setZoneOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLocationName("");
        setZone("");
        setNotes("");
        setZoneOpen(false);
    }, [visible]);

    const close = () => {
        setZoneOpen(false);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <Pressable style={styles.modalBackdrop} onPress={close}>
                <Pressable style={styles.genCard} onPress={() => {}}>
                    <View style={styles.genHeader}>
                        <Text allowFontScaling={false} style={styles.genTitle}>
                            Generate QR code
                        </Text>
                        <TouchableOpacity onPress={close} hitSlop={10} style={styles.closeBtn}>
                            <Text allowFontScaling={false} style={styles.closeTxt}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {createdCode ? (
                        <View style={styles.genBody}>
                            <Text allowFontScaling={false} style={styles.createdLabel}>
                                QR generated successfully
                            </Text>
                            <Text allowFontScaling={false} style={styles.createdCode}>
                                {createdCode}
                            </Text>
                            <Text allowFontScaling={false} style={styles.genHint}>
                                Print and install this code on site. Citizens can scan it to
                                submit grievances without login.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.genBody}>
                            <View style={styles.genField}>
                                <FieldLabel icon={LOCATION} text="LOCATION NAME" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.genInput}
                                    value={locationName}
                                    onChangeText={setLocationName}
                                    placeholderTextColor={GREY}
                                />
                                <Text allowFontScaling={false} style={styles.genHint}>
                                    e.g. Chandrabhaga Beach Parking, or a vendor stall board
                                </Text>
                            </View>

                            <View style={[styles.genField, zoneOpen && styles.genFieldOpen]}>
                                <FieldLabel icon={ZONE} text="ZONE (ROAD SEGMENT)" />
                                <TouchableOpacity
                                    style={[styles.genSelect, zoneOpen && styles.genSelectFocus]}
                                    activeOpacity={0.85}
                                    onPress={() => setZoneOpen((v) => !v)}
                                >
                                    <Text
                                        allowFontScaling={false}
                                        style={[
                                            styles.genSelectTxt,
                                            !zone && styles.genSelectPlaceholder,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {zone || "Select zone..."}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.genSelectArrow}>
                                        ▾
                                    </Text>
                                </TouchableOpacity>
                                {zoneOpen ? (
                                    <ScrollView style={styles.genDropMenu} nestedScrollEnabled>
                                        {(zones || DEFAULT_ZONES).map((z) => (
                                            <TouchableOpacity
                                                key={z}
                                                style={styles.genDropItem}
                                                onPress={() => {
                                                    setZone(z);
                                                    setZoneOpen(false);
                                                }}
                                            >
                                                <Text
                                                    allowFontScaling={false}
                                                    style={styles.genDropItemTxt}
                                                >
                                                    {z}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                ) : null}
                            </View>

                            <View style={styles.genField}>
                                <FieldLabel icon={DESCRIPTION} text="NOTES (OPTIONAL)" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.genInput}
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholderTextColor={GREY}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.genFooter}>
                        <TouchableOpacity style={styles.genCancelBtn} onPress={close}>
                            <Text allowFontScaling={false} style={styles.genCancelTxt}>
                                {createdCode ? "Close" : "Cancel"}
                            </Text>
                        </TouchableOpacity>
                        {!createdCode ? (
                            <TouchableOpacity
                                style={[styles.genPrimaryBtn, submitting && { opacity: 0.7 }]}
                                disabled={submitting}
                                onPress={() =>
                                    onSubmit?.({
                                        locationName,
                                        zoneCode: zone,
                                        notes,
                                    })
                                }
                            >
                                {submitting ? (
                                    <ActivityIndicator color={WHITE} size="small" />
                                ) : (
                                    <Text allowFontScaling={false} style={styles.genPrimaryTxt}>
                                        Generate QR
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const PrintSheetModal = ({ visible, items, onClose, onPrint }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.printRoot}>
            <View style={styles.printTopBar}>
                <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.printBackBtn}>
                    <Text allowFontScaling={false} style={styles.printBackTxt}>
                        ← Back to QR codes
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.printSheetBtn}
                    activeOpacity={0.85}
                    onPress={onPrint}
                >
                    <Image source={PRINT} style={styles.printSheetIcon} resizeMode="contain" />
                    <Text allowFontScaling={false} style={styles.printSheetTxt}>
                        Print sheet
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.printGrid}
                showsVerticalScrollIndicator={false}
            >
                {(items || []).length === 0 ? (
                    <Text allowFontScaling={false} style={styles.emptyTxt}>
                        No QR codes to print
                    </Text>
                ) : (
                    (items || []).map((item) => (
                        <View key={String(item.id)} style={styles.printCard}>
                            <View style={styles.printQrWrap}>
                                <Image
                                    source={QRCODES}
                                    style={styles.printQrImg}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text allowFontScaling={false} style={styles.printCode}>
                                {item.code}
                            </Text>
                            <Text
                                allowFontScaling={false}
                                style={styles.printLoc}
                                numberOfLines={2}
                            >
                                {item.locationName || item.place}
                            </Text>
                            <Text allowFontScaling={false} style={styles.printZone}>
                                {item.zoneName && item.zoneName !== item.zoneCode
                                    ? item.zoneName
                                    : `Zone ${item.zoneCode || item.zone || "—"}`}
                            </Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    </Modal>
);

const QrListCard = ({ item, selected, onPress, onToggle, onDelete }) => (
    <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        activeOpacity={0.88}
        onPress={onPress}
    >
        <View style={styles.cardQrThumb}>
            <Image source={QRCODES} style={styles.cardQrImg} resizeMode="contain" />
        </View>
        <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
                <Text allowFontScaling={false} style={styles.cardCode} numberOfLines={1}>
                    {item.code}
                </Text>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        onPress={onToggle}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                    >
                        <Image
                            source={DEACTIVATE}
                            style={styles.deactivateIcon}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onDelete}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                    >
                        <Image
                            source={DELETE}
                            style={styles.rowActionIcon}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.cardLocRow}>
                <Image source={LOCATION} style={styles.cardLocIcon} resizeMode="contain" />
                <Text allowFontScaling={false} style={styles.cardLoc} numberOfLines={1}>
                    {item.locationName || item.place}
                </Text>
            </View>
            <View style={styles.cardBottomRow}>
                <View style={styles.zonePill}>
                    <Text allowFontScaling={false} style={styles.zonePillTxt}>
                        {String(item.zoneCode || item.zone || "—").slice(0, 4)}
                    </Text>
                </View>
                <Text allowFontScaling={false} style={styles.cardDate}>
                    {item.created}
                </Text>
                <View style={{ flex: 1 }} />
                <View style={[styles.activeBadge, !item.active && styles.inactiveBadge]}>
                    <Text
                        allowFontScaling={false}
                        style={[styles.activeBadgeTxt, !item.active && styles.inactiveBadgeTxt]}
                    >
                        {item.active ? "Active" : "Inactive"}
                    </Text>
                </View>
            </View>
        </View>
    </TouchableOpacity>
);

export default function AdminQRCodeScreen() {
    const navigation = useNavigation();
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [selected, setSelected] = useState(null);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createdCode, setCreatedCode] = useState("");
    const [printOpen, setPrintOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });

    const showToast = useCallback((message, type = "error") => {
        setToast({
            visible: true,
            message: toErrorText(message, type === "success" ? "Done" : "Something went wrong"),
            type,
        });
    }, []);

    const loadQrCodes = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const res = await fetchQrCodes({
                    page: 1,
                    limit: 50,
                    active:
                        statusFilter === "active"
                            ? true
                            : statusFilter === "inactive"
                              ? false
                              : undefined,
                });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setItems([]);
                    setMeta({});
                    return;
                }
                setItems(res.data || []);
                setMeta(res.meta || {});
                setSelected((cur) => cur || res.data?.[0] || null);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load QR codes"), "error");
                setItems([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [statusFilter, showToast]
    );

    useEffect(() => {
        loadQrCodes();
    }, [loadQrCodes]);

    const zoneOptions = useMemo(() => {
        const fromData = items.map((i) => i.zoneCode).filter(Boolean);
        return Array.from(new Set([...DEFAULT_ZONES, ...fromData])).sort();
    }, [items]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => {
    return (
                String(item.code || "").toLowerCase().includes(q) ||
                String(item.locationName || "").toLowerCase().includes(q) ||
                String(item.zoneCode || "").toLowerCase().includes(q) ||
                String(item.notes || "").toLowerCase().includes(q)
            );
        });
    }, [items, search]);

    const totalLabel = Number(meta.total) || filtered.length;

    const onGenerate = useCallback(
        async (payload) => {
            setCreating(true);
            try {
                const res = await createQrCode(payload);
                if (!res.ok) {
                    showToast(res.message, "error");
                    return;
                }
                setCreatedCode(res.data?.code || "");
                showToast(res.message || "QR code generated", "success");
                await loadQrCodes({ soft: true });
                if (res.data) setSelected(res.data);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to generate QR"), "error");
            } finally {
                setCreating(false);
            }
        },
        [loadQrCodes, showToast]
    );

    const onToggleActive = useCallback(
        async (item) => {
            if (!item?.id) return;
            try {
                const res = await updateQrCode(item.id, { active: !item.active });
                if (!res.ok) {
                    showToast(res.message, "error");
                    return;
                }
                const next = { ...item, active: !item.active, ...(res.data || {}) };
                setItems((prev) => prev.map((row) => (row.id === next.id ? { ...row, ...next } : row)));
                setSelected((cur) => (cur?.id === next.id ? { ...cur, ...next } : cur));
                showToast(next.active ? "QR activated" : "QR deactivated", "success");
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to update QR"), "error");
            }
        },
        [showToast]
    );

    const onDelete = useCallback(
        (item) => {
            if (!item?.id) return;
            Alert.alert(
                "Delete QR code",
                "Are you sure you want to delete this QR code?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                const res = await deleteQrCode(item.id);
                                if (!res.ok) {
                                    showToast(res.message, "error");
                                    return;
                                }
                                setItems((prev) => prev.filter((row) => row.id !== item.id));
                                setSelected((cur) => (cur?.id === item.id ? null : cur));
                                showToast("QR code deleted", "success");
                            } catch (e) {
                                showToast(
                                    toErrorText(e?.message || e, "Failed to delete QR"),
                                    "error"
                                );
                            }
                        },
                    },
                ]
            );
        },
        [showToast]
    );

    const ListHeader = (
        <View>
            <View style={styles.corridorCard}>
                <View style={styles.corridorLeft}>
                    <View style={styles.corridorPin}>
                        <Image source={LOCATION} style={styles.corridorPinImg} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text allowFontScaling={false} style={styles.corridorTitle}>
                            PURI-KONARK MARINE DRIVE
                        </Text>
                        <Text allowFontScaling={false} style={styles.corridorSub}>
                            Bhudan Chhak to Chandrabhaga & beyond
                        </Text>
                    </View>
                </View>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text allowFontScaling={false} style={styles.liveTxt}>
                        LIVE
                    </Text>
                </View>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionTile, styles.actionTilePrimary]}
                    activeOpacity={0.85}
                    onPress={() => {
                        setCreatedCode("");
                        setGenerateOpen(true);
                    }}
                >
                    <Text allowFontScaling={false} style={styles.actionPlus}>
                        +
                    </Text>
                    <Text allowFontScaling={false} style={[styles.actionLabel, styles.actionLabelPrimary]}>
                        New QR Code
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionTile}
                    activeOpacity={0.85}
                    onPress={() => setExportOpen(true)}
                >
                    <Image source={DOWNLOAD} style={styles.actionIcon} resizeMode="contain" />
                    <Text allowFontScaling={false} style={styles.actionLabel}>
                        Export Report
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionTile}
                    activeOpacity={0.85}
                    onPress={() => setPrintOpen(true)}
                >
                    <Image source={PRINT} style={styles.actionIcon} resizeMode="contain" />
                    <Text allowFontScaling={false} style={styles.actionLabel}>
                        Print Sheet
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionTile}
                    activeOpacity={0.85}
                    onPress={() => showToast("Scan QR coming soon", "error")}
                >
                    <Image source={QRCODES} style={styles.scanActionIcon} resizeMode="contain" />
                    <Text allowFontScaling={false} style={styles.actionLabel}>
                        Scan QR
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHead}>
                <View style={{ flex: 1 }}>
                    <Text allowFontScaling={false} style={styles.sectionTitle}>
                        Installed / To-install Codes
                    </Text>
                    <Text allowFontScaling={false} style={styles.sectionCount}>
                        {totalLabel} codes
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.iconCircle}
                    onPress={() => setSearchOpen((v) => !v)}
                >
                    <Text allowFontScaling={false} style={styles.iconCircleTxt}>
                        🔍
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconCircle}
                    onPress={() => setFilterOpen((v) => !v)}
                >
                    <Text allowFontScaling={false} style={styles.iconCircleTxt}>
                        ☰
                    </Text>
                </TouchableOpacity>
            </View>

            {searchOpen ? (
                <View style={styles.searchBox}>
                    <TextInput
                        allowFontScaling={false}
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search code, location, zone..."
                        placeholderTextColor={GREY}
                    />
                </View>
            ) : null}

            {filterOpen ? (
                <View style={styles.filterRow}>
                    {["all", "active", "inactive"].map((key) => (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.filterChip,
                                statusFilter === key && styles.filterChipOn,
                            ]}
                            onPress={() => setStatusFilter(key)}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.filterChipTxt,
                                    statusFilter === key && styles.filterChipTxtOn,
                                ]}
                            >
                                {key === "all" ? "All" : key === "active" ? "Active" : "Inactive"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : null}
        </View>
    );

    const ListFooter = selected ? (
        <TouchableOpacity
            style={styles.previewCard}
            activeOpacity={0.9}
            onPress={() => setSelected(selected)}
        >
            <View style={styles.previewQr}>
                <Image source={QRCODES} style={styles.previewQrImg} resizeMode="contain" />
            </View>
            <View style={styles.previewBody}>
                <Text allowFontScaling={false} style={styles.previewEyebrow}>
                    QR Preview
                </Text>
                <Text allowFontScaling={false} style={styles.previewCode}>
                    {selected.code}
                </Text>
                <Text allowFontScaling={false} style={styles.previewLoc} numberOfLines={1}>
                    {selected.locationName || selected.place}
                </Text>
                <View style={styles.previewTags}>
                    <View style={styles.zonePill}>
                        <Text allowFontScaling={false} style={styles.zonePillTxt}>
                            {String(selected.zoneCode || "—").slice(0, 4)}
                        </Text>
                    </View>
                    <Text allowFontScaling={false} style={styles.previewZoneName}>
                        {selected.zoneName || selected.zoneCode}
                    </Text>
                </View>
            </View>
            <Text allowFontScaling={false} style={styles.previewChevron}>
                ›
            </Text>
        </TouchableOpacity>
    ) : (
        <View style={{ height: 16 }} />
    );

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
            <MyHeader
                title="QR Code Management"
                subtitle="PURI–KONARK MARINE DRIVE"
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
                height={58}
            />

            {loading ? (
                <ActivityIndicator color={NAVY} style={{ marginTop: 48 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.id)}
                    ListHeaderComponent={ListHeader}
                    ListFooterComponent={ListFooter}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadQrCodes({ soft: true })}
                        />
                    }
                    renderItem={({ item }) => (
                        <QrListCard
                            item={item}
                            selected={selected?.id === item.id}
                            onPress={() => setSelected(item)}
                            onToggle={() => onToggleActive(item)}
                            onDelete={() => onDelete(item)}
                        />
                    )}
                    ListEmptyComponent={
                        <Text allowFontScaling={false} style={styles.emptyTxt}>
                            No QR codes found
                        </Text>
                    }
                />
            )}

            <GenerateQrModal
                visible={generateOpen}
                onClose={() => {
                    setGenerateOpen(false);
                    setCreatedCode("");
                }}
                zones={zoneOptions}
                submitting={creating}
                onSubmit={onGenerate}
                createdCode={createdCode}
            />

            <PrintSheetModal
                visible={printOpen}
                items={filtered}
                onClose={() => setPrintOpen(false)}
                onPrint={async () => {
                    const res = await printQrSheet(filtered);
                    if (!res.ok) {
                        showToast(res.message || "Unable to open print dialog", "error");
                        return;
                    }
                    if (res.fallback === "share") {
                        showToast(
                            "Print module needs a rebuild. Shared sheet opened instead.",
                            "error"
                        );
                    }
                }}
            />

            <ExportReportSheet
                visible={exportOpen}
                onClose={() => setExportOpen(false)}
                onResult={(result) => {
                    if (result?.ok) {
                        showToast(
                            result.message || `${result.fileName || "Report"} downloaded`,
                            "success"
                        );
                    } else {
                        showToast(result?.message || "Export failed", "error");
                    }
                }}
            />

            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                setVisible={setToast}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    listContent: { paddingHorizontal: 14, paddingBottom: 28 },
    corridorCard: {
        marginTop: 12,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    corridorLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    corridorPin: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E8F1FB",
        alignItems: "center",
        justifyContent: "center",
    },
    corridorPinImg: { width: 16, height: 16, tintColor: BLUE },
    corridorTitle: { color: NAVY, fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
    corridorSub: { color: GREY, fontSize: 10, marginTop: 2 },
    liveBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F1FB",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 5,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE },
    liveTxt: { color: BLUE, fontSize: 10, fontWeight: "800" },
    actionsRow: {
        marginTop: 12,
        flexDirection: "row",
        gap: 8,
    },
    actionTile: {
        flex: 1,
        minHeight: 72,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        paddingVertical: 10,
        gap: 6,
    },
    actionTilePrimary: {
        backgroundColor: "#EEF4FF",
        borderColor: "#BFDBFE",
    },
    actionPlus: { color: BLUE, fontSize: 20, fontWeight: "700", lineHeight: 22 },
    actionIcon: { width: 18, height: 18, tintColor: NAVY },
    scanActionIcon: { width: 18, height: 18 },
    actionLabel: {
        color: NAVY,
        fontSize: 9,
        fontWeight: "700",
        textAlign: "center",
        lineHeight: 12,
    },
    actionLabelPrimary: { color: BLUE },
    sectionHead: {
        marginTop: 18,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionTitle: { color: NAVY, fontSize: 15, fontWeight: "800" },
    sectionCount: { color: GREY, fontSize: 11, marginTop: 2 },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
    },
    iconCircleTxt: { fontSize: 13 },
    searchBox: {
        marginBottom: 10,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        justifyContent: "center",
    },
    searchInput: { color: NAVY, fontSize: 13, paddingVertical: 0 },
    filterRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    filterChip: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    filterChipOn: { backgroundColor: NAVY, borderColor: NAVY },
    filterChipTxt: { color: NAVY, fontSize: 11, fontWeight: "700" },
    filterChipTxtOn: { color: WHITE },
    card: {
        flexDirection: "row",
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        padding: 10,
        marginBottom: 9,
        gap: 10,
    },
    cardSelected: { borderColor: "#93C5FD", backgroundColor: "#F7FAFF" },
    cardQrThumb: {
        width: 52,
        height: 52,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: LIGHTGREY,
        alignItems: "center",
        justifyContent: "center",
        padding: 6,
    },
    cardQrImg: { width: "100%", height: "100%" },
    cardBody: { flex: 1, minWidth: 0 },
    cardTopRow: { flexDirection: "row", alignItems: "center" },
    cardCode: { flex: 1, color: NAVY, fontSize: 13, fontWeight: "800" },
    cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionIconBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: LIGHTGREY,
    },
    rowActionIcon: { width: 15, height: 15, tintColor: NAVY },
    deactivateIcon: { width: 15, height: 15 },
    cardLocRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
    printRoot: { flex: 1, backgroundColor: "#F2F7FD" },
    printTopBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 18,
        paddingBottom: 12,
        backgroundColor: WHITE,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    printBackBtn: { paddingVertical: 6, paddingRight: 8 },
    printBackTxt: { color: GREY, fontSize: 12, fontWeight: "600" },
    printSheetBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: ORANGE,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    printSheetIcon: { width: 14, height: 14, tintColor: WHITE },
    printSheetTxt: { color: WHITE, fontSize: 12, fontWeight: "800" },
    printGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 10,
        paddingTop: 12,
        paddingBottom: 28,
        gap: 10,
    },
    printCard: {
        width: "31%",
        flexGrow: 1,
        maxWidth: "48%",
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 10,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    printQrWrap: {
        width: "100%",
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    printQrImg: { width: "88%", height: "88%" },
    printCode: {
        color: NAVY,
        fontSize: 9,
        fontWeight: "800",
        textAlign: "center",
    },
    printLoc: {
        color: NAVY,
        fontSize: 10,
        fontWeight: "700",
        textAlign: "center",
        marginTop: 3,
        lineHeight: 13,
    },
    printZone: {
        color: GREY,
        fontSize: 9,
        textAlign: "center",
        marginTop: 3,
    },
    cardLocIcon: { width: 11, height: 11, tintColor: GREY },
    cardLoc: { flex: 1, color: GREY, fontSize: 11 },
    cardBottomRow: { flexDirection: "row", alignItems: "center", marginTop: 7, gap: 7 },
    zonePill: {
        minWidth: 28,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#E8F1FB",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 7,
    },
    zonePillTxt: { color: BLUE, fontSize: 10, fontWeight: "800" },
    cardDate: { color: GREY, fontSize: 10 },
    activeBadge: {
        backgroundColor: "#E8F8EE",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    inactiveBadge: { backgroundColor: "#F1F5F9" },
    activeBadgeTxt: { color: GREEN, fontSize: 10, fontWeight: "700" },
    inactiveBadgeTxt: { color: GREY },
    emptyTxt: { textAlign: "center", color: GREY, fontSize: 13, marginTop: 28 },
    previewCard: {
        marginTop: 8,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#BFDBFE",
        padding: 12,
        gap: 12,
    },
    previewQr: {
        width: 64,
        height: 64,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: LIGHTGREY,
        padding: 6,
    },
    previewQrImg: { width: "100%", height: "100%" },
    previewBody: { flex: 1, minWidth: 0 },
    previewEyebrow: { color: BLUE, fontSize: 11, fontWeight: "800" },
    previewCode: { color: NAVY, fontSize: 14, fontWeight: "800", marginTop: 2 },
    previewLoc: { color: GREY, fontSize: 11, marginTop: 2 },
    previewTags: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
    previewZoneName: { color: NAVY, fontSize: 11, fontWeight: "600" },
    previewChevron: { color: "#8A9BB5", fontSize: 22, fontWeight: "600" },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    genCard: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: WHITE,
        borderRadius: 12,
        overflow: "visible",
        elevation: 10,
    },
    genHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    genTitle: { color: NAVY, fontSize: 14, fontWeight: "700", flex: 1, paddingRight: 8 },
    closeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
    closeTxt: { color: "#A0AAB8", fontSize: 22, lineHeight: 24 },
    genBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
    genField: { marginBottom: 12, zIndex: 1 },
    genFieldOpen: { zIndex: 40, elevation: 40 },
    fieldLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
    fieldLabelIcon: { width: 12, height: 12, marginRight: 5, tintColor: GREY },
    fieldLabel: { color: GREY, fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
    genInput: {
        height: 38,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        paddingHorizontal: 10,
        color: NAVY,
        fontSize: 12,
        backgroundColor: WHITE,
    },
    genHint: { color: GREY, fontSize: 10, marginTop: 5, lineHeight: 13 },
    createdLabel: { color: BLUE, fontSize: 12, fontWeight: "800", marginBottom: 6 },
    createdCode: { color: NAVY, fontSize: 22, fontWeight: "800", marginBottom: 8 },
    genSelect: {
        height: 38,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
    },
    genSelectFocus: { borderColor: "#93C5FD" },
    genSelectTxt: { flex: 1, color: NAVY, fontSize: 12, fontWeight: "500" },
    genSelectPlaceholder: { color: GREY, fontWeight: "400" },
    genSelectArrow: { color: GREY, fontSize: 11, marginLeft: 4 },
    genDropMenu: {
        position: "absolute",
        top: 58,
        left: 0,
        right: 0,
        maxHeight: 160,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        zIndex: 50,
        elevation: 8,
    },
    genDropItem: {
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F4F8",
    },
    genDropItemTxt: { color: NAVY, fontSize: 12, fontWeight: "500" },
    genFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#EEF1F5",
        gap: 8,
    },
    genCancelBtn: {
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
    },
    genCancelTxt: { color: NAVY, fontSize: 12, fontWeight: "700" },
    genPrimaryBtn: {
        height: 34,
        minWidth: 110,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: NAVY,
        alignItems: "center",
        justifyContent: "center",
    },
    genPrimaryTxt: { color: WHITE, fontSize: 12, fontWeight: "700" },
});
