import React, { useCallback, useState } from "react";
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import DashboardWelcomeBanner from "../../../components/commonComponents/DashboardWelcomeBanner";
import { ExportReportSheet } from "../../../components/commonComponents/ExportReportSheet";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    WHITE,
    NAVY,
    GREY,
    GREEN,
    RED,
    BLUE,
} from "../../../constant/color";
import {
    VECHILES,
    DOWNLOAD,
} from "../../../constant/imagePath";
import useDashboardSummary from "../../../hooks/useDashboardSummary";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 14;
const CARD_GAP = 10;
const STAT_W = (SCREEN_W - H_PAD * 2 - CARD_GAP) / 2;

const ZoneBarChart = ({ data }) => {
    if (!data?.length) {
        return (
            <Text allowFontScaling={false} style={styles.emptyTxt}>
                No zone vendor data
            </Text>
        );
    }
    const max = Math.max(...data.map((d) => d.value), 1);
    const chartH = 130;

    return (
        <View style={styles.barChart}>
            {data.map((item) => {
                const barH = Math.max((item.value / max) * (chartH - 28), 8);
                return (
                    <View key={item.label} style={styles.barCol}>
                        <Text allowFontScaling={false} style={[styles.barValue, { color: item.color }]}>
                            {item.value}
                        </Text>
                        <View style={[styles.barTrack, { height: chartH - 28 }]}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        height: barH,
                                        backgroundColor: item.color,
                                    },
                                ]}
                            />
                        </View>
                        <Text allowFontScaling={false} style={styles.barLabel}>
                            {item.label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

/** Donut chart built from rotated arc ticks (no extra chart library) */
const SimpleDonut = ({ data, size = 120 }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const thickness = 20;
    let angle = 0;

    const slices = data.map((item) => {
        const sweep = (item.value / total) * 360;
        const start = angle;
        angle += sweep;
        return { ...item, start, sweep };
    });

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            {slices.map((slice, i) => {
                const ticks = Math.max(Math.round(slice.sweep / 3), 1);
                return Array.from({ length: ticks }).map((_, t) => {
                    const a = slice.start + (slice.sweep * t) / ticks - 90;
                    const rad = (a * Math.PI) / 180;
                    const r = size / 2 - thickness / 2;
                    const x = size / 2 + r * Math.cos(rad) - 4;
                    const y = size / 2 + r * Math.sin(rad) - thickness / 2;
                    return (
                        <View
                            key={`${i}-${t}`}
                            style={{
                                position: "absolute",
                                left: x,
                                top: y,
                                width: 9,
                                height: thickness,
                                borderRadius: 4,
                                backgroundColor: slice.color,
                                transform: [{ rotate: `${a + 90}deg` }],
                            }}
                        />
                    );
                });
            })}
            <View
                style={{
                    width: size - thickness * 2 + 4,
                    height: size - thickness * 2 + 4,
                    borderRadius: (size - thickness * 2 + 4) / 2,
                    backgroundColor: WHITE,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            />
        </View>
    );
};

const FleetRing = ({ percent = 75, size = 58 }) => {
    const thickness = 7;
    const ticks = Math.round((percent / 100) * 48);
    const items = Array.from({ length: ticks });

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <View
                style={{
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: thickness,
                    borderColor: "#E5E7EB",
                }}
            />
            {items.map((_, t) => {
                const a = (360 * (percent / 100) * t) / ticks - 90;
                const rad = (a * Math.PI) / 180;
                const r = size / 2 - thickness / 2;
                const x = size / 2 + r * Math.cos(rad) - 3;
                const y = size / 2 + r * Math.sin(rad) - thickness / 2;
                return (
                    <View
                        key={`fleet-${t}`}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            width: 7,
                            height: thickness,
                            borderRadius: 3,
                            backgroundColor: GREEN,
                            transform: [{ rotate: `${a + 90}deg` }],
                        }}
                    />
                );
            })}
            <View
                style={{
                    width: size - thickness * 2 - 2,
                    height: size - thickness * 2 - 2,
                    borderRadius: (size - thickness * 2 - 2) / 2,
                    backgroundColor: WHITE,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Image source={VECHILES} style={{ width: 16, height: 16 }} resizeMode="contain" />
            </View>
        </View>
    );
};

const AdminDashbaorScreen = () => {
    const [exportOpen, setExportOpen] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });
    const {
        loading,
        error,
        stats,
        zoneBars,
        categories,
        activities,
        avgResolutionHours,
        fleetUptime,
        slaHours,
        scoped,
        refresh,
    } = useDashboardSummary();

    const showToast = useCallback((message, type = "error") => {
        setToast({ visible: true, message: String(message || ""), type });
    }, []);

    const categoryData = categories.length
        ? categories
        : [{ label: "No data", value: 1, color: "#94A3B8" }];

    return (
        <View style={styles.root}>
            <MyHeader
                title="PKMD CRM"
                subtitle="Puri-Konark Marine Drive"
                showMenu={false}
                showProfile={false}
                showNotification
                titleAlign="left"
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} />
                }
            >
                <DashboardWelcomeBanner
                    title="Super Admin"
                    subtitle="Here's what's happening today."
                    hPad={H_PAD}
                />

                <TouchableOpacity
                    style={styles.exportBtn}
                    activeOpacity={0.85}
                    onPress={() => setExportOpen(true)}
                >
                    <Image source={DOWNLOAD} style={styles.exportIcon} resizeMode="contain" />
                    <View style={styles.exportTextCol}>
                        <Text allowFontScaling={false} style={styles.exportTitle}>
                            Export Report
                        </Text>
                        <Text allowFontScaling={false} style={styles.exportSub}>
                            Download Excel or PDF summary
                        </Text>
                    </View>
                    <Text allowFontScaling={false} style={styles.exportChevron}>
                        ›
                    </Text>
                </TouchableOpacity>

                {error ? (
                    <Text allowFontScaling={false} style={styles.errorTxt}>
                        {error}
                    </Text>
                ) : null}
                {scoped ? (
                    <Text allowFontScaling={false} style={styles.scopeTxt}>
                        Supervisor-scoped dashboard
                    </Text>
                ) : null}
                {loading && !stats.length ? (
                    <ActivityIndicator color={NAVY} style={{ marginVertical: 16 }} />
                ) : null}

                {/* Stats grid */}
                <View style={styles.statsGrid}>
                    {stats.map((item) => (
                        <View key={item.label} style={styles.statCard}>
                            <View style={[styles.statIconWrap, { backgroundColor: item.iconBg }]}>
                                <Image
                                    source={item.icon}
                                    style={styles.statIcon}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text allowFontScaling={false} style={styles.statValue}>
                                {item.value}
                            </Text>
                            <Text allowFontScaling={false} style={styles.statLabel}>
                                {item.label}
                            </Text>
                            <Text
                                allowFontScaling={false}
                                style={[styles.statSub, { color: item.subColor }]}
                            >
                                {item.sub}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Vendors per zone */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text allowFontScaling={false} style={styles.sectionTitle}>
                            Vendors per Supervisor Zone
                        </Text>
                        <TouchableOpacity activeOpacity={0.7}>
                            <Text allowFontScaling={false} style={styles.viewAll}>
                                View All →
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <ZoneBarChart data={zoneBars} />
                </View>

                {/* Grievances by category */}
                <View style={[styles.sectionCard, styles.lastCard]}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text allowFontScaling={false} style={styles.sectionTitle}>
                                Grievances by Category
                            </Text>
                            <Text allowFontScaling={false} style={styles.sectionSub}>
                                All time
                            </Text>
                        </View>
                        <TouchableOpacity activeOpacity={0.7}>
                            <Text allowFontScaling={false} style={styles.viewAll}>
                                View All →
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.grievanceRow}>
                        <SimpleDonut data={categoryData} size={118} />
                        <View style={styles.legendCol}>
                            {categoryData.map((item) => (
                                <View key={item.label} style={styles.legendRow}>
                                    <View
                                        style={[styles.legendDot, { backgroundColor: item.color }]}
                                    />
                                    <Text
                                        allowFontScaling={false}
                                        style={styles.legendLabel}
                                        numberOfLines={1}
                                    >
                                        {item.label}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.legendValue}>
                                        {item.value}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Resolution / Fleet / Live Activity */}
                <View style={styles.bottomMetricsRow}>
                    <View style={styles.metricsCol}>
                        <View style={styles.metricCard}>
                            <View style={styles.metricTopRow}>
                                <Text allowFontScaling={false} style={styles.metricLabel}>
                                    AVG. RESOLUTION TIME
                                </Text>
                                <View style={styles.metricIconBox}>
                                    <Text allowFontScaling={false} style={styles.clockIcon}>
                                        ⏱
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.metricValueRow}>
                                <Text allowFontScaling={false} style={styles.metricValue}>
                                    {Number.isFinite(avgResolutionHours)
                                        ? `${avgResolutionHours}h`
                                        : "—"}
                                </Text>
                                <View style={styles.slaBadge}>
                                    <Text allowFontScaling={false} style={styles.slaTxt}>
                                        ✓ SLA target {slaHours || 48}h
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.metricCard, styles.metricCardLast]}>
                            <Text allowFontScaling={false} style={styles.metricLabel}>
                                FLEET AVAILABILITY
                            </Text>
                            <View style={styles.fleetRow}>
                                <Text allowFontScaling={false} style={styles.metricValue}>
                                    {Number.isFinite(fleetUptime) ? `${fleetUptime}%` : "—"}
                                </Text>
                                <FleetRing percent={fleetUptime || 0} size={58} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.feedCard}>
                        <View style={styles.feedHeader}>
                            <View style={styles.feedTitleCol}>
                                <Text allowFontScaling={false} style={styles.feedTitle}>
                                    Live Activity Feed
                                </Text>
                                <Text allowFontScaling={false} style={styles.feedSub}>
                                    From dashboard summary
                                </Text>
                            </View>
                            <View style={styles.streamingBadge}>
                                <View style={styles.streamingDot} />
                                <Text allowFontScaling={false} style={styles.streamingTxt}>
                                    live
                                </Text>
                            </View>
                        </View>

                        <ScrollView
                            style={styles.feedList}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator
                            indicatorStyle="black"
                        >
                            {!activities.length ? (
                                <Text allowFontScaling={false} style={styles.emptyTxt}>
                                    No recent activity
                                </Text>
                            ) : (
                                activities.map((item, index) => (
                                    <View
                                        key={`${item.id || item.title}-${index}`}
                                        style={[
                                            styles.feedItem,
                                            index === activities.length - 1 && styles.feedItemLast,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.feedIconWrap,
                                                { backgroundColor: item.iconBg },
                                            ]}
                                        >
                                            <Image
                                                source={item.icon}
                                                style={styles.feedIcon}
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <View style={styles.feedTextCol}>
                                            <Text
                                                allowFontScaling={false}
                                                style={styles.feedItemTitle}
                                                numberOfLines={1}
                                            >
                                                {item.title}
                                            </Text>
                                            <Text
                                                allowFontScaling={false}
                                                style={styles.feedItemSub}
                                                numberOfLines={1}
                                            >
                                                {item.sub}
                                            </Text>
                                        </View>
                                        <Text allowFontScaling={false} style={styles.feedTime}>
                                            {item.time}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>

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
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F7F9FC",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: H_PAD,
        paddingTop: 12,
        paddingBottom: 28,
    },
    exportBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E6EAF0",
    },
    exportIcon: {
        width: 22,
        height: 22,
        tintColor: BLUE,
        marginRight: 12,
    },
    exportTextCol: {
        flex: 1,
    },
    exportTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
    },
    exportSub: {
        color: GREY,
        fontSize: 11,
        marginTop: 2,
    },
    exportChevron: {
        color: BLUE,
        fontSize: 22,
        fontWeight: "600",
        marginLeft: 8,
    },
    errorTxt: {
        color: RED,
        fontSize: 12,
        marginBottom: 8,
    },
    scopeTxt: {
        color: GREY,
        fontSize: 11,
        marginBottom: 8,
    },
    emptyTxt: {
        color: GREY,
        fontSize: 12,
        textAlign: "center",
        paddingVertical: 16,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    statCard: {
        width: STAT_W,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E8EDF4",
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: CARD_GAP,
    },
    statIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statIcon: {
        width: 18,
        height: 18,
    },
    statValue: {
        color: NAVY,
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 2,
    },
    statLabel: {
        color: GREY,
        fontSize: 11,
        fontWeight: "500",
        marginBottom: 4,
    },
    statSub: {
        fontSize: 11,
        fontWeight: "600",
    },
    sectionCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E8EDF4",
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 12,
        marginBottom: 12,
    },
    lastCard: {
        marginBottom: 12,
    },
    bottomMetricsRow: {
        flexDirection: "column",
        marginBottom: 8,
    },
    metricsCol: {
        width: "100%",
        marginBottom: 10,
    },
    metricCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E8EDF4",
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },
    metricCardLast: {
        marginBottom: 0,
    },
    metricTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    metricLabel: {
        color: GREY,
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.6,
    },
    metricIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "#EEF2F7",
        alignItems: "center",
        justifyContent: "center",
    },
    clockIcon: {
        fontSize: 14,
        color: NAVY,
    },
    metricValueRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },
    metricValue: {
        color: NAVY,
        fontSize: 26,
        fontWeight: "700",
        marginRight: 8,
    },
    slaBadge: {
        backgroundColor: "#E8F8EF",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "#B7E4C7",
    },
    slaTxt: {
        color: GREEN,
        fontSize: 11,
        fontWeight: "600",
    },
    fleetRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },
    feedCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E8EDF4",
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
        maxHeight: 320,
    },
    feedHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    feedTitleCol: {
        flex: 1,
        paddingRight: 8,
    },
    feedTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
    },
    feedSub: {
        color: GREY,
        fontSize: 11,
        marginTop: 2,
    },
    streamingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F1FB",
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    streamingDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: GREEN,
        marginRight: 5,
    },
    streamingTxt: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "600",
    },
    feedList: {
        maxHeight: 240,
    },
    feedItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F4F8",
    },
    feedItemLast: {
        borderBottomWidth: 0,
    },
    feedIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    feedIcon: {
        width: 16,
        height: 16,
    },
    feedTextCol: {
        flex: 1,
        paddingRight: 6,
    },
    feedItemTitle: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 2,
    },
    feedItemSub: {
        color: GREY,
        fontSize: 10,
    },
    feedTime: {
        color: GREY,
        fontSize: 10,
        fontWeight: "500",
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    sectionTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
        flexShrink: 1,
        paddingRight: 8,
    },
    sectionSub: {
        color: GREY,
        fontSize: 11,
        marginTop: 2,
    },
    viewAll: {
        color: BLUE,
        fontSize: 12,
        fontWeight: "600",
    },
    barChart: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingHorizontal: 2,
    },
    barCol: {
        flex: 1,
        alignItems: "center",
    },
    barValue: {
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 4,
    },
    barTrack: {
        width: "70%",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    barFill: {
        width: "100%",
        borderRadius: 6,
        minHeight: 8,
    },
    barLabel: {
        color: GREY,
        fontSize: 11,
        fontWeight: "600",
        marginTop: 6,
    },
    grievanceRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    legendCol: {
        flex: 1,
        marginLeft: 12,
    },
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    legendLabel: {
        flex: 1,
        color: GREY,
        fontSize: 11,
        fontWeight: "500",
    },
    legendValue: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "700",
        marginLeft: 6,
    },
});

export default AdminDashbaorScreen;
