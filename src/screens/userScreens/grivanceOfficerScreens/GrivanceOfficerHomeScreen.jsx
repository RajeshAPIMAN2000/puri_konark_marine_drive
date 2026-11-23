import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DashboardWelcomeBanner from "../../../components/commonComponents/DashboardWelcomeBanner";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { NAVY, RED, WHITE } from "../../../constant/color";
import useDashboardSummary from "../../../hooks/useDashboardSummary";

const BARS = [
    { zone: "A", value: 27, color: "#1558E8" }, { zone: "B", value: 19, color: "#078FA7" },
    { zone: "C", value: 20, color: "#873BE7" }, { zone: "D", value: 23, color: "#E62689" },
    { zone: "E", value: 10, color: "#EE7A00" }, { zone: "F", value: 13, color: "#0AA568" },
    { zone: "G", value: 9, color: "#F13B30" },
];
const CATEGORIES = [
    ["Garbage / Waste", 9, "#E98209"], ["Vendor Dispute", 4, "#873BE7"],
    ["Street Lighting", 4, "#078FA7"], ["Safety", 3, "#E8372F"],
    ["Encroachment", 3, "#E62689"], ["Water / Drainage", 3, "#1558E8"],
    ["Road Surface", 3, "#475569"], ["Other", 2, "#7B8CA2"],
];
const FEED = [
    { title: "GRI-2026-0031 - Street Lighting", sub: "Bhudan Chhak Junction · Zone A · open", date: "17 Sept 2026", icon: "flag", bg: "#FFF0F1" },
    { title: "GRI-2026-0030 - Garbage / Waste", sub: "Bhudan Chhak Junction · Zone A · open", date: "10 Sept 2026", icon: "flag", bg: "#FFF0F1" },
    { title: "GRI-2026-0029 - Vendor Dispute", sub: "Bhudan Chhak Junction · Zone A · open", date: "09 Sept 2026", icon: "flag", bg: "#FFF0F1" },
    { title: "GRI-2026-0028 - Garbage / Waste", sub: "Bhudan Chhak Junction · Zone A · open", date: "09 Sept 2026", icon: "flag", bg: "#FFF0F1" },
    { title: "Morning cleanup completed - Pipili", sub: "D · Dilip Behera", date: "08 Sept 2026", icon: "report", bg: "#EAF3FF" },
];

const BarChart = ({ data = BARS }) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <View style={styles.chartArea}>
            <View style={styles.yLabels}><Text style={styles.axis}>{max}</Text><Text style={styles.axis}>{Math.round(max * 0.66)}</Text><Text style={styles.axis}>{Math.round(max * 0.33)}</Text><Text style={styles.axis}>0</Text></View>
            <View style={styles.plot}>
                {[25, 50, 75, 100].map((height) => <View key={height} style={[styles.gridLine, { bottom: height + "%" }]} />)}
                <View style={styles.bars}>{data.map((bar) => <View key={bar.zone} style={styles.barColumn}>
                    <View style={styles.barSlot}><View style={[styles.bar, { height: (bar.value / max) * 100 + "%", backgroundColor: bar.color }]} /></View>
                    <Text style={styles.axis}>{bar.zone}</Text>
                </View>)}</View>
            </View>
        </View>
    );
};

export default function GrivanceOfficerHomeScreen() {
    const {
        loading, error, zoneBars, categories, activities,
        avgResolutionHours, fleetUptime, slaHours, refresh,
    } = useDashboardSummary();
    const bars = zoneBars.length ? zoneBars.map((z) => ({ zone: z.label, value: z.value, color: z.color })) : BARS;
    const cats = categories.length ? categories.map((c) => [c.label, c.value, c.color]) : CATEGORIES;
    const feed = activities.length ? activities.map((a) => ({
        title: a.title, sub: a.sub, date: a.time,
        icon: a.type === "report" ? "report" : "flag",
        bg: a.iconBg,
    })) : FEED;

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader title="Puri-Konark Marine Drive" subtitle="Bhudan Chhak to Chandrabhaga & beyond" height={64} showMenu={false} showProfile={false} showNotification titleAlign="left" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
            >
                {error ? <Text style={{ color: RED, marginBottom: 8 }}>{error}</Text> : null}
                {loading ? <ActivityIndicator color={NAVY} style={{ marginVertical: 8 }} /> : null}
                <DashboardWelcomeBanner
                    title="Grievance Officer"
                    subtitle="Queue and corridor status for today."
                    hPad={12}
                />
                <View style={styles.roleRow}>
                    <View style={styles.roleIcon}><Text style={styles.roleGlyph}>●</Text></View>
                    <Text style={styles.roleTitle}>Grievance Officer</Text>
                    <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
                </View>
                <View style={styles.panel}>
                    <View style={styles.panelHeader}><Text style={styles.panelTitle}>Grievances Overview</Text><TouchableOpacity style={styles.periodButton}><Text style={styles.periodText}>Last 30 Days</Text><Text style={styles.caret}>⌄</Text></TouchableOpacity></View>
                    <BarChart data={bars} />
                </View>
                <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>AVG. RESOLUTION TIME</Text><Text style={styles.metricValue}>{Number.isFinite(avgResolutionHours) ? `${avgResolutionHours}h` : "—"}</Text>
                        <View style={styles.slaBadge}><Text style={styles.slaCheck}>✓</Text><Text style={styles.slaText}>SLA target {slaHours || 48}h</Text></View>
                        <View style={styles.clockIcon}><Text style={styles.clockGlyph}>◷</Text></View>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>FLEET AVAILABILITY</Text><Text style={styles.metricValue}>{Number.isFinite(fleetUptime) ? `${fleetUptime}%` : "—"}</Text>
                        <View style={styles.fleetRing}><Text style={styles.fleetGlyph}>◉</Text></View>
                    </View>
                </View>
                <View style={styles.categoryPanel}>
                    <View style={styles.categoryHeader}><Text style={styles.panelTitle}>Grievances by Category</Text><Text style={styles.categorySub}>All time</Text></View>
                    <View style={styles.categoryBody}>
                        <View style={styles.donutWrap}><View style={styles.donut}><View style={styles.donutHole} /></View></View>
                        <View style={styles.legend}>{cats.map(([name, count, color]) => <View key={name} style={styles.legendRow}><View style={[styles.legendSwatch, { backgroundColor: color }]} /><Text numberOfLines={1} style={styles.legendName}>{name}</Text><Text style={styles.legendCount}>{count}</Text></View>)}</View>
                    </View>
                </View>
                <View style={styles.feedPanel}>
                    <View style={styles.feedHeader}><View><Text style={styles.panelTitle}>Live Activity Feed</Text><Text style={styles.feedSub}>Auto-updates via Socket.io</Text></View><View style={styles.streaming}><View style={styles.streamDot} /><Text style={styles.streamText}>streaming</Text></View></View>
                    {feed.map((item) => <View key={item.title} style={styles.feedRow}>
                        <View style={[styles.feedIconWrap, { backgroundColor: item.bg }]}><Text style={[styles.feedIcon, item.icon === "report" && styles.reportFeedIcon]}>{item.icon === "flag" ? "⚑" : "▤"}</Text></View>
                        <View style={styles.feedCopy}><Text numberOfLines={1} style={styles.feedTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.feedLocation}>{item.sub}</Text></View>
                        <Text style={styles.feedDate}>{item.date}</Text>
                    </View>)}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F1F6FC" },
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 },
    roleRow: { height: 44, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    roleIcon: { width: 34, height: 34, borderRadius: 18, backgroundColor: "#EAF1FB", alignItems: "center", justifyContent: "center" },
    roleGlyph: { color: "#102D50", fontSize: 16 },
    roleTitle: { flex: 1, color: "#0A174A", fontSize: 16, fontWeight: "800" },
    liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E7FBEE", borderWidth: 1, borderColor: "#B8F0CA", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#20C766" },
    liveText: { color: "#078541", fontSize: 11, fontWeight: "800" },
    panel: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: "#E1EAF5", paddingHorizontal: 12, paddingTop: 11, paddingBottom: 10, marginBottom: 9, elevation: 1 },
    panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    panelTitle: { color: "#0A174A", fontSize: 15, fontWeight: "800" },
    periodButton: { height: 34, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "#D5E1F0", borderRadius: 10, paddingHorizontal: 9 },
    periodText: { color: NAVY, fontSize: 10 }, caret: { color: NAVY, fontSize: 17 },
    chartArea: { height: 132, flexDirection: "row", marginTop: 8 },
    yLabels: { width: 24, justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 17 },
    axis: { color: "#52698F", fontSize: 9 },
    plot: { flex: 1, position: "relative", borderBottomWidth: 1, borderColor: "#CCD9E9" },
    gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderColor: "#D9E4F1", borderStyle: "dashed" },
    bars: { flex: 1, flexDirection: "row", alignItems: "stretch", justifyContent: "space-around", zIndex: 1 },
    barColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
    barSlot: { width: "72%", flex: 1, justifyContent: "flex-end", alignItems: "center" },
    bar: { width: "100%", minHeight: 8, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
    metricRow: { flexDirection: "row", gap: 8, marginBottom: 9 },
    metricCard: { flex: 1, height: 112, backgroundColor: WHITE, borderRadius: 15, borderWidth: 1, borderColor: "#E1EAF5", padding: 11, position: "relative", elevation: 1 },
    metricLabel: { color: "#637797", fontSize: 9, fontWeight: "700" },
    metricValue: { color: "#0A174A", fontSize: 23, fontWeight: "800", marginTop: 6 },
    slaBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EAFBF0", borderWidth: 1, borderColor: "#B9F0C9", borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, marginTop: 5 },
    slaCheck: { color: "#078541", fontSize: 11, fontWeight: "800" }, slaText: { color: "#078541", fontSize: 9, fontWeight: "700" },
    clockIcon: { position: "absolute", right: 9, top: 9, width: 36, height: 36, borderRadius: 11, backgroundColor: "#EEF3FA", alignItems: "center", justifyContent: "center" },
    clockGlyph: { color: NAVY, fontSize: 24 },
    fleetRing: { position: "absolute", right: 12, top: 20, width: 55, height: 55, borderRadius: 30, borderWidth: 5, borderColor: "#129A39", alignItems: "center", justifyContent: "center" },
    fleetGlyph: { color: "#129A39", fontSize: 22 },
    categoryPanel: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: "#E1EAF5", overflow: "hidden", marginBottom: 9, elevation: 1 },
    categoryHeader: { paddingHorizontal: 13, paddingTop: 11, paddingBottom: 7, borderBottomWidth: 1, borderColor: "#E7EEF7" },
    categorySub: { color: "#7186AE", fontSize: 10, marginTop: 3 },
    categoryBody: { minHeight: 154, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
    donutWrap: { width: "42%", alignItems: "center", justifyContent: "center" },
    donut: { width: 112, height: 112, borderRadius: 56, borderWidth: 17, borderColor: "#E98209", borderTopColor: "#873BE7", borderRightColor: "#078FA7", borderBottomColor: "#E62689", borderLeftColor: "#1558E8", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-25deg" }] },
    donutHole: { width: 66, height: 66, borderRadius: 34, backgroundColor: WHITE },
    legend: { flex: 1, paddingLeft: 5 },
    legendRow: { flexDirection: "row", alignItems: "center", height: 17 },
    legendSwatch: { width: 9, height: 9, borderRadius: 2, marginRight: 6 },
    legendName: { flex: 1, color: "#334762", fontSize: 9 },
    legendCount: { width: 18, color: "#0A174A", fontSize: 10, textAlign: "right", fontWeight: "700" },
    feedPanel: { backgroundColor: WHITE, borderWidth: 1, borderColor: "#E1EAF5", borderRadius: 16, overflow: "hidden", elevation: 1 },
    feedHeader: { minHeight: 51, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: 1, borderColor: "#E7EEF7" },
    feedSub: { color: "#667C9F", fontSize: 9, marginTop: 2 },
    streaming: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#D7E1EE", backgroundColor: "#F4F7FB", borderRadius: 15, paddingHorizontal: 8, paddingVertical: 5 },
    streamDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F59E0B" },
    streamText: { color: NAVY, fontSize: 9, fontWeight: "600" },
    feedRow: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, borderBottomWidth: 1, borderColor: "#E8EEF6", gap: 7 },
    feedIconWrap: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    feedIcon: { color: "#E11D48", fontSize: 17 }, reportFeedIcon: { color: "#1558E8" },
    feedCopy: { flex: 1, minWidth: 0 },
    feedTitle: { color: "#0A174A", fontSize: 10, fontWeight: "800" },
    feedLocation: { color: "#657B9F", fontSize: 9, marginTop: 3 },
    feedDate: { color: "#7286A9", fontSize: 8 },
});
