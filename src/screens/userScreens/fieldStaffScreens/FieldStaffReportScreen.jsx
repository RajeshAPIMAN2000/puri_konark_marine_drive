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
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { GREY, NAVY, WHITE, BUTTON} from "../../../constant/color";
import {
    createFieldReport,
    fetchFieldReports,
    toErrorText,
    toZoneCode,
} from "../../../services/reports/ReportsService";
import { ensureCameraPermission, ensureLocationPermission } from "../../../utils/permissions";
import { getCurrentPosition, openCamera } from "../../../utils/deviceServices";

const ZONES = ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F", "Zone G"];

const Field = ({ label, children }) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
    </View>
);

export default function FieldStaffReportScreen() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [zoneFilter, setZoneFilter] = useState("All zones");
    const [zoneMenu, setZoneMenu] = useState(false);
    const [formZone, setFormZone] = useState("");
    const [formZoneMenu, setFormZoneMenu] = useState(false);
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
                    zoneCode: toZoneCode(zoneFilter),
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
        [zoneFilter, showToast]
    );

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setFormZone("");
        setLatitude("");
        setLongitude("");
        setGpsAccuracy("");
        setPhoto(null);
        setFormZoneMenu(false);
    };

    const captureGps = async () => {
        if (gpsLoading) return;
        const permitted = await ensureLocationPermission();
        if (!permitted) {
            Alert.alert("Location permission required", "Allow location access to attach GPS coordinates.");
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
                Alert.alert("Could not get GPS", error?.message || "Turn on location services and try again.");
            }
        );
    };

    const choosePhoto = () => {
        Alert.alert("Attach site photo", "Choose where to get the photo from.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Camera",
                onPress: async () => {
                    const permitted = await ensureCameraPermission();
                    if (!permitted) {
                        Alert.alert("Camera permission required", "Allow camera access to take a site photo.");
                        return;
                    }
                    openCamera({ mediaType: "photo", quality: 0.8, maxWidth: 1600, maxHeight: 1600 }, (result) => {
                        if (result?.errorCode) {
                            Alert.alert("Camera error", result.errorMessage || "Could not open the camera.");
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
                },
            },
            {
                text: "Gallery",
                onPress: async () => {
                    try {
                        const { launchImageLibrary } = require("react-native-image-picker");
                        launchImageLibrary({ mediaType: "photo", selectionLimit: 1, quality: 0.8 }, (result) => {
                            if (result?.errorCode) {
                                Alert.alert("Gallery error", result.errorMessage || "Could not select a photo.");
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
                    } catch (error) {
                        Alert.alert("Gallery unavailable", error?.message || "Could not open the photo gallery.");
                    }
                },
            },
        ]);
    };

    const submitReport = async () => {
        if (submitting) return;
        if (description.trim().length < 5) {
            Alert.alert("Complete required fields", "Description must be at least 5 characters.");
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

    const visibleReports = useMemo(() => reports, [reports]);

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Field Reports & Mobile Submissions"
                subtitle=""
                height={58}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadReports({ soft: true })} />
                }
            >
                <View style={styles.panel}>
                    <View style={styles.toolbar}>
                        <View style={styles.zoneFilterWrap}>
                            <TouchableOpacity
                                style={styles.zoneFilter}
                                onPress={() => setZoneMenu((open) => !open)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.zoneFilterText}>{zoneFilter}</Text>
                                <Text style={styles.chevron}>⌄</Text>
                            </TouchableOpacity>
                            {zoneMenu && (
                                <View style={styles.dropdown}>
                                    {["All zones", ...ZONES].map((zone) => (
                                        <TouchableOpacity
                                            key={zone}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setZoneFilter(zone);
                                                setZoneMenu(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownText}>{zone}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.newButton}
                            onPress={() => setModalVisible(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.plus}>+</Text>
                            <Text style={styles.newButtonText}>New Report</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.reportCount}>
                        {visibleReports.length} {visibleReports.length === 1 ? "report" : "reports"}
                    </Text>

                    {loading && !visibleReports.length ? (
                        <ActivityIndicator color={NAVY} style={{ marginVertical: 24 }} />
                    ) : null}

                    {visibleReports.map((report) => (
                        <View key={String(report.id)} style={styles.reportCard}>
                            <View style={styles.photoHero}>
                                {report.photoUrl ? (
                                    <Image
                                        source={{ uri: report.photoUrl }}
                                        style={styles.reportPhoto}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Text style={styles.noPhotoIcon}>▣</Text>
                                        <Text style={styles.noPhoto}>No photo attached</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.reportBody}>
                                <Text style={styles.reportTitle}>
                                    {report.title || "Field report"}
                                </Text>
                                <Text style={styles.reportDescription}>
                                    {report.description || "—"}
                                </Text>

                                <View style={styles.metaGrid}>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaLabel}>Date</Text>
                                        <Text style={styles.metaStrong}>{report.date}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaLabel}>Zone</Text>
                                        <Text style={styles.zonePill}>{report.zone || "—"}</Text>
                                    </View>
                                    <View style={styles.metaItemWide}>
                                        <Text style={styles.metaLabel}>Reporter</Text>
                                        <Text style={styles.metaStrong}>{report.reporter}</Text>
                                    </View>
                                    <View style={styles.metaItemWide}>
                                        <Text style={styles.metaLabel}>GPS</Text>
                                        <Text style={styles.gpsText}>{report.coords || "—"}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    {!loading && !visibleReports.length ? (
                        <Text style={styles.emptyTxt}>No field reports found</Text>
                    ) : null}
                </View>
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
                        <ScrollView
                            contentContainerStyle={styles.formBody}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Field label="TITLE (OPTIONAL)">
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    style={styles.input}
                                    placeholder="e.g. Morning cleanup — Pipili"
                                    placeholderTextColor="#91A2BA"
                                />
                            </Field>
                            <Field label="DESCRIPTION">
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    style={[styles.input, styles.textArea]}
                                    placeholder="What was done, observations, manpower, issues seen..."
                                    placeholderTextColor="#91A2BA"
                                    multiline
                                    textAlignVertical="top"
                                />
                            </Field>
                            <Field label="ZONE (OPTIONAL)">
                                <TouchableOpacity
                                    style={styles.selectInput}
                                    onPress={() => setFormZoneMenu((open) => !open)}
                                >
                                    <Text style={[styles.selectText, !formZone && styles.placeholder]}>
                                        {formZone || "Select zone..."}
                                    </Text>
                                    <Text style={styles.selectChevron}>⌄</Text>
                                </TouchableOpacity>
                                {formZoneMenu && (
                                    <View style={styles.formDropdown}>
                                        {ZONES.map((zone) => (
                                            <TouchableOpacity
                                                key={zone}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setFormZone(zone);
                                                    setFormZoneMenu(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownText}>{zone}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </Field>
                            <View style={styles.coordinateRow}>
                                <Field label="LATITUDE">
                                    <TextInput
                                        value={latitude}
                                        onChangeText={setLatitude}
                                        keyboardType="decimal-pad"
                                        style={styles.input}
                                        placeholder="19.85..."
                                        placeholderTextColor="#91A2BA"
                                    />
                                </Field>
                                <Field label="LONGITUDE">
                                    <TextInput
                                        value={longitude}
                                        onChangeText={setLongitude}
                                        keyboardType="decimal-pad"
                                        style={styles.input}
                                        placeholder="85.96..."
                                        placeholderTextColor="#91A2BA"
                                    />
                                </Field>
                            </View>
                            <View style={styles.gpsActions}>
                                <TouchableOpacity style={styles.outlineAction} onPress={captureGps}>
                                    <Text style={styles.actionLabel}>
                                        ⌖  {gpsLoading ? "Getting GPS…" : "Use my GPS"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <Field label="PHOTO (GEO-TAGGED)">
                                <TouchableOpacity style={styles.photoPicker} onPress={choosePhoto}>
                                    {photo?.uri ? (
                                        <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                                    ) : (
                                        <Text style={styles.cameraIcon}>▧</Text>
                                    )}
                                    <Text style={styles.photoPickerText}>
                                        {photo ? photo.name : "Tap to attach a site photo (JPG/PNG, max 5 MB)"}
                                    </Text>
                                    {photo && (
                                        <TouchableOpacity onPress={() => setPhoto(null)}>
                                            <Text style={styles.removePhoto}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            </Field>
                        </ScrollView>
                        <View style={styles.formFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                                onPress={submitReport}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={WHITE} />
                                ) : (
                                    <Text style={styles.submitText}>▣  Submit report</Text>
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
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 130 },
    panel: {
        backgroundColor: "#F9FBFE",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5EDF8",
        padding: 10,
    },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 2,
        paddingTop: 4,
    },
    zoneFilterWrap: { flex: 1, zIndex: 3 },
    zoneFilter: {
        height: 46,
        borderWidth: 1,
        borderColor: "#CFDAE9",
        borderRadius: 11,
        paddingHorizontal: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: WHITE,
    },
    zoneFilterText: { color: "#40516D", fontSize: 15, fontWeight: "600" },
    chevron: { color: NAVY, fontSize: 22, marginTop: -7 },
    newButton: {
        height: 46,
        minWidth: 142,
        borderRadius: 11,
        backgroundColor: "#EA5F0B",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    plus: { color: WHITE, fontSize: 26, fontWeight: "400", marginRight: 8 },
    newButtonText: { color: WHITE, fontSize: 14, fontWeight: "700" },
    reportCount: {
        color: "#71829D",
        fontSize: 13,
        fontWeight: "600",
        marginHorizontal: 5,
        marginTop: 12,
        marginBottom: 7,
    },
    emptyTxt: { color: GREY, textAlign: "center", paddingVertical: 24 },
    reportCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E1EAF5",
        overflow: "hidden",
        elevation: 2,
        shadowColor: NAVY,
        shadowOpacity: 0.07,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    photoHero: {
        width: "100%",
        height: 168,
        backgroundColor: "#E8EEF5",
    },
    reportPhoto: {
        width: "100%",
        height: "100%",
        backgroundColor: "#EDF2F8",
    },
    photoPlaceholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#EEF3F9",
    },
    noPhotoIcon: { color: "#7A8FA8", fontSize: 28 },
    noPhoto: { color: "#7A8FA8", fontSize: 12, fontWeight: "600" },
    reportBody: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 10,
    },
    reportTitle: { color: NAVY, fontSize: 16, lineHeight: 21, fontWeight: "800" },
    reportDescription: { color: "#536783", fontSize: 13, lineHeight: 19 },
    metaGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 2,
    },
    metaItem: {
        width: "47%",
        flexGrow: 1,
        backgroundColor: "#F5F8FC",
        borderRadius: 11,
        borderWidth: 1,
        borderColor: "#E6EEF7",
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    metaItemWide: {
        width: "100%",
        backgroundColor: "#F5F8FC",
        borderRadius: 11,
        borderWidth: 1,
        borderColor: "#E6EEF7",
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    metaLabel: {
        color: "#667792",
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.3,
        textTransform: "uppercase",
    },
    metaStrong: { color: NAVY, fontSize: 13, fontWeight: "700", marginTop: 4 },
    zonePill: {
        alignSelf: "flex-start",
        color: NAVY,
        backgroundColor: "#EAF2FF",
        borderWidth: 1,
        borderColor: "#B7D0F8",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 14,
        fontSize: 12,
        fontWeight: "700",
        overflow: "hidden",
        marginTop: 4,
    },
    gpsText: { color: "#445A78", fontSize: 12, marginTop: 4, fontWeight: "600" },
    dropdown: {
        position: "absolute",
        top: 49,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D7E1EF",
        borderRadius: 10,
        elevation: 8,
        zIndex: 20,
    },
    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF2F7",
    },
    dropdownText: { color: NAVY, fontSize: 14 },
    modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(6,20,40,0.45)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    formCard: {
        maxHeight: "92%",
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
    formTitle: { color: "#243750", fontSize: 16, fontWeight: "700" },
    close: { color: "#8B9AB0", fontSize: 26, paddingHorizontal: 5 },
    formBody: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 18 },
    field: { flex: 1, marginBottom: 12 },
    fieldLabel: { color: "#71829A", fontSize: 11, fontWeight: "700", marginBottom: 6 },
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
    textArea: { height: 80, paddingTop: 10 },
    selectInput: {
        height: 42,
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    selectText: { color: NAVY, fontSize: 14 },
    placeholder: { color: GREY },
    selectChevron: { color: NAVY, fontSize: 21, marginTop: -7 },
    formDropdown: {
        borderWidth: 1,
        borderColor: "#D7E1EF",
        borderRadius: 9,
        marginTop: 3,
        backgroundColor: WHITE,
    },
    coordinateRow: { flexDirection: "row", gap: 10 },
    gpsActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    outlineAction: {
        minHeight: 36,
        paddingHorizontal: 12,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        backgroundColor: WHITE,
    },
    actionLabel: { color: "#344963", fontSize: 12, fontWeight: "600" },
    photoPicker: {
        minHeight: 48,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#B8C8DD",
        borderRadius: 9,
        backgroundColor: "#F7FAFE",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    cameraIcon: { color: "#8092AC", fontSize: 21 },
    photoPickerText: { flex: 1, color: "#70829D", fontSize: 12 },
    photoPreview: { width: 42, height: 36, borderRadius: 5 },
    removePhoto: { color: "#B42318", fontSize: 22, paddingHorizontal: 5 },
    formFooter: {
        minHeight: 58,
        backgroundColor: "#F7F9FC",
        borderTopWidth: 1,
        borderTopColor: "#E1E8F0",
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
    },
    cancelButton: {
        height: 38,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: "#CBD7E6",
        borderRadius: 9,
        backgroundColor: WHITE,
    },
    cancelText: { color: "#344963", fontSize: 13, fontWeight: "600" },
    submitButton: {
        height: 38,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderRadius: 9,
        backgroundColor: BUTTON,
        minWidth: 120,
        alignItems: "center",
    },
    submitText: { color: WHITE, fontSize: 13, fontWeight: "700" },
});
