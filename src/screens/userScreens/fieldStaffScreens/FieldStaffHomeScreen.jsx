import React from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import DashboardWelcomeBanner from "../../../components/commonComponents/DashboardWelcomeBanner";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { NAVY, WHITE } from "../../../constant/color";
import { CHECKIN, GRIVANCE, LOGWORKACTIVITY, REPORTS, SUBMITFIELDREPORT } from "../../../constant/imagePath";

const GRIEVANCES = [
    { id: "GRI-2026-0008", title: "Road Surface", place: "Pipili-Ramachandi road", date: "06 Sept 2026", state: "Assigned", type: "open" },
    { id: "GRI-2026-0002", title: "Garbage / Waste", place: "Pipili promenade, near Coconut row", date: "06 Sept 2026", state: "Open", type: "open" },
    { id: "GRI-2026-0015", title: "Water / Drainage", place: "Ramachandi ghat side", date: "02 Sept 2026", state: "Resolved", type: "resolved" },
    { id: "GRI-2026-0019", title: "Vendor Dispute", place: "Pipili coconut row", date: "30 Aug 2026", state: "Resolved", type: "resolved" },
];

const RECENT_REPORTS = [
    { title: "Morning beach inspection", detail: "Pipili - Ramachandi Road · Today, 10:30 AM", status: "Submitted" },
    { title: "Street light check", detail: "Zone D · Yesterday, 05:15 PM", status: "Submitted" },
];

const SectionHeading = ({ title, action = "All" }) => (
    <View style={styles.sectionHeading}><Text style={styles.sectionHeadingText}>{title}</Text><TouchableOpacity style={styles.allButton}><Text style={styles.allText}>{action} ›</Text></TouchableOpacity></View>
);

export default function FieldStaffHomeScreen() {
    const navigation = useNavigation();
    const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });
    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader title="Field Staff" subtitle="Puri-Konark Marine Drive" height={62} showMenu={false} showProfile={false} showNotification titleAlign="left" />
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <DashboardWelcomeBanner
                    title="Field Staff"
                    subtitle="Your duty checklist for today."
                    hPad={12}
                />
                <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}><Text style={styles.initials}>DB</Text></View>
                    <View style={styles.profileInfo}><Text style={styles.name}>Dilip Behera</Text><Text style={styles.zone}>Zone D · Pipili - Ramachandi</Text></View>
                    <Text style={styles.dutyLine}>{today} · Duty checklist & site reporting</Text>
                </View>

                <View style={styles.attendanceCard}>
                    <Text style={styles.attendanceTitle}>Daily attendance</Text>
                    <Text style={styles.attendanceSub}>Check in captures your current GPS as the login location</Text>
                    <TouchableOpacity style={styles.checkInButton}><Image source={CHECKIN} style={styles.checkInIcon} resizeMode="contain" /><Text style={styles.checkInText}>Check in</Text></TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => navigation.navigate("My Attendance")}
                >
                    <Text style={styles.historyText}>View my attendance history →</Text>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionCard, styles.reportActionCard]}
                        activeOpacity={0.88}
                        onPress={() => navigation.navigate("My Report")}
                    >
                        <View style={styles.reportActionIcon}>
                            <Image
                                source={SUBMITFIELDREPORT}
                                style={styles.actionIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.actionTitle}>Submit Daily Report</Text>
                        <Text style={styles.actionSub}>Photo + GPS + observations</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionCard, styles.workActionCard]}
                        activeOpacity={0.88}
                        onPress={() => navigation.navigate("My Activity")}
                    >
                        <View style={styles.workActionIcon}>
                            <Image
                                source={LOGWORKACTIVITY}
                                style={styles.actionIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.actionTitle}>Log Work Activity</Text>
                        <Text style={styles.actionSub}>Manpower & materials</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.panel}>
                    <SectionHeading title="GRIEVANCES IN MY ZONE" />
                    <View style={styles.grievanceList}>{GRIEVANCES.map((item, index) => (
                        <View key={item.id} style={[styles.grievanceRow, index === GRIEVANCES.length - 1 && styles.lastRow]}>
                            <View style={[styles.grievanceIcon, item.type === "resolved" && styles.resolvedIcon]}>{item.type === "resolved" ? <Text style={styles.checkMark}>✓</Text> : <Image source={GRIVANCE} style={styles.flagIcon} resizeMode="contain" />}</View>
                            <View style={styles.grievanceInfo}><Text numberOfLines={1} style={styles.grievanceTitle}>{item.id} · {item.title}</Text><Text numberOfLines={1} style={styles.grievancePlace}>{item.place} · {item.date}</Text></View>
                            <View style={[styles.statePill, item.state === "Assigned" && styles.assignedPill, item.state === "Open" && styles.openPill, item.state === "Resolved" && styles.resolvedPill]}><Text style={[styles.stateText, item.state === "Assigned" && styles.assignedText, item.state === "Open" && styles.openText, item.state === "Resolved" && styles.resolvedText]}>{item.state}</Text></View>
                        </View>
                    ))}</View>
                </View>

                <View style={styles.panel}>
                    <SectionHeading title="MY RECENT REPORTS" />
                    {RECENT_REPORTS.map((report) => <View key={report.title} style={styles.recentRow}>
                        <View style={styles.recentIcon}><Image source={REPORTS} style={styles.recentImage} resizeMode="contain" /></View>
                        <View style={styles.recentInfo}><Text style={styles.recentTitle}>{report.title}</Text><Text style={styles.recentSub}>{report.detail}</Text></View>
                        <Text style={styles.submitted}>{report.status}</Text>
                    </View>)}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 130, gap: 9 },
    profileCard: { minHeight: 106, flexDirection: "row", flexWrap: "wrap", alignItems: "center", backgroundColor: "#0D233D", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 12, gap: 9 },
    profileAvatar: { width: 52, height: 52, borderRadius: 28, backgroundColor: "#EA5F0B", alignItems: "center", justifyContent: "center" },
    initials: { color: WHITE, fontSize: 17, fontWeight: "800" },
    profileInfo: { flex: 1, minWidth: 140 },
    name: { color: WHITE, fontSize: 17, fontWeight: "800" },
    zone: { color: "#D0DEEF", fontSize: 11, marginTop: 3 },
    dutyLine: { width: "100%", color: "#E7EFF8", fontSize: 11, marginTop: 3 },
    attendanceCard: { padding: 13, backgroundColor: WHITE, borderWidth: 1.5, borderColor: "#173858", borderRadius: 16 },
    attendanceTitle: { color: "#10274A", fontSize: 16, fontWeight: "800" },
    attendanceSub: { color: "#566E90", fontSize: 11, lineHeight: 15, marginTop: 3, marginBottom: 10 },
    checkInButton: { height: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#EA5F0B", borderRadius: 12 },
    checkInIcon: { width: 20, height: 20, tintColor: WHITE },
    checkInText: { color: WHITE, fontSize: 15, fontWeight: "800" },
    historyButton: { alignItems: "center", paddingVertical: 2 },
    historyText: { color: "#1248A6", fontSize: 12, fontWeight: "700" },
    actionRow: { flexDirection: "row", gap: 8 },
    actionCard: {
        flex: 1,
        minHeight: 168,
        padding: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F2",
        borderRadius: 16,
        elevation: 1,
    },
    reportActionCard: { backgroundColor: "#FFF8F0" },
    workActionCard: { backgroundColor: "#F3F7FC" },
    reportActionIcon: {
        width: "100%",
        height: 84,
        borderRadius: 14,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#F0E4D6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
        overflow: "hidden",
        padding: 4,
    },
    workActionIcon: {
        width: "100%",
        height: 84,
        borderRadius: 14,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F2",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
        overflow: "hidden",
        padding: 4,
    },
    actionIcon: { width: "100%", height: "100%" },
    actionTitle: { color: "#0D2147", fontSize: 13, fontWeight: "800" },
    actionSub: { color: "#566E90", fontSize: 10, marginTop: 3 },
    panel: { backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F2", borderRadius: 17, paddingHorizontal: 10, paddingVertical: 9, elevation: 1 },
    sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28, marginBottom: 4 },
    sectionHeadingText: { color: "#63738D", fontSize: 12, fontWeight: "800" },
    allButton: { paddingHorizontal: 4, paddingVertical: 4 },
    allText: { color: "#1248A6", fontSize: 11, fontWeight: "700" },
    grievanceList: { gap: 1 },
    grievanceRow: { minHeight: 59, flexDirection: "row", alignItems: "center", gap: 7, borderBottomWidth: 1, borderBottomColor: "#E8EEF5", paddingVertical: 6 },
    lastRow: { borderBottomWidth: 0 },
    grievanceIcon: { width: 27, height: 27, alignItems: "center", justifyContent: "center" },
    flagIcon: { width: 23, height: 23, tintColor: "#E11D48" },
    resolvedIcon: { backgroundColor: "#36C477", borderRadius: 4 },
    checkMark: { color: WHITE, fontSize: 17, fontWeight: "800" },
    grievanceInfo: { flex: 1, minWidth: 0 },
    grievanceTitle: { color: "#0C1D3D", fontSize: 11, fontWeight: "800" },
    grievancePlace: { color: "#657B9F", fontSize: 9, marginTop: 3 },
    statePill: { borderRadius: 16, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
    assignedPill: { backgroundColor: "#EEF5FF", borderColor: "#BDD6FF" },
    openPill: { backgroundColor: "#FFF8E6", borderColor: "#FFE39A" },
    resolvedPill: { backgroundColor: "#E9FBF1", borderColor: "#B9EFCB" },
    stateText: { fontSize: 9, fontWeight: "700" },
    assignedText: { color: "#1763D4" },
    openText: { color: "#A45D00" },
    resolvedText: { color: "#078541" },
    recentRow: { minHeight: 51, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderColor: "#E8EEF5", paddingVertical: 6 },
    recentIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: "#EAF3FF", alignItems: "center", justifyContent: "center" },
    recentImage: { width: 17, height: 17, tintColor: "#1763E8" },
    recentInfo: { flex: 1 },
    recentTitle: { color: "#10274A", fontSize: 10, fontWeight: "700" },
    recentSub: { color: "#7286A7", fontSize: 9, marginTop: 2 },
    submitted: { color: "#078541", fontSize: 8, fontWeight: "700" },
});
