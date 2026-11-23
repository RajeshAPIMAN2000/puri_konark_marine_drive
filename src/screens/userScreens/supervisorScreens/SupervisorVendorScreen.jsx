import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
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
import { MyAlert } from "../../../components/commonComponents/MyAlert";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { GREEN, GREY, NAVY, ORANGE, RED, WHITE } from "../../../constant/color";
import {
    fetchSelfSupervisor,
    fetchSupervisors,
} from "../../../services/supervisors/SupervisorsService";
import {
    createVendor,
    deleteVendor,
    fetchVendors,
    getLoginRoleKey,
    toErrorText,
    updateVendor,
} from "../../../services/vendor/VendorService";

const STATUS_OPTIONS = ["All statuses", "active", "inactive", "unverified"];

const VendorRow = ({ vendor, canDelete, onEdit, onDelete }) => {
    const statusColor =
        vendor.status === "active"
            ? "#078541"
            : vendor.status === "inactive"
              ? RED
              : ORANGE;
    const statusBg =
        vendor.status === "active"
            ? "#E9FBF2"
            : vendor.status === "inactive"
              ? "#FEE2E2"
              : "#FFF7ED";
    return (
        <TouchableOpacity activeOpacity={0.8} style={styles.vendorCard} onPress={onEdit}>
            <View style={[styles.vendorAvatar, { backgroundColor: vendor.color || "#2161F5" }]}>
                <Text style={styles.avatarLetter}>{vendor.initial}</Text>
            </View>
            <View style={styles.vendorInfo}>
                <Text numberOfLines={1} style={styles.shopName}>
                    {vendor.shopName}
                </Text>
                <Text numberOfLines={1} style={styles.ownerName}>
                    {vendor.ownerName}
                </Text>
                <View style={styles.detailLine}>
                    <SimpleIcon name="phone" size={15} color="#526B9B" />
                    <Text style={styles.detailText}>{vendor.mobileNumber || "—"}</Text>
                </View>
            </View>
            <View style={styles.vendorRight}>
                <View style={[styles.activeBadge, { backgroundColor: statusBg, borderColor: statusBg }]}>
                    <View style={[styles.activeDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.activeText, { color: statusColor }]}>
                        {vendor.statusLabel}
                    </Text>
                </View>
                <View style={styles.detailLine}>
                    <SimpleIcon name="map-marker-outline" size={15} color="#526B9B" />
                    <Text numberOfLines={1} style={styles.locationText}>
                        {vendor.coords}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity hitSlop={8} onPress={onEdit}>
                    <Text style={styles.editIcon}>✎</Text>
                </TouchableOpacity>
                {canDelete ? (
                    <TouchableOpacity hitSlop={8} onPress={onDelete}>
                        <Text style={styles.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity hitSlop={8} onPress={onEdit}>
                        <Text style={styles.moreIcon}>⋮</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const VendorFormModal = ({
    visible,
    initial = null,
    supervisors = [],
    showSupervisorPicker = false,
    submitting = false,
    onClose,
    onSubmit,
}) => {
    const [shopName, setShopName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [sideRemark, setSideRemark] = useState("");
    const [status, setStatus] = useState("active");
    const [supervisorId, setSupervisorId] = useState(null);
    const [statusOpen, setStatusOpen] = useState(false);
    const [supOpen, setSupOpen] = useState(false);
    const isEdit = !!initial?.id;

    useEffect(() => {
        if (!visible) return;
        setShopName(initial?.shopName || "");
        setOwnerName(initial?.ownerName || "");
        setMobileNumber(
            initial?.mobileNumber && initial.mobileNumber !== "—"
                ? String(initial.mobileNumber)
                : ""
        );
        setLatitude(
            initial?.latitude != null ? String(initial.latitude) : ""
        );
        setLongitude(
            initial?.longitude != null ? String(initial.longitude) : ""
        );
        setSideRemark(initial?.sideRemark || "");
        setStatus(initial?.status || "active");
        setSupervisorId(initial?.supervisorId ?? null);
        setStatusOpen(false);
        setSupOpen(false);
    }, [visible, initial]);

    const selectedSup = supervisors.find(
        (s) => String(s.id) === String(supervisorId)
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalRoot} onPress={submitting ? undefined : onClose}>
                <Pressable style={styles.formCard} onPress={() => {}}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>
                            {isEdit ? "Edit vendor" : "Add vendor"}
                        </Text>
                        <TouchableOpacity onPress={onClose} disabled={submitting}>
                            <Text style={styles.formClose}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        contentContainerStyle={styles.formBody}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.fieldLabel}>SHOP NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={shopName}
                            onChangeText={setShopName}
                            placeholder="Shop name"
                            placeholderTextColor="#91A2C3"
                        />
                        <Text style={styles.fieldLabel}>OWNER NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={ownerName}
                            onChangeText={setOwnerName}
                            placeholder="Owner name"
                            placeholderTextColor="#91A2C3"
                        />
                        <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                        <TextInput
                            style={styles.input}
                            value={mobileNumber}
                            onChangeText={setMobileNumber}
                            keyboardType="phone-pad"
                            placeholder="Mobile number"
                            placeholderTextColor="#91A2C3"
                            maxLength={24}
                        />
                        {showSupervisorPicker ? (
                            <>
                                <Text style={styles.fieldLabel}>SUPERVISOR / ZONE</Text>
                                <TouchableOpacity
                                    style={styles.selectField}
                                    onPress={() => setSupOpen((v) => !v)}
                                >
                                    <Text
                                        style={[
                                            styles.selectFieldTxt,
                                            !selectedSup && { color: GREY },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {selectedSup
                                            ? `${selectedSup.zone} — ${selectedSup.name}`
                                            : "Select supervisor..."}
                                    </Text>
                                    <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                                </TouchableOpacity>
                                {supOpen && (
                                    <View style={styles.menu}>
                                        {supervisors.map((item) => (
                                            <TouchableOpacity
                                                key={String(item.id)}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setSupervisorId(item.id);
                                                    setSupOpen(false);
                                                }}
                                            >
                                                <Text style={styles.menuTxt}>
                                                    {item.zone} — {item.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        ) : null}
                        <View style={styles.coordRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>LATITUDE</Text>
                                <TextInput
                                    style={styles.input}
                                    value={latitude}
                                    onChangeText={setLatitude}
                                    keyboardType="decimal-pad"
                                    placeholder="19.81..."
                                    placeholderTextColor="#91A2C3"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>LONGITUDE</Text>
                                <TextInput
                                    style={styles.input}
                                    value={longitude}
                                    onChangeText={setLongitude}
                                    keyboardType="decimal-pad"
                                    placeholder="85.83..."
                                    placeholderTextColor="#91A2C3"
                                />
                            </View>
                        </View>
                        <Text style={styles.fieldLabel}>STATUS</Text>
                        <TouchableOpacity
                            style={styles.selectField}
                            onPress={() => setStatusOpen((v) => !v)}
                        >
                            <Text style={styles.selectFieldTxt}>{status}</Text>
                            <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                        </TouchableOpacity>
                        {statusOpen && (
                            <View style={styles.menu}>
                                {["active", "inactive", "unverified"].map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setStatus(item);
                                            setStatusOpen(false);
                                        }}
                                    >
                                        <Text style={styles.menuTxt}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <Text style={styles.fieldLabel}>REMARK (OPTIONAL)</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 64, textAlignVertical: "top" }]}
                            value={sideRemark}
                            onChangeText={setSideRemark}
                            placeholder="Side remark"
                            placeholderTextColor="#91A2C3"
                            multiline
                        />
                    </ScrollView>
                    <View style={styles.formFooter}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            disabled={submitting}
                        >
                            <Text style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
                            disabled={submitting}
                            onPress={() =>
                                onSubmit({
                                    id: initial?.id,
                                    shopName,
                                    ownerName,
                                    mobileNumber,
                                    latitude,
                                    longitude,
                                    sideRemark,
                                    status,
                                    supervisorId,
                                })
                            }
                        >
                            {submitting ? (
                                <ActivityIndicator color={WHITE} />
                            ) : (
                                <Text style={styles.saveTxt}>
                                    {isEdit ? "Update" : "Save"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default function SupervisorVendorScreen() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All statuses");
    const [statusOpen, setStatusOpen] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [selfZone, setSelfZone] = useState(null);
    const [supervisors, setSupervisors] = useState([]);
    const [roleKey, setRoleKey] = useState("");
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });

    const canDelete = roleKey === "super_admin";
    const showSupervisorPicker = roleKey === "super_admin" || roleKey === "authority";

    const showToast = useCallback((message, type = "error") => {
        setToast({
            visible: true,
            message: toErrorText(message, String(message || "")),
            type,
        });
    }, []);

    const loadVendors = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const res = await fetchVendors({
                    page: 1,
                    limit: 50,
                    status: status === "All statuses" ? undefined : status,
                    q: search.trim() || undefined,
                });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setVendors([]);
                    return;
                }
                setVendors(res.data || []);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load vendors"), "error");
                setVendors([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [status, search, showToast]
    );

    useEffect(() => {
        (async () => {
            const role = await getLoginRoleKey();
            setRoleKey(role);
            if (role === "super_admin" || role === "authority") {
                const supRes = await fetchSupervisors({ page: 1, limit: 50 });
                if (supRes.ok) setSupervisors(supRes.data || []);
            } else {
                const selfRes = await fetchSelfSupervisor();
                if (selfRes.ok) setSelfZone(selfRes.data);
            }
        })();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => loadVendors(), 250);
        return () => clearTimeout(timer);
    }, [loadVendors]);

    const filtered = useMemo(() => vendors, [vendors]);

    const saveVendor = async (data) => {
        if (saving) return;
        setSaving(true);
        try {
            const payload = {
                shopName: data.shopName,
                ownerName: data.ownerName,
                mobileNumber: data.mobileNumber,
                sideRemark: data.sideRemark,
                status: data.status,
            };
            if (data.latitude !== "" && data.longitude !== "") {
                payload.latitude = data.latitude;
                payload.longitude = data.longitude;
            }
            if (showSupervisorPicker && data.supervisorId) {
                payload.supervisorId = data.supervisorId;
            }
            const res = data.id
                ? await updateVendor(data.id, payload)
                : await createVendor(payload);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setFormOpen(false);
            setEditing(null);
            showToast(data.id ? "Vendor updated" : "Vendor registered", "success");
            await loadVendors({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to save vendor"), "error");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        const id = deleteId;
        try {
            const res = await deleteVendor(id);
            setDeleteId(null);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setVendors((prev) => prev.filter((v) => String(v.id) !== String(id)));
            showToast("Vendor deleted", "success");
        } catch (e) {
            setDeleteId(null);
            showToast(toErrorText(e?.message || e, "Failed to delete vendor"), "error");
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Vendor Map & Registry"
                subtitle=""
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadVendors({ soft: true })}
                    />
                }
            >
                {selfZone ? (
                    <View style={styles.zoneCard}>
                        <View
                            style={[
                                styles.zoneAvatar,
                                { backgroundColor: selfZone.color || "#145AF2" },
                            ]}
                        >
                            <Text style={styles.zoneLetter}>
                                {selfZone.letter || selfZone.zoneCode || "Z"}
                            </Text>
                        </View>
                        <View style={styles.zoneInfo}>
                            <Text style={styles.zoneTitle}>{selfZone.name}</Text>
                            <Text numberOfLines={1} style={styles.zoneArea}>
                                {selfZone.segment || selfZone.assignedRoadSegment || "—"}
                            </Text>
                            <Text numberOfLines={1} style={styles.zoneCoordinates}>
                                Zone {selfZone.zoneCode} · {selfZone.vendors || 0} shops
                            </Text>
                        </View>
                        <View style={styles.zoneRight}>
                            <Text style={styles.zoneCountText}>
                                {filtered.length} listed
                            </Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <SimpleIcon name="magnify" size={22} color={NAVY} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search shop, owner, mobile..."
                            placeholderTextColor="#91A2C3"
                            style={styles.searchInput}
                        />
                    </View>
                </View>
                <View style={styles.controlsRow}>
                    <View style={styles.statusWrap}>
                        <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => setStatusOpen((open) => !open)}
                        >
                            <Text style={styles.selectText}>{status}</Text>
                            <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                        </TouchableOpacity>
                        {statusOpen && (
                            <View style={styles.statusMenu}>
                                {STATUS_OPTIONS.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={styles.statusOption}
                                        onPress={() => {
                                            setStatus(item);
                                            setStatusOpen(false);
                                        }}
                                    >
                                        <Text style={styles.statusOptionText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Text style={styles.addPlus}>+</Text>
                        <Text style={styles.addText}>Add Vendor</Text>
                    </TouchableOpacity>
                </View>

                {loading && !filtered.length ? (
                    <ActivityIndicator color={NAVY} style={{ marginTop: 28 }} />
                ) : (
                    <View style={styles.vendorList}>
                        {filtered.map((vendor) => (
                            <VendorRow
                                key={String(vendor.id)}
                                vendor={vendor}
                                canDelete={canDelete}
                                onEdit={() => {
                                    setEditing(vendor);
                                    setFormOpen(true);
                                }}
                                onDelete={() => setDeleteId(vendor.id)}
                            />
                        ))}
                        {!filtered.length ? (
                            <Text style={styles.emptyTxt}>No vendors found</Text>
                        ) : null}
                    </View>
                )}
            </ScrollView>

            <VendorFormModal
                visible={formOpen}
                initial={editing}
                supervisors={supervisors}
                showSupervisorPicker={showSupervisorPicker}
                submitting={saving}
                onClose={() => {
                    setFormOpen(false);
                    setEditing(null);
                }}
                onSubmit={saveVendor}
            />

            <MyAlert
                visible={!!deleteId}
                title="Delete Vendor"
                message="Are you sure you want to delete this vendor?"
                textRight="Delete"
                textLeft="Cancel"
                backgroundColor={RED}
                color={WHITE}
                onPressRight={confirmDelete}
                onPressLeft={() => setDeleteId(null)}
                onRequestClose={() => setDeleteId(null)}
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
    root: { flex: 1, backgroundColor: "#F5FAFF" },
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 18 },
    zoneCard: {
        minHeight: 92,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 9,
        marginBottom: 12,
        gap: 10,
        elevation: 1,
    },
    zoneAvatar: {
        width: 55,
        height: 55,
        borderRadius: 13,
        backgroundColor: "#145AF2",
        alignItems: "center",
        justifyContent: "center",
    },
    zoneLetter: { color: WHITE, fontSize: 24, fontWeight: "700" },
    zoneInfo: { flex: 1, minWidth: 0 },
    zoneTitle: { color: "#0A174A", fontSize: 13, fontWeight: "800" },
    zoneArea: { color: "#7186AE", fontSize: 11, marginTop: 3 },
    zoneCoordinates: { color: "#8094B7", fontSize: 9, marginTop: 5 },
    zoneRight: {
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "stretch",
        paddingVertical: 8,
    },
    zoneCountText: { color: NAVY, fontSize: 12, fontWeight: "700" },
    searchRow: { flexDirection: "row", gap: 9, marginBottom: 10 },
    searchBox: {
        flex: 1,
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 14,
        paddingHorizontal: 11,
        gap: 9,
    },
    searchInput: { flex: 1, padding: 0, color: NAVY, fontSize: 12 },
    controlsRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
    selectButton: {
        minWidth: 0,
        flex: 1,
        height: 43,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 13,
        paddingHorizontal: 10,
    },
    selectText: { color: NAVY, fontSize: 11, fontWeight: "500", flexShrink: 1 },
    statusWrap: { flex: 1, position: "relative", zIndex: 2 },
    statusMenu: {
        position: "absolute",
        top: 46,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 12,
        elevation: 5,
    },
    statusOption: { paddingHorizontal: 10, paddingVertical: 9 },
    statusOptionText: { color: NAVY, fontSize: 11 },
    addButton: {
        height: 43,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingHorizontal: 10,
        backgroundColor: "#EA5F0B",
        borderRadius: 13,
    },
    addPlus: { color: WHITE, fontSize: 19, lineHeight: 21 },
    addText: { color: WHITE, fontSize: 11, fontWeight: "700" },
    vendorList: { gap: 8 },
    emptyTxt: { color: GREY, textAlign: "center", paddingVertical: 28 },
    vendorCard: {
        minHeight: 94,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 16,
        paddingHorizontal: 9,
        paddingVertical: 9,
        gap: 8,
        elevation: 1,
    },
    vendorAvatar: {
        width: 45,
        height: 45,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarLetter: { color: WHITE, fontSize: 20, fontWeight: "700" },
    vendorInfo: { flex: 1, minWidth: 0, justifyContent: "center" },
    shopName: { color: NAVY, fontSize: 11, fontWeight: "800" },
    ownerName: { color: "#7A8FB5", fontSize: 10, marginTop: 3 },
    detailLine: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
    detailText: { color: "#6D83AA", fontSize: 10 },
    vendorRight: { width: 120, height: 62, justifyContent: "space-between", alignItems: "flex-start" },
    activeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#E9FBF2",
        borderColor: "#BDF2D7",
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#20B96B" },
    activeText: { color: "#078541", fontSize: 11, fontWeight: "600" },
    locationText: { color: "#6D83AA", fontSize: 9, flexShrink: 1 },
    actions: {
        width: 24,
        height: 60,
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 2,
    },
    editIcon: { color: "#5874A8", fontSize: 18 },
    deleteIcon: { color: RED, fontSize: 14 },
    moreIcon: { color: "#5874A8", fontSize: 21, lineHeight: 20, fontWeight: "700" },
    modalRoot: {
        flex: 1,
        backgroundColor: "rgba(6,20,40,0.45)",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    formCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        maxHeight: "88%",
        overflow: "hidden",
    },
    formHeader: {
        height: 52,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E3EAF3",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    formTitle: { color: NAVY, fontSize: 16, fontWeight: "700" },
    formClose: { color: "#8B9AB0", fontSize: 26 },
    formBody: { padding: 16 },
    fieldLabel: { color: GREY, fontSize: 11, fontWeight: "700", marginTop: 10, marginBottom: 6 },
    input: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        paddingHorizontal: 12,
        color: NAVY,
        fontSize: 14,
        backgroundColor: WHITE,
    },
    coordRow: { flexDirection: "row", gap: 10 },
    selectField: {
        minHeight: 42,
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: WHITE,
    },
    selectFieldTxt: { color: NAVY, fontSize: 13, flex: 1 },
    menu: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        borderRadius: 10,
        backgroundColor: WHITE,
        overflow: "hidden",
    },
    menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
    menuTxt: { color: NAVY, fontSize: 13 },
    formFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: "#E1E8F0",
        backgroundColor: "#F7F9FC",
    },
    cancelBtn: {
        height: 38,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        backgroundColor: WHITE,
    },
    cancelTxt: { color: NAVY, fontWeight: "600" },
    saveBtn: {
        height: 38,
        minWidth: 100,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 14,
        borderRadius: 9,
        backgroundColor: NAVY,
    },
    saveTxt: { color: WHITE, fontWeight: "700" },
});
