import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../components/commonComponents/ToastMessage";
import { NAVY, WHITE } from "../../constant/color";
import { NOTIFICATION } from "../../constant/imagePath";
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    toErrorText,
} from "../../services/notifications/NotificationsService";

const FILTERS = ["All", "Unread"];

export default function NotificationScreen() {
    const [filter, setFilter] = useState("All");
    const [filterOpen, setFilterOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingId, setMarkingId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });

    const showToast = useCallback((message, type = "error") => {
        setToast({
            visible: true,
            message: toErrorText(message, type === "success" ? "Done" : "Something went wrong"),
            type,
        });
    }, []);

    const loadNotifications = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const res = await fetchNotifications({
                    page: 1,
                    limit: 50,
                    unreadOnly: filter === "Unread",
                });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setItems([]);
                    return;
                }
                setItems(res.data || []);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load notifications"), "error");
                setItems([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [filter, showToast]
    );

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const unreadCount = useMemo(
        () => items.filter((item) => !item.isRead).length,
        [items]
    );

    const onMarkOne = useCallback(
        async (item) => {
            if (!item?.id || item.isRead || markingId) return;
            setMarkingId(item.id);
            try {
                const res = await markNotificationRead(item.id);
                if (!res.ok) {
                    showToast(res.message, "error");
                    return;
                }
                setItems((prev) =>
                    prev
                        .map((row) => (row.id === item.id ? { ...row, isRead: true } : row))
                        .filter((row) => (filter === "Unread" ? !row.isRead : true))
                );
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to mark as read"), "error");
            } finally {
                setMarkingId(null);
            }
        },
        [filter, markingId, showToast]
    );

    const onMarkAll = useCallback(async () => {
        if (markingAll || unreadCount <= 0) return;
        setMarkingAll(true);
        try {
            const res = await markAllNotificationsRead();
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            if (filter === "Unread") setItems([]);
            else setItems((prev) => prev.map((row) => ({ ...row, isRead: true })));
            showToast("All notifications marked as read", "success");
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to mark all as read"), "error");
        } finally {
            setMarkingAll(false);
        }
    }, [filter, markingAll, unreadCount, showToast]);

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Notification Centre"
                subtitle="Your personal and role-targeted alerts"
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
                height={62}
            />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadNotifications({ soft: true })}
                    />
                }
            >
                <View style={styles.toolbar}>
                    <View style={styles.filterWrap}>
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setFilterOpen((open) => !open)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.filterText}>{filter}</Text>
                            <Text style={styles.chevron}>⌄</Text>
                        </TouchableOpacity>
                        {filterOpen ? (
                            <View style={styles.dropdown}>
                                {FILTERS.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setFilter(item);
                                            setFilterOpen(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        style={styles.readButton}
                        onPress={onMarkAll}
                        activeOpacity={0.8}
                        disabled={markingAll || unreadCount <= 0}
                    >
                        <Text style={styles.readCheck}>✓</Text>
                        <Text style={styles.readText}>
                            {markingAll
                                ? "Updating…"
                                : unreadCount <= 0
                                  ? "All read"
                                  : "Mark all read"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
                ) : items.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.bellCircle}>
                            <Image source={NOTIFICATION} style={styles.bell} resizeMode="contain" />
                        </View>
                        <Text style={styles.emptyTitle}>Nothing here</Text>
                        <Text style={styles.emptyText}>
                            {filter === "Unread"
                                ? "You have no unread notifications."
                                : "New events will appear here as they happen."}
                        </Text>
                    </View>
                ) : (
                    items.map((item) => (
                        <TouchableOpacity
                            key={String(item.id)}
                            activeOpacity={0.8}
                            style={[styles.notificationCard, !item.isRead && styles.notificationUnread]}
                            onPress={() => onMarkOne(item)}
                            disabled={markingId === item.id}
                        >
                            <View style={styles.flagCircle}>
                                <Text style={styles.flag}>⚑</Text>
                            </View>
                            <View style={styles.notificationBody}>
                                <View style={styles.titleRow}>
                                    <Text numberOfLines={2} style={styles.notificationTitle}>
                                        {item.title}
                                    </Text>
                                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                                </View>
                                {!!item.message && (
                                    <Text numberOfLines={3} style={styles.detail}>
                                        {item.message}
                                    </Text>
                                )}
                                <View style={styles.metaRow}>
                                    <View style={styles.categoryPill}>
                                        <Text style={styles.categoryText}>
                                            {item.isRead ? "Read" : "Unread"}
                                        </Text>
                                    </View>
                                    <Text style={styles.target}>
                                        target: {String(item.roleLabel || "you").toLowerCase()}
                                    </Text>
                                    <Text style={styles.date}>{item.ago}</Text>
                                </View>
                            </View>
                            <Text style={styles.cardChevron}>›</Text>
                        </TouchableOpacity>
                    ))
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
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
        zIndex: 5,
    },
    filterWrap: { flex: 1 },
    filterButton: {
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#CFDAE9",
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    filterText: { color: NAVY, fontSize: 15, fontWeight: "600" },
    chevron: { color: NAVY, fontSize: 22, marginTop: -7 },
    dropdown: {
        position: "absolute",
        top: 51,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D5DFEC",
        borderRadius: 10,
        elevation: 8,
        zIndex: 10,
    },
    dropdownItem: {
        minHeight: 40,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#EDF1F6",
    },
    dropdownText: { color: NAVY, fontSize: 14 },
    readButton: {
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        paddingHorizontal: 13,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#CFDAE9",
        borderRadius: 12,
    },
    readCheck: { color: NAVY, fontSize: 20, fontWeight: "700" },
    readText: { color: NAVY, fontSize: 14, fontWeight: "700" },
    emptyCard: {
        minHeight: 300,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        elevation: 2,
        shadowColor: NAVY,
        shadowOpacity: 0.07,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    bellCircle: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: "#E8F2FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 17,
    },
    bell: { width: 37, height: 37, tintColor: "#2878D2" },
    emptyTitle: { color: "#152B4B", fontSize: 20, fontWeight: "700", textAlign: "center" },
    emptyText: {
        color: "#586B86",
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
        marginTop: 10,
    },
    notificationCard: {
        minHeight: 88,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 9,
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        borderRadius: 14,
        marginBottom: 9,
        elevation: 1,
    },
    notificationUnread: { backgroundColor: "#F7FAFF" },
    flagCircle: {
        width: 42,
        height: 42,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF0F1",
        marginTop: 2,
    },
    flag: { color: "#E11D48", fontSize: 24 },
    notificationBody: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
    notificationTitle: {
        flex: 1,
        color: "#0A174A",
        fontSize: 13,
        lineHeight: 17,
        fontWeight: "800",
    },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F27A00", marginTop: 4 },
    detail: { color: "#354D6E", fontSize: 11, lineHeight: 15, marginTop: 3 },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 7,
        marginTop: 6,
    },
    categoryPill: {
        borderWidth: 1,
        borderColor: "#FFAAAA",
        borderRadius: 16,
        backgroundColor: "#FFF4F4",
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    categoryText: { color: "#D62020", fontSize: 10, fontWeight: "700" },
    target: { color: "#778BAA", fontSize: 10 },
    date: { color: "#7186A9", fontSize: 10, marginLeft: "auto" },
    cardChevron: { color: "#385782", fontSize: 24, lineHeight: 30, alignSelf: "center" },
});
