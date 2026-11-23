import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import {
    MAP_DEFAULT_CENTER,
    MAP_DEFAULT_ZOOM,
} from "../../constant/mapEnv";
import { GREY, NAVY, WHITE } from "../../constant/color";
import { VECHILES } from "../../constant/imagePath";
import ErrorBoundary from "../commonComponents/ErrorBoundary";

const VEHICLE_ICON_URI = Image.resolveAssetSource(VECHILES)?.uri || "";

/**
 * Stable CRM map via Leaflet in WebView.
 * Supports numbered cluster pins, corridor/zone polygons, and marker click → RN.
 */
function buildMapHtml({ center, zoom, markers, polygons, fitBounds, vehicleIconUrl }) {
    const markersJson = JSON.stringify(markers || []);
    const polygonsJson = JSON.stringify(polygons || []);
    const fitJson = JSON.stringify(fitBounds || null);
    const lat = Number(center?.latitude) || MAP_DEFAULT_CENTER.latitude;
    const lng = Number(center?.longitude) || MAP_DEFAULT_CENTER.longitude;
    const z = Number.isFinite(zoom) ? zoom : MAP_DEFAULT_ZOOM;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#E8EEF5; }
    .leaflet-div-icon {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    .pin, .cluster, .letter, .vehicle {
      display:flex; align-items:center; justify-content:center;
      box-sizing:border-box;
      width:100%; height:100%;
      border-radius:50% !important;
      color:#fff; text-align:center;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
      padding:0; margin:0; transform:none !important;
      overflow:hidden;
    }
    .pin {
      width:28px; height:28px; min-width:28px; min-height:28px;
      border:2px solid #fff; font:700 11px/1 sans-serif;
    }
    .cluster {
      width:40px; height:40px; min-width:40px; min-height:40px;
      border:4px solid rgba(148,163,184,0.55); font:800 13px/1 sans-serif;
    }
    .letter {
      width:34px; height:34px; min-width:34px; min-height:34px;
      border:2px solid #fff; font:800 14px/1 sans-serif;
    }
    .vehicle {
      width:44px; height:44px; min-width:44px; min-height:44px;
      border:2px solid #fff;
      background:#fff !important;
      padding:3px;
    }
    .vehicle img {
      width:100%; height:100%;
      object-fit:contain;
      display:block;
      border-radius:50%;
    }
    .vehicle svg {
      width:22px; height:22px;
      display:block;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var center = [${lat}, ${lng}];
      var zoom = ${z};
      var markers = ${markersJson};
      var polygons = ${polygonsJson};
      var fit = ${fitJson};
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        boxZoom: true,
        keyboard: true,
        bounceAtZoomLimits: false
      }).setView(center, zoom);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);
      setTimeout(function () { try { map.invalidateSize(true); } catch (e) {} }, 120);
      setTimeout(function () { try { map.invalidateSize(true); } catch (e) {} }, 400);

      var bounds = [];

      (polygons || []).forEach(function (p) {
        if (!p || !Array.isArray(p.coordinates) || p.coordinates.length < 2) return;
        var ring = p.coordinates
          .filter(function (c) { return typeof c[0] === 'number' && typeof c[1] === 'number'; })
          .map(function (c) { return [c[0], c[1]]; });
        if (ring.length < 2) return;
        var layer = L.polygon(ring, {
          color: p.color || '#DC2626',
          weight: p.weight || 2,
          dashArray: p.dashArray || '8 6',
          fillColor: p.fillColor || p.color || '#DC2626',
          fillOpacity: typeof p.fillOpacity === 'number' ? p.fillOpacity : 0.06
        }).addTo(map);
        try { bounds = bounds.concat(layer.getLatLngs()[0].map(function (ll) { return [ll.lat, ll.lng]; })); } catch (e) {}
      });

      var vehicleIconUrl = ${JSON.stringify(vehicleIconUrl || "")};
      var vehicleSvg =
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path fill="#fff" d="M5 11.5l1.2-3.6A2 2 0 0 1 8.1 6.5h7.8a2 2 0 0 1 1.9 1.4L19 11.5v5.2a1 1 0 0 1-1 1h-.7a2.2 2.2 0 0 1-4.3 0H11a2.2 2.2 0 0 1-4.3 0H6a1 1 0 0 1-1-1v-5.2z"/>' +
        '<circle cx="8.2" cy="17.2" r="1.35" fill="#0B1F3A"/>' +
        '<circle cx="15.8" cy="17.2" r="1.35" fill="#0B1F3A"/>' +
        '<path stroke="#fff" stroke-width="1.2" stroke-linecap="round" d="M5.5 11.5h13"/>' +
        '</svg>';

      markers.forEach(function (m) {
        if (typeof m.latitude !== 'number' || typeof m.longitude !== 'number') return;
        var color = m.color || '#0B1F3A';
        var label = (m.label || '•').toString();
        var kind = m.kind || 'pin';
        var size = kind === 'cluster' ? 40 : (kind === 'vehicle' ? 44 : (kind === 'letter' ? 34 : 28));
        var cls =
          kind === 'cluster' ? 'cluster' :
          kind === 'vehicle' ? 'vehicle' :
          kind === 'letter' ? 'letter' : 'pin';
        var iconSrc = m.iconUrl || vehicleIconUrl;
        var inner =
          kind === 'vehicle'
            ? (iconSrc
                ? '<img src="' + iconSrc + '" alt="vehicle" />'
                : vehicleSvg)
            : label;
        var bg = kind === 'vehicle' ? '#ffffff' : color;
        var icon = L.divIcon({
          className: 'pkmd-circle-icon',
          html: '<div class="' + cls + '" style="background:' + bg + ';border-radius:50%">' + inner + '</div>',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2]
        });
        var marker = L.marker([m.latitude, m.longitude], { icon: icon, keyboard: false }).addTo(map);
        if (m.title) {
          try { marker.bindTooltip(String(m.title), { direction: 'top', opacity: 0.9 }); } catch (e) {}
        }
        if (m.id) {
          marker.on('click', function () {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'marker',
                id: m.id,
                kind: kind || 'pin',
                zoneId: m.zoneId || null,
                vendorId: m.vendorId || null
              }));
            }
          });
        }
        bounds.push([m.latitude, m.longitude]);
      });

      if (fit && Array.isArray(fit) && fit.length >= 2) {
        try {
          map.fitBounds(fit, { padding: [36, 36], maxZoom: 15 });
        } catch (e) {}
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], Math.max(zoom, 13));
      }

      window.__pkmdMap = map;
      window.__pkmdZoom = function (delta) {
        map.setZoom(map.getZoom() + delta);
      };
      window.__pkmdFit = function (b) {
        try {
          if (b && b.length >= 2) map.fitBounds(b, { padding: [36, 36], maxZoom: 15 });
        } catch (e) {}
      };
    })();
  </script>
</body>
</html>`;
}

function StaticCrmMapInner({
    markers = [],
    polygons = [],
    fitBounds = null,
    initialCenter = MAP_DEFAULT_CENTER,
    initialZoom = MAP_DEFAULT_ZOOM,
    style,
    showZoom = true,
    onMarkerPress,
}) {
    const webRef = useRef(null);
    const [failed, setFailed] = useState(false);

    const safeMarkers = useMemo(
        () =>
            (markers || [])
                .filter(
                    (m) =>
                        m &&
                        Number.isFinite(m.latitude) &&
                        Number.isFinite(m.longitude)
                )
                .map((m) => ({
                    id: String(m.id ?? `${m.latitude},${m.longitude}`),
                    latitude: m.latitude,
                    longitude: m.longitude,
                    label: String(m.label ?? "•"),
                    title: m.title ? String(m.title) : "",
                    color: m.color || NAVY,
                    kind: m.kind || "pin",
                    iconUrl: m.iconUrl || (m.kind === "vehicle" ? VEHICLE_ICON_URI : ""),
                    zoneId: m.zoneId || null,
                    vendorId: m.vendorId || null,
                    payload: m.payload || null,
                })),
        [markers]
    );

    const safePolygons = useMemo(
        () =>
            (polygons || [])
                .filter((p) => Array.isArray(p?.coordinates) && p.coordinates.length >= 2)
                .map((p, idx) => ({
                    id: String(p.id ?? idx),
                    coordinates: p.coordinates,
                    color: p.color || "#DC2626",
                    fillColor: p.fillColor || p.color || "#DC2626",
                    fillOpacity:
                        typeof p.fillOpacity === "number" ? p.fillOpacity : 0.06,
                    weight: p.weight || 2,
                    dashArray: p.dashArray || "8 6",
                })),
        [polygons]
    );

    const safeFit = useMemo(() => {
        if (!Array.isArray(fitBounds) || fitBounds.length < 2) return null;
        return fitBounds
            .filter((b) => Number.isFinite(b?.[0]) && Number.isFinite(b?.[1]))
            .map((b) => [b[0], b[1]]);
    }, [fitBounds]);

    const center = useMemo(() => {
        if (safeMarkers[0]) {
            return {
                latitude: safeMarkers[0].latitude,
                longitude: safeMarkers[0].longitude,
            };
        }
        return initialCenter || MAP_DEFAULT_CENTER;
    }, [safeMarkers, initialCenter]);

    // Keep fitBounds out of HTML so inject-only updates don't remount the map mid-pan.
    const html = useMemo(
        () =>
            buildMapHtml({
                center,
                zoom: initialZoom,
                markers: safeMarkers,
                polygons: safePolygons,
                fitBounds: null,
                vehicleIconUrl: VEHICLE_ICON_URI,
            }),
        [center, initialZoom, safeMarkers, safePolygons]
    );

    useEffect(() => {
        if (!webRef.current) return;
        const fitJs =
            safeFit && safeFit.length >= 2
                ? `if (window.__pkmdFit) { window.__pkmdFit(${JSON.stringify(safeFit)}); }`
                : "";
        const timer = setTimeout(() => {
            webRef.current?.injectJavaScript(
                `try{ if (window.__pkmdMap) { window.__pkmdMap.invalidateSize(true); } ${fitJs} }catch(e){};true;`
            );
        }, 200);
        return () => clearTimeout(timer);
    }, [safeFit, html]);

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event?.nativeEvent?.data || "{}");
            if (data?.type === "marker" && data.id) {
                const found = safeMarkers.find((m) => m.id === String(data.id));
                if (found) onMarkerPress?.(found, data);
            }
        } catch (_) {
            // ignore
        }
    };

    const zoomBy = (delta) => {
        webRef.current?.injectJavaScript(
            `try{window.__pkmdZoom&&window.__pkmdZoom(${delta});}catch(e){};true;`
        );
    };

    if (failed) {
        return (
            <View style={[styles.root, style, styles.placeholder]}>
                <Text allowFontScaling={false} style={styles.placeholderTxt}>
                    Map unavailable. Check network and try again.
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
                nestedScrollEnabled
                overScrollMode="never"
                bounces={false}
                allowsInlineMediaPlayback
                onError={() => setFailed(true)}
                onHttpError={() => setFailed(true)}
            />

            {showZoom ? (
                <View style={styles.zoom}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(1)}>
                        <Text allowFontScaling={false} style={styles.zoomTxt}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(-1)}>
                        <Text allowFontScaling={false} style={styles.zoomTxt}>−</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}

export default function StaticCrmMap(props) {
    return (
        <ErrorBoundary title="Map unavailable">
            <StaticCrmMapInner {...props} />
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#E8EEF5", overflow: "hidden", minHeight: 160 },
    map: { flex: 1, backgroundColor: "#E8EEF5" },
    placeholder: { alignItems: "center", justifyContent: "center", padding: 16 },
    placeholderTxt: { color: GREY, fontSize: 13, fontWeight: "600", textAlign: "center" },
    zoom: { position: "absolute", right: 10, bottom: 12, gap: 6 },
    zoomBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        alignItems: "center",
        justifyContent: "center",
    },
    zoomTxt: { color: NAVY, fontSize: 18, fontWeight: "700" },
});
