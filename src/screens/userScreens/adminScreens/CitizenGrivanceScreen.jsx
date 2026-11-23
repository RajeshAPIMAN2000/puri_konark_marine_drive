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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    BLUE,
    GREEN,
    GREY,
    LIGHTGREY,
    NAVY,
    ORANGE,
    RED,
    WHITE,
} from "../../../constant/color";
import {
    LOCATION,
    ZONE,
    DESCRIPTION,
    QRCODES,
    DOWNLOAD,
    LINK,
    OPEN,
    PRINT,
} from "../../../constant/imagePath";
import { fetchPublicQr } from "../../../services/public/PublicGrievanceService";
import {
    createQrCode,
    deleteQrCode,
    fetchQrCodes,
    toErrorText,
    updateQrCode,
} from "../../../services/qr/QrService";
import CitizenPublicGrievanceForm from "./CitizenPublicGrievanceForm";

const DEFAULT_ZONES = ["A", "B", "C", "D", "E", "F", "G", "BBSR"];

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

const ActionBtn = ({ label, icon, onPress, danger = false }) => (
    <TouchableOpacity
        style={[styles.actionBtn, danger && styles.actionBtnDanger]}
        activeOpacity={0.85}
        onPress={onPress}
    >
        {icon ? (
            <Image
                source={icon}
                style={[styles.actionIcon, danger && styles.actionIconDanger]}
                resizeMode="contain"
            />
        ) : null}
        <Text
            allowFontScaling={false}
            style={[styles.actionTxt, danger && styles.actionTxtDanger]}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

const FieldLabel = ({ icon, text }) => (
    <View style={styles.genLabelRow}>
        {icon ? (
            <Image source={icon} style={styles.genLabelIcon} resizeMode="contain" />
        ) : null}
        <Text allowFontScaling={false} style={styles.genLabel}>
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
    const [vendorId, setVendorId] = useState("");
    const [notes, setNotes] = useState("");
    const [zoneOpen, setZoneOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLocationName("");
        setZone("");
        setVendorId("");
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
                                    placeholder="e.g. Chandrabhaga Beach Parking"
                                    placeholderTextColor={GREY}
                                />
                            </View>

                            <View style={[styles.genField, zoneOpen && styles.genFieldOpen]}>
                                <FieldLabel icon={ZONE} text="ZONE CODE" />
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
                                    <View style={styles.genDropMenu}>
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
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.genField}>
                                <FieldLabel text="VENDOR ID (OPTIONAL)" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.genInput}
                                    value={vendorId}
                                    onChangeText={setVendorId}
                                    placeholder="Vendor database ID"
                                    placeholderTextColor={GREY}
                                    keyboardType="number-pad"
                                />
                            </View>

                            <View style={styles.genField}>
                                <FieldLabel icon={DESCRIPTION} text="NOTES (OPTIONAL)" />
                                <TextInput
                                    allowFontScaling={false}
                                    style={styles.genInput}
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Additional information"
                                    placeholderTextColor={GREY}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.genFooter}>
                        <TouchableOpacity
                            style={styles.genCancelBtn}
                            activeOpacity={0.85}
                            onPress={close}
                        >
                            <Text allowFontScaling={false} style={styles.genCancelTxt}>
                                {createdCode ? "Close" : "Cancel"}
                            </Text>
                        </TouchableOpacity>
                        {!createdCode ? (
                            <TouchableOpacity
                                style={[styles.genPrimaryBtn, submitting && { opacity: 0.7 }]}
                                activeOpacity={0.85}
                                disabled={submitting}
                                onPress={() =>
                                    onSubmit?.({
                                        locationName,
                                        zoneCode: zone,
                                        vendorId: vendorId.trim() || undefined,
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

const EditQrModal = ({ visible, item, submitting, onClose, onSave }) => {
    const [locationName, setLocationName] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!visible || !item) return;
        setLocationName(item.locationName || item.place || "");
        setNotes(item.notes || "");
    }, [visible, item]);

    if (!item) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Pressable style={styles.genCard} onPress={() => {}}>
                    <View style={styles.genHeader}>
                        <Text allowFontScaling={false} style={styles.genTitle}>
                            Edit QR · {item.code}
                        </Text>
                        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                            <Text allowFontScaling={false} style={styles.closeTxt}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.genBody}>
                        <View style={styles.genField}>
                            <FieldLabel icon={LOCATION} text="LOCATION NAME" />
                            <TextInput
                                allowFontScaling={false}
                                style={styles.genInput}
                                value={locationName}
                                onChangeText={setLocationName}
                            />
                        </View>
                        <View style={styles.genField}>
                            <FieldLabel icon={DESCRIPTION} text="NOTES" />
                            <TextInput
                                allowFontScaling={false}
                                style={styles.genInput}
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>
                    </View>
                    <View style={styles.genFooter}>
                        <TouchableOpacity style={styles.genCancelBtn} onPress={onClose}>
                            <Text allowFontScaling={false} style={styles.genCancelTxt}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.genPrimaryBtn, submitting && { opacity: 0.7 }]}
                            disabled={submitting}
                            onPress={() => onSave?.({ locationName, notes })}
                        >
                            {submitting ? (
                                <ActivityIndicator color={WHITE} size="small" />
                            ) : (
                                <Text allowFontScaling={false} style={styles.genPrimaryTxt}>
                                    Save
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const QrDetailModal = ({
    item,
    visible,
    onClose,
    onOpenForm,
    onToggleActive,
    onEdit,
    onDelete,
    busy,
}) => {
    const [liveQr, setLiveQr] = useState(null);
    const [liveLoading, setLiveLoading] = useState(false);

    useEffect(() => {
        let active = true;
        if (!visible || !item?.code) {
            setLiveQr(null);
            return undefined;
        }
        setLiveLoading(true);
        fetchPublicQr(item.code)
            .then((res) => {
                if (!active) return;
                setLiveQr(res.ok ? res.data : null);
            })
            .catch(() => {
                if (active) setLiveQr(null);
            })
            .finally(() => {
                if (active) setLiveLoading(false);
            });
        return () => {
            active = false;
        };
    }, [visible, item?.code]);

    if (!item) return null;

    const place = liveQr?.locationName || item.locationName || item.place;
    const zoneName = liveQr?.zoneName || item.zoneName;
    const zoneCode = liveQr?.zoneCode || item.zoneCode || item.zone;
    const vendorLine =
        liveQr?.vendor?.shopName ||
        (item.vendorName && item.vendorName !== "—"
            ? `${item.vendorName}${item.vendorOwner ? ` · ${item.vendorOwner}` : ""}`
            : null);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Pressable style={styles.modalCard} onPress={() => {}}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalPinWrap}>
                            <Image
                                source={LOCATION}
                                style={styles.modalPinImg}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.modalHeaderInfo}>
                            <Text allowFontScaling={false} style={styles.modalCode}>
                                {item.code}
                            </Text>
                            <Text allowFontScaling={false} style={styles.modalPlace}>
                                {place}
                            </Text>
                            <Text allowFontScaling={false} style={styles.modalZone}>
                                {zoneName}
                                {zoneCode ? ` · ${zoneCode}` : ""}
                            </Text>
                            {item.supervisorName && item.supervisorName !== "—" ? (
                                <Text allowFontScaling={false} style={styles.modalPlace}>
                                    Supervisor: {item.supervisorName}
                                </Text>
                            ) : null}
                            {vendorLine ? (
                                <Text allowFontScaling={false} style={styles.modalPlace}>
                                    Vendor: {vendorLine}
                                </Text>
                            ) : null}
                            {item.notes ? (
                                <Text allowFontScaling={false} style={styles.modalPlace}>
                                    Notes: {item.notes}
                                </Text>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                            <Text allowFontScaling={false} style={styles.closeTxt}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.modalScroll}
                    >
                        {liveLoading || busy ? (
                            <ActivityIndicator color={NAVY} style={{ marginVertical: 12 }} />
                        ) : null}
                        <View style={styles.qrFrame}>
                            <Image
                                source={QRCODES}
                                style={styles.qrImage}
                                resizeMode="contain"
                            />
                        </View>

                        <View
                            style={[
                                styles.statusBar,
                                !item.active && { backgroundColor: "#F1F5F9" },
                            ]}
                        >
                            <View style={styles.statusLeft}>
                                <View
                                    style={[
                                        styles.statusDot,
                                        { backgroundColor: item.active ? GREEN : GREY },
                                    ]}
                                />
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        styles.statusTxt,
                                        !item.active && { color: GREY },
                                    ]}
                                >
                                    {item.active ? "Active" : "Inactive"}
                                    {liveQr ? " · QR Verified" : ""}
                                </Text>
                            </View>
                            <Text allowFontScaling={false} style={styles.createdTxt}>
                                Created {item.created}
                            </Text>
                        </View>

                        <ActionBtn label="Download PNG" icon={DOWNLOAD} />
                        <ActionBtn label="Copy Link" icon={LINK} />
                        <ActionBtn
                            label="Open Grievance Form"
                            icon={OPEN}
                            onPress={() => onOpenForm?.(item.code)}
                        />
                        <ActionBtn label="Print Sheet" icon={PRINT} />
                        <ActionBtn label="Edit location / notes" onPress={onEdit} />
                        <ActionBtn
                            label={item.active ? "Deactivate QR" : "Activate QR"}
                            onPress={onToggleActive}
                        />
                        <ActionBtn label="Delete QR code" danger onPress={onDelete} />

                        <View style={styles.infoBox}>
                            <View style={styles.infoIcon}>
                                <Text allowFontScaling={false} style={styles.infoIconTxt}>
                                    i
                                </Text>
                            </View>
                            <Text allowFontScaling={false} style={styles.infoTxt}>
                                Deactivating a QR stops public citizen submissions for that
                                code. Delete permanently removes the record.
                            </Text>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const QrCard = ({ item, selected, onPress }) => (
    <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        activeOpacity={0.88}
        onPress={onPress}
    >
        <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
                <Text allowFontScaling={false} style={styles.cardId}>
                    {item.code}
                </Text>
                <Text allowFontScaling={false} style={styles.cardPlace} numberOfLines={1}>
                    {item.locationName || item.place}
                </Text>
                {item.supervisorName && item.supervisorName !== "—" ? (
                    <Text allowFontScaling={false} style={styles.cardMeta} numberOfLines={1}>
                        Supervisor: {item.supervisorName}
                    </Text>
                ) : null}
                {item.vendorName && item.vendorName !== "—" ? (
                    <Text allowFontScaling={false} style={styles.cardMeta} numberOfLines={1}>
                        Vendor: {item.vendorName}
                    </Text>
                ) : null}
            </View>
            <Text allowFontScaling={false} style={styles.chevron}>
                ›
            </Text>
        </View>
        <View style={styles.cardTags}>
            <View style={[styles.zonePill, { width: undefined, paddingHorizontal: 8 }]}>
                <Text allowFontScaling={false} style={styles.zonePillTxt}>
                    {item.zoneCode || item.zone}
                </Text>
            </View>
            <View
                style={[
                    styles.activePill,
                    !item.active && { backgroundColor: "#F1F5F9" },
                ]}
            >
                <View
                    style={[
                        styles.activeDot,
                        { backgroundColor: item.active ? GREEN : GREY },
                    ]}
                />
                <Text
                    allowFontScaling={false}
                    style={[styles.activePillTxt, !item.active && { color: GREY }]}
                >
                    {item.active ? "Active" : "Inactive"}
                </Text>
            </View>
        </View>
    </TouchableOpacity>
);

const CitizenGrivanceScreen = () => {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [zoneFilter, setZoneFilter] = useState("");
    const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createdCode, setCreatedCode] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [formQrCode, setFormQrCode] = useState("");
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
                    zoneCode: zoneFilter || undefined,
                    active:
                        status === "active"
                            ? true
                            : status === "inactive"
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
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load QR codes"), "error");
                setItems([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [status, zoneFilter, showToast]
    );

    useEffect(() => {
        loadQrCodes();
    }, [loadQrCodes]);

    const zoneOptions = useMemo(() => {
        const fromData = items.map((i) => i.zoneCode).filter(Boolean);
        return Array.from(new Set([...DEFAULT_ZONES, ...fromData])).sort();
    }, [items]);

    const statusChips = useMemo(() => {
        const total = Number(meta.total) || items.length;
        const activeCount = items.filter((i) => i.active).length;
        const inactiveCount = items.filter((i) => !i.active).length;
        return [
            { key: "all", label: "All", count: status === "all" ? total : total },
            { key: "active", label: "Active", count: status === "active" ? total : activeCount, dot: GREEN },
            {
                key: "inactive",
                label: "Inactive",
                count: status === "inactive" ? total : inactiveCount,
                dot: GREY,
            },
        ];
    }, [items, meta.total, status]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => {
            return (
                String(item.code || "").toLowerCase().includes(q) ||
                String(item.locationName || "").toLowerCase().includes(q) ||
                String(item.zoneCode || "").toLowerCase().includes(q) ||
                String(item.supervisorName || "").toLowerCase().includes(q) ||
                String(item.vendorName || "").toLowerCase().includes(q) ||
                String(item.notes || "").toLowerCase().includes(q)
            );
        });
    }, [items, search]);

    const openQr = (item) => {
        setSelected(item);
        setModalOpen(true);
    };

    const openCitizenForm = useCallback((code) => {
        setFormQrCode(String(code || "").trim());
        setModalOpen(false);
        setFormOpen(true);
    }, []);

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
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to generate QR"), "error");
            } finally {
                setCreating(false);
            }
        },
        [loadQrCodes, showToast]
    );

    const onToggleActive = useCallback(async () => {
        if (!selected?.id || busy) return;
        setBusy(true);
        try {
            const res = await updateQrCode(selected.id, { active: !selected.active });
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            const next = { ...selected, active: !selected.active, ...(res.data || {}) };
            setSelected(next);
            setItems((prev) => prev.map((row) => (row.id === next.id ? { ...row, ...next } : row)));
            showToast(
                next.active ? "QR code activated" : "QR code deactivated",
                "success"
            );
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to update QR"), "error");
        } finally {
            setBusy(false);
        }
    }, [selected, busy, showToast]);

    const onSaveEdit = useCallback(
        async (payload) => {
            if (!selected?.id) return;
            setSaving(true);
            try {
                const res = await updateQrCode(selected.id, payload);
                if (!res.ok) {
                    showToast(res.message, "error");
                    return;
                }
                const next = {
                    ...selected,
                    locationName: payload.locationName,
                    place: payload.locationName,
                    notes: payload.notes,
                    ...(res.data || {}),
                };
                setSelected(next);
                setItems((prev) =>
                    prev.map((row) => (row.id === next.id ? { ...row, ...next } : row))
                );
                setEditOpen(false);
                showToast("QR code updated", "success");
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to update QR"), "error");
            } finally {
                setSaving(false);
            }
        },
        [selected, showToast]
    );

    const onDelete = useCallback(() => {
        if (!selected?.id) return;
        Alert.alert(
            "Delete QR code",
            "Are you sure you want to delete this QR code?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setBusy(true);
                        try {
                            const res = await deleteQrCode(selected.id);
                            if (!res.ok) {
                                showToast(res.message, "error");
                                return;
                            }
                            setItems((prev) => prev.filter((row) => row.id !== selected.id));
                            setModalOpen(false);
                            setSelected(null);
                            showToast("QR code deleted", "success");
                        } catch (e) {
                            showToast(
                                toErrorText(e?.message || e, "Failed to delete QR"),
                                "error"
                            );
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    }, [selected, showToast]);

    return (
        <View style={styles.root}>
            <MyHeader
                title="Citizen Grievance QR Codes"
                subtitle=""
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <View style={styles.pageHead}>
                <Text allowFontScaling={false} style={styles.eyebrow}>
                    PKMD CRM · Super Admin
                </Text>
                <View style={styles.titleRow}>
                    <Text allowFontScaling={false} style={styles.pageTitle}>
                        Citizen Grievance QR Codes
                    </Text>
                    <TouchableOpacity
                        style={styles.newBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                            setCreatedCode("");
                            setGenerateOpen(true);
                        }}
                    >
                        <Text allowFontScaling={false} style={styles.newBtnTxt}>
                            + New QR code
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text allowFontScaling={false} style={styles.pageHint}>
                    Print and install on-site. Scanning opens a no-login grievance form.
                </Text>
            </View>

            <View style={styles.filters}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Text allowFontScaling={false} style={styles.searchIcon}>
                            🔍
                        </Text>
                        <TextInput
                            allowFontScaling={false}
                            style={styles.searchInput}
                            placeholder="Search by location, code or keyword..."
                            placeholderTextColor={GREY}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.zoneDrop}
                        activeOpacity={0.85}
                        onPress={() => setZoneMenuOpen((v) => !v)}
                    >
                        <PinIcon color={NAVY} size={11} />
                        <Text allowFontScaling={false} style={styles.zoneDropTxt}>
                            {zoneFilter || "All zones"}
                        </Text>
                        <Text allowFontScaling={false} style={styles.zoneDropArrow}>
                            ▾
                        </Text>
                    </TouchableOpacity>
                </View>
                {zoneMenuOpen ? (
                    <View style={styles.zoneMenu}>
                        <TouchableOpacity
                            style={styles.genDropItem}
                            onPress={() => {
                                setZoneFilter("");
                                setZoneMenuOpen(false);
                            }}
                        >
                            <Text allowFontScaling={false} style={styles.genDropItemTxt}>
                                All zones
                            </Text>
                        </TouchableOpacity>
                        {zoneOptions.map((z) => (
                            <TouchableOpacity
                                key={z}
                                style={styles.genDropItem}
                                onPress={() => {
                                    setZoneFilter(z);
                                    setZoneMenuOpen(false);
                                }}
                            >
                                <Text allowFontScaling={false} style={styles.genDropItemTxt}>
                                    {z}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : null}

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                >
                    {statusChips.map((c) => {
                        const active = status === c.key;
                        return (
                            <TouchableOpacity
                                key={c.key}
                                activeOpacity={0.85}
                                onPress={() => setStatus(c.key)}
                                style={[styles.chip, active && styles.chipActive]}
                            >
                                {c.dot ? (
                                    <View
                                        style={[styles.chipDot, { backgroundColor: c.dot }]}
                                    />
                                ) : null}
                                <Text
                                    allowFontScaling={false}
                                    style={[styles.chipTxt, active && styles.chipTxtActive]}
                                >
                                    {c.label} ({c.count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
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
                            onRefresh={() => loadQrCodes({ soft: true })}
                        />
                    }
                    renderItem={({ item }) => (
                        <QrCard
                            item={item}
                            selected={selected?.id === item.id}
                            onPress={() => openQr(item)}
                        />
                    )}
                    ListEmptyComponent={
                        <Text allowFontScaling={false} style={styles.emptyTxt}>
                            No QR codes found
                        </Text>
                    }
                />
            )}

            <QrDetailModal
                item={selected}
                visible={modalOpen}
                onClose={() => setModalOpen(false)}
                onOpenForm={openCitizenForm}
                onToggleActive={onToggleActive}
                onEdit={() => setEditOpen(true)}
                onDelete={onDelete}
                busy={busy}
            />

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

            <EditQrModal
                visible={editOpen}
                item={selected}
                submitting={saving}
                onClose={() => setEditOpen(false)}
                onSave={onSaveEdit}
            />

            <CitizenPublicGrievanceForm
                visible={formOpen}
                qrCode={formQrCode}
                onClose={() => setFormOpen(false)}
                onToast={showToast}
            />

            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                setVisible={setToast}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5F7FA" },
    pageHead: {
        backgroundColor: WHITE,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 8,
    },
    eyebrow: {
        color: GREY,
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    pageTitle: { flex: 1, color: NAVY, fontSize: 16, fontWeight: "800" },
    newBtn: {
        backgroundColor: ORANGE,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    newBtnTxt: { color: WHITE, fontSize: 11, fontWeight: "700" },
    pageHint: { color: GREY, fontSize: 10, marginTop: 5, lineHeight: 14 },
    filters: {
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
        zIndex: 5,
    },
    searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
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
        marginRight: 8,
    },
    searchIcon: { fontSize: 11, marginRight: 6 },
    searchInput: { flex: 1, color: NAVY, fontSize: 11, paddingVertical: 0 },
    zoneDrop: {
        height: 36,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
    },
    zoneDropTxt: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "600",
        marginHorizontal: 5,
    },
    zoneDropArrow: { color: GREY, fontSize: 10 },
    zoneMenu: {
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        marginBottom: 8,
        overflow: "hidden",
    },
    chipsRow: { paddingRight: 4 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 6,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    chipActive: { backgroundColor: NAVY, borderColor: NAVY },
    chipDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    chipTxt: { color: NAVY, fontSize: 11, fontWeight: "700" },
    chipTxtActive: { color: WHITE },
    listContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
    card: {
        backgroundColor: WHITE,
        borderRadius: 11,
        padding: 11,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#EEF1F5",
    },
    cardSelected: { backgroundColor: "#EEF5FF", borderColor: "#93C5FD" },
    cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
    cardInfo: { flex: 1, paddingRight: 6 },
    cardId: { color: NAVY, fontSize: 13, fontWeight: "800", marginBottom: 2 },
    cardPlace: { color: GREY, fontSize: 11 },
    cardMeta: { color: "#7185A5", fontSize: 10, marginTop: 2 },
    chevron: { color: "#C0C7D2", fontSize: 18, marginTop: -2 },
    cardTags: { flexDirection: "row", alignItems: "center" },
    zonePill: {
        height: 26,
        borderRadius: 13,
        backgroundColor: LIGHTGREY,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 7,
    },
    zonePillTxt: { color: NAVY, fontSize: 9, fontWeight: "800" },
    activePill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F8EE",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    activeDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
    activePillTxt: { color: GREEN, fontSize: 10, fontWeight: "700" },
    emptyTxt: { textAlign: "center", color: GREY, fontSize: 12, marginTop: 40 },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    modalCard: {
        width: "100%",
        maxWidth: 360,
        maxHeight: "88%",
        backgroundColor: WHITE,
        borderRadius: 14,
        overflow: "hidden",
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    modalPinWrap: {
        width: 34,
        height: 34,
        borderRadius: 9,
        backgroundColor: "#E8F1FB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 9,
    },
    modalPinImg: { width: 16, height: 16, tintColor: BLUE },
    modalHeaderInfo: { flex: 1 },
    modalCode: { color: NAVY, fontSize: 13, fontWeight: "800" },
    modalPlace: { color: GREY, fontSize: 11, marginTop: 1 },
    modalZone: { color: NAVY, fontSize: 10, fontWeight: "600", marginTop: 1 },
    closeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
    closeTxt: { color: "#A0AAB8", fontSize: 22, lineHeight: 24 },
    modalScroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 },
    qrFrame: {
        alignSelf: "center",
        width: 180,
        height: 180,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
        marginBottom: 10,
    },
    qrImage: { width: "100%", height: "100%" },
    statusBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#E8F8EE",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginBottom: 10,
    },
    statusLeft: { flexDirection: "row", alignItems: "center" },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: GREEN,
        marginRight: 6,
    },
    statusTxt: { color: GREEN, fontSize: 11, fontWeight: "800" },
    createdTxt: { color: GREY, fontSize: 9, fontWeight: "500" },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#BFDBFE",
        backgroundColor: WHITE,
        marginBottom: 7,
    },
    actionBtnDanger: { borderColor: "#FECACA", backgroundColor: "#FFF5F5" },
    actionIcon: { width: 14, height: 14, marginRight: 7, tintColor: BLUE },
    actionIconDanger: { tintColor: RED },
    actionTxt: { color: BLUE, fontSize: 12, fontWeight: "700" },
    actionTxtDanger: { color: RED },
    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#E8F1FB",
        borderRadius: 9,
        padding: 10,
        marginTop: 4,
    },
    infoIcon: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: BLUE,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
        marginTop: 1,
    },
    infoIconTxt: { color: WHITE, fontSize: 10, fontWeight: "800" },
    infoTxt: { flex: 1, color: NAVY, fontSize: 10, lineHeight: 14, fontWeight: "500" },
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
    genTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
        flex: 1,
        paddingRight: 8,
    },
    genBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
    genField: { marginBottom: 12, zIndex: 1 },
    genFieldOpen: { zIndex: 40, elevation: 40 },
    genLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
    genLabelIcon: { width: 12, height: 12, marginRight: 5, tintColor: GREY },
    genLabel: { color: GREY, fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
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
    createdLabel: { color: GREEN, fontSize: 12, fontWeight: "800", marginBottom: 6 },
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
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        zIndex: 50,
        elevation: 8,
        overflow: "hidden",
        maxHeight: 180,
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

export default CitizenGrivanceScreen;
