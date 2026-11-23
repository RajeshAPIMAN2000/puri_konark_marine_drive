/**
 * Validates GPS samples before distance accumulation / sync.
 */

const EARTH_RADIUS_M = 6371000;

export const toRad = (deg) => (deg * Math.PI) / 180;

export const haversineMeters = (a, b) => {
    if (!a || !b) return 0;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const isValidCoordinate = (coords) => {
    if (!coords) return false;
    const { latitude, longitude } = coords;
    if (typeof latitude !== "number" || typeof longitude !== "number") return false;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    if (latitude < -90 || latitude > 90) return false;
    if (longitude < -180 || longitude > 180) return false;
    if (latitude === 0 && longitude === 0) return false;
    return true;
};

export const isAcceptableAccuracy = (accuracy, maxAccuracyM = 75) => {
    if (accuracy == null || !Number.isFinite(accuracy)) return true;
    return accuracy <= maxAccuracyM;
};

export const isFreshTimestamp = (timestamp, maxAgeMs = 120000) => {
    if (!timestamp) return false;
    const t = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
    if (!Number.isFinite(t)) return false;
    const age = Date.now() - t;
    return age >= -5000 && age <= maxAgeMs;
};

export const isDuplicatePoint = (prev, next, minDistanceM = 2) => {
    if (!prev || !next) return false;
    return haversineMeters(prev, next) < minDistanceM;
};

/**
 * Filters unrealistic jumps without discarding legitimate highway travel.
 * Max plausible speed ~180 km/h (~50 m/s) with buffer for GPS jitter.
 */
export const isUnrealisticJump = (prev, next, maxSpeedMps = 55) => {
    if (!prev || !next) return false;
    const dist = haversineMeters(prev, next);
    const t0 = typeof prev.timestamp === "number" ? prev.timestamp : Date.parse(prev.timestamp);
    const t1 = typeof next.timestamp === "number" ? next.timestamp : Date.parse(next.timestamp);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) {
        // Without time delta, only reject absurd single hops (> 5 km)
        return dist > 5000;
    }
    const dtSec = (t1 - t0) / 1000;
    if (dtSec <= 0) return true;
    const speed = dist / dtSec;
    return speed > maxSpeedMps && dist > 200;
};

export const normalizeLocationSample = (location) => {
    const coords = location?.coords || location;
    if (!isValidCoordinate(coords)) return null;
    const timestamp =
        location?.timestamp ||
        coords.timestamp ||
        location?.age ||
        Date.now();
    return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? null,
        speed: coords.speed ?? null,
        heading: coords.heading ?? null,
        altitude: coords.altitude ?? null,
        timestamp: typeof timestamp === "number" ? timestamp : Date.parse(timestamp) || Date.now(),
        odometer: typeof location?.odometer === "number" ? location.odometer : null,
        uuid: location?.uuid || null,
        is_moving: location?.is_moving,
        sample: !!location?.sample,
    };
};

export const validateForTracking = (sample, previous, options = {}) => {
    const {
        maxAccuracyM = 75,
        maxAgeMs = 120000,
        minDistanceM = 2,
        maxSpeedMps = 55,
    } = options;

    if (!sample || !isValidCoordinate(sample)) {
        return { ok: false, reason: "invalid_coords" };
    }
    if (!isAcceptableAccuracy(sample.accuracy, maxAccuracyM)) {
        return { ok: false, reason: "poor_accuracy" };
    }
    if (!isFreshTimestamp(sample.timestamp, maxAgeMs)) {
        return { ok: false, reason: "stale_timestamp" };
    }
    if (previous && isDuplicatePoint(previous, sample, minDistanceM)) {
        return { ok: false, reason: "duplicate" };
    }
    if (previous && isUnrealisticJump(previous, sample, maxSpeedMps)) {
        return { ok: false, reason: "unrealistic_jump" };
    }
    return { ok: true };
};
