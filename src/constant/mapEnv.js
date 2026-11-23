/**
 * Map tile / style configuration (separate from map UI components).
 *
 * Defaults use OpenFreeMap Liberty — free for production use with attribution.
 * Override via these constants or build-time values without hard-coding paid
 * MapTiler / Mapbox / Google keys.
 *
 * OpenFreeMap: https://openfreemap.org/
 * Attribution must remain visible on the map (MapLibre attributionEnabled).
 */

export const MAP_STYLE_URL =
    "https://tiles.openfreemap.org/styles/liberty";

/** Optional fallback / offline-friendly demo style for local UI smoke tests */
export const MAP_STYLE_FALLBACK_URL =
    "https://demotiles.maplibre.org/style.json";

export const MAP_ATTRIBUTION =
    "© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors";

/** Default camera over Puri–Konark Marine Drive corridor */
export const MAP_DEFAULT_CENTER = {
    latitude: 19.855,
    longitude: 85.95,
};

export const MAP_DEFAULT_ZOOM = 10;

/**
 * Optional native BGeo HTTP upload endpoint.
 * Leave empty until backend exposes a location-ingest contract matching BGeo's
 * location JSON shape. When empty, autoSync stays disabled and JS sync is used.
 */
export const BGEO_LOCATION_UPLOAD_URL = "";

export const BGEO_HTTP_ROOT_PROPERTY = "location";
