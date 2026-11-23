import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { GREEN, GREY, NAVY, WHITE, BUTTON} from "../../../constant/color";
import {
    fetchPublicQr,
    submitPublicGrievance,
    toErrorText,
} from "../../../services/public/PublicGrievanceService";

/**
 * Citizen no-login grievance form used from Citizen Grievance QR Codes UI
 * (Open Grievance Form) — GET public/qr/:code + POST public/grievances.
 */
export default function CitizenPublicGrievanceForm({
    visible,
    qrCode,
    onClose,
    onToast,
}) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [qr, setQr] = useState(null);
    const [category, setCategory] = useState("");
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [description, setDescription] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [photo, setPhoto] = useState(null);
    const [success, setSuccess] = useState(null);

    const resetForm = useCallback(() => {
        setCategory("");
        setCategoryOpen(false);
        setDescription("");
        setContactNumber("");
        setPhoto(null);
        setSuccess(null);
    }, []);

    const loadQr = useCallback(async () => {
        if (!qrCode) return;
        setLoading(true);
        setQr(null);
        setSuccess(null);
        try {
            const res = await fetchPublicQr(qrCode);
            if (!res.ok || !res.data) {
                onToast?.(res.message || "Failed to load QR details", "error");
                setQr(null);
                return;
            }
            setQr(res.data);
            if (res.data.categories?.length === 1) {
                setCategory(res.data.categories[0].value);
            }
        } catch (e) {
            onToast?.(toErrorText(e?.message || e, "Failed to load QR details"), "error");
        } finally {
            setLoading(false);
        }
    }, [qrCode, onToast]);

    useEffect(() => {
        if (!visible) return;
        resetForm();
        loadQr();
    }, [visible, loadQr, resetForm]);

    const pickPhoto = () => {
        try {
            // eslint-disable-next-line global-require
            const { launchImageLibrary } = require("react-native-image-picker");
            launchImageLibrary(
                { mediaType: "photo", selectionLimit: 1, quality: 0.8 },
                (result) => {
                    if (result?.didCancel) return;
                    const asset = result?.assets?.[0];
                    if (!asset?.uri) {
                        onToast?.(result?.errorMessage || "Could not pick image", "error");
                        return;
                    }
                    setPhoto({
                        uri: asset.uri,
                        type: asset.type || "image/jpeg",
                        fileName: asset.fileName || "complaint.jpg",
                        name: asset.fileName || "complaint.jpg",
                    });
                }
            );
        } catch (e) {
            onToast?.(toErrorText(e?.message || e, "Image picker unavailable"), "error");
        }
    };

    const onSubmit = async () => {
        if (!qr?.code || submitting) return;
        setSubmitting(true);
        try {
            const res = await submitPublicGrievance({
                qrCode: qr.code,
                category,
                description,
                contactNumber,
                photo,
            });
            if (!res.ok) {
                onToast?.(res.message, "error");
                return;
            }
            setSuccess(res.data);
            onToast?.(
                res.message || "Grievance registered successfully.",
                "success"
            );
        } catch (e) {
            onToast?.(toErrorText(e?.message || e, "Failed to submit grievance"), "error");
        } finally {
            setSubmitting(false);
        }
    };

    const selectedLabel =
        qr?.categories?.find((c) => c.value === category)?.label || "Select category...";

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={() => {}}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text allowFontScaling={false} style={styles.title}>
                                Submit Your Grievance
                            </Text>
                            <Text allowFontScaling={false} style={styles.sub}>
                                {qr
                                    ? `${qr.locationName} · ${qr.zoneCode}`
                                    : String(qrCode || "—")}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                            <Text allowFontScaling={false} style={styles.closeTxt}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator color={NAVY} style={{ marginVertical: 40 }} />
                    ) : success ? (
                        <View style={styles.successBox}>
                            <Text allowFontScaling={false} style={styles.successEyebrow}>
                                Grievance Successfully Registered
                            </Text>
                            <Text allowFontScaling={false} style={styles.ticket}>
                                {success.ticketNo}
                            </Text>
                            <Text allowFontScaling={false} style={styles.successStatus}>
                                {String(success.status || "open").toUpperCase()}
                            </Text>
                            {!!success.locationName && (
                                <Text allowFontScaling={false} style={styles.successLoc}>
                                    {success.locationName}
                                </Text>
                            )}
                            <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                                <Text allowFontScaling={false} style={styles.primaryTxt}>
                                    Done
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : !qr ? (
                        <View style={styles.emptyBox}>
                            <Text allowFontScaling={false} style={styles.emptyTxt}>
                                Could not load this QR code. Check the code and try again.
                            </Text>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={loadQr}>
                                <Text allowFontScaling={false} style={styles.secondaryTxt}>
                                    Retry
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.body}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.infoCard}>
                                <Text allowFontScaling={false} style={styles.infoLabel}>
                                    Location
                                </Text>
                                <Text allowFontScaling={false} style={styles.infoValue}>
                                    {qr.locationName}
                                </Text>
                                <Text allowFontScaling={false} style={styles.infoMeta}>
                                    QR {qr.code} · Zone {qr.zoneCode}
                                </Text>
                                {!!qr.vendor?.shopName && (
                                    <Text allowFontScaling={false} style={styles.infoMeta}>
                                        Vendor: {qr.vendor.shopName}
                                        {qr.vendor.ownerName ? ` · ${qr.vendor.ownerName}` : ""}
                                    </Text>
                                )}
                                {!!qr.org?.helpline && (
                                    <Text allowFontScaling={false} style={styles.infoMeta}>
                                        Helpline: {qr.org.helpline}
                                    </Text>
                                )}
                            </View>

                            <Text allowFontScaling={false} style={styles.fieldLabel}>
                                1. Select Complaint Category
                            </Text>
                            <TouchableOpacity
                                style={styles.select}
                                onPress={() => setCategoryOpen((v) => !v)}
                                activeOpacity={0.85}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[styles.selectTxt, !category && styles.placeholder]}
                                >
                                    {selectedLabel}
                                </Text>
                                <Text allowFontScaling={false} style={styles.chevron}>
                                    ▾
                                </Text>
                            </TouchableOpacity>
                            {categoryOpen ? (
                                <View style={styles.dropdown}>
                                    {(qr.categories || []).map((item) => (
                                        <TouchableOpacity
                                            key={item.value}
                                            style={styles.dropItem}
                                            onPress={() => {
                                                setCategory(item.value);
                                                setCategoryOpen(false);
                                            }}
                                        >
                                            <Text allowFontScaling={false} style={styles.dropTxt}>
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : null}

                            <Text allowFontScaling={false} style={styles.fieldLabel}>
                                2. Describe Your Problem
                            </Text>
                            <TextInput
                                allowFontScaling={false}
                                style={[styles.input, styles.textArea]}
                                multiline
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Enter your complaint description..."
                                placeholderTextColor={GREY}
                                maxLength={1500}
                            />
                            <Text allowFontScaling={false} style={styles.hint}>
                                Minimum 10 and maximum 1500 characters ({description.length}/1500)
                            </Text>

                            <Text allowFontScaling={false} style={styles.fieldLabel}>
                                3. Contact Number (Optional)
                            </Text>
                            <TextInput
                                allowFontScaling={false}
                                style={styles.input}
                                value={contactNumber}
                                onChangeText={setContactNumber}
                                placeholder="Enter 10-digit mobile number"
                                placeholderTextColor={GREY}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            <Text allowFontScaling={false} style={styles.fieldLabel}>
                                4. Upload Photograph (Optional)
                            </Text>
                            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                                <Text allowFontScaling={false} style={styles.photoBtnTxt}>
                                    {photo ? "Change photo" : "Choose an image from your device"}
                                </Text>
                            </TouchableOpacity>
                            {photo?.uri ? (
                                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                            ) : null}

                            <TouchableOpacity
                                style={[styles.primaryBtn, submitting && styles.primaryDisabled]}
                                onPress={onSubmit}
                                disabled={submitting}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={WHITE} />
                                ) : (
                                    <Text allowFontScaling={false} style={styles.primaryTxt}>
                                        Submit Grievance
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.4)",
        justifyContent: "flex-end",
    },
    card: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        maxHeight: "92%",
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF2F7",
    },
    title: { color: NAVY, fontSize: 17, fontWeight: "800" },
    sub: { color: GREY, fontSize: 12, marginTop: 3 },
    closeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
    closeTxt: { color: "#A0AAB8", fontSize: 22, lineHeight: 24 },
    body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
    infoCard: {
        backgroundColor: "#F3F8FF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D7E5F6",
        padding: 12,
        marginBottom: 14,
    },
    infoLabel: { color: GREY, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    infoValue: { color: NAVY, fontSize: 15, fontWeight: "800", marginTop: 3 },
    infoMeta: { color: "#526B8E", fontSize: 12, marginTop: 4 },
    fieldLabel: { color: NAVY, fontSize: 13, fontWeight: "800", marginBottom: 6, marginTop: 8 },
    select: {
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#CFDAE9",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    selectTxt: { color: NAVY, fontSize: 14, fontWeight: "600", flex: 1 },
    placeholder: { color: GREY, fontWeight: "500" },
    chevron: { color: NAVY, fontSize: 14 },
    dropdown: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: "#D5DFEC",
        borderRadius: 10,
        backgroundColor: WHITE,
        overflow: "hidden",
    },
    dropItem: {
        minHeight: 42,
        justifyContent: "center",
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#EDF1F6",
    },
    dropTxt: { color: NAVY, fontSize: 14 },
    input: {
        minHeight: 46,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#CFDAE9",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: NAVY,
        fontSize: 14,
    },
    textArea: { minHeight: 110, textAlignVertical: "top" },
    hint: { color: GREY, fontSize: 11, marginTop: 4, marginBottom: 4 },
    photoBtn: {
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#BFDBFE",
        backgroundColor: "#F5F9FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    photoBtnTxt: { color: "#2563EB", fontSize: 13, fontWeight: "700" },
    photoPreview: {
        width: "100%",
        height: 160,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: "#E8EEF5",
    },
    primaryBtn: {
        marginTop: 10,
        height: 48,
        borderRadius: 12,
        backgroundColor: BUTTON,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryDisabled: { opacity: 0.7 },
    primaryTxt: { color: WHITE, fontSize: 15, fontWeight: "800" },
    secondaryBtn: {
        marginTop: 12,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#CFDAE9",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    secondaryTxt: { color: NAVY, fontSize: 14, fontWeight: "700" },
    emptyBox: { padding: 24, alignItems: "center" },
    emptyTxt: { color: GREY, fontSize: 13, textAlign: "center", lineHeight: 18 },
    successBox: { padding: 24, alignItems: "center" },
    successEyebrow: { color: GREEN, fontSize: 12, fontWeight: "800" },
    ticket: { color: NAVY, fontSize: 26, fontWeight: "800", marginTop: 8 },
    successStatus: {
        marginTop: 8,
        color: GREEN,
        fontSize: 12,
        fontWeight: "800",
        backgroundColor: "#E8F8EE",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: "hidden",
    },
    successLoc: { color: GREY, fontSize: 13, marginTop: 10, textAlign: "center" },
});
