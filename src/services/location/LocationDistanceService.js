/**
 * Distance accumulation for journeys.
 * Primary source of truth while tracking: BGeo native odometer (metres).
 * Secondary: validated segment haversine for UI fallback / offline display.
 * Never use first→last only; never double-count odometer + JS segments.
 */

import { haversineMeters } from "./LocationValidationService";

export const metresToKm = (metres) => {
    if (!Number.isFinite(metres) || metres < 0) return 0;
    return Math.round((metres / 1000) * 1000) / 1000;
};

export const kmToMetres = (km) => {
    if (!Number.isFinite(km) || km < 0) return 0;
    return km * 1000;
};

export const formatDistanceKm = (metres) => {
    const km = metresToKm(metres);
    return `${km.toFixed(km >= 100 ? 1 : 2)} km`;
};

/**
 * Prefer native odometer when available; otherwise accumulate validated segments.
 * `mode`: "odometer" | "segments" | "reconcile"
 */
export const resolveJourneyDistanceMetres = ({
    odometerMetres = null,
    segmentMetres = 0,
    backendMetres = null,
    mode = "reconcile",
}) => {
    const odo = Number.isFinite(odometerMetres) ? Math.max(0, odometerMetres) : null;
    const seg = Number.isFinite(segmentMetres) ? Math.max(0, segmentMetres) : 0;
    const backend = Number.isFinite(backendMetres) ? Math.max(0, backendMetres) : null;

    if (mode === "odometer" && odo != null) return odo;
    if (mode === "segments") return seg;

    // Reconcile: prefer the larger of native odometer and validated segments
    // so neither silent odometer reset nor sparse samples under-report long trips.
    let local = seg;
    if (odo != null) local = Math.max(local, odo);
    if (backend != null) {
        // Do not shrink local progress from a smaller backend value mid-journey.
        return Math.max(local, backend);
    }
    return local;
};

export const accumulateSegment = (totalMetres, fromPoint, toPoint) => {
    if (!fromPoint || !toPoint) return totalMetres;
    const delta = haversineMeters(fromPoint, toPoint);
    if (!Number.isFinite(delta) || delta <= 0) return totalMetres;
    return totalMetres + delta;
};

export const buildRouteCoordinates = (points = []) =>
    points
        .filter((p) => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => [p.longitude, p.latitude]);
