import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../components/commonComponents/MyHeader";
import StaticCrmMap from "../../components/map/StaticCrmMap";
import WorkerInfoPanel from "../../components/map/WorkerInfoPanel";
import { WORKER_STATUS_COLOR } from "../../components/map/WorkerMarker";
import { GREEN, NAVY, RED, WHITE } from "../../constant/color";
import { MAP_DEFAULT_CENTER } from "../../constant/mapEnv";
import useBackgroundTracking from "../../hooks/useBackgroundTracking";
import useWorkerLocations from "../../hooks/useWorkerLocations";

const DEFAULT_WORKER = {
    id: "self",
    name: "Field Worker",
};

export default function LiveTrackingScreen() {
    const [query, setQuery] = useState("");
    const { journey, busy, error, isActive, start, stop } = useBackgroundTracking({
        worker: DEFAULT_WORKER,
    });
    const {
        workers,
        selectedWorkerId,
        setSelectedWorkerId,
        currentLocation,
    } = useWorkerLocations({ selfWorker: DEFAULT_WORKER });

    const filteredWorkers = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return workers;
        return workers.filter(
            (w) =>
                w.name?.toLowerCase().includes(q) ||
                String(w.id).toLowerCase().includes(q)
        );
    }, [workers, query]);

    const mapMarkers = useMemo(() => {
        const markers = filteredWorkers
            .filter(
                (w) =>
                    Number.isFinite(w?.latitude) && Number.isFinite(w?.longitude)
            )
            .map((w) => {
                const selected = String(w.id) === String(selectedWorkerId);
                return {
                    id: String(w.id),
                    latitude: w.latitude,
                    longitude: w.longitude,
                    label: (
                        w.initial ||
                        (w.name || "W").charAt(0) ||
                        "W"
                    )
                        .toString()
                        .slice(0, 2)
                        .toUpperCase(),
                    color: selected
                        ? WORKER_STATUS_COLOR.selected
                        : WORKER_STATUS_COLOR[w.status] ||
                          WORKER_STATUS_COLOR.active,
                };
            });

        if (
            currentLocation &&
            Number.isFinite(currentLocation.latitude) &&
            Number.isFinite(currentLocation.longitude) &&
            !markers.some((m) => String(m.id) === String(DEFAULT_WORKER.id))
        ) {
            markers.push({
                id: String(DEFAULT_WORKER.id),
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                label: "ME",
                color: WORKER_STATUS_COLOR.selected,
            });
        }

        return markers;
    }, [filteredWorkers, selectedWorkerId, currentLocation]);

    const mapCenter = useMemo(() => {
        if (mapMarkers[0]) {
            return {
                latitude: mapMarkers[0].latitude,
                longitude: mapMarkers[0].longitude,
            };
        }
        if (
            currentLocation &&
            Number.isFinite(currentLocation.latitude) &&
            Number.isFinite(currentLocation.longitude)
        ) {
            return {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
            };
        }
        return MAP_DEFAULT_CENTER;
    }, [mapMarkers, currentLocation]);

    const onStart = async () => {
        await start();
    };

    const onStop = async () => {
        await stop();
    };

    return (
        <View style={styles.root}>
            <MyHeader
                title="Live Tracking"
                subtitle="Puri–Konark Marine Drive"
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
            />

            <View style={styles.toolbar}>
                <TextInput
                    allowFontScaling={false}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search worker"
                    placeholderTextColor="#8A9BB3"
                    style={styles.search}
                />
                <View
                    style={[
                        styles.statusChip,
                        { backgroundColor: isActive ? "#E8F8EE" : "#EEF2F7" },
                    ]}
                >
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: isActive ? GREEN : "#8A9BB3" },
                        ]}
                    />
                    <Text
                        allowFontScaling={false}
                        style={[
                            styles.statusTxt,
                            { color: isActive ? GREEN : "#5C708C" },
                        ]}
                    >
                        {isActive ? "Tracking" : "Idle"}
                    </Text>
                </View>
            </View>

            <View style={styles.mapWrap}>
                <StaticCrmMap
                    style={styles.map}
                    markers={mapMarkers}
                    initialCenter={mapCenter}
                    initialZoom={14}
                    showZoom
                    onMarkerPress={(marker) => setSelectedWorkerId(marker.id)}
                />
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.btn, styles.startBtn, (busy || isActive) && styles.disabled]}
                    disabled={busy || isActive}
                    onPress={onStart}
                    activeOpacity={0.85}
                >
                    {busy && !isActive ? (
                        <ActivityIndicator color={WHITE} />
                    ) : (
                        <Text allowFontScaling={false} style={styles.btnTxt}>Start Journey</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.btn, styles.stopBtn, (busy || !isActive) && styles.disabled]}
                    disabled={busy || !isActive}
                    onPress={onStop}
                    activeOpacity={0.85}
                >
                    {busy && isActive ? (
                        <ActivityIndicator color={WHITE} />
                    ) : (
                        <Text allowFontScaling={false} style={styles.btnTxt}>Stop Journey</Text>
                    )}
                </TouchableOpacity>
            </View>

            {error ? (
                <Text allowFontScaling={false} style={styles.error}>
                    {String(error)}
                </Text>
            ) : null}

            {!journey?.remoteJourneyId && journey?.apiLimitation ? (
                <Text allowFontScaling={false} style={styles.note}>
                    Journey is recorded on-device. No Start/Stop Journey API is wired in this frontend yet.
                </Text>
            ) : null}

            <WorkerInfoPanel
                workerName={DEFAULT_WORKER.name}
                workerId={DEFAULT_WORKER.id}
                journeyStatus={journey?.status || "idle"}
                distanceMetres={journey?.distanceMetres || 0}
                speed={journey?.speed}
                startedAt={journey?.startedAt}
                endedAt={journey?.endedAt}
                lastUpdatedAt={journey?.lastUpdatedAt}
                accuracy={journey?.accuracy}
                gpsStatus={journey?.gpsStatus || "offline"}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    search: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        backgroundColor: WHITE,
        paddingHorizontal: 12,
        color: NAVY,
        fontSize: 14,
    },
    statusChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusTxt: { fontSize: 12, fontWeight: "700" },
    mapWrap: { flex: 1, marginHorizontal: 0 },
    map: { flex: 1 },
    actions: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
    },
    btn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    startBtn: { backgroundColor: GREEN },
    stopBtn: { backgroundColor: RED },
    disabled: { opacity: 0.45 },
    btnTxt: { color: WHITE, fontSize: 14, fontWeight: "800" },
    error: {
        color: RED,
        fontSize: 12,
        paddingHorizontal: 14,
        marginBottom: 4,
    },
    note: {
        color: "#6A7F9C",
        fontSize: 11,
        paddingHorizontal: 14,
        marginBottom: 4,
    },
});
