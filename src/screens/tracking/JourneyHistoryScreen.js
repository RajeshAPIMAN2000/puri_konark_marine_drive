import React, { useCallback, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MyHeader } from "../../components/commonComponents/MyHeader";
import { NAVY, WHITE } from "../../constant/color";
import { formatDistanceKm } from "../../services/location/LocationDistanceService";
import { loadJourneyHistory } from "../../services/location/LocationSyncService";

const formatWhen = (ts) => {
    if (!ts) return "—";
    try {
        return new Date(ts).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
};

export default function JourneyHistoryScreen() {
    const [items, setItems] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const reload = useCallback(async () => {
        setRefreshing(true);
        try {
            const list = await loadJourneyHistory();
            setItems(list);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            reload();
        }, [reload])
    );

    return (
        <View style={styles.root}>
            <MyHeader
                title="Journey History"
                subtitle="Saved on-device journeys"
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
            />
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={reload} />
                }
                ListEmptyComponent={
                    <Text allowFontScaling={false} style={styles.empty}>
                        No saved journeys yet. Start and stop a journey from Live Tracking.
                    </Text>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text allowFontScaling={false} style={styles.title}>
                            {item.id}
                        </Text>
                        <Text allowFontScaling={false} style={styles.meta}>
                            {formatWhen(item.startedAt)} → {formatWhen(item.endedAt)}
                        </Text>
                        <Text allowFontScaling={false} style={styles.distance}>
                            {formatDistanceKm(item.distanceMetres || 0)}
                        </Text>
                        <Text allowFontScaling={false} style={styles.points}>
                            {(item.route || []).length} GPS points · {item.status}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    list: { padding: 12, paddingBottom: 24, flexGrow: 1 },
    empty: {
        color: "#6A7F9C",
        textAlign: "center",
        marginTop: 40,
        paddingHorizontal: 24,
        fontSize: 13,
    },
    card: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        padding: 14,
        marginBottom: 10,
    },
    title: { color: NAVY, fontSize: 14, fontWeight: "800" },
    meta: { color: "#6A7F9C", fontSize: 11, marginTop: 4 },
    distance: { color: NAVY, fontSize: 18, fontWeight: "800", marginTop: 8 },
    points: { color: "#7A8DA8", fontSize: 11, marginTop: 4 },
});
