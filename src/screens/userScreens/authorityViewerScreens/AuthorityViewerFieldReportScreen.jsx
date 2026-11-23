import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { BLUE, GREY, NAVY, WHITE } from "../../../constant/color";
import { BANNER, LOCATION, PHOTO, REPORTS } from "../../../constant/imagePath";
import {
    fetchFieldReports,
    toErrorText,
    toZoneCode,
} from "../../../services/reports/ReportsService";

const ZONES = ["All zones", "Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F"];

const FieldReportCard = ({ report }) => (
    <View style={styles.reportCard}>
        <Image
            source={report.photoUrl ? { uri: report.photoUrl } : BANNER}
            style={styles.thumbnail}
            resizeMode="cover"
        />
        <View style={styles.reportContent}>
            <View style={styles.reportMetaRow}>
                <Text style={styles.reportMeta}>{report.ago}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.reportMeta} numberOfLines={1}>
                    {report.reporter}
                </Text>
                <View style={styles.zonePill}>
                    <Text style={styles.zoneText}>{report.zone}</Text>
                </View>
            </View>
            <Text style={styles.reportTitle} numberOfLines={1}>
                {report.title}
            </Text>
            <Text style={styles.reportDescription} numberOfLines={2}>
                {report.description}
            </Text>
            <View style={styles.detailRow}>
                <Image source={LOCATION} style={styles.detailIcon} resizeMode="contain" />
                <Text style={styles.detailText} numberOfLines={1}>
                    {report.coords}
                </Text>
                <View style={styles.detailDivider} />
                <Image source={PHOTO} style={styles.detailIcon} resizeMode="contain" />
                <Text style={styles.photoText}>
                    {report.photoUrl ? "1 photo" : "No photo"}
                </Text>
            </View>
            {report.supervisor && report.supervisor !== "—" ? (
                <Text style={styles.supervisorTxt} numberOfLines={1}>
                    Supervisor: {report.supervisor}
                </Text>
            ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
    </View>
);

export default function AuthorityViewFieldReportScreen() {
    const [query, setQuery] = useState("");
    const [selectedZone, setSelectedZone] = useState("All zones");
    const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
                    zoneCode: toZoneCode(selectedZone),
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
        [selectedZone, showToast]
    );

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const filteredReports = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return reports;
        return reports.filter((report) => {
            const searchable = `${report.title} ${report.description} ${report.reporter} ${report.supervisor} ${report.coords}`.toLowerCase();
            return searchable.includes(q);
        });
    }, [query, reports]);

    return (
        <View style={styles.screen}>
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
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadReports({ soft: true })} />
                }
            >
                <View style={styles.toolbar}>
                    <View style={styles.searchBox}>
                        <Text style={styles.searchGlyph}>⌕</Text>
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Search reports, location, reporter..."
                            placeholderTextColor="#8496B8"
                            style={styles.searchInput}
                            returnKeyType="search"
                        />
                    </View>
                    <Pressable style={styles.zoneButton} onPress={() => setZoneMenuOpen(!zoneMenuOpen)}>
                        <Text style={styles.zoneButtonText} numberOfLines={1}>
                            {selectedZone}
                        </Text>
                        <Text style={styles.downArrow}>⌄</Text>
                    </Pressable>
                </View>
                {zoneMenuOpen && (
                    <View style={styles.zoneMenu}>
                        {ZONES.map((zone) => (
                            <Pressable
                                key={zone}
                                style={styles.zoneOption}
                                onPress={() => {
                                    setSelectedZone(zone);
                                    setZoneMenuOpen(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.zoneOptionText,
                                        selectedZone === zone && styles.zoneOptionSelected,
                                    ]}
                                >
                                    {zone}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View style={styles.summaryRow}>
                    <Image source={REPORTS} style={styles.summaryIcon} resizeMode="contain" />
                    <Text style={styles.summaryTxt}>
                        {filteredReports.length} report{filteredReports.length === 1 ? "" : "s"}
                    </Text>
                </View>

                {loading && !filteredReports.length ? (
                    <ActivityIndicator color={NAVY} style={{ marginTop: 28 }} />
                ) : (
                    <View style={styles.reportList}>
                        {filteredReports.map((report) => (
                            <FieldReportCard key={String(report.id)} report={report} />
                        ))}
                        {filteredReports.length === 0 && (
                            <Text style={styles.emptyText}>No reports match your filters.</Text>
                        )}
                    </View>
                )}
            </ScrollView>

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
    screen: { flex: 1, backgroundColor: "#F5F8FC" },
    scrollContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 },
    toolbar: { flexDirection: "row", alignItems: "center", gap: 7 },
    searchBox: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D9E3F2",
        backgroundColor: WHITE,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
    },
    searchGlyph: { color: "#8496B8", fontSize: 16, marginRight: 6 },
    searchInput: { flex: 1, color: NAVY, fontSize: 13, padding: 0 },
    zoneButton: {
        maxWidth: 118,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D9E3F2",
        backgroundColor: WHITE,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    zoneButtonText: { color: NAVY, fontSize: 12, fontWeight: "600", maxWidth: 82 },
    downArrow: { color: GREY, marginLeft: 4, fontSize: 14 },
    zoneMenu: {
        marginTop: 8,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2EAF5",
        overflow: "hidden",
    },
    zoneOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F4FA" },
    zoneOptionText: { color: NAVY, fontSize: 13 },
    zoneOptionSelected: { color: BLUE, fontWeight: "700" },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
        marginBottom: 8,
    },
    summaryIcon: { width: 16, height: 16, tintColor: BLUE },
    summaryTxt: { color: GREY, fontSize: 12, fontWeight: "600" },
    reportList: { gap: 10 },
    emptyText: { color: GREY, textAlign: "center", paddingVertical: 28 },
    reportCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E4ECF6",
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    thumbnail: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#E8EEF6" },
    reportContent: { flex: 1, marginLeft: 10, minWidth: 0 },
    reportMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    reportMeta: { color: "#7A8BA8", fontSize: 11, flexShrink: 1 },
    metaDot: { color: "#B0BDD2", fontSize: 11 },
    zonePill: {
        marginLeft: "auto",
        backgroundColor: "#EFF5FF",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: "#D6E5FF",
    },
    zoneText: { color: "#1454C4", fontSize: 10, fontWeight: "700" },
    reportTitle: { color: NAVY, fontSize: 13, fontWeight: "700", marginTop: 4 },
    reportDescription: { color: "#657B9F", fontSize: 11, lineHeight: 15, marginTop: 2 },
    detailRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    detailIcon: { width: 12, height: 12, tintColor: GREY },
    detailText: { color: "#7186AE", fontSize: 10, flexShrink: 1, maxWidth: "46%" },
    detailDivider: { width: 1, height: 12, backgroundColor: "#D5DEEA", marginHorizontal: 2 },
    photoText: { color: "#7186AE", fontSize: 10 },
    supervisorTxt: { color: "#8496B8", fontSize: 10, marginTop: 4 },
    chevron: { color: "#244A80", fontSize: 22, marginLeft: 4 },
});
