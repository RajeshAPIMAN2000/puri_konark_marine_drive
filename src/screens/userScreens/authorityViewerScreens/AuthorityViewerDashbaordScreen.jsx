import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import DashboardWelcomeBanner from "../../../components/commonComponents/DashboardWelcomeBanner";
import { ExportReportSheet } from "../../../components/commonComponents/ExportReportSheet";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    BLUE,
    GREEN,
    GREY,
    NAVY,
    RED,
    WHITE,
} from "../../../constant/color";
import {
    DOWNLOAD,
    FIELDATTENDANCE,
    GRIVANCE,
    REPORTS,
    SUPERVISOR,
    VECHILES,
    VENDOR,
    ZONE,
} from "../../../constant/imagePath";
import useDashboardSummary from "../../../hooks/useDashboardSummary";

const ZONES = ["All zones", "Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F", "Zone G"];

const CHART_H = 120;

const Donut = ({ data = [] }) => {
    const source = data.length ? data : [{ label: "No data", value: 1, color: "#94A3B8" }];
    const total = source.reduce((sum, item) => sum + item.value, 0) || 1;
    const ticks = 40;
    const colors = [];
    source.forEach((item) => {
        const count = Math.max(1, Math.round((item.value / total) * ticks));
        for (let i = 0; i < count && colors.length < ticks; i += 1) colors.push(item.color);
    });
    while (colors.length < ticks) colors.push(source[source.length - 1].color);

    const size = 124;
    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            {colors.map((color, index) => (
                <View
                    key={`${color}-${index}`}
                    style={{
                        position: "absolute",
                        left: size / 2 - 4,
                        top: size / 2 - 6,
                        width: 8,
                        height: 13,
                        borderRadius: 4,
                        backgroundColor: color,
                        transform: [
                            { rotate: `${(index / ticks) * 360}deg` },
                            { translateY: -46 },
                        ],
                    }}
                />
            ))}
            <View style={styles.donutCenter}>
                <Text allowFontScaling={false} style={styles.donutValue}>{total}</Text>
                <Text allowFontScaling={false} style={styles.donutLabel}>Total</Text>
            </View>
        </View>
    );
};

const FleetRing = ({ percent = 0 }) => {
    const ticks = 28;
    const active = Math.round(ticks * (Math.max(0, Math.min(100, percent)) / 100));
    const size = 54;
    return (
        <View style={{ width: size, height: size }}>
            {Array.from({ length: ticks }).map((_, index) => (
                <View
                    key={index}
                    style={{
                        position: "absolute",
                        left: size / 2 - 2,
                        top: size / 2 - 3,
                        width: 4,
                        height: 7,
                        borderRadius: 2,
                        backgroundColor: index < active ? "#16A34A" : "#E2E8F0",
                        transform: [
                            { rotate: `${(index / ticks) * 360 - 90}deg` },
                            { translateY: -20 },
                        ],
                    }}
                />
            ))}
            <View style={styles.fleetIconCenter}>
                <Image source={VECHILES} style={styles.fleetMini} resizeMode="contain" />
            </View>
        </View>
    );
};

export default function AuthorityViewerDashbaordScreen() {
    const [zone, setZone] = useState("All zones");
    const [zoneOpen, setZoneOpen] = useState(false);
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
        refresh,
        kpis,
    } = useDashboardSummary();

    const showToast = useCallback((message, type = "error") => {
        setToast({ visible: true, message: String(message || ""), type });
    }, []);

    const bars = useMemo(
        () =>
            zoneBars.map((item) => ({
                key: item.label,
                value: item.value,
                color: item.color,
            })),
        [zoneBars]
    );

    const maxBar = Math.max(...bars.map((b) => b.value), 1);
    const todayLabel = new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return (
        <View style={styles.root}>
            <MyHeader
                title="Puri-Konark Marine Drive"
                subtitle="Command Dashboard"
                height={52}
                showMenu={false}
                showProfile={false}
                showNotification
                titleAlign="left"
            />

            <ScrollView
                style={styles.page}
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
            >
                {error ? (
                    <Text allowFontScaling={false} style={{ color: RED, marginBottom: 8 }}>
                        {error}
                    </Text>
                ) : null}
                {loading && !stats.length ? (
                    <ActivityIndicator color={NAVY} style={{ marginVertical: 12 }} />
                ) : null}
                <DashboardWelcomeBanner
                    title="Authority Viewer"
                    subtitle="Corridor command overview for today."
                    hPad={12}
                />
                <View style={styles.toolbar}>
                    <View style={styles.dateChip}>
                        <Image source={FIELDATTENDANCE} style={styles.toolIcon} resizeMode="contain" />
                        <Text allowFontScaling={false} style={styles.toolTxt}>{todayLabel}</Text>
                    </View>
                    <View style={styles.zoneWrap}>
                        <TouchableOpacity
                            style={styles.zoneChip}
                            activeOpacity={0.85}
                            onPress={() => setZoneOpen((open) => !open)}
                        >
                            <Image source={ZONE} style={styles.toolIcon} resizeMode="contain" />
                            <Text allowFontScaling={false} style={styles.toolTxt}>{zone}</Text>
                            <Text allowFontScaling={false} style={styles.caret}>▾</Text>
                        </TouchableOpacity>
                        {zoneOpen && (
                            <View style={styles.zoneMenu}>
                                {ZONES.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={styles.zoneItem}
                                        onPress={() => {
                                            setZone(item);
                                            setZoneOpen(false);
                                        }}
                                    >
                                        <Image source={ZONE} style={styles.menuIcon} resizeMode="contain" />
                                        <Text allowFontScaling={false} style={styles.zoneItemTxt}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                    <View style={styles.live}>
                        <View style={styles.liveDot} />
                        <Text allowFontScaling={false} style={styles.liveTxt}>LIVE</Text>
                    </View>
                </View>

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

                <View style={styles.statGrid}>
                    <Stat
                        icon={VENDOR}
                        tint="#2563EB"
                        bg="#E8F1FF"
                        title="Vendors on Record"
                        value={String(kpis?.vendors?.total ?? 0)}
                        note={`${kpis?.vendors?.active ?? 0} active`}
                        extra={`${kpis?.vendors?.unverified ?? 0} unverified`}
                    />
                    <Stat
                        icon={SUPERVISOR}
                        tint="#2563EB"
                        bg="#E8F1FF"
                        title="Supervisors / Zones"
                        value={String(kpis?.supervisors?.count ?? 0)}
                        note="Role-scoped zones"
                    />
                    <Stat
                        icon={GRIVANCE}
                        tint="#E11D48"
                        bg="#FDECEC"
                        title="Open Grievances"
                        value={String(kpis?.grievances?.open ?? 0)}
                        note={`${kpis?.grievances?.slaBreach ?? 0} beyond SLA`}
                        extra={`${kpis?.grievances?.createdLast7Days ?? 0} this week`}
                    />
                    <Stat
                        icon={VECHILES}
                        tint="#16A34A"
                        bg="#E8F8EE"
                        title="Vehicles Active"
                        value={`${kpis?.vehicles?.active ?? 0}/${kpis?.vehicles?.total ?? 0}`}
                        note={`${kpis?.vehicles?.idle ?? 0} idle • ${kpis?.vehicles?.offline ?? 0} offline`}
                    />
                    <Stat
                        icon={REPORTS}
                        tint="#2563EB"
                        bg="#E8F1FF"
                        title="Reports Today"
                        value={String(kpis?.reports?.today ?? 0)}
                        note={`${kpis?.reports?.last7Days ?? 0} in last 7 days`}
                    />
                    <Stat
                        icon={FIELDATTENDANCE}
                        tint="#0F766E"
                        bg="#E6F7F4"
                        title="Field Attendance"
                        value={String(kpis?.attendance?.presentToday ?? 0)}
                        note={`${kpis?.attendance?.onDutyNow ?? 0} still on duty today`}
                    />
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHead}>
                        <View style={styles.cardTitleRow}>
                            <Image source={REPORTS} style={styles.sectionIcon} resizeMode="contain" />
                            <View>
                                <Text allowFontScaling={false} style={styles.cardTitle}>
                                    Vendors per Supervisor Zone
                                </Text>
                                <Text allowFontScaling={false} style={styles.cardSub}>Colour-coded by zone</Text>
                            </View>
                        </View>
                        <Text allowFontScaling={false} style={styles.link}>View all →</Text>
                    </View>
                    <View style={styles.chartRow}>
                        <View style={styles.yAxis}>
                            {[maxBar, Math.round(maxBar * 0.75), Math.round(maxBar * 0.5), Math.round(maxBar * 0.25), 0].map((label) => (
                                <Text key={label} allowFontScaling={false} style={styles.yLabel}>{label}</Text>
                            ))}
                        </View>
                        <View style={styles.plot}>
                            {[0, 1, 2, 3, 4].map((line) => (
                                <View key={line} style={[styles.gridLine, { bottom: (line / 4) * CHART_H }]} />
                            ))}
                            <View style={styles.bars}>
                                {(bars.length ? bars : [{ key: "-", value: 0, color: GREY }]).map((bar) => (
                                    <View key={bar.key} style={styles.barCol}>
                                        <View
                                            style={[
                                                styles.bar,
                                                {
                                                    height: Math.max((bar.value / maxBar) * CHART_H, 4),
                                                    backgroundColor: bar.color,
                                                },
                                            ]}
                                        />
                                        <Text allowFontScaling={false} style={styles.barLabel}>{bar.key}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text allowFontScaling={false} style={styles.cardTitle}>Grievances by Category</Text>
                    <Text allowFontScaling={false} style={styles.cardSub}>All time</Text>
                    <View style={styles.categoryRow}>
                        <Donut data={categories} />
                        <View style={styles.legend}>
                            {(categories.length ? categories : [{ label: "No data", value: 0, color: GREY }]).map((item) => (
                                <View key={item.label} style={styles.legendRow}>
                                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                    <Text allowFontScaling={false} style={styles.legendTxt} numberOfLines={1}>
                                        {item.label}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.legendVal}>{item.value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.metricTop}>
                        <Text allowFontScaling={false} style={styles.metricLabel}>AVG. RESOLUTION TIME</Text>
                        <View style={styles.clockBox}>
                            <Image source={FIELDATTENDANCE} style={styles.clockIcon} resizeMode="contain" />
                        </View>
                    </View>
                    <View style={styles.metricBottom}>
                        <Text allowFontScaling={false} style={styles.metricValue}>
                            {Number.isFinite(avgResolutionHours) ? `${avgResolutionHours}h` : "—"}
                        </Text>
                        <View style={styles.slaPill}>
                            <View style={styles.slaDot} />
                            <Text allowFontScaling={false} style={styles.slaTxt}>
                                SLA target {slaHours || 48}h
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.metricTop}>
                        <Text allowFontScaling={false} style={styles.metricLabel}>FLEET AVAILABILITY</Text>
                        <FleetRing percent={fleetUptime || 0} />
                    </View>
                    <Text allowFontScaling={false} style={styles.metricValue}>
                        {Number.isFinite(fleetUptime) ? `${fleetUptime}%` : "—"}
                    </Text>
                </View>

                <View style={styles.feedCard}>
                    <View style={styles.cardHead}>
                        <View>
                            <Text allowFontScaling={false} style={styles.cardTitle}>Live Activity Feed</Text>
                            <Text allowFontScaling={false} style={styles.cardSub}>From dashboard summary</Text>
                        </View>
                        <View style={styles.streamPill}>
                            <View style={styles.streamDot} />
                            <Text allowFontScaling={false} style={styles.streamTxt}>live</Text>
                        </View>
                    </View>
                    <FlatList
                        data={activities.map((item) => ({
                            id: item.id,
                            icon: item.icon,
                            tint: item.type === "fleet" ? "#7C3AED" : item.type === "report" ? "#2563EB" : "#E11D48",
                            bg: item.iconBg,
                            title: item.title,
                            sub: item.sub,
                            ago: item.time,
                        }))}
                        keyExtractor={(item) => String(item.id)}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <Text allowFontScaling={false} style={{ color: GREY, paddingVertical: 12 }}>
                                No recent activity
                            </Text>
                        }
                        renderItem={({ item }) => (
                            <View style={styles.feedRow}>
                                <View style={[styles.feedIcon, { backgroundColor: item.bg }]}>
                                    <Image
                                        source={item.icon}
                                        style={[styles.feedImg, { tintColor: item.tint }]}
                                        resizeMode="contain"
                                    />
                                </View>
                                <View style={styles.feedBody}>
                                    <Text allowFontScaling={false} style={styles.feedTitle} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.feedSub} numberOfLines={1}>
                                        {item.sub}
                                    </Text>
                                </View>
                                <Text allowFontScaling={false} style={styles.feedAgo}>{item.ago}</Text>
                            </View>
                        )}
                    />
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
}

const Stat = ({ icon, tint, bg, title, value, note, extra }) => (
    <View style={styles.stat}>
        <View style={styles.statTop}>
            <View style={[styles.statIconBox, { backgroundColor: bg }]}>
                <Image source={icon} style={[styles.statIcon, { tintColor: tint }]} resizeMode="contain" />
            </View>
            <Text allowFontScaling={false} style={styles.statTitle}>{title}</Text>
        </View>
        <Text allowFontScaling={false} style={styles.statValue}>{value}</Text>
        <Text allowFontScaling={false} style={styles.statNote}>{note}</Text>
        {!!extra && <Text allowFontScaling={false} style={styles.statNote}>{extra}</Text>}
    </View>
);

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F4F7FB" },
    page: { flex: 1 },
    pageContent: { paddingBottom: 24 },
    exportBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 14,
        marginHorizontal: 12,
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E6EEF8",
    },
    exportIcon: {
        width: 20,
        height: 20,
        tintColor: BLUE,
        marginRight: 12,
    },
    exportTextCol: { flex: 1 },
    exportTitle: { color: NAVY, fontSize: 14, fontWeight: "700" },
    exportSub: { color: GREY, fontSize: 11, marginTop: 2 },
    exportChevron: { color: BLUE, fontSize: 22, fontWeight: "600", marginLeft: 8 },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        marginTop: 10,
        zIndex: 20,
    },
    dateChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E6EEF8",
        paddingHorizontal: 8,
        height: 32,
        marginRight: 6,
    },
    zoneWrap: { marginRight: 6, zIndex: 20 },
    zoneChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E6EEF8",
        paddingHorizontal: 8,
        height: 32,
    },
    toolIcon: { width: 12, height: 12, marginRight: 4, tintColor: GREY },
    toolTxt: { color: NAVY, fontSize: 11, fontWeight: "600" },
    caret: { color: GREY, fontSize: 10, marginLeft: 4 },
    zoneMenu: {
        position: "absolute",
        top: 36,
        left: 0,
        width: 140,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        elevation: 8,
        zIndex: 30,
    },
    zoneItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
    menuIcon: { width: 12, height: 12, marginRight: 6 },
    zoneItemTxt: { color: NAVY, fontSize: 12 },
    live: {
        marginLeft: "auto",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F8EE",
        borderRadius: 20,
        paddingHorizontal: 10,
        height: 32,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN, marginRight: 5 },
    liveTxt: { color: GREEN, fontSize: 11, fontWeight: "800" },
    statGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 8,
        marginTop: 10,
    },
    stat: {
        width: "31.5%",
        marginHorizontal: "0.9%",
        marginBottom: 8,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 8,
        minHeight: 108,
    },
    statTop: { flexDirection: "row", alignItems: "flex-start" },
    statIconBox: {
        width: 22,
        height: 22,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 4,
    },
    statIcon: { width: 12, height: 12 },
    statTitle: { flex: 1, color: GREY, fontSize: 9, fontWeight: "600", lineHeight: 12 },
    statValue: { color: NAVY, fontSize: 22, fontWeight: "800", marginTop: 8 },
    statNote: { color: "#64748B", fontSize: 9, lineHeight: 12 },
    card: {
        marginHorizontal: 12,
        marginTop: 8,
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 12,
    },
    cardHead: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
    sectionIcon: { width: 16, height: 16, marginRight: 8, tintColor: NAVY },
    cardTitle: { color: NAVY, fontSize: 14, fontWeight: "700" },
    cardSub: { color: GREY, fontSize: 11, marginTop: 2 },
    link: { color: "#2563EB", fontSize: 12, fontWeight: "600" },
    chartRow: { flexDirection: "row", marginTop: 12, height: CHART_H + 18 },
    yAxis: { width: 22, justifyContent: "space-between", height: CHART_H },
    yLabel: { color: GREY, fontSize: 9 },
    plot: { flex: 1, height: CHART_H },
    gridLine: {
        position: "absolute",
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: "#EEF2F7",
    },
    bars: {
        flex: 1,
        height: CHART_H,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-around",
    },
    barCol: { alignItems: "center", justifyContent: "flex-end", height: CHART_H },
    bar: { width: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    barLabel: { position: "absolute", bottom: -16, color: GREY, fontSize: 11, fontWeight: "700" },
    categoryRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    donutCenter: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
    },
    donutValue: { color: NAVY, fontSize: 18, fontWeight: "800" },
    donutLabel: { color: GREY, fontSize: 11 },
    legend: { flex: 1, marginLeft: 8 },
    legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    legendTxt: { flex: 1, color: "#475569", fontSize: 11 },
    legendVal: { color: NAVY, fontSize: 11, fontWeight: "700" },
    metricTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    metricLabel: { color: GREY, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
    metricBottom: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    metricValue: { color: NAVY, fontSize: 28, fontWeight: "800", marginRight: 10 },
    slaPill: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#BBF7D0",
        backgroundColor: "#F0FDF4",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    slaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN, marginRight: 4 },
    slaTxt: { color: GREEN, fontSize: 11, fontWeight: "700" },
    clockBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
    },
    clockIcon: { width: 16, height: 16, tintColor: GREY },
    fleetIconCenter: {
        position: "absolute",
        left: 15,
        top: 15,
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    fleetMini: { width: 12, height: 12, tintColor: GREEN },
    feedCard: {
        marginHorizontal: 12,
        marginTop: 8,
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        paddingTop: 12,
        paddingBottom: 6,
    },
    streamPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF7ED",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 12,
    },
    streamDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EA5F0B", marginRight: 4 },
    streamTxt: { color: "#C2410C", fontSize: 11, fontWeight: "700" },
    feedRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    feedIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    feedImg: { width: 14, height: 14 },
    feedBody: { flex: 1, marginRight: 8 },
    feedTitle: { color: NAVY, fontSize: 12, fontWeight: "700" },
    feedSub: { color: GREY, fontSize: 11, marginTop: 2 },
    feedAgo: { color: GREY, fontSize: 11 },
});
