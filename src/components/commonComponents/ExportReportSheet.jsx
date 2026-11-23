import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { BLUE, GREY, LIGHTGREY, NAVY, WHITE } from "../../constant/color";
import {
    downloadSummaryReport,
    EXPORT_REPORT_OPTIONS,
} from "../../services/exports/ExportsService";

/**
 * Bottom sheet: choose Excel or PDF summary export.
 * onResult({ ok, message, fileName, path })
 */
export const ExportReportSheet = ({ visible, onClose, onResult }) => {
    const [busyKey, setBusyKey] = useState(null);

    const handleDownload = async (format) => {
        if (busyKey) return;
        setBusyKey(format);
        try {
            const result = await downloadSummaryReport(format);
            if (typeof onResult === "function") onResult(result);
            if (result?.ok) onClose?.();
        } catch (e) {
            if (typeof onResult === "function") {
                onResult({
                    ok: false,
                    message: e?.message || "Export failed",
                });
            }
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={busyKey ? undefined : onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
                    <View style={styles.handle} />
                    <Text allowFontScaling={false} style={styles.title}>
                        Export Reports
                    </Text>
                    <Text allowFontScaling={false} style={styles.sub}>
                        Download your administrative summary
                    </Text>

                    {EXPORT_REPORT_OPTIONS.map((opt) => {
                        const loading = busyKey === opt.key;
                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.row, busyKey && !loading && styles.rowDisabled]}
                                activeOpacity={0.85}
                                disabled={!!busyKey}
                                onPress={() => handleDownload(opt.key)}
                            >
                                <View style={styles.rowText}>
                                    <Text allowFontScaling={false} style={styles.rowTitle}>
                                        {opt.title}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.rowSub}>
                                        {opt.subtitle}
                                    </Text>
                                </View>
                                {loading ? (
                                    <ActivityIndicator color={BLUE} />
                                ) : (
                                    <Text allowFontScaling={false} style={styles.rowAction}>
                                        Download
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        activeOpacity={0.85}
                        disabled={!!busyKey}
                        onPress={onClose}
                    >
                        <Text allowFontScaling={false} style={styles.cancelTxt}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(11,31,58,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 24,
    },
    handle: {
        alignSelf: "center",
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#D5DBE5",
        marginBottom: 14,
    },
    title: {
        color: NAVY,
        fontSize: 18,
        fontWeight: "800",
    },
    sub: {
        color: GREY,
        fontSize: 13,
        marginTop: 4,
        marginBottom: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: LIGHTGREY,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E6EAF0",
    },
    rowDisabled: {
        opacity: 0.55,
    },
    rowText: {
        flex: 1,
        paddingRight: 10,
    },
    rowTitle: {
        color: NAVY,
        fontSize: 15,
        fontWeight: "700",
    },
    rowSub: {
        color: GREY,
        fontSize: 12,
        marginTop: 2,
    },
    rowAction: {
        color: BLUE,
        fontSize: 13,
        fontWeight: "700",
    },
    cancelBtn: {
        marginTop: 6,
        alignItems: "center",
        paddingVertical: 12,
    },
    cancelTxt: {
        color: GREY,
        fontSize: 14,
        fontWeight: "600",
    },
});

export default ExportReportSheet;
