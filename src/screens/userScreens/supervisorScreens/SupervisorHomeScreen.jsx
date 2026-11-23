import React, { useMemo } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Image,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import DashboardWelcomeBanner from "../../../components/commonComponents/DashboardWelcomeBanner";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { BLUE, GREEN, NAVY, RED, WHITE } from "../../../constant/color";
import {
    SUBMITFIELDREPORT,
    LOGWORKACTIVITY,
    ZONEGRIVANCE,
    MARKATTENDANCE,
    VENDORONRECORD,
    SUPERVISORS,
    VECHILEACTIVE,
    REPORTSTODAY,
    FIELDATTENDANCES,
    GRIVANCE,
} from "../../../constant/imagePath";
import useDashboardSummary from "../../../hooks/useDashboardSummary";

const QUICK_ACTIONS = [
    { image: SUBMITFIELDREPORT, title: "Submit\nField Report", color: "#1455F8", bg: "#EFF5FF" },
    { image: LOGWORKACTIVITY, title: "Log\nWork Activity", color: "#EA5F0B", bg: "#FFF7ED" },
    { image: ZONEGRIVANCE, title: "Zone\nGrievances", color: "#EF3340", bg: "#FFF1F2" },
    { image: MARKATTENDANCE, title: "Mark\nAttendance", color: "#059669", bg: "#ECFDF5" },
];

const METRICS = [
    { image: VENDORONRECORD, value: "39", label: "Vendors on record", sub: "39 verified  ·  0 pending", color: "#1685F8", bg: "#EAF6FF" },
    { image: SUPERVISORS, value: "1", label: "Supervisors / Zones", sub: "Bhudan Chhak – Puri End...", color: "#3155E8", bg: "#EEF1FF" },
    { image: GRIVANCE, value: "6", label: "Open Grievances", sub: "6 beyond 48h SLA", color: "#F04444", bg: "#FFF1F1" },
    { image: VECHILEACTIVE, value: "1/1", label: "Vehicles Active", sub: "0 idle  ·  0 offline", color: "#059669", bg: "#E9FBF2" },
    { image: REPORTSTODAY, value: "0", label: "Reports Today", sub: "0 in last 7 days", color: "#5141A5", bg: "#F4F0FF" },
    { image: FIELDATTENDANCES, value: "0", label: "Field Attendance", sub: "0 still on duty today", color: "#059669", bg: "#E9FBF2" },
];

const BARS = [
    { label: "A", value: 39, color: "#2459E8" }, { label: "B", value: 22, color: "#079BB6" },
    { label: "C", value: 23, color: "#8541E8" }, { label: "D", value: 24, color: "#E6288D" },
    { label: "E", value: 14, color: "#F27A00" }, { label: "F", value: 17, color: "#13AD63" },
    { label: "G", value: 14, color: "#F04438" },
];

const CATEGORIES = [
    ["Garbage / Waste", "4", "#E98209"], ["Street Lighting", "2", "#0895B5"],
    ["Vendor Dispute", "1", "#A23BD9"], ["Encroachment", "1", "#F04438"],
    ["Water / Drainage", "1", "#DF2995"], ["Road Surface", "1", "#475569"],
];

const Icon = SimpleIcon;

const MetricCard = ({ item }) => (
    <View style={styles.metricCard}>
        <View style={[styles.metricIcon, { backgroundColor: item.bg }]}>
            <Image source={item.image} style={styles.metricImage} resizeMode="contain" />
        </View>
        <Text style={styles.metricValue}>{item.value}</Text>
        <Text numberOfLines={1} style={styles.metricLabel}>{item.label}</Text>
        <Text numberOfLines={1} style={styles.metricSub}>{item.sub}</Text>
    </View>
);

export default function SupervisorHomeScreen() {
    const {
        loading, error, stats, zoneBars, categories, activities,
        avgResolutionHours, fleetUptime, slaHours, refresh, kpis,
    } = useDashboardSummary();

    const metrics = useMemo(() => ([
        { image: VENDORONRECORD, value: String(kpis?.vendors?.total ?? 0), label: "Vendors on record", sub: `${kpis?.vendors?.active ?? 0} verified  ·  ${kpis?.vendors?.unverified ?? 0} pending`, color: "#1685F8", bg: "#EAF6FF" },
        { image: SUPERVISORS, value: String(kpis?.supervisors?.count ?? 0), label: "Supervisors / Zones", sub: "Scoped zone dashboard", color: "#3155E8", bg: "#EEF1FF" },
        { image: GRIVANCE, value: String(kpis?.grievances?.open ?? 0), label: "Open Grievances", sub: `${kpis?.grievances?.slaBreach ?? 0} beyond SLA`, color: "#F04444", bg: "#FFF1F1" },
        { image: VECHILEACTIVE, value: `${kpis?.vehicles?.active ?? 0}/${kpis?.vehicles?.total ?? 0}`, label: "Vehicles Active", sub: `${kpis?.vehicles?.idle ?? 0} idle  ·  ${kpis?.vehicles?.offline ?? 0} offline`, color: "#059669", bg: "#E9FBF2" },
        { image: REPORTSTODAY, value: String(kpis?.reports?.today ?? 0), label: "Reports Today", sub: `${kpis?.reports?.last7Days ?? 0} in last 7 days`, color: "#5141A5", bg: "#F4F0FF" },
        { image: FIELDATTENDANCES, value: String(kpis?.attendance?.presentToday ?? 0), label: "Field Attendance", sub: `${kpis?.attendance?.onDutyNow ?? 0} still on duty today`, color: "#059669", bg: "#E9FBF2" },
    ]), [kpis]);

    const bars = zoneBars.length ? zoneBars : [{ label: "-", value: 0, color: "#94A3B8" }];
    const maxBar = Math.max(...bars.map((b) => b.value), 1);
    const cats = categories.length ? categories.map((c) => [c.label, String(c.value), c.color]) : [["No data", "0", "#94A3B8"]];

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader title="Puri-Konark Marine Drive" subtitle="Zone Dashboard" showMenu={false} showProfile={false} showNotification />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
            >
                {error ? <Text style={{ color: RED, marginBottom: 8 }}>{error}</Text> : null}
                {loading && !stats.length ? <ActivityIndicator color={NAVY} style={{ marginVertical: 10 }} /> : null}
                <DashboardWelcomeBanner
                    title="Supervisor"
                    subtitle="Your zone overview for today."
                    hPad={12}
                />
                <View style={styles.filtersRow}>
                    <TouchableOpacity style={styles.zoneSelector}>
                        <Icon name="map-marker-outline" size={19} color={NAVY} />
                        <Text numberOfLines={1} style={styles.filterText}>Bhudan Chhak – Chandrabhaga (Puri End)</Text>
                        <Icon name="chevron-right" size={19} color={NAVY} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dateSelector}>
                        <Icon name="calendar-blank-outline" size={18} color={NAVY} />
                        <Text style={styles.filterText}>22 Sep 2026</Text>
                        <Icon name="chevron-down" size={16} color={NAVY} />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionsRow}>
                    {QUICK_ACTIONS.map((action) => (
                        <TouchableOpacity key={action.title} style={[styles.actionCard, { backgroundColor: action.bg }]}>
                            <View style={[styles.actionIcon, { backgroundColor: WHITE }]}>
                                <Image source={action.image} style={styles.actionImage} resizeMode="contain" />
                            </View>
                            <Text style={styles.actionText}>{action.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Key Metrics</Text>
                    <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View>
                </View>
                <View style={styles.metricsGrid}>{metrics.map((item) => <MetricCard key={item.label} item={item} />)}</View>

                <View style={styles.chartsRow}>
                    <View style={[styles.panel, styles.halfPanel]}>
                        <Text style={styles.panelTitle}>Vendors per Supervisor Zone</Text>
                        <Text style={styles.panelSubtitle}>Total vendors by zone</Text>
                        <View style={styles.barChart}>
                            {[40, 20, 0].map((tick) => <View key={tick} style={[styles.gridLine, { bottom: 21 + tick / 40 * 76 }]} />)}
                            {bars.map((bar) => <View key={bar.label} style={styles.barColumn}>
                                <View style={[styles.bar, { height: Math.max(bar.value / maxBar * 76, 8), backgroundColor: bar.color }]} />
                                <Text style={styles.axisLabel}>{bar.label}</Text>
                            </View>)}
                        </View>
                    </View>
                    <View style={[styles.panel, styles.halfPanel]}>
                        <Text style={styles.panelTitle}>Grievance Trend – 30 Days</Text>
                        <Text style={styles.panelSubtitle}>Raised vs resolved per day</Text>
                        <View style={styles.trendChart}>
                            <View style={styles.trendLine} />
                            <View style={styles.trendBlue} />
                            <View style={styles.trendGreen} />
                        </View>
                        <View style={styles.trendDates}><Text style={styles.axisLabel}>08-24</Text><Text style={styles.axisLabel}>08-31</Text><Text style={styles.axisLabel}>09-07</Text><Text style={styles.axisLabel}>09-14</Text><Text style={styles.axisLabel}>09-21</Text></View>
                        <View style={styles.legend}><Text style={styles.legendText}>● Raised</Text><Text style={[styles.legendText, { color: GREEN }]}>● Resolved</Text></View>
                    </View>
                </View>

                <View style={styles.lowerRow}>
                    <View style={[styles.panel, styles.categoryPanel]}>
                        <Text style={styles.panelTitle}>Grievances by Category</Text>
                        <View style={styles.categoryContent}>
                            <View style={styles.donut}><View style={styles.donutHole} /></View>
                            <View style={styles.categoryLegend}>{cats.map(([label, value, color]) => <View key={label} style={styles.categoryItem}>
                                <View style={[styles.categoryDot, { backgroundColor: color }]} /><Text numberOfLines={1} style={styles.categoryLabel}>{label}</Text><Text style={styles.categoryValue}>{value}</Text>
                            </View>)}</View>
                        </View>
                    </View>
                    <View style={styles.smallPanels}>
                        <View style={[styles.panel, styles.smallPanel]}>
                            <View><Text style={styles.panelSubtitle}>Avg. Resolution Time</Text><View style={styles.resolutionRow}><Text style={styles.resolutionValue}>{Number.isFinite(avgResolutionHours) ? `${avgResolutionHours}h` : "—"}</Text><Text style={styles.sla}>◉ SLA target {slaHours || 48}h</Text></View></View>
                            <View style={styles.clockBadge}><Icon name="clock-outline" size={21} /></View>
                        </View>
                        <View style={[styles.panel, styles.smallPanel]}>
                            <View><Text style={styles.panelSubtitle}>Fleet Availability</Text><Text style={styles.resolutionValue}>{Number.isFinite(fleetUptime) ? `${fleetUptime}%` : "—"}</Text></View>
                            <View style={styles.fleetBadge}><Icon name="access-point" color={GREEN} size={23} /></View>
                        </View>
                    </View>
                </View>

                <View style={styles.feedPanel}>
                    <View style={styles.feedHeader}><Text style={styles.panelTitle}>Live Activity Feed</Text><TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity></View>
                    {!activities.length ? (
                        <Text style={{ color: "#7A8DA8", paddingVertical: 10 }}>No recent activity</Text>
                    ) : activities.map((item) => (
                        <View key={item.id} style={styles.feedItem}>
                            <View style={styles.feedIcon}><Icon name={item.type === "report" ? "file-document-outline" : item.type === "fleet" ? "car" : "flag-outline"} color={item.type === "fleet" ? GREEN : RED} size={21} /></View>
                            <View style={styles.feedCopy}><Text numberOfLines={1} style={styles.feedTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.feedSub}>{item.sub}</Text></View>
                            <Text style={styles.feedTime}>{item.time}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5FAFF" },
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14 },
    filtersRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    zoneSelector: { flex: 1, height: 42, flexDirection: "row", alignItems: "center", paddingHorizontal: 9, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D8E5F5", borderRadius: 12, gap: 5 },
    dateSelector: { height: 42, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D8E5F5", borderRadius: 12, gap: 5 },
    filterText: { flexShrink: 1, color: "#17376E", fontSize: 10, fontWeight: "500" },
    actionsRow: { flexDirection: "row", justifyContent: "space-between", gap: 7, marginBottom: 12 },
    actionCard: { flex: 1, minHeight: 88, borderRadius: 14, padding: 9, justifyContent: "space-between" },
    actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EDF1F8" },
    actionImage: { width: 23, height: 23 },
    actionText: { color: NAVY, fontSize: 11, lineHeight: 14, fontWeight: "700" },
    sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    sectionTitle: { color: NAVY, fontSize: 17, fontWeight: "800" },
    liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#C9F3DF", backgroundColor: "#F0FDF6", borderRadius: 18, paddingHorizontal: 10, paddingVertical: 5 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
    liveText: { color: GREEN, fontSize: 11, fontWeight: "600" },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 4 },
    metricCard: { width: "32.2%", minHeight: 120, padding: 9, marginBottom: 7, backgroundColor: WHITE, borderRadius: 13, borderWidth: 1, borderColor: "#DDE9F7" },
    metricIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, marginBottom: 5 },
    metricImage: { width: 22, height: 22 },
    metricValue: { fontSize: 18, lineHeight: 21, fontWeight: "800", color: NAVY },
    metricLabel: { color: "#304B7D", fontSize: 10, marginTop: 2 },
    metricSub: { color: "#8093B4", fontSize: 9, marginTop: 4 },
    chartsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    panel: { backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE9F7", borderRadius: 13, padding: 10 },
    halfPanel: { flex: 1, minHeight: 162 },
    panelTitle: { color: NAVY, fontSize: 11, fontWeight: "700" },
    panelSubtitle: { color: "#7184A6", fontSize: 9, marginTop: 3 },
    barChart: { flex: 1, height: 100, marginTop: 8, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingTop: 5, borderBottomWidth: 1, borderColor: "#D6E2F0" },
    gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: "#D6E2F0" },
    barColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
    bar: { width: "57%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    axisLabel: { color: "#7184A6", fontSize: 8 },
    trendChart: { flex: 1, minHeight: 84, marginTop: 9, borderBottomWidth: 1, borderColor: "#D6E2F0", overflow: "hidden", justifyContent: "center" },
    trendLine: { position: "absolute", left: 0, right: 0, top: "56%", borderTopWidth: 1, borderStyle: "dashed", borderColor: "#D6E2F0" },
    trendBlue: { height: 35, borderTopWidth: 2, borderColor: NAVY, transform: [{ skewY: "-12deg" }], marginTop: 8, borderRadius: 20 },
    trendGreen: { height: 20, borderTopWidth: 2, borderColor: "#16A34A", transform: [{ skewY: "8deg" }], marginTop: -7, borderRadius: 20 },
    trendDates: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
    legend: { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 3 },
    legendText: { color: NAVY, fontSize: 8 },
    lowerRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    categoryPanel: { flex: 1.08, minHeight: 145 },
    categoryContent: { flex: 1, flexDirection: "row", alignItems: "center", marginTop: 6 },
    donut: { width: 74, height: 74, borderRadius: 37, borderWidth: 14, borderColor: "#E98209", borderTopColor: "#0895B5", borderRightColor: "#F04438", borderBottomColor: "#DF2995", transform: [{ rotate: "-35deg" }], alignItems: "center", justifyContent: "center" },
    donutHole: { width: 39, height: 39, borderRadius: 20, backgroundColor: WHITE },
    categoryLegend: { flex: 1, marginLeft: 8 },
    categoryItem: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
    categoryDot: { width: 7, height: 7, borderRadius: 2, marginRight: 5 },
    categoryLabel: { flex: 1, color: "#52658B", fontSize: 8 },
    categoryValue: { color: NAVY, fontSize: 9, fontWeight: "700", marginLeft: 3 },
    smallPanels: { flex: 0.92, justifyContent: "space-between", gap: 8 },
    smallPanel: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 9 },
    resolutionRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
    resolutionValue: { color: NAVY, fontSize: 21, fontWeight: "800" },
    sla: { color: GREEN, fontSize: 8, borderWidth: 1, borderColor: "#B8F0D3", backgroundColor: "#F1FCF6", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4 },
    clockBadge: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F6FA" },
    fleetBadge: { width: 38, height: 38, borderRadius: 20, borderWidth: 3, borderColor: GREEN, alignItems: "center", justifyContent: "center" },
    feedPanel: { backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE9F7", borderRadius: 13, overflow: "hidden" },
    feedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 11, paddingVertical: 9, borderBottomWidth: 1, borderColor: "#EDF2F8" },
    viewAll: { color: BLUE, fontSize: 10, fontWeight: "600" },
    feedItem: { flexDirection: "row", alignItems: "center", padding: 9, gap: 8 },
    feedIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center" },
    feedCopy: { flex: 1 },
    feedTitle: { color: NAVY, fontSize: 10, fontWeight: "700" },
    feedSub: { color: "#7184A6", fontSize: 9, marginTop: 3 },
    feedTime: { color: "#7184A6", fontSize: 9 },
    bottomNav: { height: 62, flexDirection: "row", justifyContent: "space-around", alignItems: "center", backgroundColor: WHITE, borderTopWidth: 1, borderColor: "#E8EEF6" },
    navItem: { minWidth: 55, alignItems: "center", justifyContent: "center" },
    navIcon: { width: 38, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 },
    navActive: { backgroundColor: "#153B63" },
    navText: { color: "#52658B", fontSize: 9, marginTop: 1 },
    navTextActive: { color: NAVY, fontWeight: "700" },
});


