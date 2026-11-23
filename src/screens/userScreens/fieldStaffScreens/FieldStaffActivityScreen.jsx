import React, { useMemo, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { NAVY, WHITE, BUTTON} from "../../../constant/color";

const STATUSES = ["All statuses", "On Track", "Pending", "Completed"];
const WORK_STATUSES = ["On Track", "Pending", "Completed"];
const getDateInputValue = () => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
};
const INITIAL_LOGS = [
    {
        id: "1",
        date: "08 Sept 2026",
        zone: "D",
        supervisor: "Tapas Maharana",
        status: "On Track",
        manpower: "12",
        materials: "Jute bags 200, sanitiser 5 L",
        notes: "Morning promenade clean-up and vendor verification.",
        loggedBy: "Dilip Behera",
    },
    {
        id: "2",
        date: "05 Sept 2026",
        zone: "D",
        supervisor: "Tapas Maharana",
        status: "On Track",
        manpower: "10",
        materials: "Jute bags 150",
        notes: "Evening round + closure enforcement.",
        loggedBy: "Dilip Behera",
    },
];

const FieldLabel = ({ children }) => <Text style={styles.fieldLabel}>{children}</Text>;

export default function FieldStaffActivityScreen() {
    const [logs, setLogs] = useState(INITIAL_LOGS);
    const [filter, setFilter] = useState("All statuses");
    const [filterOpen, setFilterOpen] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [status, setStatus] = useState("On Track");
    const [statusOpen, setStatusOpen] = useState(false);
    const [manpower, setManpower] = useState("5");
    const [date, setDate] = useState(getDateInputValue);
    const [materials, setMaterials] = useState("");
    const [notes, setNotes] = useState("");

    const shownLogs = useMemo(
        () => filter === "All statuses" ? logs : logs.filter((log) => log.status === filter),
        [filter, logs]
    );

    const closeForm = () => {
        setModalVisible(false);
        setStatusOpen(false);
    };

    const saveLog = () => {
        if (!manpower.trim() || !date.trim()) {
            Alert.alert("Required information", "Enter manpower count and activity date.");
            return;
        }
        const parsedDate = date.split("-");
        const displayDate = parsedDate.length === 3
            ? `${parsedDate[0]} ${new Date(`${parsedDate[2]}-${parsedDate[1]}-${parsedDate[0]}`).toLocaleString("en", { month: "short" })} ${parsedDate[2]}`
            : date;
        setLogs((current) => [{
            id: String(Date.now()),
            date: displayDate,
            zone: "D",
            supervisor: "Tapas Maharana",
            status,
            manpower: manpower.trim(),
            materials: materials.trim() || "—",
            notes: notes.trim() || "No notes added.",
            loggedBy: "Dilip Behera",
        }, ...current]);
        setFilter("All statuses");
        setStatus("On Track");
        setManpower("5");
        setDate(getDateInputValue());
        setMaterials("");
        setNotes("");
        closeForm();
    };

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Field Activity Logs"
                subtitle="Work status, manpower deployment and materials"
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
                height={58}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.panel}>
                    <View style={styles.toolbar}>
                        <View style={styles.filterWrap}>
                            <TouchableOpacity style={styles.filterButton} onPress={() => setFilterOpen((open) => !open)}>
                                <Text style={styles.filterText}>{filter}</Text>
                                <Text style={styles.chevron}>⌄</Text>
                            </TouchableOpacity>
                            {filterOpen && <View style={styles.dropdown}>
                                {STATUSES.map((item) => <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => { setFilter(item); setFilterOpen(false); }}>
                                    <Text style={styles.dropdownText}>{item}</Text>
                                </TouchableOpacity>)}
                            </View>}
                        </View>
                        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
                            <Text style={styles.addPlus}>+</Text><Text style={styles.addText}>Log Activity</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.count}>{shownLogs.length} {shownLogs.length === 1 ? "record" : "records"}</Text>

                    {shownLogs.map((item) => (
                        <View key={item.id} style={styles.logCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.dateWrap}>
                                    <Text style={styles.dateText}>{item.date}</Text>
                                    <Text style={styles.supervisorLine}>
                                        Zone {item.zone} · {item.supervisor}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.statusPill,
                                        item.status === "On Track"
                                            ? styles.onTrack
                                            : item.status === "Pending"
                                              ? styles.pending
                                              : styles.completed,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            item.status === "Pending"
                                                ? styles.pendingText
                                                : item.status === "Completed"
                                                  ? styles.completedText
                                                  : null,
                                        ]}
                                    >
                                        {item.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.metricRow}>
                                <View style={styles.metricBox}>
                                    <Text style={styles.label}>Manpower</Text>
                                    <Text style={styles.detailValue}>{item.manpower}</Text>
                                </View>
                                <View style={styles.metricBoxWide}>
                                    <Text style={styles.label}>Material usage</Text>
                                    <Text numberOfLines={2} style={styles.detailValue}>
                                        {item.materials}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoBlock}>
                                <Text style={styles.label}>Notes</Text>
                                <Text numberOfLines={3} style={styles.notesText}>
                                    {item.notes}
                                </Text>
                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={styles.label}>Logged by</Text>
                                <Text style={styles.loggedBy}>{item.loggedBy}</Text>
                            </View>
                        </View>
                    ))}
                    {shownLogs.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>No activity records</Text><Text style={styles.emptySub}>Log field work to see it here.</Text></View>}
                </View>
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeForm}>
                <View style={styles.modalRoot}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeForm} />
                    <View style={styles.formCard}>
                        <View style={styles.formHeader}><Text style={styles.formTitle}>Log field activity</Text><TouchableOpacity onPress={closeForm}><Text style={styles.close}>×</Text></TouchableOpacity></View>
                        <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <View style={styles.formRow}>
                                <View style={styles.formField}>
                                    <FieldLabel>WORK STATUS</FieldLabel>
                                    <TouchableOpacity style={styles.selectInput} onPress={() => setStatusOpen((open) => !open)}><Text style={styles.inputText}>{status}</Text><Text style={styles.selectChevron}>⌄</Text></TouchableOpacity>
                                    {statusOpen && <View style={styles.formDropdown}>{WORK_STATUSES.map((item) => <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => { setStatus(item); setStatusOpen(false); }}><Text style={styles.dropdownText}>{item}</Text></TouchableOpacity>)}</View>}
                                </View>
                                <View style={styles.formField}><FieldLabel>MANPOWER COUNT</FieldLabel><TextInput style={styles.input} value={manpower} onChangeText={setManpower} keyboardType="number-pad" placeholder="e.g. 5" placeholderTextColor="#91A2BA" /></View>
                            </View>
                            <View style={styles.formField}><FieldLabel>ACTIVITY DATE</FieldLabel><TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="DD-MM-YYYY" placeholderTextColor="#91A2BA" /></View>
                            <View style={styles.formField}><FieldLabel>MATERIAL USAGE (OPTIONAL)</FieldLabel><TextInput style={styles.input} value={materials} onChangeText={setMaterials} placeholder="e.g. Cement 2 bags, paint 4 L" placeholderTextColor="#91A2BA" /></View>
                            <View style={styles.formField}><FieldLabel>NOTES (OPTIONAL)</FieldLabel><TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} multiline textAlignVertical="top" /></View>
                        </ScrollView>
                        <View style={styles.formFooter}><TouchableOpacity style={styles.cancelButton} onPress={closeForm}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.saveButton} onPress={saveLog}><Text style={styles.saveText}>Save log</Text></TouchableOpacity></View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 130 },
    panel: { backgroundColor: "#F9FBFE", borderRadius: 17, borderWidth: 1, borderColor: "#E3ECF7", padding: 10 },
    toolbar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2, paddingTop: 4 },
    filterWrap: { flex: 1, zIndex: 3 },
    filterButton: { height: 46, borderWidth: 1, borderColor: "#CFDAE9", borderRadius: 11, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: WHITE },
    filterText: { color: NAVY, fontSize: 15, fontWeight: "600" },
    chevron: { color: NAVY, fontSize: 22, marginTop: -7 },
    addButton: { height: 46, minWidth: 145, borderRadius: 11, backgroundColor: "#EA5F0B", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    addPlus: { color: WHITE, fontSize: 25, marginRight: 7 },
    addText: { color: WHITE, fontSize: 14, fontWeight: "700" },
    count: { color: "#71829D", fontSize: 13, marginHorizontal: 4, marginTop: 12, marginBottom: 8 },
    logCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E1EAF5",
        elevation: 2,
        shadowColor: NAVY,
        shadowOpacity: 0.07,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        gap: 12,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
    },
    dateWrap: { flex: 1, minWidth: 0 },
    dateText: { color: NAVY, fontSize: 15, fontWeight: "800" },
    supervisorLine: { color: "#667792", fontSize: 12, marginTop: 4 },
    label: {
        color: "#657791",
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.3,
        textTransform: "uppercase",
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 18,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    onTrack: { backgroundColor: "#E8FBF0", borderColor: "#9BE7B8" },
    pending: { backgroundColor: "#FFF7E6", borderColor: "#FFD875" },
    completed: { backgroundColor: "#EEF5FF", borderColor: "#B8D1FF" },
    statusText: { color: "#078541", fontSize: 12, fontWeight: "700" },
    pendingText: { color: "#A45D00" },
    completedText: { color: "#1763D4" },
    metricRow: { flexDirection: "row", gap: 8 },
    metricBox: {
        flex: 0.9,
        backgroundColor: "#F5F8FC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E6EEF7",
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    metricBoxWide: {
        flex: 1.5,
        backgroundColor: "#F5F8FC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E6EEF7",
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    detailValue: { color: NAVY, fontSize: 14, fontWeight: "700", marginTop: 4 },
    infoBlock: {
        backgroundColor: "#FBFCFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E8EEF6",
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    notesText: { color: "#2F4563", fontSize: 13, lineHeight: 18, marginTop: 4 },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: "#E8EDF4",
        paddingTop: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    loggedBy: { color: NAVY, fontSize: 13, fontWeight: "700", flexShrink: 1 },
    empty: { paddingVertical: 40, alignItems: "center" },
    emptyTitle: { color: NAVY, fontSize: 16, fontWeight: "700" },
    emptySub: { color: "#71829D", fontSize: 13, marginTop: 5 },
    dropdown: { position: "absolute", top: 49, left: 0, right: 0, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D7E1EF", borderRadius: 10, elevation: 8, zIndex: 20 },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
    dropdownText: { color: NAVY, fontSize: 14 },
    modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(6,20,40,0.45)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    formCard: { maxHeight: "90%", backgroundColor: WHITE, borderTopLeftRadius: 17, borderTopRightRadius: 17, overflow: "visible" },
    formHeader: { height: 52, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#E3EAF3", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    formTitle: { color: "#243750", fontSize: 16, fontWeight: "700" },
    close: { color: "#8B9AB0", fontSize: 26, paddingHorizontal: 5 },
    formBody: { paddingHorizontal: 15, paddingTop: 13, paddingBottom: 8 },
    formRow: { flexDirection: "row", gap: 10 },
    formField: { flex: 1, marginBottom: 13, position: "relative", zIndex: 2 },
    fieldLabel: { color: "#71829A", fontSize: 11, fontWeight: "700", marginBottom: 6 },
    input: { height: 42, borderWidth: 1, borderColor: "#CBD7E6", borderRadius: 9, paddingHorizontal: 12, color: NAVY, fontSize: 14, backgroundColor: WHITE },
    textArea: { height: 72, paddingTop: 9 },
    selectInput: { height: 42, borderWidth: 1, borderColor: "#CBD7E6", borderRadius: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: WHITE },
    inputText: { color: NAVY, fontSize: 14 },
    selectChevron: { color: NAVY, fontSize: 21, marginTop: -7 },
    formDropdown: { position: "absolute", top: 64, left: 0, right: 0, borderWidth: 1, borderColor: "#D7E1EF", borderRadius: 9, backgroundColor: WHITE, elevation: 9, zIndex: 20 },
    formFooter: { minHeight: 58, backgroundColor: "#F7F9FC", borderTopWidth: 1, borderTopColor: "#E1E8F0", paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
    cancelButton: { height: 38, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: "#CBD7E6", borderRadius: 9, backgroundColor: WHITE },
    cancelText: { color: "#344963", fontSize: 13, fontWeight: "600" },
    saveButton: { height: 38, justifyContent: "center", paddingHorizontal: 17, borderRadius: 9, backgroundColor: BUTTON },
    saveText: { color: WHITE, fontSize: 13, fontWeight: "700" },
});
