import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
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
import { GREY, NAVY, WHITE, BUTTON} from "../../../constant/color";
import { BANNER } from "../../../constant/imagePath";
import {
    createFieldReport,
    fetchFieldReports,
    toErrorText,
    toZoneCode,
} from "../../../services/reports/ReportsService";
import { ensureCameraPermission, ensureLocationPermission } from "../../../utils/permissions";
import { getCurrentPosition, openCamera } from "../../../utils/deviceServices";

const ZONES = ["All zones", "ZA", "ZB", "ZC", "ZD", "ZE", "ZF", "ZG"];

const ReportCard = ({ report }) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.reportCard}>
        <View style={styles.reportHeader}>
            <View style={styles.metaPair}>
                <SimpleIcon name="calendar-blank-outline" size={15} color="#1C55B4" />
                <Text style={styles.metaText}>{report.ago}</Text>
            </View>
            <View style={styles.reporter}>
                <SimpleIcon name="account-circle-outline" size={15} color="#1C55B4" />
                <Text numberOfLines={1} style={styles.metaText}>
                    {report.reporter}
                </Text>
            </View>
            <View style={styles.zoneBadge}>
                <Text style={styles.zoneText}>{report.zone}</Text>
            </View>
        </View>
        <View style={styles.reportBody}>
            <View style={styles.reportCopy}>
                <Text numberOfLines={1} style={styles.reportTitle}>
                    {report.title}
                </Text>
                <Text numberOfLines={3} style={styles.description}>
                    {report.description}
                </Text>
                <View style={styles.locationRow}>
                    <SimpleIcon name="map-marker-outline" size={15} color="#1C55B4" />
                    <Text style={styles.locationText}>{report.coords}</Text>
                </View>
            </View>
            {report.photoUrl ? (
                <Image source={{ uri: report.photoUrl }} style={styles.thumbnailImg} resizeMode="cover" />
            ) : (
                <Image source={BANNER} style={styles.thumbnailImg} resizeMode="cover" />
            )}
            <Text style={styles.chevron}>›</Text>
        </View>
    </TouchableOpacity>
);

export default function SupervisorReportsScreen() {
    const [search, setSearch] = useState("");
    const [zone, setZone] = useState("All zones");
    const [sort, setSort] = useState("Latest first");
    const [menu, setMenu] = useState("");
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [gpsAccuracy, setGpsAccuracy] = useState("");
    const [photo, setPhoto] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });

    const showToast = useCallback((message, type = "error") => {
        setToast({ visible: true, message: toErrorText(message, String(message || "")), type });
    }, []);

    const loadReports = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const res = await fetchFieldReports({
                    page: 1,
                    limit: 50,
                    zoneCode: toZoneCode(zone),
                });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setReports([]);
                    return;
                }
                setReports(res.data || []);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load reports"), "error");
                setReports([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [zone, showToast]
    );

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        const list = reports.filter(
            (report) =>
                !query ||
                String(report.title || "").toLowerCase().includes(query) ||
                String(report.reporter || "").toLowerCase().includes(query) ||
                String(report.description || "").toLowerCase().includes(query) ||
                String(report.supervisor || "").toLowerCase().includes(query)
        );
        return sort === "Oldest first" ? list.slice().reverse() : list;
    }, [reports, search, sort]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setLatitude("");
        setLongitude("");
        setGpsAccuracy("");
        setPhoto(null);
    };

    const captureGps = async () => {
        if (gpsLoading) return;
        const permitted = await ensureLocationPermission();
        if (!permitted) {
            Alert.alert("Location permission required", "Allow location access to attach GPS.");
            return;
        }
        setGpsLoading(true);
        getCurrentPosition(
            ({ coords }) => {
                setLatitude(coords.latitude.toFixed(6));
                setLongitude(coords.longitude.toFixed(6));
                if (coords.accuracy != null) setGpsAccuracy(String(Math.round(coords.accuracy)));
                setGpsLoading(false);
            },
            (error) => {
                setGpsLoading(false);
                Alert.alert("Could not get GPS", error?.message || "Try again.");
            }
        );
    };

    const choosePhoto = async () => {
        const permitted = await ensureCameraPermission();
        if (!permitted) {
            Alert.alert("Camera permission required", "Allow camera access to take a photo.");
            return;
        }
        openCamera({ mediaType: "photo", quality: 0.8 }, (result) => {
            if (result?.didCancel) return;
            if (result?.errorCode) {
                Alert.alert("Camera error", result.errorMessage || "Could not open camera.");
                return;
            }
            const asset = result?.assets?.[0];
            if (asset?.uri) {
                setPhoto({
                    uri: asset.uri,
                    name: asset.fileName || "report.jpg",
                    type: asset.type || "image/jpeg",
                });
            }
        });
    };

    const submitReport = async () => {
        if (submitting) return;
        if (description.trim().length < 5) {
            Alert.alert("Required", "Description must be at least 5 characters.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await createFieldReport({
                title: title.trim(),
                description: description.trim(),
                latitude,
                longitude,
                gpsAccuracy,
                photo,
            });
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            setModalVisible(false);
            resetForm();
            showToast("Field report submitted successfully", "success");
            await loadReports({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to submit report"), "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Field Reports & Mobile Submissions"
                subtitle=""
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadReports({ soft: true })} />
                }
            >
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <SimpleIcon name="magnify" size={22} color={NAVY} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search reports, reporter, or keyword..."
                            placeholderTextColor="#91A2C3"
                            style={styles.searchInput}
                        />
                    </View>
                </View>
                <View style={styles.controlsRow}>
                    <View style={styles.dropWrap}>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => setMenu(menu === "zone" ? "" : "zone")}
                        >
                            <Text style={styles.dropdownText}>{zone}</Text>
                            <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                        </TouchableOpacity>
                        {menu === "zone" && (
                            <View style={styles.menu}>
                                {ZONES.map((value) => (
                                    <TouchableOpacity
                                        key={value}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setZone(value);
                                            setMenu("");
                                        }}
                                    >
                                        <Text style={styles.menuText}>{value}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    <View style={styles.dropWrap}>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => setMenu(menu === "sort" ? "" : "sort")}
                        >
                            <Text style={styles.dropdownText}>{sort}</Text>
                            <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                        </TouchableOpacity>
                        {menu === "sort" && (
                            <View style={styles.menu}>
                                {["Latest first", "Oldest first"].map((value) => (
                                    <TouchableOpacity
                                        key={value}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setSort(value);
                                            setMenu("");
                                        }}
                                    >
                                        <Text style={styles.menuText}>{value}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    <TouchableOpacity style={styles.newReport} onPress={() => setModalVisible(true)}>
                        <Text style={styles.plus}>+</Text>
                        <Text style={styles.newReportText}>New Report</Text>
                    </TouchableOpacity>
                </View>

                {loading && !filtered.length ? (
                    <ActivityIndicator color={NAVY} style={{ marginTop: 28 }} />
                ) : (
                    <View style={styles.reportList}>
                        {filtered.map((report) => (
                            <ReportCard key={String(report.id)} report={report} />
                        ))}
                        {!filtered.length ? (
                            <Text style={styles.emptyTxt}>No field reports found</Text>
                        ) : null}
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalRoot}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => {
                            setModalVisible(false);
                            resetForm();
                        }}
                    />
                    <View style={styles.formCard}>
                        <View style={styles.formHeader}>
                            <Text style={styles.formTitle}>Submit field report</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.close}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled">
                            <Text style={styles.fieldLabel}>TITLE (OPTIONAL)</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                style={styles.input}
                                placeholder="Report title"
                                placeholderTextColor="#91A2C3"
                            />
                            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                style={[styles.input, styles.textArea]}
                                placeholder="What was done / observed..."
                                placeholderTextColor="#91A2C3"
                                multiline
                                textAlignVertical="top"
                            />
                            <View style={styles.coordRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>LATITUDE</Text>
                                    <TextInput
                                        value={latitude}
                                        onChangeText={setLatitude}
                                        style={styles.input}
                                        keyboardType="decimal-pad"
                                        placeholder="19.85..."
                                        placeholderTextColor="#91A2C3"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>LONGITUDE</Text>
                                    <TextInput
                                        value={longitude}
                                        onChangeText={setLongitude}
                                        style={styles.input}
                                        keyboardType="decimal-pad"
                                        placeholder="85.96..."
                                        placeholderTextColor="#91A2C3"
                                    />
                                </View>
                            </View>
                            <TouchableOpacity style={styles.gpsBtn} onPress={captureGps}>
                                <Text style={styles.gpsTxt}>
                                    {gpsLoading ? "Fetching GPS…" : "Use my GPS"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoBtn} onPress={choosePhoto}>
                                {photo?.uri ? (
                                    <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                                ) : (
                                    <Text style={styles.gpsTxt}>Attach photo</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                        <View style={styles.formFooter}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                onPress={submitReport}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={WHITE} />
                                ) : (
                                    <Text style={styles.submitTxt}>Submit report</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 22 },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 9 },
    searchBox: {
        flex: 1,
        height: 47,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 14,
        paddingHorizontal: 11,
    },
    searchInput: { flex: 1, color: NAVY, fontSize: 12, padding: 0 },
    controlsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    dropWrap: { flex: 1, position: "relative", zIndex: 2 },
    dropdown: {
        height: 42,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F4",
        borderRadius: 13,
        paddingHorizontal: 10,
        gap: 5,
    },
    dropdownText: { color: NAVY, fontSize: 11, flexShrink: 1 },
    menu: {
        position: "absolute",
        top: 45,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        elevation: 5,
    },
    menuItem: { paddingHorizontal: 10, paddingVertical: 9 },
    menuText: { color: NAVY, fontSize: 11 },
    newReport: {
        height: 42,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingHorizontal: 10,
        backgroundColor: "#EA5F0B",
        borderRadius: 12,
    },
    plus: { color: WHITE, fontSize: 19, lineHeight: 21 },
    newReportText: { color: WHITE, fontSize: 11, fontWeight: "700" },
    reportList: { gap: 8 },
    emptyTxt: { color: GREY, textAlign: "center", paddingVertical: 24 },
    reportCard: {
        minHeight: 132,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E1EAF5",
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 9,
        elevation: 1,
    },
    reportHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 },
    metaPair: { flexDirection: "row", alignItems: "center", gap: 4 },
    reporter: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        justifyContent: "flex-end",
    },
    metaText: { color: "#6E83AA", fontSize: 10 },
    zoneBadge: {
        backgroundColor: "#F0F6FF",
        borderWidth: 1,
        borderColor: "#D6E5FF",
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    zoneText: { color: "#1454C4", fontSize: 10, fontWeight: "700" },
    reportBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
    reportCopy: { flex: 1, alignSelf: "stretch", justifyContent: "space-between", minWidth: 0 },
    reportTitle: { color: "#0A174A", fontSize: 12, fontWeight: "800" },
    description: { color: "#657B9F", fontSize: 10, lineHeight: 14, marginTop: 4 },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
    locationText: { color: "#7186AE", fontSize: 10 },
    thumbnailImg: { width: 82, height: 68, borderRadius: 9, backgroundColor: "#E8EEF6" },
    chevron: { color: "#244A80", fontSize: 24, lineHeight: 28, paddingLeft: 1 },
    modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(6,20,40,0.45)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    formCard: {
        maxHeight: "90%",
        backgroundColor: WHITE,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
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
    close: { color: "#8B9AB0", fontSize: 26 },
    formBody: { padding: 16 },
    fieldLabel: { color: GREY, fontSize: 11, fontWeight: "700", marginBottom: 6, marginTop: 8 },
    input: {
        height: 42,
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        paddingHorizontal: 12,
        color: NAVY,
        fontSize: 14,
        backgroundColor: WHITE,
    },
    textArea: { height: 90, paddingTop: 10 },
    coordRow: { flexDirection: "row", gap: 10 },
    gpsBtn: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        paddingVertical: 10,
        alignItems: "center",
    },
    gpsTxt: { color: NAVY, fontSize: 13, fontWeight: "600" },
    photoBtn: {
        marginTop: 10,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#B8C8DD",
        borderRadius: 9,
        paddingVertical: 12,
        alignItems: "center",
        backgroundColor: "#F7FAFE",
    },
    photoPreview: { width: 72, height: 56, borderRadius: 6 },
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
    submitBtn: {
        height: 38,
        minWidth: 120,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 14,
        borderRadius: 9,
        backgroundColor: BUTTON,
    },
    submitTxt: { color: WHITE, fontWeight: "700" },
});
