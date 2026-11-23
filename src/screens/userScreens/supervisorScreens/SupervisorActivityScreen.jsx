import React, { useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { NAVY, WHITE } from "../../../constant/color";

const ACTIVITIES = [
    { day: "07", month: "Sept 2026", time: "10:30 AM", initial: "A", color: "#273E5C", person: "Ananta Narayan Malik", place: "Bhudan Chhak - Chandrabhaga", manpower: "8 manpower", materials: "Drainage tools kit", note: "Chandrabhaga drainage outlet clearing.", loggedBy: "Ananta Narayan Malik", status: "On Track" },
    { day: "03", month: "Sept 2026", time: "09:15 AM", initial: "A", color: "#273E5C", person: "Ananta Narayan Malik", place: "Bhudan Chhak - Chandrabhaga", manpower: "4 manpower", materials: "Bitumen patch material", note: "Approach ramp edge collapse - material awaiting supply.", loggedBy: "Ananta Narayan Malik", status: "Pending" },
    { day: "28", month: "Aug 2026", time: "04:20 PM", initial: "B", color: "#07865D", person: "Sandeep Gochhayat", place: "Niali Stretch", manpower: "12 manpower", materials: "Street light fittings", note: "Street light pole erected and wiring in progress.", loggedBy: "Sandeep Gochhayat", status: "On Track" },
    { day: "25", month: "Aug 2026", time: "11:10 AM", initial: "C", color: "#4939EB", person: "Ameet Arush Parida", place: "Pipili - Ramachandi Road", manpower: "6 manpower", materials: "Signage boards", note: "Installed caution signage near bus bay.", loggedBy: "Ameet Arush Parida", status: "Completed" },
];

const ActivityCard = ({ item }) => {
    const statusStyle = item.status === "Pending" ? styles.pending : item.status === "Completed" ? styles.completed : styles.onTrack;
    return (
        <TouchableOpacity activeOpacity={0.8} style={styles.card}>
            <View style={styles.dateColumn}>
                <Text style={styles.day}>{item.day}</Text>
                <Text style={styles.month}>{item.month}</Text>
                <Text style={styles.time}>{item.time}</Text>
            </View>
            <View style={styles.cardContent}>
                <View style={styles.personRow}>
                    <View style={[styles.initialBadge, { backgroundColor: item.color }]}><Text style={styles.initial}>{item.initial}</Text></View>
                    <View style={styles.personText}><Text numberOfLines={1} style={styles.personName}>{item.person}</Text><Text numberOfLines={1} style={styles.place}>{item.place}</Text></View>
                    <View style={[styles.statusBadge, statusStyle]}><View style={[styles.statusDot, item.status === "Pending" && styles.pendingDot, item.status === "Completed" && styles.completedDot]} /><Text style={[styles.statusText, item.status === "Pending" && styles.pendingText, item.status === "Completed" && styles.completedText]}>{item.status}</Text></View>
                </View>
                <View style={styles.factsRow}>
                    <View style={styles.fact}><Text style={styles.factIcon}>♙</Text><Text style={styles.factText}>{item.manpower}</Text></View>
                    <View style={styles.fact}><Text style={styles.factIcon}>⬡</Text><Text numberOfLines={1} style={styles.factText}>{item.materials}</Text></View>
                </View>
                <View style={styles.noteRow}><Text style={styles.noteIcon}>▤</Text><Text numberOfLines={2} style={styles.note}>{item.note}</Text></View>
                <View style={styles.loggedBy}>
                    <View style={styles.personIcon}><SimpleIcon name="account-circle-outline" size={18} color="#1E3A5F" /></View>
                    <View style={styles.loggedCopy}><Text style={styles.loggedLabel}>Logged by</Text><Text numberOfLines={1} style={styles.loggedName}>{item.loggedBy}</Text></View>
                    <Text style={styles.chevron}>›</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function SupervisorActivityScreen() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All statuses");
    const [statusOpen, setStatusOpen] = useState(false);
    const activities = useMemo(() => {
        const query = search.trim().toLowerCase();
        return ACTIVITIES.filter((item) =>
            (!query || item.place.toLowerCase().includes(query) || item.note.toLowerCase().includes(query) || item.person.toLowerCase().includes(query)) &&
            (status === "All statuses" || item.status === status)
        );
    }, [search, status]);

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader title="Field Activity Logs" subtitle="" showMenu={false} showNotification={false} showProfile={false} titleAlign="center" />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <TouchableOpacity style={styles.areaSelector}>
                    <SimpleIcon name="map-marker-outline" size={20} color="#1454C4" />
                    <Text numberOfLines={1} style={styles.areaText}>Bhudan Chhak - Chandrabhaga (Puri End)</Text>
                    <SimpleIcon name="chevron-down" size={16} color={NAVY} />
                </TouchableOpacity>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}><SimpleIcon name="magnify" size={22} color={NAVY} /><TextInput value={search} onChangeText={setSearch} placeholder="Search by zone, notes, or date..." placeholderTextColor="#91A2C3" style={styles.searchInput} /></View>
                    <TouchableOpacity style={styles.filterButton}><Text style={styles.filterGlyph}>☷</Text></TouchableOpacity>
                </View>
                <View style={styles.controlsRow}>
                    <View style={styles.statusWrap}>
                        <TouchableOpacity style={styles.statusSelect} onPress={() => setStatusOpen((open) => !open)}><Text style={styles.statusSelectText}>{status}</Text><SimpleIcon name="chevron-down" size={16} color={NAVY} /></TouchableOpacity>
                        {statusOpen && <View style={styles.statusMenu}>{["All statuses", "On Track", "Pending", "Completed"].map((value) => <TouchableOpacity key={value} style={styles.statusOption} onPress={() => { setStatus(value); setStatusOpen(false); }}><Text style={styles.statusOptionText}>{value}</Text></TouchableOpacity>)}</View>}
                    </View>
                    <TouchableOpacity style={styles.logButton}><Text style={styles.logPlus}>+</Text><Text style={styles.logText}>Log Activity</Text></TouchableOpacity>
                </View>
                <View style={styles.activityList}>{activities.map((item) => <ActivityCard key={item.day + item.month} item={item} />)}</View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5FAFF" },
    content: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 20 },
    areaSelector: { height: 45, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 13, paddingHorizontal: 10, marginBottom: 9 },
    areaText: { flex: 1, color: "#123D8B", fontSize: 12, fontWeight: "500" },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    searchBox: { flex: 1, height: 46, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 13, paddingHorizontal: 10 },
    searchInput: { flex: 1, color: NAVY, fontSize: 12, padding: 0 },
    filterButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 12 },
    filterGlyph: { color: NAVY, fontSize: 22, fontWeight: "700" },
    controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9, gap: 8 },
    statusWrap: { width: "43%", position: "relative", zIndex: 2 },
    statusSelect: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 13, paddingHorizontal: 10 },
    statusSelectText: { color: NAVY, fontSize: 12 },
    statusMenu: { position: "absolute", top: 45, left: 0, right: 0, backgroundColor: WHITE, borderRadius: 12, borderWidth: 1, borderColor: "#E2EAF5", elevation: 5 },
    statusOption: { paddingHorizontal: 10, paddingVertical: 9 },
    statusOptionText: { color: NAVY, fontSize: 11 },
    logButton: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12, backgroundColor: "#EA5F0B", borderRadius: 12 },
    logPlus: { color: WHITE, fontSize: 20, lineHeight: 21 },
    logText: { color: WHITE, fontSize: 12, fontWeight: "700" },
    activityList: { gap: 8 },
    card: { minHeight: 174, flexDirection: "row", backgroundColor: WHITE, borderWidth: 1, borderColor: "#E1EAF5", borderRadius: 15, padding: 10, elevation: 1 },
    dateColumn: { width: 62, borderRightWidth: 1, borderRightColor: "#E8EEF6", paddingTop: 2, marginRight: 9 },
    day: { color: "#081748", fontSize: 18, fontWeight: "800" },
    month: { color: "#7186AE", fontSize: 10, marginTop: 3 },
    time: { color: "#8195B8", fontSize: 9, marginTop: 6 },
    cardContent: { flex: 1, minWidth: 0 },
    personRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    initialBadge: { width: 30, height: 30, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    initial: { color: WHITE, fontSize: 15, fontWeight: "800" },
    personText: { flex: 1, minWidth: 0 },
    personName: { color: NAVY, fontSize: 11, fontWeight: "800" },
    place: { color: "#7186AE", fontSize: 9, marginTop: 3 },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
    onTrack: { backgroundColor: "#EAFBF2", borderColor: "#B9F1D2" },
    pending: { backgroundColor: "#FFF8E4", borderColor: "#FFE59A" },
    completed: { backgroundColor: "#EEF5FF", borderColor: "#C7DDFE" },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#14B86B" },
    pendingDot: { backgroundColor: "#E39A00" },
    completedDot: { backgroundColor: "#1763E8" },
    statusText: { color: "#078541", fontSize: 9, fontWeight: "600" },
    pendingText: { color: "#B87800" },
    completedText: { color: "#1759C8" },
    factsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 9 },
    fact: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
    factIcon: { color: "#7489B4", fontSize: 16, width: 16, textAlign: "center" },
    factText: { color: "#62789F", fontSize: 10, flexShrink: 1 },
    noteRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
    noteIcon: { color: "#7489B4", fontSize: 15 },
    note: { flex: 1, color: "#344C70", fontSize: 10 },
    loggedBy: { minHeight: 42, flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5FA", borderRadius: 10, paddingHorizontal: 7, marginTop: 8 },
    personIcon: { width: 27, height: 27, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: WHITE },
    loggedCopy: { flex: 1, marginLeft: 6 },
    loggedLabel: { color: "#8295B9", fontSize: 9 },
    loggedName: { color: "#526A92", fontSize: 9, marginTop: 2 },
    chevron: { color: "#284B7C", fontSize: 21, paddingHorizontal: 3 },
});
