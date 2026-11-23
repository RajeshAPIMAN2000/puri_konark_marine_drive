import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { WebView } from "react-native-webview";
import StaticCrmMap from "../../../components/map/StaticCrmMap";
import { MyAlert } from "../../../components/commonComponents/MyAlert";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import {
    BLUE,
    GREEN,
    GREY,
    LIGHTGREY,
    NAVY,
    ORANGE,
    RED,
    WHITE, BUTTON} from "../../../constant/color";
import { BACKTOLIVE, PLAY, SWITCHOFF, VECHILES } from "../../../constant/imagePath";
import {
    VEHICLE_STATUS_OPTIONS,
    VEHICLE_TYPE_OPTIONS,
    acknowledgeFleetAlert,
    createRecording,
    createVehicle,
    deleteRecording,
    deleteVehicle,
    fetchFleetAlerts,
    fetchRecordings,
    fetchVehicles,
    formatDateTime,
    isValidIndianMobile,
    isValidUrl,
    summarizeVehicles,
    switchOffVehicle,
    toErrorText,
    updateVehicle,
} from "../../../services/fleet/FleetService";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const H_PAD = 12;
const GAP = 8;
const FEED_WIDTH = SCREEN_W - H_PAD * 2;
/** Full-width 16:9 stage so streams render at readable screen size */
const FEED_HEIGHT = Math.max(220, Math.round(FEED_WIDTH * (9 / 16)));
const FULL_VIDEO_H = Math.min(Math.round(SCREEN_H * 0.55), Math.round(SCREEN_W * (9 / 16)));
const ALL_VEHICLES = "all";

const getRecordingPlayerHtml = (url) => {
    const src = String(url || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;background:#111;overflow:hidden}
.stage{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111}
video{width:100%;height:100%;object-fit:contain;background:#111;display:block}
</style></head><body>
<div class="stage">
<video id="v" controls autoplay playsinline webkit-playsinline preload="auto">
  <source src="${src}" />
</video>
</div>
<script>
  var v = document.getElementById('v');
  var start = function(){ if(!v) return; var p = v.play(); if (p && p.catch) p.catch(function(){}); };
  if (v) { v.addEventListener('loadeddata', start); v.addEventListener('canplay', start); start(); }
</script>
</body></html>`;
};

const RecordingCard = ({ item, onPlay, onDelete }) => (
    <View style={styles.clipCard}>
        <View style={styles.clipTop}>
            <View style={styles.clipVehicleRow}>
                <View style={styles.clipVehicleIcon}>
                    <Image source={VECHILES} style={styles.clipVehicleImg} resizeMode="contain" />
                </View>
                <Text allowFontScaling={false} style={styles.clipVehicle} numberOfLines={1}>
                    {item.vehicleNumber}
                </Text>
            </View>
            <View style={styles.durationPill}>
                <Text allowFontScaling={false} style={styles.durationPillTxt}>
                    {item.duration || "—"}
                </Text>
            </View>
        </View>
        <Text allowFontScaling={false} style={styles.clipName} numberOfLines={2}>
            {item.note || `${item.vehicleType} · ${item.zoneCode}`}
        </Text>
        <Text allowFontScaling={false} style={styles.clipRange} numberOfLines={2}>
            {item.startLabel} → {item.endLabel}
        </Text>
        <View style={styles.clipActions}>
            <TouchableOpacity
                style={[styles.playBtn, !item.videoUrl && styles.playBtnDisabled]}
                activeOpacity={0.85}
                disabled={!item.videoUrl}
                onPress={() => onPlay?.(item)}
            >
                <Image source={PLAY} style={styles.playIcon} resizeMode="contain" />
                <Text allowFontScaling={false} style={styles.playTxt}>
                    {item.videoUrl ? "Play" : "No video"}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.clipDelBtn}
                activeOpacity={0.85}
                onPress={() => onDelete?.(item)}
            >
                <Text allowFontScaling={false} style={styles.clipDelTxt}>
                    Delete
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
                    <Text allowFontScaling={false} style={styles.playerTitle} numberOfLines={2}>
                        {clip
                            ? `${clip.vehicleNumber} — ${
                                  clip.note || clip.vehicleType || "Recording"
                              }`
                            : ""}
                    </Text>
                    <TouchableOpacity onPress={onBackToLive} hitSlop={10}>
                        <Text allowFontScaling={false} style={styles.playerClose}>
                            ×
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.playerStage, { height: FULL_VIDEO_H }]}>
                    {clip?.videoUrl ? (
                        <WebView
                            key={`rec-${clip.id}`}
                            source={{
                                html: getRecordingPlayerHtml(clip.videoUrl),
                                baseUrl: "https://localhost",
                            }}
                            style={styles.playerVideo}
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
                <Text allowFontScaling={false} style={styles.playerMeta} numberOfLines={2}>
                    ◷ {clip?.startLabel || "—"} → {clip?.endLabel || "—"} ·{" "}
                    {clip?.duration || "—"}
                </Text>
                <TouchableOpacity
                    style={styles.backToLiveBtn}
                    activeOpacity={0.85}
                    onPress={onBackToLive}
                >
                    <Image
                        source={BACKTOLIVE}
                        style={styles.backToLiveIcon}
                        resizeMode="contain"
                    />
                    <Text allowFontScaling={false} style={styles.backToLiveTxt}>
                        Back to Live
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const emptyVehicleForm = () => ({
    vehicleNumber: "",
    vehicleType: VEHICLE_TYPE_OPTIONS[0]?.key || "patrol_van",
    driverName: "",
    driverMobile: "",
    zoneCode: "",
    streamUrl: "",
    notes: "",
    status: "active",
});

const emptyRecordingForm = () => ({
    vehicleId: "",
    videoUrl: "",
    startTime: "",
    endTime: "",
    note: "",
});

const getStreamHtml = (url, { contain = true } = {}) => {
    const src = String(url || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;");
    const fit = contain ? "contain" : "cover";
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background: #0B1F3A; overflow: hidden;
    }
    .stage {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: #0B1F3A;
    }
    video {
      width: 100%; height: 100%;
      max-width: 100%; max-height: 100%;
      object-fit: ${fit};
      background: #0B1F3A;
      display: block;
    }
  </style>
</head>
<body>
  <div class="stage">
    <video autoplay muted loop playsinline webkit-playsinline preload="auto">
      <source src="${src}" />
    </video>
  </div>
  <script>
    var v = document.querySelector('video');
    var start = function () {
      if (!v) return;
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (v) {
      v.addEventListener('loadeddata', start);
      v.addEventListener('canplay', start);
      start();
    }
  </script>
</body>
</html>`;
};

const StreamPlayer = ({ url, style, playerKey }) => {
    if (!url) return null;
    return (
        <WebView
            key={playerKey || url}
            originWhitelist={["*"]}
            source={{ html: getStreamHtml(url), baseUrl: "https://localhost" }}
            style={[styles.feedVideo, style]}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mixedContentMode="always"
            androidLayerType="hardware"
            setSupportMultipleWindows={false}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            bounces={false}
            overScrollMode="never"
        />
    );
};

const CamIcon = ({ color = NAVY, size = 14 }) => (
    <View style={[styles.camIcon, { width: size + 4, height: size + 2 }]}>
        <View
            style={[
                styles.camBody,
                { borderColor: color, width: size, height: size * 0.7 },
            ]}
        />
        <View
            style={[
                styles.camLens,
                {
                    borderColor: color,
                    width: size * 0.35,
                    height: size * 0.35,
                    borderRadius: size * 0.2,
                },
            ]}
        />
    </View>
);

const ExpandIcon = () => (
    <View style={styles.expandIcon}>
        <View style={[styles.expandCorner, styles.expandTL]} />
        <View style={[styles.expandCorner, styles.expandTR]} />
        <View style={[styles.expandCorner, styles.expandBL]} />
        <View style={[styles.expandCorner, styles.expandBR]} />
    </View>
);

const PinIcon = () => (
    <View style={styles.pinWrap}>
        <View style={styles.pinHead} />
        <View style={styles.pinTip} />
    </View>
);

const OptionChips = ({ options, value, onChange }) => (
    <View style={styles.chipRow}>
        {options.map((opt) => {
            const active = value === opt.key;
            return (
                <TouchableOpacity
                    key={opt.key}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => onChange(opt.key)}
                >
                    <Text
                        allowFontScaling={false}
                        style={[styles.chipTxt, active && styles.chipTxtActive]}
                    >
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const callDriver = (mobile) => {
    const clean = String(mobile || "").replace(/[^\d+]/g, "");
    if (clean && clean !== "--" && clean !== "—") {
        Linking.openURL(`tel:${clean}`);
    }
};

const LiveVehicleCard = ({
    vehicle,
    playing,
    switchingOff,
    onExpand,
    onSwitchOff,
    onEdit,
    onDelete,
}) => {
    const hasStream = !!String(vehicle.streamUrl || "").trim();
    const statusKey = String(vehicle.status || "").toLowerCase();
    const statusLabel = String(vehicle.statusLabel || vehicle.status || "Active").toUpperCase();
    const zone =
        vehicle.zoneCode && vehicle.zoneCode !== "—"
            ? `Zone ${String(vehicle.zoneCode).replace(/^zone\s*/i, "")}`
            : "—";
    const meta = [
        vehicle.vehicleTypeLabel || "Vehicle",
        vehicle.driverName || "—",
        zone,
        vehicle.pingLabel || "—",
    ].join(" · ");

    return (
        <View style={styles.liveCard}>
            <TouchableOpacity
                style={[styles.liveVideo, { height: FEED_HEIGHT }]}
                activeOpacity={0.95}
                onPress={() => {
                    if (hasStream) onExpand?.(vehicle);
                }}
                disabled={!hasStream}
            >
                {playing && hasStream ? (
                    <StreamPlayer
                        url={vehicle.streamUrl}
                        playerKey={`feed-${vehicle.id}`}
                    />
                ) : (
                    <View style={styles.feedPoster}>
                        <CamIcon color={WHITE} size={28} />
                        <Text allowFontScaling={false} style={styles.feedPosterTxt}>
                            {hasStream ? "Stream paused" : "No stream URL"}
                        </Text>
                    </View>
                )}
                <View style={styles.liveBadge} pointerEvents="none">
                    <View style={styles.liveDot} />
                    <Text allowFontScaling={false} style={styles.liveTxt}>
                        LIVE
                    </Text>
                </View>
                {hasStream ? (
                    <View style={styles.expandHint} pointerEvents="none">
                        <Text allowFontScaling={false} style={styles.expandHintTxt}>
                            ● TAPPING TO EXPAND
                        </Text>
                    </View>
                ) : null}
            </TouchableOpacity>

            <View style={styles.liveInfo}>
                <View style={styles.vehicleIconWrap}>
                    <Image
                        source={VECHILES}
                        style={styles.vehicleIconImg}
                        resizeMode="contain"
                    />
                </View>
                <View style={styles.liveInfoCopy}>
                    <View style={styles.liveTitleRow}>
                        <Text
                            allowFontScaling={false}
                            style={styles.vehiclePlate}
                            numberOfLines={1}
                        >
                            {vehicle.vehicleNumber}
                        </Text>
                        <View
                            style={[
                                styles.statusPill,
                                statusKey === "active" && styles.statusPillActive,
                                statusKey === "idle" && styles.statusPillIdle,
                                statusKey === "offline" && styles.statusPillOffline,
                            ]}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.statusPillTxt,
                                    statusKey === "active" && styles.statusPillTxtActive,
                                    statusKey === "idle" && styles.statusPillTxtIdle,
                                    statusKey === "offline" && styles.statusPillTxtOffline,
                                ]}
                            >
                                {statusLabel}
                            </Text>
                        </View>
                    </View>
                    <Text allowFontScaling={false} style={styles.liveMeta} numberOfLines={1}>
                        {meta}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.iconBtn}
                    activeOpacity={0.85}
                    onPress={() => callDriver(vehicle.driverMobile)}
                >
                    <Text allowFontScaling={false} style={styles.iconBtnGlyph}>
                        ☎
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.iconBtn,
                        (switchingOff || statusKey === "offline") && styles.iconBtnDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={switchingOff || statusKey === "offline"}
                    onPress={() => onSwitchOff?.(vehicle)}
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

            <View style={styles.adminActions}>
                <TouchableOpacity style={styles.miniBtn} activeOpacity={0.85} onPress={onEdit}>
                    <Text allowFontScaling={false} style={styles.miniBtnTxt}>
                        Edit
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.miniBtn, styles.miniBtnDanger]}
                    activeOpacity={0.85}
                    onPress={onDelete}
                >
                    <Text
                        allowFontScaling={false}
                        style={[styles.miniBtnTxt, styles.miniBtnDangerTxt]}
                    >
                        Delete
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const FormModal = ({
    visible,
    title,
    onClose,
    onSubmit,
    submitting,
    children,
}) => (
    <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
    >
        <Pressable style={styles.modalRoot} onPress={onClose}>
            <Pressable style={styles.formCard} onPress={() => {}}>
                <View style={styles.formHeader}>
                    <Text allowFontScaling={false} style={styles.formTitle}>
                        {title}
                    </Text>
                    <TouchableOpacity onPress={onClose} hitSlop={10}>
                        <Text allowFontScaling={false} style={styles.formClose}>
                            ×
                        </Text>
                    </TouchableOpacity>
                </View>
                <ScrollView
                    style={styles.formScroll}
                    contentContainerStyle={styles.formBody}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
                <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    activeOpacity={0.85}
                    disabled={submitting}
                    onPress={onSubmit}
                >
                    {submitting ? (
                        <ActivityIndicator color={WHITE} size="small" />
                    ) : (
                        <Text allowFontScaling={false} style={styles.submitTxt}>
                            Save
                        </Text>
                    )}
                </TouchableOpacity>
            </Pressable>
        </Pressable>
    </Modal>
);

const Field = ({ label, value, onChangeText, placeholder, multiline, keyboardType }) => (
    <View style={styles.fieldWrap}>
        <Text allowFontScaling={false} style={styles.fieldLabel}>
            {label}
        </Text>
        <TextInput
            allowFontScaling={false}
            style={[styles.fieldInput, multiline && styles.fieldMultiline]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9AA7B8"
            multiline={multiline}
            keyboardType={keyboardType}
            autoCapitalize="none"
        />
    </View>
);

const CameraScreen = () => {
    const [vehicles, setVehicles] = useState([]);
    const [corridor, setCorridor] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState("live");
    const [vehicleFilter, setVehicleFilter] = useState(ALL_VEHICLES);
    const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
    const [playingClip, setPlayingClip] = useState(null);
    const [pausedIds, setPausedIds] = useState({});
    const [switchingOffId, setSwitchingOffId] = useState(null);
    const [fullscreenVehicle, setFullscreenVehicle] = useState(null);
    const [saving, setSaving] = useState(false);

    const [vehicleModal, setVehicleModal] = useState({
        open: false,
        mode: "add",
        id: null,
    });
    const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm());
    const [recordingModal, setRecordingModal] = useState(false);
    const [recordingForm, setRecordingForm] = useState(emptyRecordingForm());

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toastMessage, setToastMessage] = useState({
        visible: false,
        msg: "",
        type: "",
    });

    const summary = useMemo(() => summarizeVehicles(vehicles), [vehicles]);

    const statusCards = useMemo(
        () => [
            {
                key: "active",
                label: "Active",
                value: String(summary.active),
                color: GREEN,
                iconBg: "#E8F8EE",
            },
            {
                key: "idle",
                label: "Idle",
                value: String(summary.idle),
                color: ORANGE,
                iconBg: "#FFF4E5",
            },
            {
                key: "offline",
                label: "Offline",
                value: String(summary.offline),
                color: GREY,
                iconBg: "#EEF1F5",
            },
            {
                key: "total",
                label: "Total Fleet",
                value: String(summary.total),
                color: NAVY,
                iconBg: "#EAF1FB",
            },
        ],
        [summary]
    );

    // Fleet map: vehicle icons only for units that have GPS (lat/lng). No letter/corridor pins.
    const mapMarkers = useMemo(
        () =>
            vehicles
                .filter(
                    (v) =>
                        Number.isFinite(v.latitude) && Number.isFinite(v.longitude)
                )
                .map((v) => ({
                    id: `v-${v.id}`,
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
        const match = vehicles.find((v) => String(v.id) === String(vehicleFilter));
        return match?.vehicleNumber || "All vehicles";
    }, [vehicleFilter, vehicles]);

    const showToast = useCallback((msg, type = "success") => {
        setToastMessage({
            visible: true,
            msg: toErrorText(msg, type === "error" ? "Something went wrong" : "Done"),
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
                    fetchRecordings({ page: 1, limit: 30 }),
                    fetchFleetAlerts({ page: 1, limit: 30 }),
                ]);

                if (!vehRes.ok) {
                    showToast(
                        toErrorText(vehRes.result, "Failed to load vehicles"),
                        "error"
                    );
                }
                if (!recRes.ok) {
                    showToast(
                        toErrorText(recRes.result, "Failed to load recordings"),
                        "error"
                    );
                }
                if (!alertRes.ok) {
                    showToast(
                        toErrorText(alertRes.result, "Failed to load alerts"),
                        "error"
                    );
                }

                setVehicles(vehRes.data || []);
                setCorridor(vehRes.corridor || []);
                setRecordings(recRes.data || []);
                setAlerts(alertRes.data || []);
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load fleet"), "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [showToast]
    );

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
                loadAll({ soft: true });
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to switch off"), "error");
            } finally {
                setSwitchingOffId(null);
            }
        },
        [showToast, loadAll]
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

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openAddVehicle = () => {
        setVehicleForm(emptyVehicleForm());
        setVehicleModal({ open: true, mode: "add", id: null });
    };

    const openEditVehicle = (vehicle) => {
        setVehicleForm({
            vehicleNumber: vehicle.vehicleNumber === "—" ? "" : vehicle.vehicleNumber,
            vehicleType: vehicle.vehicleType || VEHICLE_TYPE_OPTIONS[0]?.key,
            driverName: vehicle.driverName === "—" ? "" : vehicle.driverName,
            driverMobile: vehicle.driverMobile === "—" ? "" : vehicle.driverMobile,
            zoneCode: vehicle.zoneCode === "—" ? "" : vehicle.zoneCode,
            streamUrl: vehicle.streamUrl || "",
            notes: vehicle.notes || "",
            status: vehicle.status || "active",
        });
        setVehicleModal({ open: true, mode: "edit", id: vehicle.id });
    };

    const closeVehicleModal = () => {
        if (saving) return;
        setVehicleModal({ open: false, mode: "add", id: null });
    };

    const validateVehicleForm = () => {
        const number = String(vehicleForm.vehicleNumber || "").trim();
        const driver = String(vehicleForm.driverName || "").trim();
        const mobile = String(vehicleForm.driverMobile || "").trim();
        const zone = String(vehicleForm.zoneCode || "").trim();
        if (!number) {
            showToast("Vehicle number is required", "error");
            return false;
        }
        if (!driver) {
            showToast("Driver name is required", "error");
            return false;
        }
        if (!isValidIndianMobile(mobile)) {
            showToast("Enter a valid 10-digit Indian mobile", "error");
            return false;
        }
        if (!zone) {
            showToast("Zone code is required", "error");
            return false;
        }
        if (!isValidUrl(vehicleForm.streamUrl)) {
            showToast("Stream URL is invalid", "error");
            return false;
        }
        return true;
    };

    const submitVehicle = async () => {
        if (!validateVehicleForm()) return;
        setSaving(true);
        try {
            const payload = {
                vehicleNumber: String(vehicleForm.vehicleNumber).trim(),
                vehicleType: vehicleForm.vehicleType,
                driverName: String(vehicleForm.driverName).trim(),
                driverMobile: String(vehicleForm.driverMobile).trim(),
                zoneCode: String(vehicleForm.zoneCode).trim(),
            };
            const stream = String(vehicleForm.streamUrl || "").trim();
            const notes = String(vehicleForm.notes || "").trim();
            if (stream) payload.streamUrl = stream;
            if (notes) payload.notes = notes;

            if (vehicleModal.mode === "edit") {
                payload.status = vehicleForm.status;
                const res = await updateVehicle(vehicleModal.id, payload);
                if (!res.ok) {
                    showToast(
                        toErrorText(res.message || res.result, "Failed to update vehicle"),
                        "error"
                    );
                    return;
                }
                showToast("Vehicle updated", "success");
            } else {
                const res = await createVehicle(payload);
                if (!res.ok) {
                    showToast(
                        toErrorText(res.message || res.result, "Failed to add vehicle"),
                        "error"
                    );
                    return;
                }
                showToast("Vehicle added", "success");
            }
            setVehicleModal({ open: false, mode: "add", id: null });
            await loadAll({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to save vehicle"), "error");
        } finally {
            setSaving(false);
        }
    };

    const openAddRecording = () => {
        setRecordingForm({
            ...emptyRecordingForm(),
            vehicleId: vehicles[0]?.id ? String(vehicles[0].id) : "",
        });
        setRecordingModal(true);
    };

    const validateRecordingForm = () => {
        if (!recordingForm.vehicleId) {
            showToast("Select a vehicle", "error");
            return false;
        }
        const url = String(recordingForm.videoUrl || "").trim();
        if (!url || !isValidUrl(url)) {
            showToast("Enter a valid video URL", "error");
            return false;
        }
        const start = String(recordingForm.startTime || "").trim();
        const end = String(recordingForm.endTime || "").trim();
        if (!start || Number.isNaN(Date.parse(start))) {
            showToast("Start time must be a valid ISO datetime", "error");
            return false;
        }
        if (!end || Number.isNaN(Date.parse(end))) {
            showToast("End time must be a valid ISO datetime", "error");
            return false;
        }
        if (Date.parse(end) <= Date.parse(start)) {
            showToast("End time must be after start time", "error");
            return false;
        }
        return true;
    };

    const submitRecording = async () => {
        if (!validateRecordingForm()) return;
        setSaving(true);
        try {
            const payload = {
                vehicleId: recordingForm.vehicleId,
                videoUrl: String(recordingForm.videoUrl).trim(),
                startTime: new Date(recordingForm.startTime).toISOString(),
                endTime: new Date(recordingForm.endTime).toISOString(),
            };
            const note = String(recordingForm.note || "").trim();
            if (note) payload.note = note;

            const res = await createRecording(payload);
            if (!res.ok) {
                showToast(
                    toErrorText(res.message || res.result, "Failed to add recording"),
                    "error"
                );
                return;
            }
            showToast("Recording added", "success");
            setRecordingModal(false);
            await loadAll({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to add recording"), "error");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        setSaving(true);
        try {
            if (target.kind === "vehicle") {
                const res = await deleteVehicle(target.id);
                if (!res.ok) {
                    showToast(
                        toErrorText(res.message || res.result, "Failed to delete vehicle"),
                        "error"
                    );
                    return;
                }
                setPausedIds((prev) => {
                    const next = { ...prev };
                    delete next[String(target.id)];
                    return next;
                });
                showToast("Vehicle deleted", "success");
            } else if (target.kind === "recording") {
                const res = await deleteRecording(target.id);
                if (!res.ok) {
                    showToast(
                        toErrorText(res.message || res.result, "Failed to delete recording"),
                        "error"
                    );
                    return;
                }
                showToast("Recording deleted", "success");
            }
            await loadAll({ soft: true });
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Delete failed"), "error");
        } finally {
            setSaving(false);
        }
    };

    const onAcknowledge = async (alertItem) => {
        if (!alertItem?.id || alertItem.acknowledged) return;
        try {
            const res = await acknowledgeFleetAlert(alertItem.id);
            if (!res.ok) {
                showToast(
                    toErrorText(res.message || res.result, "Failed to acknowledge alert"),
                    "error"
                );
                return;
            }
            setAlerts((prev) =>
                prev.map((a) =>
                    String(a.id) === String(alertItem.id)
                        ? { ...a, acknowledged: true }
                        : a
                )
            );
            showToast("Alert acknowledged", "success");
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to acknowledge"), "error");
        }
    };

    const deleteAlertTitle =
        deleteTarget?.kind === "recording" ? "Delete Recording" : "Delete Vehicle";
    const deleteAlertMessage =
        deleteTarget?.kind === "recording"
            ? `Delete recording for ${deleteTarget?.label || "this vehicle"}?`
            : `Delete vehicle ${deleteTarget?.label || ""}? This cannot be undone.`;

    return (
        <View style={styles.root}>
            <MyHeader
                title="Live Fleet & Camera Monitoring"
                subtitle=""
                height={52}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="center"
            />

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, tab === "live" && styles.tabOn]}
                    activeOpacity={0.85}
                    onPress={() => setTab("live")}
                >
                    <Text
                        allowFontScaling={false}
                        style={[styles.tabTxt, tab === "live" && styles.tabTxtOn]}
                    >
                        Live Monitoring
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === "recordings" && styles.tabOn]}
                    activeOpacity={0.85}
                    onPress={() => setTab("recordings")}
                >
                    <Text
                        allowFontScaling={false}
                        style={[styles.tabTxt, tab === "recordings" && styles.tabTxtOn]}
                    >
                        Recordings
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator color={NAVY} size="large" />
                    <Text allowFontScaling={false} style={styles.loadingTxt}>
                        Loading fleet…
                    </Text>
                </View>
            ) : tab === "live" ? (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadAll({ soft: true })}
                            tintColor={NAVY}
                            colors={[NAVY]}
                        />
                    }
                >
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statusRow}
                    >
                        {statusCards.map((s) => (
                            <View key={s.key} style={styles.statusCard}>
                                <View
                                    style={[
                                        styles.statusIconWrap,
                                        { backgroundColor: s.iconBg },
                                    ]}
                                >
                                    <CamIcon color={s.color} size={12} />
                                </View>
                                <View>
                                    <Text allowFontScaling={false} style={styles.statusValue}>
                                        {s.value}
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.statusLabel}>
                                        {s.label}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.addVehicleBtn}
                        activeOpacity={0.85}
                        onPress={openAddVehicle}
                    >
                        <Text allowFontScaling={false} style={styles.addVehicleBtnTxt}>
                            + Add Vehicle
                        </Text>
                    </TouchableOpacity>

                    {vehicles.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text allowFontScaling={false} style={styles.emptyTitle}>
                                No vehicles yet
                            </Text>
                            <Text allowFontScaling={false} style={styles.emptySub}>
                                Add a vehicle to start live fleet monitoring.
                            </Text>
                        </View>
                    ) : (
                        vehicles.map((vehicle) => {
                            const id = String(vehicle.id);
                            const hasStream = !!String(vehicle.streamUrl || "").trim();
                            const playing = hasStream && !pausedIds[id];
                            return (
                                <LiveVehicleCard
                                    key={id}
                                    vehicle={vehicle}
                                    playing={playing}
                                    switchingOff={switchingOffId === id}
                                    onExpand={(v) => setFullscreenVehicle(v)}
                                    onSwitchOff={onSwitchOff}
                                    onEdit={() => openEditVehicle(vehicle)}
                                    onDelete={() =>
                                        setDeleteTarget({
                                            kind: "vehicle",
                                            id: vehicle.id,
                                            label: vehicle.vehicleNumber,
                                        })
                                    }
                                />
                            );
                        })
                    )}

                    <View style={styles.mapPane}>
                        <Text allowFontScaling={false} style={styles.paneTitle}>
                            Fleet Map
                        </Text>
                        <View style={styles.mapBox}>
                            <StaticCrmMap
                                style={styles.map}
                                markers={mapMarkers}
                                showZoom
                            />
                        </View>
                    </View>

                    <View style={styles.listPane}>
                        <View style={styles.listHeader}>
                            <Text allowFontScaling={false} style={styles.paneTitle}>
                                Fleet Alerts
                            </Text>
                            <Text allowFontScaling={false} style={styles.listSub}>
                                {alerts.filter((a) => !a.acknowledged).length} open ·{" "}
                                {alerts.length} total
                            </Text>
                        </View>
                        {alerts.length === 0 ? (
                            <Text allowFontScaling={false} style={styles.emptyInline}>
                                No alerts
                            </Text>
                        ) : (
                            alerts.map((item) => (
                                <View key={String(item.id)} style={styles.alertRow}>
                                    <View style={styles.alertInfo}>
                                        <Text
                                            allowFontScaling={false}
                                            style={styles.alertMsg}
                                            numberOfLines={2}
                                        >
                                            {toErrorText(item.message, "Fleet alert")}
                                        </Text>
                                        <Text allowFontScaling={false} style={styles.alertMeta}>
                                            {toErrorText(item.vehicleNumber, "—")} ·{" "}
                                            {toErrorText(item.type, "alert")} ·{" "}
                                            {toErrorText(item.createdLabel, "—")}
                                        </Text>
                                    </View>
                                    {item.acknowledged ? (
                                        <View style={styles.ackPill}>
                                            <Text
                                                allowFontScaling={false}
                                                style={styles.ackPillTxt}
                                            >
                                                Done
                                            </Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.ackBtn}
                                            activeOpacity={0.85}
                                            onPress={() => onAcknowledge(item)}
                                        >
                                            <Text
                                                allowFontScaling={false}
                                                style={styles.ackBtnTxt}
                                            >
                                                Acknowledge
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    style={styles.scroll}
                    data={filteredRecordings}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.clipList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadAll({ soft: true })}
                            tintColor={NAVY}
                            colors={[NAVY]}
                        />
                    }
                    ListHeaderComponent={
                        <View style={styles.recHeader}>
                            <View style={styles.recHeaderTop}>
                                <View style={{ flex: 1 }}>
                                    <Text allowFontScaling={false} style={styles.footageTitle}>
                                        Recorded Footage
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.footageSub}>
                                        Past clips from on-board cameras
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addClipBtn}
                                    activeOpacity={0.85}
                                    onPress={openAddRecording}
                                >
                                    <Text allowFontScaling={false} style={styles.addClipBtnTxt}>
                                        + Add Recordings
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.vehicleFilterBtn}
                                activeOpacity={0.85}
                                onPress={() => setVehicleMenuOpen((v) => !v)}
                            >
                                <Image
                                    source={VECHILES}
                                    style={styles.vehicleFilterIcon}
                                    resizeMode="contain"
                                />
                                <Text
                                    allowFontScaling={false}
                                    style={styles.vehicleFilterTxt}
                                    numberOfLines={1}
                                >
                                    {filterLabel}
                                </Text>
                                <Text allowFontScaling={false} style={styles.caret}>
                                    ▾
                                </Text>
                            </TouchableOpacity>
                            {vehicleMenuOpen ? (
                                <View style={styles.vehicleMenu}>
                                    <TouchableOpacity
                                        style={styles.vehicleItem}
                                        onPress={() => {
                                            setVehicleFilter(ALL_VEHICLES);
                                            setVehicleMenuOpen(false);
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
                                            key={String(v.id)}
                                            style={styles.vehicleItem}
                                            onPress={() => {
                                                setVehicleFilter(v.id);
                                                setVehicleMenuOpen(false);
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
                            ) : null}
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text allowFontScaling={false} style={styles.emptyTitle}>
                                No recordings found
                            </Text>
                            <Text allowFontScaling={false} style={styles.emptySub}>
                                Add a recording or try another vehicle filter.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <RecordingCard
                            item={item}
                            onPlay={(clip) => setPlayingClip(clip)}
                            onDelete={(clip) =>
                                setDeleteTarget({
                                    kind: "recording",
                                    id: clip.id,
                                    label: clip.vehicleNumber,
                                })
                            }
                        />
                    )}
                />
            )}

            <FormModal
                visible={vehicleModal.open}
                title={vehicleModal.mode === "edit" ? "Edit Vehicle" : "Add Vehicle"}
                onClose={closeVehicleModal}
                onSubmit={submitVehicle}
                submitting={saving}
            >
                <Field
                    label="Vehicle number *"
                    value={vehicleForm.vehicleNumber}
                    onChangeText={(t) =>
                        setVehicleForm((p) => ({ ...p, vehicleNumber: t }))
                    }
                    placeholder="OD-01-AB-1234"
                />
                <Text allowFontScaling={false} style={styles.fieldLabel}>
                    Vehicle type *
                </Text>
                <OptionChips
                    options={VEHICLE_TYPE_OPTIONS}
                    value={vehicleForm.vehicleType}
                    onChange={(key) =>
                        setVehicleForm((p) => ({ ...p, vehicleType: key }))
                    }
                />
                <Field
                    label="Driver name *"
                    value={vehicleForm.driverName}
                    onChangeText={(t) =>
                        setVehicleForm((p) => ({ ...p, driverName: t }))
                    }
                    placeholder="Driver name"
                />
                <Field
                    label="Driver mobile *"
                    value={vehicleForm.driverMobile}
                    onChangeText={(t) =>
                        setVehicleForm((p) => ({ ...p, driverMobile: t }))
                    }
                    placeholder="10-digit mobile"
                    keyboardType="phone-pad"
                />
                <Field
                    label="Zone code *"
                    value={vehicleForm.zoneCode}
                    onChangeText={(t) =>
                        setVehicleForm((p) => ({ ...p, zoneCode: t }))
                    }
                    placeholder="ZA / ZB / ZC…"
                />
                <Field
                    label="Stream URL"
                    value={vehicleForm.streamUrl}
                    onChangeText={(t) =>
                        setVehicleForm((p) => ({ ...p, streamUrl: t }))
                    }
                    placeholder="https://…"
                />
                <Field
                    label="Notes"
                    value={vehicleForm.notes}
                    onChangeText={(t) => setVehicleForm((p) => ({ ...p, notes: t }))}
                    placeholder="Optional notes"
                    multiline
                />
                {vehicleModal.mode === "edit" ? (
                    <>
                        <Text allowFontScaling={false} style={styles.fieldLabel}>
                            Status
                        </Text>
                        <OptionChips
                            options={VEHICLE_STATUS_OPTIONS}
                            value={vehicleForm.status}
                            onChange={(key) =>
                                setVehicleForm((p) => ({ ...p, status: key }))
                            }
                        />
                    </>
                ) : null}
            </FormModal>

            <RecordingPlayerModal
                clip={playingClip}
                onBackToLive={backToLiveFromRecording}
            />

            <FormModal
                visible={recordingModal}
                title="Add Recordings"
                onClose={() => {
                    if (!saving) setRecordingModal(false);
                }}
                onSubmit={submitRecording}
                submitting={saving}
            >
                <Text allowFontScaling={false} style={styles.fieldLabel}>
                    Vehicle *
                </Text>
                <OptionChips
                    options={vehicles.map((v) => ({
                        key: String(v.id),
                        label: v.vehicleNumber,
                    }))}
                    value={String(recordingForm.vehicleId || "")}
                    onChange={(key) =>
                        setRecordingForm((p) => ({ ...p, vehicleId: key }))
                    }
                />
                <Field
                    label="Video URL *"
                    value={recordingForm.videoUrl}
                    onChangeText={(t) =>
                        setRecordingForm((p) => ({ ...p, videoUrl: t }))
                    }
                    placeholder="https://…"
                />
                <Field
                    label="Start time (ISO) *"
                    value={recordingForm.startTime}
                    onChangeText={(t) =>
                        setRecordingForm((p) => ({ ...p, startTime: t }))
                    }
                    placeholder="2026-09-10T14:26:10+05:30"
                />
                <Field
                    label="End time (ISO) *"
                    value={recordingForm.endTime}
                    onChangeText={(t) =>
                        setRecordingForm((p) => ({ ...p, endTime: t }))
                    }
                    placeholder="2026-09-10T14:31:42+05:30"
                />
                <Field
                    label="Note"
                    value={recordingForm.note}
                    onChangeText={(t) =>
                        setRecordingForm((p) => ({ ...p, note: t }))
                    }
                    placeholder="Optional note"
                    multiline
                />
                <Text allowFontScaling={false} style={styles.hintTxt}>
                    Tip: use ISO timestamps. Example now: {formatDateTime(new Date().toISOString())}
                </Text>
            </FormModal>

            <Modal
                visible={!!fullscreenVehicle}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setFullscreenVehicle(null)}
            >
                <View style={styles.fullRoot}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setFullscreenVehicle(null)}
                    />
                    <View style={styles.fullCard}>
                        <View style={styles.fullHead}>
                            <Text
                                allowFontScaling={false}
                                style={styles.fullTitle}
                                numberOfLines={1}
                            >
                                {fullscreenVehicle?.vehicleNumber || "Live feed"}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setFullscreenVehicle(null)}
                                hitSlop={10}
                            >
                                <Text allowFontScaling={false} style={styles.fullClose}>
                                    ×
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.fullStage, { height: FULL_VIDEO_H }]}>
                            {fullscreenVehicle?.streamUrl ? (
                                <StreamPlayer
                                    url={fullscreenVehicle.streamUrl}
                                    playerKey={`full-${fullscreenVehicle.id}`}
                                />
                            ) : null}
                        </View>
                        <Text allowFontScaling={false} style={styles.fullMeta} numberOfLines={2}>
                            {fullscreenVehicle?.vehicleTypeLabel || "—"} ·{" "}
                            {fullscreenVehicle?.driverName || "—"} ·{" "}
                            {fullscreenVehicle?.zoneCode || "—"}
                        </Text>
                        <TouchableOpacity
                            style={styles.fullCloseBtn}
                            activeOpacity={0.85}
                            onPress={() => setFullscreenVehicle(null)}
                        >
                            <Text allowFontScaling={false} style={styles.fullCloseBtnTxt}>
                                Close player
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <MyAlert
                visible={!!deleteTarget}
                title={deleteAlertTitle}
                message={deleteAlertMessage}
                textRight="Yes"
                textLeft="No"
                backgroundColor={NAVY}
                color={WHITE}
                onPressRight={confirmDelete}
                onPressLeft={() => setDeleteTarget(null)}
                onRequestClose={() => setDeleteTarget(null)}
            />

            {toastMessage.visible && (
                <ToastMessage
                    message={toastMessage.msg}
                    visible={toastMessage.visible}
                    setVisible={({ visible }) =>
                        setToastMessage((prev) => ({ ...prev, visible }))
                    }
                    bacgroundColor={
                        toastMessage.type === "success" ? GREEN : "#DC2626"
                    }
                    textColor={WHITE}
                    type={toastMessage.type}
                    duration={3000}
                    position="bottom"
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: WHITE,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: H_PAD,
        paddingTop: 8,
        paddingBottom: 28,
    },
    loadingWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    loadingTxt: {
        color: GREY,
        fontSize: 12,
        fontWeight: "600",
    },
    statusRow: {
        paddingBottom: 8,
        alignItems: "center",
    },
    statusCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E8ECF1",
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginRight: 7,
    },
    statusIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
    },
    statusValue: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
        lineHeight: 15,
    },
    statusLabel: {
        color: GREY,
        fontSize: 8,
        fontWeight: "500",
    },
    tabs: {
        flexDirection: "row",
        marginHorizontal: H_PAD,
        marginTop: 8,
        marginBottom: 4,
        backgroundColor: "#EEF2F7",
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    tab: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    tabOn: { backgroundColor: NAVY },
    tabTxt: { color: NAVY, fontSize: 12, fontWeight: "700" },
    tabTxtOn: { color: WHITE },
    addVehicleBtn: {
        alignSelf: "flex-start",
        backgroundColor: NAVY,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 10,
    },
    addVehicleBtnTxt: { color: WHITE, fontSize: 11, fontWeight: "700" },
    clipList: {
        paddingHorizontal: H_PAD,
        paddingBottom: 28,
    },
    recHeader: { marginBottom: 10, zIndex: 5 },
    recHeaderTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 10,
    },
    footageTitle: { color: NAVY, fontSize: 16, fontWeight: "800" },
    footageSub: { color: GREY, fontSize: 11, marginTop: 2, fontWeight: "500" },
    addClipBtn: {
        backgroundColor: ORANGE,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    addClipBtnTxt: { color: WHITE, fontSize: 11, fontWeight: "800" },
    vehicleFilterBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 40,
        gap: 8,
    },
    vehicleFilterIcon: { width: 16, height: 16, tintColor: NAVY },
    vehicleFilterTxt: { flex: 1, color: NAVY, fontSize: 12, fontWeight: "700" },
    caret: { color: GREY, fontSize: 12 },
    vehicleMenu: {
        marginTop: 6,
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        overflow: "hidden",
    },
    vehicleItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E8EEF5",
    },
    vehicleItemTxt: { color: NAVY, fontSize: 12, fontWeight: "600" },
    clipCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5EAF1",
        padding: 12,
        marginBottom: 10,
    },
    clipTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    clipVehicleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    clipVehicleIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: "#EEF4FF",
        alignItems: "center",
        justifyContent: "center",
    },
    clipVehicleImg: { width: 16, height: 16, tintColor: "#4F6BED" },
    clipVehicle: { flex: 1, color: NAVY, fontSize: 13, fontWeight: "800" },
    durationPill: {
        backgroundColor: "#EEF2F7",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    durationPillTxt: { color: NAVY, fontSize: 10, fontWeight: "800" },
    clipName: { color: NAVY, fontSize: 13, fontWeight: "700", marginTop: 8 },
    clipRange: { color: GREY, fontSize: 11, marginTop: 4, fontWeight: "500" },
    clipActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
    },
    playBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    playBtnDisabled: { opacity: 0.5 },
    playIcon: { width: 12, height: 12, tintColor: NAVY },
    playTxt: { color: NAVY, fontSize: 12, fontWeight: "700" },
    clipDelBtn: {
        backgroundColor: "#FEE2E2",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    clipDelTxt: { color: "#B91C1C", fontSize: 12, fontWeight: "700" },
    playerModalRoot: {
        flex: 1,
        backgroundColor: "rgba(8, 16, 32, 0.72)",
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
    playerVideo: { width: "100%", height: "100%", backgroundColor: "#111" },
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
    backToLiveIcon: {
        width: 18,
        height: 18,
        tintColor: NAVY,
    },
    backToLiveTxt: { color: NAVY, fontSize: 13, fontWeight: "700" },
    camIcon: {
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    camBody: {
        borderWidth: 1.4,
        borderRadius: 2,
        backgroundColor: "transparent",
    },
    camLens: {
        borderWidth: 1.3,
        marginLeft: -2,
        backgroundColor: "transparent",
    },
    liveCard: {
        width: FEED_WIDTH,
        alignSelf: "center",
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5EAF1",
        marginBottom: 12,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    liveVideo: {
        width: "100%",
        backgroundColor: "#0B1F3A",
        position: "relative",
        overflow: "hidden",
    },
    feedVideo: {
        width: "100%",
        height: "100%",
        backgroundColor: "#0B1F3A",
    },
    feedPoster: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#0B1F3A",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 16,
    },
    feedPosterTxt: {
        color: WHITE,
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
    },
    liveBadge: {
        position: "absolute",
        top: 10,
        left: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(0,0,0,0.72)",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#EF4444",
    },
    liveTxt: {
        color: WHITE,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.4,
    },
    expandHint: {
        position: "absolute",
        right: 10,
        bottom: 10,
        backgroundColor: "rgba(0,0,0,0.62)",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    expandHintTxt: {
        color: WHITE,
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    liveInfo: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 8,
        gap: 8,
    },
    vehicleIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#EEF4FF",
        alignItems: "center",
        justifyContent: "center",
    },
    vehicleIconImg: {
        width: 20,
        height: 20,
        tintColor: "#4F6BED",
    },
    liveInfoCopy: {
        flex: 1,
        minWidth: 0,
    },
    liveTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    vehiclePlate: {
        flexShrink: 1,
        color: NAVY,
        fontSize: 14,
        fontWeight: "800",
    },
    statusPill: {
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 2,
        backgroundColor: "#EEF2F7",
        borderWidth: 1,
        borderColor: "#D0D8E4",
    },
    statusPillActive: {
        backgroundColor: "#E8FAEF",
        borderColor: "#AFEBC6",
    },
    statusPillIdle: {
        backgroundColor: "#FFF6E5",
        borderColor: "#F5D59A",
    },
    statusPillOffline: {
        backgroundColor: "#EEF2F7",
        borderColor: "#D0D8E4",
    },
    statusPillTxt: {
        fontSize: 9,
        fontWeight: "800",
        color: "#4A5B73",
    },
    statusPillTxtActive: { color: "#078541" },
    statusPillTxtIdle: { color: "#B36B00" },
    statusPillTxtOffline: { color: "#4A5B73" },
    liveMeta: {
        marginTop: 3,
        color: GREY,
        fontSize: 11,
        fontWeight: "500",
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        backgroundColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
    },
    iconBtnDisabled: {
        opacity: 0.45,
    },
    iconBtnGlyph: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
    },
    switchOffIcon: {
        width: 18,
        height: 18,
        tintColor: NAVY,
    },
    adminActions: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    fullRoot: {
        flex: 1,
        backgroundColor: "rgba(8, 16, 32, 0.72)",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    fullCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        overflow: "hidden",
        paddingBottom: 14,
    },
    fullHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    fullTitle: {
        flex: 1,
        color: NAVY,
        fontSize: 15,
        fontWeight: "800",
        paddingRight: 8,
    },
    fullClose: {
        color: GREY,
        fontSize: 28,
        lineHeight: 28,
        fontWeight: "400",
    },
    fullStage: {
        width: "100%",
        backgroundColor: "#0B1F3A",
    },
    fullMeta: {
        color: GREY,
        fontSize: 12,
        fontWeight: "600",
        paddingHorizontal: 14,
        paddingTop: 10,
    },
    fullCloseBtn: {
        marginTop: 12,
        marginHorizontal: 14,
        backgroundColor: NAVY,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
    },
    fullCloseBtnTxt: {
        color: WHITE,
        fontSize: 13,
        fontWeight: "700",
    },
    miniBtn: {
        backgroundColor: "#EEF2F7",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    miniBtnDanger: {
        backgroundColor: "#FEE2E2",
    },
    miniBtnTxt: {
        color: NAVY,
        fontSize: 10,
        fontWeight: "800",
    },
    miniBtnDangerTxt: {
        color: "#B91C1C",
    },
    expandIcon: {
        width: 11,
        height: 11,
    },
    expandCorner: {
        position: "absolute",
        width: 4.5,
        height: 4.5,
        borderColor: NAVY,
    },
    expandTL: { top: 0, left: 0, borderTopWidth: 1.4, borderLeftWidth: 1.4 },
    expandTR: { top: 0, right: 0, borderTopWidth: 1.4, borderRightWidth: 1.4 },
    expandBL: { bottom: 0, left: 0, borderBottomWidth: 1.4, borderLeftWidth: 1.4 },
    expandBR: { bottom: 0, right: 0, borderBottomWidth: 1.4, borderRightWidth: 1.4 },
    pinWrap: {
        width: 9,
        height: 11,
        alignItems: "center",
        marginRight: 4,
    },
    pinHead: {
        width: 7,
        height: 7,
        borderRadius: 4,
        borderWidth: 1.3,
        borderColor: WHITE,
    },
    pinTip: {
        width: 0,
        height: 0,
        marginTop: -1,
        borderLeftWidth: 2.5,
        borderRightWidth: 2.5,
        borderTopWidth: 3.5,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: WHITE,
    },
    coordsTxt: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 9,
        fontWeight: "600",
        flex: 1,
    },
    timeTxt: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 9,
        fontWeight: "600",
    },
    listPane: {
        marginTop: 6,
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#EEF1F5",
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 8,
    },
    listHeader: {
        marginBottom: 4,
    },
    paneTitle: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 2,
    },
    listSub: {
        color: GREEN,
        fontSize: 10,
        fontWeight: "600",
        marginBottom: 4,
    },
    emptyInline: {
        color: GREY,
        fontSize: 11,
        paddingVertical: 10,
    },
    emptyBox: {
        borderWidth: 1,
        borderColor: "#E8ECF1",
        borderRadius: 10,
        padding: 16,
        alignItems: "center",
        marginBottom: 10,
        backgroundColor: LIGHTGREY,
    },
    emptyTitle: {
        color: NAVY,
        fontSize: 13,
        fontWeight: "700",
    },
    emptySub: {
        color: GREY,
        fontSize: 11,
        marginTop: 4,
        textAlign: "center",
    },
    alertRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: "#F1F4F8",
        gap: 8,
    },
    alertInfo: {
        flex: 1,
    },
    alertMsg: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "700",
    },
    alertMeta: {
        color: GREY,
        fontSize: 9,
        marginTop: 2,
    },
    ackBtn: {
        backgroundColor: "#E8F1FB",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    ackBtnTxt: {
        color: BLUE,
        fontSize: 9,
        fontWeight: "800",
    },
    ackPill: {
        backgroundColor: "#E8F8EE",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    ackPillTxt: {
        color: GREEN,
        fontSize: 9,
        fontWeight: "800",
    },
    recRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: "#F1F4F8",
        gap: 8,
    },
    recInfo: {
        flex: 1,
    },
    recTitle: {
        color: NAVY,
        fontSize: 11,
        fontWeight: "700",
    },
    recMeta: {
        color: GREY,
        fontSize: 9,
        marginTop: 2,
    },
    recDelBtn: {
        backgroundColor: "#FEE2E2",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    recDelTxt: {
        color: RED,
        fontSize: 9,
        fontWeight: "800",
    },
    mapPane: {
        marginTop: 12,
        marginBottom: 6,
    },
    mapBox: {
        height: 220,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#EEF1F5",
        backgroundColor: LIGHTGREY,
    },
    map: {
        flex: 1,
    },
    modalRoot: {
        flex: 1,
        backgroundColor: "rgba(8,16,32,0.45)",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    formCard: {
        backgroundColor: WHITE,
        borderRadius: 14,
        maxHeight: "86%",
        overflow: "hidden",
    },
    formHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF1F5",
    },
    formTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "800",
    },
    formClose: {
        color: GREY,
        fontSize: 22,
        lineHeight: 24,
        fontWeight: "600",
    },
    formScroll: {
        maxHeight: 420,
    },
    formBody: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 12,
    },
    fieldWrap: {
        marginBottom: 8,
    },
    fieldLabel: {
        color: GREY,
        fontSize: 10,
        fontWeight: "700",
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        color: NAVY,
        fontSize: 12,
        backgroundColor: "#F8FAFC",
    },
    fieldMultiline: {
        minHeight: 64,
        textAlignVertical: "top",
    },
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 10,
    },
    chip: {
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: WHITE,
    },
    chipActive: {
        backgroundColor: NAVY,
        borderColor: NAVY,
    },
    chipTxt: {
        color: NAVY,
        fontSize: 10,
        fontWeight: "700",
    },
    chipTxtActive: {
        color: WHITE,
    },
    submitBtn: {
        marginHorizontal: 14,
        marginBottom: 14,
        marginTop: 4,
        backgroundColor: BUTTON,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitTxt: {
        color: WHITE,
        fontSize: 13,
        fontWeight: "800",
    },
    hintTxt: {
        color: GREY,
        fontSize: 9,
        marginTop: 2,
        marginBottom: 4,
    },
});

export default CameraScreen;
