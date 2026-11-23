import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import {
    MAP_DEFAULT_CENTER,
    MAP_DEFAULT_ZOOM,
} from "../../constant/mapEnv";
import { GREY } from "../../constant/color";
import ErrorBoundary from "../commonComponents/ErrorBoundary";
import MapControls from "./MapControls";
import { WORKER_STATUS_COLOR } from "./WorkerMarker";

/**
 * Live tracking map via Leaflet WebView — avoids native MapLibre process crashes.
 */
function buildLiveHtml({
    focus,
    zoom,
    workers,
    routePoints,
    currentLocation,
    selectedWorkerId,
}) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#E8EEF5; }
    .pin {
      min-width:30px; height:30px; border-radius:15px; border:2px solid #fff;
      color:#fff; font:800 11px/26px sans-serif; text-align:center; padding:0 6px;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    }
    .me {
      width:22px; height:22px; border-radius:11px;
      background:rgba(47,111,237,0.25); display:flex; align-items:center; justify-content:center;
    }
    .me > span {
      width:12px; height:12px; border-radius:6px; background:#2F6FED; border:2px solid #fff; display:block;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var focus = ${JSON.stringify(focus)};
      var zoom = ${Number(zoom) || MAP_DEFAULT_ZOOM};
      var workers = ${JSON.stringify(workers || [])};
      var route = ${JSON.stringify(routePoints || [])};
      var current = ${JSON.stringify(currentLocation || null)};
      var selectedId = ${JSON.stringify(selectedWorkerId || null)};
      var colors = ${JSON.stringify(WORKER_STATUS_COLOR)};

      var map = L.map('map', { zoomControl: false, attributionControl: false })
        .setView([focus.latitude, focus.longitude], zoom);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      if (Array.isArray(route) && route.length > 1) {
        var line = route
          .filter(function (p) { return typeof p.latitude === 'number' && typeof p.longitude === 'number'; })
          .map(function (p) { return [p.latitude, p.longitude]; });
        if (line.length > 1) {
          L.polyline(line, { color: '#0B1F3A', weight: 4, opacity: 0.9 }).addTo(map);
        }
      }

      workers.forEach(function (w) {
        if (typeof w.latitude !== 'number' || typeof w.longitude !== 'number') return;
        var selected = String(w.id) === String(selectedId);
        var color = selected ? (colors.selected || '#2F6FED') : (colors[w.status] || colors.active || '#16A34A');
        var label = (w.initial || (w.name || 'W').charAt(0) || 'W').toString().slice(0, 2);
        var icon = L.divIcon({
          className: '',
          html: '<div class="pin" style="background:' + color + ';border-color:' + (selected ? '#2F6FED' : '#fff') + '">' + label + '</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 30]
        });
        var marker = L.marker([w.latitude, w.longitude], { icon: icon }).addTo(map);
        marker.on('click', function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'worker', id: w.id }));
          }
        });
      });

      if (current && typeof current.latitude === 'number' && typeof current.longitude === 'number') {
        var meIcon = L.divIcon({
          className: '',
          html: '<div class="me"><span></span></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        L.marker([current.latitude, current.longitude], { icon: meIcon }).addTo(map);
      }

      window.__pkmdMap = map;
      window.__pkmdZoom = function (delta) {
        map.setZoom(map.getZoom() + delta);
      };
      window.__pkmdRecenter = function () {
        map.setView([focus.latitude, focus.longitude], Math.max(map.getZoom(), 14));
      };
    })();
  </script>
</body>
</html>`;
}

function LiveWorkerMapInner({
    workers = [],
    selectedWorkerId = null,
    routePoints = [],
    currentLocation = null,
    showControls = true,
    onSelectWorker,
    style,
}) {
    const webRef = useRef(null);
    const [failed, setFailed] = useState(false);

    const safeWorkers = useMemo(
        () =>
            (workers || [])
                .filter(
                    (w) =>
                        w &&
                        Number.isFinite(w.latitude) &&
                        Number.isFinite(w.longitude)
                )
                .map((w) => ({
                    id: w.id,
                    name: w.name,
                    initial: w.initial || w.name?.charAt(0) || "W",
                    latitude: w.latitude,
                    longitude: w.longitude,
                    status: w.status || "active",
                })),
        [workers]
    );

    const safeRoute = useMemo(
        () =>
            (routePoints || [])
                .filter(
                    (p) =>
                        Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude)
                )
                .map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        [routePoints]
    );

    const focus = useMemo(() => {
        if (
            Number.isFinite(currentLocation?.latitude) &&
            Number.isFinite(currentLocation?.longitude)
        ) {
            return {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
            };
        }
        const selected = safeWorkers.find((w) => w.id === selectedWorkerId);
        if (selected) {
            return { latitude: selected.latitude, longitude: selected.longitude };
        }
        if (safeWorkers[0]) {
            return {
                latitude: safeWorkers[0].latitude,
                longitude: safeWorkers[0].longitude,
            };
        }
        return MAP_DEFAULT_CENTER;
    }, [currentLocation, safeWorkers, selectedWorkerId]);

    const html = useMemo(
        () =>
            buildLiveHtml({
                focus,
                zoom: MAP_DEFAULT_ZOOM,
                workers: safeWorkers,
                routePoints: safeRoute,
                currentLocation:
                    Number.isFinite(currentLocation?.latitude) &&
                    Number.isFinite(currentLocation?.longitude)
                        ? {
                              latitude: currentLocation.latitude,
                              longitude: currentLocation.longitude,
                          }
                        : null,
                selectedWorkerId,
            }),
        [focus, safeWorkers, safeRoute, currentLocation, selectedWorkerId]
    );

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event?.nativeEvent?.data || "{}");
            if (data?.type === "worker" && data.id != null) {
                const found = safeWorkers.find((w) => String(w.id) === String(data.id));
                if (found) onSelectWorker?.(found);
            }
        } catch (_) {
            // ignore
        }
    };

    if (failed) {
        return (
            <View style={[styles.root, style, styles.placeholder]}>
                <Text allowFontScaling={false} style={styles.placeholderTxt}>
                    Live map unavailable. Check network and try again.
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.root, style]}>
            <WebView
                ref={webRef}
                originWhitelist={["*"]}
                source={{ html }}
                style={styles.map}
                onMessage={onMessage}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                setSupportMultipleWindows={false}
                scrollEnabled={false}
                onError={() => setFailed(true)}
                onHttpError={() => setFailed(true)}
            />

            {showControls ? (
                <MapControls
                    onZoomIn={() =>
                        webRef.current?.injectJavaScript(
                            "try{window.__pkmdZoom&&window.__pkmdZoom(1);}catch(e){};true;"
                        )
                    }
                    onZoomOut={() =>
                        webRef.current?.injectJavaScript(
                            "try{window.__pkmdZoom&&window.__pkmdZoom(-1);}catch(e){};true;"
                        )
                    }
                    onRecenter={() =>
                        webRef.current?.injectJavaScript(
                            "try{window.__pkmdRecenter&&window.__pkmdRecenter();}catch(e){};true;"
                        )
                    }
                />
            ) : null}

        </View>
    );
}

export default function LiveWorkerMap(props) {
    return (
        <ErrorBoundary title="Live map unavailable">
            <LiveWorkerMapInner {...props} />
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#E8EEF5", overflow: "hidden", minHeight: 180 },
    map: { flex: 1, backgroundColor: "#E8EEF5" },
    placeholder: { alignItems: "center", justifyContent: "center", padding: 16 },
    placeholderTxt: { color: GREY, fontSize: 13, fontWeight: "600", textAlign: "center" },
});
