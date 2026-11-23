import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { WebView } from "react-native-webview";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import StaticCrmMap from "../../../components/map/StaticCrmMap";
import { GREEN, GREY, NAVY, RED, WHITE } from "../../../constant/color";
import { BACKTOLIVE, SWITCHOFF, VECHILES } from "../../../constant/imagePath";
import {
    acknowledgeFleetAlert,
    fetchFleetAlerts,
    fetchRecordings,
    fetchVehicles,
    summarizeVehicles,
    switchOffVehicle,
    toErrorText,
} from "../../../services/fleet/FleetService";

const ALL_VEHICLES = "All vehicles";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const VIDEO_H = Math.max(220, Math.round((SCREEN_W - 28) * (9 / 16)));
const PLAYER_H = Math.min(Math.round(SCREEN_H * 0.5), Math.round(SCREEN_W * (9 / 16)));

const streamHtml = (url) => {
    const src = String(url || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    return `<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no'><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#10243b;overflow:hidden}.stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center}video{width:100%;height:100%;object-fit:contain;background:#10243b;display:block}</style></head><body><div class='stage'><video autoplay muted loop playsinline webkit-playsinline preload='auto'><source src="${src}" /></video></div><script>var v=document.querySelector('video');var s=function(){if(!v)return;v.muted=true;var p=v.play();if(p&&p.catch)p.catch(function(){})};if(v){v.addEventListener('loadeddata',s);v.addEventListener('canplay',s);s();}</script></body></html>`;
};

const statusPillStyle = (status) => {
    if (status === "active") {
        return { color: "#078541", backgroundColor: "#E8FAEF", borderColor: "#AFEBC6" };
    }
    if (status === "idle") {
        return { color: "#B36B00", backgroundColor: "#FFF6E5", borderColor: "#F5D59A" };
    }
    return { color: "#4A5B73", backgroundColor: "#EEF2F7", borderColor: "#D0D8E4" };
};

const LiveCard = ({
    vehicle,
    playing = true,
    switchingOff = false,
    onSwitchOff,
    onExpand,
    onCall,
}) => {
    const pill = statusPillStyle(vehicle.status);
    const hasStream = !!vehicle.streamUrl;
    const zone =
        vehicle.zoneCode && vehicle.zoneCode !== "—"
            ? `Zone ${String(vehicle.zoneCode).replace(/^zone\s*/i, "")}`
            : "—";

    return (
        <View style={styles.liveCard}>
            <TouchableOpacity
                style={styles.liveVideo}
                activeOpacity={0.95}
                onPress={() => hasStream && onExpand?.(vehicle)}
                disabled={!hasStream}
            >
                {playing && hasStream ? (
                    <WebView
                        source={{
                            html: streamHtml(vehicle.streamUrl),
                            baseUrl: "https://localhost",
                        }}
                        originWhitelist={["*"]}
                        javaScriptEnabled
                        domStorageEnabled
                        mediaPlaybackRequiresUserAction={false}
                        allowsInlineMediaPlayback
                        allowsFullscreenVideo
                        mixedContentMode="always"
                        androidLayerType="hardware"
                        setSupportMultipleWindows={false}
                        scrollEnabled={false}
                        style={styles.video}
                    />
                ) : (
                    <View style={styles.poster}>
                        <Text style={styles.posterGlyph}>▣</Text>
                        <Text style={styles.posterText}>
                            {hasStream ? "Stream paused" : "No stream URL"}
                        </Text>
                    </View>
                )}
                <View pointerEvents="none" style={styles.liveOverlay}>
                    <View style={styles.liveTag}>
                        <View style={styles.redDot} />
                        <Text style={styles.liveTagText}>LIVE</Text>
                    </View>
                </View>
                {hasStream ? (
                    <Text pointerEvents="none" style={styles.expandHint}>
                        ● TAPPING TO EXPAND
                    </Text>
                ) : null}
            </TouchableOpacity>
            <View style={styles.liveInfo}>
                <View style={styles.vehicleIcon}>
                    <Image
                        source={VECHILES}
                        style={styles.vehicleIconImg}
                        resizeMode="contain"
                    />
                </View>
                <View style={styles.vehicleCopy}>
                    <View style={styles.vehicleTitle}>
                        <Text style={styles.vehicleId} numberOfLines={1}>
                            {vehicle.vehicleNumber}
                        </Text>
                        <Text style={[styles.activePill, pill]}>
                            {(vehicle.statusLabel || vehicle.status || "Active").toUpperCase()}
                        </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.vehicleMeta}>
                        {vehicle.vehicleTypeLabel} · {vehicle.driverName} · {zone} ·{" "}
                        {vehicle.pingLabel}
                    </Text>
                </View>
                <TouchableOpacity style={styles.callButton} onPress={onCall} activeOpacity={0.8}>
                    <SimpleIcon name="phone" size={16} color={NAVY} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.callButton,
                        (switchingOff ||
                            String(vehicle.status || "").toLowerCase() === "offline") &&
                            styles.callButtonDisabled,
                    ]}
                    onPress={() => onSwitchOff?.(vehicle)}
                    activeOpacity={0.8}
                    disabled={
                        switchingOff ||
                        String(vehicle.status || "").toLowerCase() === "offline"
                    }
                >
                    {switchingOff ? (
                        <ActivityIndicator size="small" color={NAVY} />
                    ) : (
                        <Image
                            source={SWITCHOFF}
                            style={styles.switchOffIcon}
                            resizeMode="contain"
                        />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const RecordingCard = ({ item, onPlay }) => (
    <View style={styles.recordingCard}>
        <View style={styles.recordingCopy}>
            <View style={styles.recordingTitle}>
                <Text style={styles.busIcon}>▰</Text>
                <Text numberOfLines={1} style={styles.recordingId}>
                    {item.vehicleNumber}
                </Text>
                <View style={styles.duration}>
                    <Text style={styles.durationTxt}>{item.duration || "—"}</Text>
                </View>
            </View>
            <Text style={styles.recordingNote} numberOfLines={2}>
                {item.note || `${item.vehicleType} · ${item.zoneCode}`}
            </Text>
            <Text style={styles.recordingMeta}>
                {item.startLabel} → {item.endLabel}
            </Text>
            <TouchableOpacity
                style={[styles.playRowBtn, !item.videoUrl && { opacity: 0.5 }]}
                activeOpacity={0.85}
                disabled={!item.videoUrl}
                onPress={() => onPlay?.(item)}
            >
                <Text style={styles.playIcon}>▶</Text>
                <Text style={styles.playRowTxt}>
                    {item.videoUrl ? "Play" : "No video"}
                </Text>
            </TouchableOpacity>
        </View>
    </View>
);

const RecordingPlayerModal = ({ clip, onBackToLive }) => (
    <Modal
        visible={!!clip}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onBackToLive}
    >
        <View style={styles.playerModalRoot}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onBackToLive} />
            <View style={styles.playerCard}>
                <View style={styles.playerHead}>
                    <Text style={styles.playerTitle} numberOfLines={2}>
                        {clip
                            ? `${clip.vehicleNumber} — ${
                                  clip.note || clip.vehicleType || "Recording"
                              }`
                            : ""}
                    </Text>
                    <TouchableOpacity onPress={onBackToLive} hitSlop={10}>
                        <Text style={styles.playerClose}>×</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.playerStage, { height: PLAYER_H }]}>
                    {clip?.videoUrl ? (
                        <WebView
                            key={`go-rec-${clip.id}`}
                            source={{
                                html: streamHtml(clip.videoUrl),
                                baseUrl: "https://localhost",
                            }}
                            style={styles.video}
                            originWhitelist={["*"]}
                            javaScriptEnabled
                            domStorageEnabled
                            mediaPlaybackRequiresUserAction={false}
                            allowsInlineMediaPlayback
                            allowsFullscreenVideo
                            mixedContentMode="always"
                            androidLayerType="hardware"
                            setSupportMultipleWindows={false}
                            scrollEnabled={false}
                        />
                    ) : null}
                </View>
                <Text style={styles.playerMeta} numberOfLines={2}>
                    ◷ {clip?.startLabel || "—"} → {clip?.endLabel || "—"} ·{" "}
                    {clip?.duration || "—"}
                </Text>
                <TouchableOpacity
                    style={styles.backToLiveBtn}
                    onPress={onBackToLive}
                    activeOpacity={0.85}
                >
                    <Image
                        source={BACKTOLIVE}
                        style={styles.backToLiveIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.backToLiveTxt}>Back to Live</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const AlertRow = ({ alert, busy, canAcknowledge, onAcknowledge }) => (
    <View style={styles.alertRow}>
        <View style={styles.alertCopy}>
            <Text style={styles.alertTitle} numberOfLines={2}>
                {toErrorText(alert.message, "Fleet alert")}
            </Text>
            <Text style={styles.alertMeta} numberOfLines={1}>
                {toErrorText(alert.vehicleNumber, "—")} ·{" "}
                {toErrorText(alert.type, "alert")} ·{" "}
                {toErrorText(alert.createdLabel, "—")}
            </Text>
        </View>
        {alert.acknowledged ? (
            <Text style={styles.ackDone}>ACK</Text>
        ) : canAcknowledge ? (
            <TouchableOpacity
                style={[styles.ackBtn, busy && styles.ackBtnDisabled]}
                disabled={busy}
                onPress={onAcknowledge}
                activeOpacity={0.85}
            >
                {busy ? (
                    <ActivityIndicator size="small" color={WHITE} />
                ) : (
                    <Text style={styles.ackBtnText}>Ack</Text>
                )}
            </TouchableOpacity>
        ) : (
            <Text style={styles.pendingTag}>Open</Text>
        )}
    </View>
);

export default function GrivanceOfficerFleetMonitoringScreen({ route, role: roleProp }) {
    const roleKey = String(roleProp || route?.params?.role || "grievanceOfficer")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
    const canAcknowledge =
        roleKey.includes("grievance") || roleKey.includes("grivance");
    // Backend allows fleet/alerts only for grievance roles; supervisor gets 403.
    const canLoadAlerts = canAcknowledge;

    const [tab, setTab] = useState("live");
    const [filterOpen, setFilterOpen] = useState(false);
    const [vehicleFilter, setVehicleFilter] = useState(ALL_VEHICLES);
    const [vehicleFilterId, setVehicleFilterId] = useState(null);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [vehicles, setVehicles] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pausedIds, setPausedIds] = useState({});
    const [switchingOffId, setSwitchingOffId] = useState(null);
    const [playingClip, setPlayingClip] = useState(null);
    const [ackingId, setAckingId] = useState(null);
    const [toastMessage, setToastMessage] = useState({
        visible: false,
        msg: "",
        type: "",
    });

    const stats = useMemo(() => summarizeVehicles(vehicles), [vehicles]);

    const mapMarkers = useMemo(
        () =>
            vehicles
                .filter(
                    (v) =>
                        Number.isFinite(v.latitude) && Number.isFinite(v.longitude)
                )
                .map((v) => ({
                    id: `veh-${v.id}`,
                    latitude: v.latitude,
                    longitude: v.longitude,
                    kind: "vehicle",
                    title: String(v.vehicleNumber || "Vehicle"),
                    label: "",
                    color: v.statusColor || "#16A34A",
                })),
        [vehicles]
    );

    const showToast = useCallback((msg, type = "error") => {
        setToastMessage({
            visible: true,
            msg: toErrorText(msg, type === "success" ? "Done" : "Something went wrong"),
            type,
        });
    }, []);

    const load = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            console.log("[FleetMonitoring] load start", {
                roleKey,
                roleProp,
                routeRole: route?.params?.role,
                soft,
                vehicleFilterId,
                dateFrom,
                dateTo,
            });
            try {
                const [vehiclesRes, recordingsRes, alertsRes] = await Promise.all([
                    fetchVehicles(),
                    fetchRecordings({
                        vehicleId: vehicleFilterId || undefined,
                        from: dateFrom || undefined,
                        to: dateTo || undefined,
                        page: 1,
                        limit: 40,
                    }),
                    canLoadAlerts
                        ? fetchFleetAlerts({ page: 1, limit: 10 })
                        : Promise.resolve({
                              ok: true,
                              data: [],
                              result: { skipped: true, reason: "role_not_allowed" },
                          }),
                ]);

                const isRoleForbidden = (msg) => {
                    const lower = String(msg || "").toLowerCase();
                    return (
                        lower.includes("not authorised") ||
                        lower.includes("not authorized") ||
                        lower.includes("role is not") ||
                        lower.includes("not define") ||
                        lower.includes("not defined")
                    );
                };

                if (!vehiclesRes.ok) {
                    const msg = toErrorText(
                        vehiclesRes.result,
                        "Failed to load vehicles"
                    );
                    console.log("[FleetMonitoring] vehicles API error", {
                        roleKey,
                        ok: vehiclesRes.ok,
                        message: msg,
                        result: vehiclesRes.result,
                    });
                    if (!isRoleForbidden(msg)) showToast(msg, "error");
                } else {
                    console.log("[FleetMonitoring] vehicles API success", {
                        roleKey,
                        count: (vehiclesRes.data || []).length,
                    });
                }
                if (!recordingsRes.ok) {
                    const msg = toErrorText(
                        recordingsRes.result,
                        "Failed to load recordings"
                    );
                    console.log("[FleetMonitoring] recordings API error", {
                        roleKey,
                        ok: recordingsRes.ok,
                        message: msg,
                        result: recordingsRes.result,
                    });
                    if (!isRoleForbidden(msg)) showToast(msg, "error");
                } else {
                    console.log("[FleetMonitoring] recordings API success", {
                        roleKey,
                        count: (recordingsRes.data || []).length,
                    });
                }
                if (!alertsRes.ok) {
                    const msg = toErrorText(
                        alertsRes.result,
                        "Failed to load fleet alerts"
                    );
                    console.log("[FleetMonitoring] alerts API error", {
                        roleKey,
                        ok: alertsRes.ok,
                        message: msg,
                        result: alertsRes.result,
                    });
                    // Role-forbidden responses stay in console only — map/vehicles still usable.
                    if (!isRoleForbidden(msg)) showToast(msg, "error");
                } else if (!alertsRes.result?.skipped) {
                    console.log("[FleetMonitoring] alerts API success", {
                        roleKey,
                        count: (alertsRes.data || []).length,
                    });
                }

                console.log("[FleetMonitoring] load success summary", {
                    roleKey,
                    canLoadAlerts,
                    vehiclesOk: vehiclesRes.ok,
                    vehiclesCount: (vehiclesRes.data || []).length,
                    recordingsOk: recordingsRes.ok,
                    recordingsCount: (recordingsRes.data || []).length,
                    alertsOk: alertsRes.ok,
                    alertsCount: (alertsRes.data || []).length,
                    alertsSkipped: !!alertsRes.result?.skipped,
                });

                setVehicles(vehiclesRes.data || []);
                setRecordings(recordingsRes.data || []);
                setAlerts(canLoadAlerts ? alertsRes.data || [] : []);
            } catch (e) {
                console.log("[FleetMonitoring] load exception", {
                    roleKey,
                    message: e?.message || String(e),
                    error: e,
                    stack: e?.stack,
                });
                showToast(toErrorText(e?.message || e, "Failed to load fleet data"), "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [
            canLoadAlerts,
            dateFrom,
            dateTo,
            roleKey,
            roleProp,
            route?.params?.role,
            showToast,
            vehicleFilterId,
        ]
    );

    useEffect(() => {
        load();
    }, [load]);

    const onSwitchOff = useCallback(
        async (vehicle) => {
            if (!vehicle?.id) return;
            const key = String(vehicle.id);
            if (String(vehicle.status || "").toLowerCase() === "offline") return;
            setSwitchingOffId(key);
            try {
                const res = await switchOffVehicle(vehicle.id);
                if (!res.ok) {
                    showToast(res.message, "error");
                    return;
                }
                setPausedIds((prev) => ({ ...prev, [key]: true }));
                if (res.data) {
                    setVehicles((prev) =>
                        prev.map((v) =>
                            String(v.id) === key ? { ...v, ...res.data } : v
                        )
                    );
                } else {
                    setVehicles((prev) =>
                        prev.map((v) =>
                            String(v.id) === key
                                ? {
                                      ...v,
                                      status: "offline",
                                      statusLabel: "Offline",
                                      statusColor: "#64748B",
                                  }
                                : v
                        )
                    );
                }
                showToast(res.message || "Vehicle switched off", "success");
                load({ soft: true });
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to switch off"), "error");
            } finally {
                setSwitchingOffId(null);
            }
        },
        [load, showToast]
    );

    const backToLiveFromRecording = useCallback(() => {
        const clip = playingClip;
        setPlayingClip(null);
        setTab("live");
        if (clip?.vehicleId != null) {
            const key = String(clip.vehicleId);
            setPausedIds((prev) => {
                if (!prev[key]) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    }, [playingClip]);

    const onCall = useCallback(
        (vehicle) => {
            const mobile = String(vehicle?.driverMobile || "").replace(/\D/g, "");
            if (mobile.length < 10) {
                showToast("Driver mobile not available", "error");
                return;
            }
            Linking.openURL(`tel:${mobile}`).catch(() =>
                showToast("Unable to start call", "error")
            );
        },
        [showToast]
    );

    const onAcknowledge = useCallback(
        async (alert) => {
            if (!alert?.id || ackingId) return;
            setAckingId(alert.id);
            try {
                const res = await acknowledgeFleetAlert(alert.id);
                if (!res.ok) {
                    showToast(
                        toErrorText(
                            res.message || res.result,
                            "Failed to acknowledge alert"
                        ),
                        "error"
                    );
                    return;
                }
                setAlerts((prev) =>
                    prev.map((item) =>
                        item.id === alert.id
                            ? { ...item, acknowledged: true }
                            : item
                    )
                );
                showToast("Alert acknowledged", "success");
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to acknowledge alert"), "error");
            } finally {
                setAckingId(null);
            }
        },
        [ackingId, showToast]
    );

    const vehicleMenu = useMemo(
        () => [
            { label: ALL_VEHICLES, id: null },
            ...vehicles.map((v) => ({
                label: v.vehicleNumber,
                id: v.id,
            })),
        ],
        [vehicles]
    );

    const openAlerts = useMemo(
        () => alerts.filter((a) => !a.acknowledged).slice(0, 5),
        [alerts]
    );

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Live Fleet & Camera Monitoring"
                subtitle=""
                height={64}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />
            <View style={styles.tabs}>
                <TouchableOpacity
                    onPress={() => setTab("live")}
                    style={[styles.tab, tab === "live" && styles.tabActive]}
                >
                    <SimpleIcon name="camera-outline" size={17} color={tab === "live" ? WHITE : NAVY} />
                    <Text style={[styles.tabText, tab === "live" && styles.tabTextActive]}>
                        Live Monitoring
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setTab("recordings")}
                    style={[styles.tab, tab === "recordings" && styles.tabActive]}
                >
                    <Text style={[styles.playSmall, tab === "recordings" && styles.tabTextActive]}>
                        ▷
                    </Text>
                    <Text style={[styles.tabText, tab === "recordings" && styles.tabTextActive]}>
                        Recordings
                    </Text>
                </TouchableOpacity>
            </View>

            {tab === "live" ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => load({ soft: true })}
                            colors={[NAVY]}
                            tintColor={NAVY}
                        />
                    }
                >
                    {loading && !vehicles.length ? (
                        <ActivityIndicator color={NAVY} style={{ marginVertical: 18 }} />
                    ) : null}

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <View style={[styles.statDot, { backgroundColor: "#20C56B" }]} />
                            <View>
                                <Text style={styles.statLabel}>ON PATROL</Text>
                                <Text style={[styles.statValue, { color: "#158447" }]}>
                                    {stats.active}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statDot, { backgroundColor: "#F49A08" }]} />
                            <View>
                                <Text style={styles.statLabel}>IDLE / STATIONARY</Text>
                                <Text style={[styles.statValue, { color: "#D98200" }]}>
                                    {stats.idle}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statDot, { backgroundColor: "#8392A8" }]} />
                            <View>
                                <Text style={styles.statLabel}>OFFLINE</Text>
                                <Text style={styles.statValue}>{stats.offline}</Text>
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statDot, { backgroundColor: "#102D50" }]} />
                            <View>
                                <Text style={styles.statLabel}>CORRIDOR VEHICLES</Text>
                                <Text style={styles.statValue}>{stats.total}</Text>
                            </View>
                        </View>
                    </View>

                    {openAlerts.length > 0 && (
                        <View style={styles.alertsCard}>
                            <Text style={styles.alertsTitle}>Fleet Alerts</Text>
                            {openAlerts.map((alert) => (
                                <AlertRow
                                    key={String(alert.id)}
                                    alert={alert}
                                    busy={ackingId === alert.id}
                                    canAcknowledge={canAcknowledge}
                                    onAcknowledge={() => onAcknowledge(alert)}
                                />
                            ))}
                        </View>
                    )}

                    {!loading && vehicles.length === 0 ? (
                        <Text style={styles.empty}>No vehicles found for this corridor.</Text>
                    ) : null}

                    {vehicles.map((vehicle) => {
                        const id = String(vehicle.id);
                        const hasStream = !!vehicle.streamUrl;
                        const playing = hasStream && !pausedIds[id];
                        return (
                            <LiveCard
                                key={id}
                                vehicle={vehicle}
                                playing={playing}
                                switchingOff={switchingOffId === id}
                                onSwitchOff={onSwitchOff}
                                onExpand={(v) => {
                                    if (v?.streamUrl) Linking.openURL(String(v.streamUrl));
                                }}
                                onCall={() => onCall(vehicle)}
                            />
                        );
                    })}

                    <View style={styles.mapPane}>
                        <Text style={styles.sectionTitle}>Fleet Map</Text>
                        <Text style={styles.sectionSubtitle}>
                            Live vehicle positions from fleet API
                        </Text>
                        <View style={styles.mapBox}>
                            <StaticCrmMap
                                style={styles.map}
                                markers={mapMarkers}
                                showZoom
                            />
                        </View>
                        {!mapMarkers.length ? (
                            <Text style={styles.empty}>
                                No mapped vehicles with GPS coordinates yet.
                            </Text>
                        ) : null}
                    </View>
                </ScrollView>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => load({ soft: true })}
                            colors={[NAVY]}
                            tintColor={NAVY}
                        />
                    }
                >
                    <View style={styles.recordingsIntro}>
                        <Text style={styles.sectionTitle}>Recorded Footage</Text>
                        <Text style={styles.sectionSubtitle}>
                            Past clips from on-board cameras, with date & vehicle filters
                        </Text>
                        <View style={styles.filtersRow}>
                            <View style={styles.filterWrap}>
                                <TouchableOpacity
                                    style={styles.vehicleSelect}
                                    onPress={() => setFilterOpen((open) => !open)}
                                >
                                    <Text numberOfLines={1} style={styles.vehicleSelectText}>
                                        {vehicleFilter}
                                    </Text>
                                    <SimpleIcon name="chevron-down" size={15} color={NAVY} />
                                </TouchableOpacity>
                                {filterOpen && (
                                    <View style={styles.filterMenu}>
                                        {vehicleMenu.map((item) => (
                                            <TouchableOpacity
                                                key={String(item.id ?? "all")}
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setVehicleFilter(item.label);
                                                    setVehicleFilterId(item.id);
                                                    setFilterOpen(false);
                                                }}
                                            >
                                                <Text style={styles.menuText}>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() =>
                                    setDateFrom((prev) =>
                                        prev ? "" : new Date().toISOString().slice(0, 10)
                                    )
                                }
                            >
                                <Text style={styles.datePlaceholder}>
                                    {dateFrom || "from yyyy-mm-dd"}
                                </Text>
                                <SimpleIcon name="calendar-blank-outline" size={15} color={NAVY} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() =>
                                    setDateTo((prev) =>
                                        prev ? "" : new Date().toISOString().slice(0, 10)
                                    )
                                }
                            >
                                <Text style={styles.datePlaceholder}>
                                    {dateTo || "to yyyy-mm-dd"}
                                </Text>
                                <SimpleIcon name="calendar-blank-outline" size={15} color={NAVY} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading && !recordings.length ? (
                        <ActivityIndicator color={NAVY} style={{ marginVertical: 18 }} />
                    ) : null}

                    {!loading && recordings.length === 0 ? (
                        <Text style={styles.empty}>No recordings match these filters.</Text>
                    ) : null}

                    {recordings.map((item) => (
                        <RecordingCard
                            key={String(item.id)}
                            item={item}
                            onPlay={(clip) => setPlayingClip(clip)}
                        />
                    ))}
                </ScrollView>
            )}

            <RecordingPlayerModal
                clip={playingClip}
                onBackToLive={backToLiveFromRecording}
            />

            {toastMessage.visible && (
                <ToastMessage
                    message={toastMessage.msg}
                    visible={toastMessage.visible}
                    setVisible={({ visible }) =>
                        setToastMessage((prev) => ({ ...prev, visible }))
                    }
                    bacgroundColor={toastMessage.type === "success" ? GREEN : RED}
                    textColor={WHITE}
                    type={toastMessage.type}
                    duration={2500}
                    position="bottom"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    tabs: {
        flexDirection: "row",
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 8,
        padding: 3,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 13,
        elevation: 1,
    },
    tab: {
        flex: 1,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        borderRadius: 10,
    },
    tabActive: { backgroundColor: "#102D4C" },
    tabText: { color: "#203A5A", fontSize: 12, fontWeight: "700" },
    tabTextActive: { color: WHITE },
    playSmall: { color: NAVY, fontSize: 17, fontWeight: "700" },
    content: { paddingHorizontal: 12, paddingBottom: 110, gap: 9 },
    mapPane: {
        marginTop: 4,
        marginBottom: 8,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F2",
        borderRadius: 14,
        padding: 10,
    },
    mapBox: {
        height: 240,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E8EEF5",
        backgroundColor: "#E8EEF5",
        marginTop: 8,
    },
    map: { flex: 1 },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 8,
    },
    statCard: {
        width: "48.7%",
        minHeight: 66,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 13,
        elevation: 1,
    },
    statDot: { width: 11, height: 11, borderRadius: 6 },
    statLabel: { color: "#8192AD", fontSize: 9, fontWeight: "800" },
    statValue: { color: NAVY, fontSize: 18, fontWeight: "800", marginTop: 1 },
    alertsCard: {
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 14,
        padding: 10,
        gap: 8,
    },
    alertsTitle: { color: "#10274A", fontSize: 13, fontWeight: "800" },
    alertRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
        borderTopWidth: 1,
        borderTopColor: "#EEF3F9",
    },
    alertCopy: { flex: 1, minWidth: 0 },
    alertTitle: { color: "#1A3355", fontSize: 11, fontWeight: "700" },
    alertMeta: { color: "#667A97", fontSize: 9, marginTop: 2 },
    ackBtn: {
        minWidth: 48,
        height: 30,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: "#102D4C",
        alignItems: "center",
        justifyContent: "center",
    },
    ackBtnDisabled: { opacity: 0.6 },
    ackBtnText: { color: WHITE, fontSize: 11, fontWeight: "800" },
    ackDone: {
        color: "#078541",
        backgroundColor: "#E8FAEF",
        borderWidth: 1,
        borderColor: "#AFEBC6",
        overflow: "hidden",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        fontSize: 10,
        fontWeight: "800",
    },
    pendingTag: {
        color: "#B36B00",
        backgroundColor: "#FFF6E5",
        borderWidth: 1,
        borderColor: "#F5D59A",
        overflow: "hidden",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        fontSize: 10,
        fontWeight: "800",
    },
    empty: { color: "#667A97", fontSize: 12, textAlign: "center", paddingVertical: 16 },
    liveCard: {
        overflow: "hidden",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F2",
        borderRadius: 15,
        elevation: 1,
    },
    liveVideo: {
        height: VIDEO_H,
        backgroundColor: "#13253B",
        position: "relative",
        overflow: "hidden",
    },
    video: { width: "100%", height: "100%", backgroundColor: "#13253B" },
    poster: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#13253B",
        gap: 6,
    },
    posterGlyph: { color: WHITE, fontSize: 22 },
    posterText: { color: "#D7E4F5", fontSize: 11, fontWeight: "700" },
    liveOverlay: {
        position: "absolute",
        top: 8,
        left: 8,
        right: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    liveTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(12,22,34,0.82)",
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 4,
    },
    redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F3313D" },
    liveTagText: { color: WHITE, fontSize: 10, fontWeight: "800" },
    codec: {
        color: WHITE,
        fontSize: 9,
        backgroundColor: "rgba(12,22,34,0.65)",
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 5,
    },
    expandHint: {
        position: "absolute",
        right: 8,
        bottom: 8,
        color: WHITE,
        backgroundColor: "rgba(12,22,34,0.8)",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 5,
        fontSize: 9,
        fontWeight: "700",
    },
    liveInfo: {
        minHeight: 55,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        gap: 7,
    },
    vehicleIcon: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: "#EEF4FF",
        alignItems: "center",
        justifyContent: "center",
    },
    vehicleIconImg: { width: 18, height: 18, tintColor: "#4F6BED" },
    vehicleCopy: { flex: 1, minWidth: 0 },
    vehicleTitle: { flexDirection: "row", alignItems: "center", gap: 7 },
    vehicleId: { color: "#10274A", fontSize: 12, fontWeight: "800", flexShrink: 1 },
    activePill: {
        overflow: "hidden",
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 3,
        fontSize: 9,
        fontWeight: "800",
        borderWidth: 1,
    },
    vehicleMeta: { color: "#637997", fontSize: 9, marginTop: 3 },
    callButton: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 10,
        backgroundColor: WHITE,
    },
    callButtonDisabled: { opacity: 0.45 },
    switchOffIcon: { width: 18, height: 18, tintColor: NAVY },
    recordingsIntro: {
        padding: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 14,
    },
    sectionTitle: { color: "#10274A", fontSize: 15, fontWeight: "800" },
    sectionSubtitle: { color: "#566E90", fontSize: 10, marginTop: 3 },
    filtersRow: { flexDirection: "row", gap: 7, marginTop: 10 },
    filterWrap: { flex: 1, position: "relative", zIndex: 3 },
    vehicleSelect: {
        height: 39,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
        paddingHorizontal: 8,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D6E1EF",
        borderRadius: 10,
    },
    vehicleSelectText: { flex: 1, color: "#203A5A", fontSize: 9 },
    filterMenu: {
        position: "absolute",
        top: 42,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D6E1EF",
        borderRadius: 10,
        elevation: 5,
        maxHeight: 180,
    },
    menuItem: { paddingHorizontal: 8, paddingVertical: 8 },
    menuText: { color: NAVY, fontSize: 9 },
    dateInput: {
        flex: 1,
        height: 39,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 7,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D6E1EF",
        borderRadius: 10,
    },
    datePlaceholder: { color: "#455B79", fontSize: 9 },
    recordingCard: {
        padding: 12,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 14,
        marginBottom: 10,
        elevation: 1,
    },
    recordingCopy: { gap: 6 },
    recordingNote: { color: NAVY, fontSize: 13, fontWeight: "700" },
    duration: {
        marginLeft: "auto",
        backgroundColor: "#EEF2F7",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    durationTxt: { color: NAVY, fontSize: 10, fontWeight: "800" },
    playRowBtn: {
        marginTop: 4,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "#D6E1EF",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: WHITE,
    },
    playIcon: { color: NAVY, fontSize: 12, marginLeft: 1 },
    playRowTxt: { color: NAVY, fontSize: 12, fontWeight: "700" },
    playerModalRoot: {
        flex: 1,
        backgroundColor: "rgba(8,16,32,0.72)",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    playerCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        overflow: "hidden",
        paddingBottom: 14,
    },
    playerHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    playerTitle: {
        flex: 1,
        color: NAVY,
        fontSize: 14,
        fontWeight: "800",
        paddingRight: 8,
    },
    playerClose: { color: GREY, fontSize: 28, lineHeight: 28 },
    playerStage: { width: "100%", backgroundColor: "#111" },
    playerMeta: {
        color: GREY,
        fontSize: 12,
        fontWeight: "600",
        paddingHorizontal: 14,
        paddingTop: 10,
    },
    backToLiveBtn: {
        marginTop: 12,
        marginHorizontal: 14,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        borderRadius: 10,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: WHITE,
    },
    backToLiveIcon: { width: 18, height: 18, tintColor: NAVY },
    backToLiveTxt: { color: NAVY, fontSize: 13, fontWeight: "700" },
    recordingTitle: { flexDirection: "row", alignItems: "center", gap: 4 },
    busIcon: { color: "#1688E7", fontSize: 14 },
    recordingId: { flex: 1, color: "#10274A", fontSize: 11, fontWeight: "800" },
    recordingMeta: { color: "#455D7D", fontSize: 9, flexShrink: 1 },
    recordingMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    cameraIcon: { color: "#45617F", fontSize: 12 },
});
