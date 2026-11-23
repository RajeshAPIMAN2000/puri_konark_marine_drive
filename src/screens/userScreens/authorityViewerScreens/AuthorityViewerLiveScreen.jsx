import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { WebView } from "react-native-webview";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import StaticCrmMap from "../../../components/map/StaticCrmMap";
import { GREEN, GREY, NAVY, RED, WHITE } from "../../../constant/color";
import {
    BACKTOLIVE,
    GRIVANCE,
    LOCATION,
    NOTIFICATION,
    OPEN,
    PHOTO,
    PLAY,
    PAUSE,
    STOP,
    VECHILES,
} from "../../../constant/imagePath";
import {
    acknowledgeFleetAlert,
    fetchFleetAlerts,
    fetchRecordings,
    fetchVehicles,
    formatDateTime,
    summarizeVehicles,
    toErrorText,
} from "../../../services/fleet/FleetService";

const SCREEN = Dimensions.get("window");
const ALL_VEHICLES = "all";
const FEED_H = Math.max(220, Math.round((SCREEN.width - 24) * (9 / 16)));

const safeSrc = (src) =>
    String(src || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const playerHtml = (src) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  *{box-sizing:border-box}
  html, body { margin:0; padding:0; width:100%; height:100%; background:#111; overflow:hidden; }
  .stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  video { width:100%; height:100%; background:#111; object-fit:contain; display:block; }
</style>
</head><body>
<div class="stage">
<video id="v" controls autoplay playsinline webkit-playsinline preload="auto">
  <source src="${safeSrc(src)}" />
</video>
</div>
<script>
  var v = document.getElementById('v');
  var start = function(){ v.muted = false; var p = v.play(); if (p && p.catch) p.catch(function(){}); };
  v.addEventListener('loadeddata', start);
  v.addEventListener('canplay', start);
  start();
</script>
</body></html>`;

const streamHtml = (src) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  *{box-sizing:border-box}
  html,body{margin:0;width:100%;height:100%;background:#0b1f3a;overflow:hidden}
  .stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  video{width:100%;height:100%;object-fit:contain;background:#0b1f3a;display:block}
</style>
</head><body>
<div class="stage">
<video autoplay muted loop playsinline webkit-playsinline preload="auto">
  <source src="${safeSrc(src)}" />
</video>
</div>
<script>
  var v = document.querySelector('video');
  var start = function(){ if(!v) return; v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function(){}); };
  if (v) {
    v.addEventListener('loadeddata', start);
    v.addEventListener('canplay', start);
    start();
  }
</script>
</body></html>`;

export default function AuthorityViewerLiveScreen() {
    const [tab, setTab] = useState("live");
    const [vehicles, setVehicles] = useState([]);
    const [corridor, setCorridor] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [vehicleFilter, setVehicleFilter] = useState(ALL_VEHICLES);
    const [vehicleOpen, setVehicleOpen] = useState(false);
    const [pausedIds, setPausedIds] = useState({});
    const [playing, setPlaying] = useState(null);
    const [ackingId, setAckingId] = useState(null);
    const [toastMessage, setToastMessage] = useState({
        visible: false,
        msg: "",
        type: "",
    });
    const playerRef = useRef(null);

    const showToast = useCallback((msg, type = "error") => {
        setToastMessage({
            visible: true,
            msg: toErrorText(msg, "Something went wrong"),
            type,
        });
    }, []);

    const loadAll = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setRefreshing(true);
            else setLoading(true);
            try {
                const [vehRes, recRes, alertRes] = await Promise.all([
                    fetchVehicles(),
                    fetchRecordings({ page: 1, limit: 50 }),
                    fetchFleetAlerts({ page: 1, limit: 30 }),
                ]);

                if (!vehRes.ok) {
                    showToast(
                        toErrorText(vehRes.result, "Failed to load vehicles"),
                        "error"
                    );
                    setVehicles([]);
                    setCorridor([]);
                } else {
                    setVehicles(vehRes.data || []);
                    setCorridor(vehRes.corridor || []);
                }

                if (!recRes.ok) {
                    showToast(
                        toErrorText(recRes.result, "Failed to load recordings"),
                        "error"
                    );
                    setRecordings([]);
                } else {
                    setRecordings(recRes.data || []);
                }

                if (!alertRes.ok) {
                    showToast(
                        toErrorText(alertRes.result, "Failed to load alerts"),
                        "error"
                    );
                    setAlerts([]);
                } else {
                    setAlerts(alertRes.data || []);
                }
            } catch (err) {
                showToast(toErrorText(err, "Failed to load fleet data"), "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [showToast]
    );

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const summary = useMemo(() => summarizeVehicles(vehicles), [vehicles]);

    // Fleet map: vehicle icons only for units that have GPS (lat/lng). No letter/corridor pins.
    const mapMarkers = useMemo(
        () =>
            vehicles
                .filter(
                    (v) =>
                        Number.isFinite(v.latitude) &&
                        Number.isFinite(v.longitude)
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

    const filteredRecordings = useMemo(() => {
        if (vehicleFilter === ALL_VEHICLES) return recordings;
        return recordings.filter(
            (r) => String(r.vehicleId) === String(vehicleFilter)
        );
    }, [recordings, vehicleFilter]);

    const filterLabel = useMemo(() => {
        if (vehicleFilter === ALL_VEHICLES) return "All vehicles";
        const match = vehicles.find(
            (v) => String(v.id) === String(vehicleFilter)
        );
        return match?.vehicleNumber || "All vehicles";
    }, [vehicleFilter, vehicles]);

    const onAcknowledge = useCallback(
        async (alert) => {
            if (!alert?.id || alert.acknowledged || ackingId) return;
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
                    prev.map((a) =>
                        a.id === alert.id
                            ? {
                                  ...a,
                                  acknowledged: true,
                                  message: toErrorText(
                                      res.data?.message || a.message,
                                      "Fleet alert"
                                  ),
                              }
                            : a
                    )
                );
                showToast("Alert acknowledged", "success");
            } catch (err) {
                showToast(toErrorText(err, "Failed to acknowledge alert"), "error");
            } finally {
                setAckingId(null);
            }
        },
        [ackingId, showToast]
    );

    const refreshControl = (
        <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAll({ soft: true })}
            tintColor={NAVY}
            colors={[NAVY]}
        />
    );

    return (
        <View style={styles.root}>
            <MyHeader
                title="Live Fleet & Camera Monitoring"
                subtitle=""
                height={48}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <View style={styles.tabs}>
                <Tab
                    icon={PHOTO}
                    label="Live Monitoring"
                    active={tab === "live"}
                    onPress={() => setTab("live")}
                />
                <Tab
                    icon={PLAY}
                    label="Recordings"
                    active={tab === "recordings"}
                    onPress={() => setTab("recordings")}
                />
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={NAVY} />
                    <Text allowFontScaling={false} style={styles.loadingTxt}>
                        Loading fleet data…
                    </Text>
                </View>
            ) : tab === "live" ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    style={styles.flex}
                    refreshControl={refreshControl}
                >
                    <View style={styles.statsRow}>
                        <StatChip label="Active" value={summary.active} color="#16A34A" />
                        <StatChip label="Idle" value={summary.idle} color="#F59E0B" />
                        <StatChip label="Offline" value={summary.offline} color="#64748B" />
                        <StatChip label="Total" value={summary.total} color={NAVY} />
                    </View>

                    <View style={styles.stack}>
                        {vehicles.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text allowFontScaling={false} style={styles.emptyTitle}>
                                    No vehicles online
                                </Text>
                                <Text allowFontScaling={false} style={styles.emptySub}>
                                    Pull to refresh when fleet data is available.
                                </Text>
                            </View>
                        ) : (
                            vehicles.map((vehicle) => {
                                const id = String(vehicle.id);
                                const canStream = !!vehicle.streamUrl;
                                const streaming = canStream && !pausedIds[id];
                                return (
                                    <VehicleTile
                                        key={id}
                                        vehicle={vehicle}
                                        streaming={streaming}
                                        onToggleStream={() =>
                                            setPausedIds((prev) => {
                                                const next = { ...prev };
                                                if (next[id]) delete next[id];
                                                else next[id] = true;
                                                return next;
                                            })
                                        }
                                    />
                                );
                            })
                        )}
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHead}>
                            <View style={styles.titleRow}>
                                <Image
                                    source={LOCATION}
                                    style={styles.headIcon}
                                    resizeMode="contain"
                                />
                                <View>
                                    <Text allowFontScaling={false} style={styles.cardTitle}>
                                        Live Fleet Locations
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.cardSub}>
                                        Vehicles & corridor points on Marine Drive
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.mapBox}>
                            <StaticCrmMap
                                style={styles.map}
                                markers={mapMarkers}
                                showZoom
                            />
                            <View style={styles.legend}>
                                <View style={styles.legendDot} />
                                <Text allowFontScaling={false} style={styles.legendTxt}>
                                    Active / mapped unit
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHead}>
                            <View style={styles.titleRow}>
                                <Image
                                    source={NOTIFICATION}
                                    style={styles.headIcon}
                                    resizeMode="contain"
                                />
                                <View>
                                    <Text allowFontScaling={false} style={styles.cardTitle}>
                                        Recent Alerts
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.cardSub}>
                                        Live events from fleet analytics
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {alerts.length === 0 ? (
                            <Text allowFontScaling={false} style={styles.emptyInline}>
                                No alerts right now.
                            </Text>
                        ) : (
                            alerts.map((item) => (
                                <View key={item.id} style={styles.alert}>
                                    <View style={styles.flag}>
                                        <Image
                                            source={GRIVANCE}
                                            style={styles.flagIcon}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View style={styles.alertBody}>
                                        <Text
                                            allowFontScaling={false}
                                            style={styles.alertTitle}
                                            numberOfLines={2}
                                        >
                                            {toErrorText(item.message, "Fleet alert")}
                                        </Text>
                                        <Text
                                            allowFontScaling={false}
                                            style={styles.alertPlace}
                                            numberOfLines={1}
                                        >
                                            {toErrorText(item.vehicleNumber, "—")}
                                            {item.type
                                                ? ` · ${toErrorText(item.type, "")}`
                                                : ""}
                                        </Text>
                                    </View>
                                    <View style={styles.alertMeta}>
                                        <Text allowFontScaling={false} style={styles.alertTime}>
                                            {item.createdLabel ||
                                                formatDateTime(item.createdAt)}
                                        </Text>
                                        {item.acknowledged ? (
                                            <View style={[styles.tag, styles.tagOk]}>
                                                <Text
                                                    allowFontScaling={false}
                                                    style={[styles.tagTxt, styles.tagOkTxt]}
                                                >
                                                    Acked
                                                </Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.ackBtn}
                                                activeOpacity={0.85}
                                                disabled={ackingId === item.id}
                                                onPress={() => onAcknowledge(item)}
                                            >
                                                <Text
                                                    allowFontScaling={false}
                                                    style={styles.ackTxt}
                                                >
                                                    {ackingId === item.id
                                                        ? "…"
                                                        : "Acknowledge"}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    style={styles.flex}
                    data={filteredRecordings}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.clipList}
                    refreshControl={refreshControl}
                    ListHeaderComponent={
                        <View>
                            <Text allowFontScaling={false} style={styles.footageTitle}>
                                Recorded Footage
                            </Text>
                            <Text allowFontScaling={false} style={styles.footageSub}>
                                Past clips from on-board cameras, with vehicle filter
                            </Text>
                            <TouchableOpacity
                                style={styles.vehicleBtn}
                                onPress={() => setVehicleOpen((v) => !v)}
                            >
                                <Image
                                    source={VECHILES}
                                    style={styles.smallIcon}
                                    resizeMode="contain"
                                />
                                <Text allowFontScaling={false} style={styles.vehicleTxt}>
                                    {filterLabel}
                                </Text>
                                <Text allowFontScaling={false} style={styles.caret}>
                                    ▾
                                </Text>
                            </TouchableOpacity>
                            {vehicleOpen && (
                                <View style={styles.vehicleMenu}>
                                    <TouchableOpacity
                                        style={styles.vehicleItem}
                                        onPress={() => {
                                            setVehicleFilter(ALL_VEHICLES);
                                            setVehicleOpen(false);
                                        }}
                                    >
                                        <Text
                                            allowFontScaling={false}
                                            style={styles.vehicleItemTxt}
                                        >
                                            All vehicles
                                        </Text>
                                    </TouchableOpacity>
                                    {vehicles.map((v) => (
                                        <TouchableOpacity
                                            key={v.id}
                                            style={styles.vehicleItem}
                                            onPress={() => {
                                                setVehicleFilter(v.id);
                                                setVehicleOpen(false);
                                            }}
                                        >
                                            <Text
                                                allowFontScaling={false}
                                                style={styles.vehicleItemTxt}
                                            >
                                                {v.vehicleNumber}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyCard}>
                            <Text allowFontScaling={false} style={styles.emptyTitle}>
                                No recordings found
                            </Text>
                            <Text allowFontScaling={false} style={styles.emptySub}>
                                Try another vehicle or pull to refresh.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.clipCard}>
                            <View style={styles.clipTop}>
                                <Text allowFontScaling={false} style={styles.clipVehicle}>
                                    {item.vehicleNumber}
                                </Text>
                                <View style={styles.duration}>
                                    <Text allowFontScaling={false} style={styles.durationTxt}>
                                        {item.duration}
                                    </Text>
                                </View>
                            </View>
                            <Text allowFontScaling={false} style={styles.clipName}>
                                {item.note ||
                                    `${item.vehicleType} · ${item.zoneCode}`}
                            </Text>
                            <Text allowFontScaling={false} style={styles.clipRange}>
                                {item.startLabel} → {item.endLabel}
                            </Text>
                            <View style={styles.clipActions}>
                                <TouchableOpacity
                                    style={styles.playBtn}
                                    activeOpacity={0.85}
                                    disabled={!item.videoUrl}
                                    onPress={() =>
                                        setPlaying({
                                            id: item.id,
                                            vehicleId: item.vehicleId,
                                            vehicle: item.vehicleNumber,
                                            clip: item.note || "Recording",
                                            start: item.startLabel,
                                            end: item.endLabel,
                                            duration: item.duration,
                                            video: item.videoUrl,
                                        })
                                    }
                                >
                                    <Image
                                        source={PLAY}
                                        style={styles.ctrlIcon}
                                        resizeMode="contain"
                                    />
                                    <Text allowFontScaling={false} style={styles.playTxt}>
                                        {item.videoUrl ? "Play" : "No video"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            <PlayerModal
                clip={playing}
                playerRef={playerRef}
                onClose={() => {
                    const clip = playing;
                    setPlaying(null);
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
                }}
            />

            <ToastMessage
                message={toastMessage.msg}
                visible={toastMessage.visible}
                type={toastMessage.type}
                bacgroundColor={WHITE}
                setVisible={({ visible }) =>
                    setToastMessage((prev) => ({ ...prev, visible }))
                }
            />
        </View>
    );
}

const sendPlayer = (ref, command) => {
    ref.current?.injectJavaScript(`
        (function(){
          var v = document.querySelector('video');
          if (!v) return;
          if ('${command}' === 'play') { var p = v.play(); if (p && p.catch) p.catch(function(){}); }
          if ('${command}' === 'pause') v.pause();
          if ('${command}' === 'stop') { v.pause(); v.currentTime = 0; }
        })();
        true;
    `);
};

const PlayerModal = ({ clip, playerRef, onClose }) => {
    const html = useMemo(() => (clip?.video ? playerHtml(clip.video) : ""), [clip]);
    return (
        <Modal
            visible={!!clip}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.modalRoot}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.playerCard}>
                    <View style={styles.playerHead}>
                        <Text
                            allowFontScaling={false}
                            style={styles.playerTitle}
                            numberOfLines={2}
                        >
                            {clip ? `${clip.vehicle} — ${clip.clip}` : ""}
                        </Text>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <Text allowFontScaling={false} style={styles.playerClose}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.playerStage}>
                        {!!clip?.video && (
                            <WebView
                                key={clip.id}
                                ref={playerRef}
                                source={{ html, baseUrl: "https://localhost" }}
                                style={styles.playerVideo}
                                originWhitelist={["*"]}
                                javaScriptEnabled
                                domStorageEnabled
                                mediaPlaybackRequiresUserAction={false}
                                allowsInlineMediaPlayback
                                mixedContentMode="always"
                                androidLayerType="hardware"
                                setSupportMultipleWindows={false}
                                scrollEnabled={false}
                                allowsFullscreenVideo
                            />
                        )}
                    </View>
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={styles.ctrlBtn}
                            onPress={() => sendPlayer(playerRef, "play")}
                        >
                            <Image
                                source={PLAY}
                                style={styles.ctrlIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.ctrlBtn}
                            onPress={() => sendPlayer(playerRef, "pause")}
                        >
                            <Image
                                source={PAUSE}
                                style={styles.ctrlIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.ctrlBtn}
                            onPress={() => sendPlayer(playerRef, "stop")}
                        >
                            <Image
                                source={STOP}
                                style={styles.ctrlIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                    {clip && (
                        <Text allowFontScaling={false} style={styles.playerMeta}>
                            {clip.start} → {clip.end} · {clip.duration}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={styles.closePlayer}
                        onPress={onClose}
                        activeOpacity={0.85}
                    >
                        <Image
                            source={BACKTOLIVE}
                            style={styles.backToLiveIcon}
                            resizeMode="contain"
                        />
                        <Text allowFontScaling={false} style={styles.closePlayerTxt}>
                            Back to Live
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const VehicleTile = ({ vehicle, streaming, onToggleStream }) => {
    const html = useMemo(
        () => (vehicle.streamUrl ? streamHtml(vehicle.streamUrl) : ""),
        [vehicle.streamUrl]
    );
    const canStream = !!vehicle.streamUrl;

    return (
        <View style={styles.tile}>
            <TouchableOpacity
                style={styles.videoTap}
                activeOpacity={0.92}
                onPress={canStream ? onToggleStream : undefined}
                disabled={!canStream}
            >
                {streaming && canStream ? (
                    <WebView
                        key={`stream-${vehicle.id}`}
                        source={{ html, baseUrl: "https://localhost" }}
                        style={styles.video}
                        originWhitelist={["*"]}
                        javaScriptEnabled
                        domStorageEnabled
                        mediaPlaybackRequiresUserAction={false}
                        allowsInlineMediaPlayback
                        mixedContentMode="always"
                        androidLayerType="hardware"
                        setSupportMultipleWindows={false}
                        scrollEnabled={false}
                    />
                ) : (
                    <View style={styles.poster}>
                        <Image
                            source={VECHILES}
                            style={styles.posterIcon}
                            resizeMode="contain"
                        />
                        <Text allowFontScaling={false} style={styles.posterTxt}>
                            {canStream ? "Stream paused" : "No live stream"}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            <View style={styles.live}>
                <View style={styles.liveDot} />
                <Text allowFontScaling={false} style={styles.liveTxt}>
                    LIVE
                </Text>
            </View>
            {canStream && (
                <View style={styles.expand}>
                    <Text allowFontScaling={false} style={styles.expandHintTxt}>
                        ● TAPPING TO EXPAND
                    </Text>
                </View>
            )}
            <View style={styles.caption}>
                <View style={styles.captionTop}>
                    <Text allowFontScaling={false} style={styles.camId} numberOfLines={1}>
                        {vehicle.vehicleNumber}
                    </Text>
                    <View
                        style={[
                            styles.statusPill,
                            { backgroundColor: `${vehicle.statusColor || GREEN}22` },
                        ]}
                    >
                        <Text
                            allowFontScaling={false}
                            style={[
                                styles.statusPillTxt,
                                { color: vehicle.statusColor || GREEN },
                            ]}
                        >
                            {vehicle.statusLabel}
                        </Text>
                    </View>
                </View>
                <Text allowFontScaling={false} style={styles.camTime} numberOfLines={1}>
                    {vehicle.vehicleTypeLabel} · {vehicle.driverName} ·{" "}
                    {vehicle.zoneCode} · {vehicle.pingLabel}
                </Text>
            </View>
        </View>
    );
};

const StatChip = ({ label, value, color }) => (
    <View style={styles.statChip}>
        <View style={[styles.statDot, { backgroundColor: color }]} />
        <View>
            <Text allowFontScaling={false} style={styles.statLabel}>
                {label}
            </Text>
            <Text allowFontScaling={false} style={[styles.statValue, { color }]}>
                {value}
            </Text>
        </View>
    </View>
);

const Tab = ({ icon, label, active, onPress }) => (
    <TouchableOpacity
        style={[styles.tab, active && styles.tabOn]}
        activeOpacity={0.85}
        onPress={onPress}
    >
        <Image
            source={icon}
            style={[styles.tabIcon, active && styles.tabIconOn]}
            resizeMode="contain"
        />
        <Text
            allowFontScaling={false}
            style={[styles.tabTxt, active && styles.tabTxtOn]}
            numberOfLines={1}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F4F7FB" },
    tabs: {
        flexDirection: "row",
        marginHorizontal: 12,
        marginTop: 8,
        backgroundColor: WHITE,
        borderRadius: 12,
        padding: 3,
        borderWidth: 1,
        borderColor: "#EEF2F7",
    },
    tab: {
        flex: 1,
        height: 32,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    tabOn: { backgroundColor: NAVY },
    tabIcon: { width: 12, height: 12, marginRight: 4, tintColor: NAVY },
    tabIconOn: { tintColor: WHITE },
    tabTxt: { color: NAVY, fontSize: 11, fontWeight: "700" },
    tabTxtOn: { color: WHITE },
    content: { paddingBottom: 18 },
    flex: { flex: 1 },
    loadingWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    loadingTxt: { color: GREY, fontSize: 12 },
    statsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 12,
        marginTop: 8,
        gap: 8,
    },
    statChip: {
        width: "47.5%",
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        backgroundColor: WHITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#EEF2F7",
    },
    statDot: { width: 8, height: 8, borderRadius: 4 },
    statLabel: { color: GREY, fontSize: 9, fontWeight: "700" },
    statValue: { color: NAVY, fontSize: 16, fontWeight: "800", marginTop: 1 },
    stack: {
        paddingHorizontal: 12,
        marginTop: 8,
    },
    tile: {
        width: "100%",
        height: FEED_H,
        marginBottom: 10,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: NAVY,
    },
    videoTap: { width: "100%", height: "100%" },
    video: { width: "100%", height: "100%", backgroundColor: NAVY },
    poster: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0F2744",
    },
    posterIcon: { width: 28, height: 28, tintColor: "rgba(255,255,255,0.7)" },
    posterTxt: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 11,
        fontWeight: "600",
        marginTop: 8,
    },
    live: {
        position: "absolute",
        top: 6,
        left: 6,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(15,23,42,0.55)",
        borderRadius: 8,
        paddingHorizontal: 5,
        height: 16,
    },
    liveDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: RED,
        marginRight: 3,
    },
    liveTxt: { color: WHITE, fontSize: 8, fontWeight: "800" },
    expandHintTxt: {
        color: WHITE,
        fontSize: 8,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
    expand: {
        position: "absolute",
        bottom: 44,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.62)",
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    expandIcon: { width: 10, height: 10 },
    caption: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: "rgba(15,23,42,0.55)",
    },
    captionTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    camId: { flex: 1, color: WHITE, fontSize: 11, fontWeight: "700" },
    camTime: { color: "rgba(255,255,255,0.85)", fontSize: 9, marginTop: 2 },
    statusPill: {
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    statusPillTxt: { fontSize: 9, fontWeight: "800" },
    card: {
        marginHorizontal: 12,
        marginTop: 6,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 10,
    },
    cardHead: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    headIcon: { width: 14, height: 14, marginRight: 6, tintColor: "#2563EB" },
    cardTitle: { color: NAVY, fontSize: 13, fontWeight: "700" },
    cardSub: { color: GREY, fontSize: 10, marginTop: 1 },
    mapBox: { height: 168, marginTop: 8, borderRadius: 12, overflow: "hidden" },
    map: { flex: 1, backgroundColor: "#E7EEF4" },
    legend: {
        position: "absolute",
        right: 8,
        bottom: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderRadius: 10,
        paddingHorizontal: 8,
        height: 22,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: GREEN,
        marginRight: 4,
    },
    legendTxt: { color: NAVY, fontSize: 10, fontWeight: "600" },
    emptyCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 16,
        marginBottom: 8,
        alignItems: "center",
    },
    emptyTitle: { color: NAVY, fontSize: 13, fontWeight: "700" },
    emptySub: { color: GREY, fontSize: 11, marginTop: 4, textAlign: "center" },
    emptyInline: { color: GREY, fontSize: 11, marginTop: 10 },
    alert: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    flag: {
        width: 22,
        height: 22,
        borderRadius: 6,
        backgroundColor: "#FDECEC",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    flagIcon: { width: 11, height: 11, tintColor: RED },
    alertBody: { flex: 1 },
    alertTitle: { color: NAVY, fontSize: 12, fontWeight: "700" },
    alertPlace: { color: GREY, fontSize: 10, marginTop: 1 },
    alertMeta: { alignItems: "flex-end", marginLeft: 6, maxWidth: 110 },
    alertTime: { color: GREY, fontSize: 10 },
    tag: {
        marginTop: 3,
        backgroundColor: "#FFF1F2",
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    tagTxt: { color: RED, fontSize: 9, fontWeight: "700" },
    tagOk: { backgroundColor: "#ECFDF5" },
    tagOkTxt: { color: "#047857" },
    ackBtn: {
        marginTop: 4,
        backgroundColor: NAVY,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    ackTxt: { color: WHITE, fontSize: 9, fontWeight: "700" },
    clipList: { paddingHorizontal: 12, paddingBottom: 24 },
    footageTitle: { color: NAVY, fontSize: 15, fontWeight: "800", marginTop: 12 },
    footageSub: { color: GREY, fontSize: 11, marginTop: 2, marginBottom: 8 },
    vehicleBtn: {
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: WHITE,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        marginBottom: 8,
    },
    smallIcon: { width: 14, height: 14, marginRight: 6 },
    vehicleTxt: { color: NAVY, fontSize: 12, fontWeight: "600" },
    caret: { color: GREY, marginLeft: 8, fontSize: 11 },
    vehicleMenu: {
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 8,
    },
    vehicleItem: { paddingHorizontal: 12, paddingVertical: 8 },
    vehicleItemTxt: { color: NAVY, fontSize: 12 },
    clipCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#EEF2F7",
        padding: 12,
        marginBottom: 8,
    },
    clipTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    clipVehicle: { color: NAVY, fontSize: 13, fontWeight: "800" },
    duration: {
        backgroundColor: "#E8F1FF",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    durationTxt: { color: "#1D4ED8", fontSize: 11, fontWeight: "700" },
    clipName: { color: NAVY, fontSize: 13, fontWeight: "600", marginTop: 4 },
    clipRange: { color: GREY, fontSize: 11, marginTop: 3 },
    clipActions: { flexDirection: "row", alignItems: "center", marginTop: 10 },
    playBtn: {
        marginTop: 8,
        alignSelf: "flex-end",
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 32,
        backgroundColor: WHITE,
    },
    playTxt: { color: NAVY, fontSize: 12, fontWeight: "700" },
    ctrlIcon: { width: 14, height: 14, marginRight: 4 },
    modalRoot: {
        width: SCREEN.width,
        height: SCREEN.height,
        backgroundColor: "rgba(15,23,42,0.45)",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    playerCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 14,
    },
    playerHead: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    playerTitle: {
        flex: 1,
        color: NAVY,
        fontSize: 15,
        fontWeight: "800",
        marginRight: 8,
    },
    playerClose: { color: GREY, fontSize: 24, lineHeight: 24 },
    playerVideo: { width: "100%", height: "100%", backgroundColor: "#111" },
    playerStage: {
        height: Math.max(240, Math.round(SCREEN.width * (9 / 16))),
        borderRadius: 12,
        backgroundColor: "#111",
        overflow: "hidden",
    },
    controls: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
    ctrlBtn: {
        width: 40,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 6,
        backgroundColor: WHITE,
    },
    playerMeta: { color: GREY, fontSize: 12, marginTop: 10 },
    closePlayer: {
        alignSelf: "stretch",
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: WHITE,
    },
    backToLiveIcon: { width: 18, height: 18, tintColor: NAVY },
    closePlayerTxt: { color: NAVY, fontSize: 12, fontWeight: "700" },
});
