import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BLUE, GREEN, GREY, NAVY, ORANGE, RED, WHITE } from "../../constant/color";
import { formatDistanceKm } from "../../services/location/LocationDistanceService";
import { WORKER_STATUS_COLOR } from "./WorkerMarker";

const formatDuration = (startedAt, endedAt) => {
    if (!startedAt) return "—";
    const end = endedAt || Date.now();
    const sec = Math.max(0, Math.floor((end - startedAt) / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const formatSpeed = (speedMps) => {
    if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) return "—";
    const kmh = speedMps * 3.6;
    return `${kmh.toFixed(1)} km/h`;
};

const formatTime = (ts) => {
    if (!ts) return "—";
    try {
        return new Date(ts).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return "—";
    }
};

export default function WorkerInfoPanel({
    workerName = "Field Worker",
    workerId = "—",
    journeyStatus = "idle",
    distanceMetres = 0,
    speed = null,
    startedAt = null,
    endedAt = null,
    lastUpdatedAt = null,
    accuracy = null,
    gpsStatus = "offline",
}) {
    const statusColor = useMemo(() => {
        if (journeyStatus === "stopped") return RED;
        if (journeyStatus === "active") {
            return WORKER_STATUS_COLOR[gpsStatus] || GREEN;
        }
        return GREY;
    }, [journeyStatus, gpsStatus]);

    const statusLabel = useMemo(() => {
        if (journeyStatus === "active") {
            if (gpsStatus === "weak") return "Weak GPS";
            if (gpsStatus === "offline") return "Offline";
            return "Active tracking";
        }
        if (journeyStatus === "stopped") return "Journey stopped";
        return "Idle";
    }, [journeyStatus, gpsStatus]);

    return (
        <View style={styles.panel}>
            <View style={styles.head}>
                <View style={{ flex: 1 }}>
                    <Text allowFontScaling={false} style={styles.name} numberOfLines={1}>
                        {workerName}
                    </Text>
                    <Text allowFontScaling={false} style={styles.id} numberOfLines={1}>
                        Worker ID · {workerId}
                    </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${statusColor}18`, borderColor: statusColor }]}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text allowFontScaling={false} style={[styles.badgeTxt, { color: statusColor }]}>
                        {statusLabel}
                    </Text>
                </View>
            </View>

            <View style={styles.grid}>
                <Metric label="Distance" value={formatDistanceKm(distanceMetres)} />
                <Metric label="Speed" value={formatSpeed(speed)} />
                <Metric label="Duration" value={formatDuration(startedAt, endedAt)} />
                <Metric
                    label="GPS accuracy"
                    value={accuracy != null && Number.isFinite(accuracy) ? `±${Math.round(accuracy)} m` : "—"}
                />
            </View>

            <Text allowFontScaling={false} style={styles.updated}>
                Last update · {formatTime(lastUpdatedAt)}
            </Text>
        </View>
    );
}

const Metric = ({ label, value }) => (
    <View style={styles.metric}>
        <Text allowFontScaling={false} style={styles.metricLabel}>{label}</Text>
        <Text allowFontScaling={false} style={styles.metricValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    panel: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
        elevation: 6,
        shadowColor: "#0B1F3A",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
    },
    head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    name: { color: NAVY, fontSize: 16, fontWeight: "800" },
    id: { color: "#6A7F9C", fontSize: 11, marginTop: 2 },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    badgeTxt: { fontSize: 11, fontWeight: "700" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    metric: {
        width: "47%",
        backgroundColor: "#F5F8FC",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    metricLabel: { color: "#6A7F9C", fontSize: 10, fontWeight: "600" },
    metricValue: { color: NAVY, fontSize: 15, fontWeight: "800", marginTop: 2 },
    updated: { color: "#7A8DA8", fontSize: 11, marginTop: 10 },
});
