/**
 * Singleton BGeo background GPS tracking service.
 * Do not start multiple tracking instances. Tracking continues when React UI unmounts.
 * BGeo is loaded lazily so opening screens that only import this module cannot
 * crash the process when the native module is unavailable.
 */

import {
    BGEO_HTTP_ROOT_PROPERTY,
    BGEO_LOCATION_UPLOAD_URL,
} from "../../constant/mapEnv";
import { getObjByKey } from "../../utils/Storage";
import {
    accumulateSegment,
    resolveJourneyDistanceMetres,
} from "./LocationDistanceService";
import {
    ensureTrackingPermissions,
    getGpsSignalStatus,
} from "./LocationPermissionService";
import {
    appendJourneyHistory,
    enqueuePendingLocations,
    loadActiveJourney,
    saveActiveJourney,
    syncPendingLocations,
    AUDITED_JOURNEY_ENDPOINTS,
} from "./LocationSyncService";
import {
    normalizeLocationSample,
    validateForTracking,
} from "./LocationValidationService";

let BackgroundGeolocation = null;
let readyPromise = null;
let listenersAttached = false;
let subscriptionHandles = [];
let busy = false;

const listeners = {
    location: new Set(),
    status: new Set(),
    error: new Set(),
};

const emit = (channel, payload) => {
    listeners[channel]?.forEach((fn) => {
        try {
            fn(payload);
        } catch (e) {
            // ignore subscriber errors
        }
    });
};

const loadBgeo = () => {
    if (BackgroundGeolocation) return BackgroundGeolocation;
    try {
        // eslint-disable-next-line global-require
        BackgroundGeolocation = require("@dc-bgeo/react-native-background-geolocation").default;
        return BackgroundGeolocation;
    } catch (error) {
        console.log("BGeo load failed:", error?.message || error);
        throw error;
    }
};

const buildConfig = async (BGeo) => {
    const uploadUrl =
        BGEO_LOCATION_UPLOAD_URL && String(BGEO_LOCATION_UPLOAD_URL).trim()
            ? String(BGEO_LOCATION_UPLOAD_URL).trim()
            : null;

    let authHeader = {};
    try {
        const loginRes = await getObjByKey("loginResponse");
        const token = loginRes?.token || loginRes?.data?.token || loginRes?.data;
        if (typeof token === "string" && token.length > 10) {
            authHeader = { Authorization: `Bearer ${token}` };
        }
    } catch (_) {
        // no auth
    }

    const config = {
        desiredAccuracy: BGeo.DESIRED_ACCURACY_HIGH,
        distanceFilter: 20,
        stopTimeout: 5,
        stationaryRadius: 25,
        heartbeatInterval: 60,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        preventSuspend: true,
        pausesLocationUpdatesAutomatically: false,
        locationAuthorizationRequest: "Always",
        backgroundPermissionRationale: {
            title: "Allow background location for journey tracking",
            message:
                "PKMD CRM needs background location so field journeys of 150–300 km keep recording while the screen is off.",
            positiveAction: "Allow always",
            negativeAction: "Cancel",
        },
        notification: {
            title: "PKMD Journey Tracking",
            text: "Recording your field journey location",
            channelName: "PKMD Location",
            sticky: true,
        },
        autoSync: !!uploadUrl,
        batchSync: true,
        maxBatchSize: 50,
        maxRecordsToPersist: 10000,
        debug: false,
        logLevel: BGeo.LOG_LEVEL_WARNING,
    };

    if (uploadUrl) {
        config.url = uploadUrl;
        config.method = "POST";
        config.httpRootProperty = BGEO_HTTP_ROOT_PROPERTY;
        config.headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...authHeader,
        };
        config.params = {
            source: "bgeo-native",
        };
    }

    return config;
};

const attachListeners = (BGeo) => {
    if (listenersAttached) return;
    listenersAttached = true;

    const onLocation = BGeo.onLocation(
        async (location) => {
            const sample = normalizeLocationSample(location);
            if (!sample || sample.sample) return;

            const journey = await loadActiveJourney();
            if (!journey || journey.status !== "active") {
                emit("location", { sample, journey: null });
                return;
            }

            const previous = journey.lastPoint || null;
            const validation = validateForTracking(sample, previous, {
                maxAccuracyM: 100,
                minDistanceM: 3,
            });

            let segmentMetres = journey.segmentMetres || 0;
            if (validation.ok) {
                segmentMetres = accumulateSegment(segmentMetres, previous, sample);
                journey.route = [...(journey.route || []), sample].slice(-8000);
                journey.lastPoint = sample;
                journey.segmentMetres = segmentMetres;
                await enqueuePendingLocations([
                    {
                        ...sample,
                        journeyId: journey.id,
                    },
                ]);
            }

            const odometer =
                typeof sample.odometer === "number"
                    ? sample.odometer
                    : journey.odometerMetres || 0;

            journey.odometerMetres = odometer;
            journey.distanceMetres = resolveJourneyDistanceMetres({
                odometerMetres: odometer,
                segmentMetres,
                mode: "reconcile",
            });
            journey.speed = sample.speed;
            journey.accuracy = sample.accuracy;
            journey.lastUpdatedAt = sample.timestamp;
            journey.gpsStatus = getGpsSignalStatus({
                accuracy: sample.accuracy,
                enabled: true,
                providerEnabled: true,
            });

            await saveActiveJourney(journey);
            emit("location", { sample, journey });
            emit("status", journey);
        },
        (error) => emit("error", error)
    );

    const onMotion = BGeo.onMotionChange(async (event) => {
        const journey = await loadActiveJourney();
        if (!journey) return;
        journey.isMoving = !!event?.isMoving;
        await saveActiveJourney(journey);
        emit("status", journey);
    });

    const onProvider = BGeo.onProviderChange(async (event) => {
        const journey = await loadActiveJourney();
        if (!journey) return;
        journey.gpsStatus = getGpsSignalStatus({
            accuracy: journey.accuracy,
            enabled: !!event?.enabled,
            providerEnabled: !!event?.gps,
        });
        journey.provider = event;
        await saveActiveJourney(journey);
        emit("status", journey);
    });

    const onHeartbeat = BGeo.onHeartbeat(async (event) => {
        const sample = normalizeLocationSample(event?.location);
        if (!sample) return;
        emit("location", { sample, heartbeat: true });
    });

    const onHttp = BGeo.onHttp((response) => {
        emit("status", { http: response });
    });

    subscriptionHandles = [onLocation, onMotion, onProvider, onHeartbeat, onHttp];
};

const detachListeners = () => {
    subscriptionHandles.forEach((sub) => {
        try {
            sub?.remove?.();
        } catch (_) {
            // ignore
        }
    });
    subscriptionHandles = [];
    listenersAttached = false;
};

export const subscribeLocation = (fn) => {
    listeners.location.add(fn);
    return () => listeners.location.delete(fn);
};

export const subscribeStatus = (fn) => {
    listeners.status.add(fn);
    return () => listeners.status.delete(fn);
};

export const subscribeError = (fn) => {
    listeners.error.add(fn);
    return () => listeners.error.delete(fn);
};

export const readyBackgroundLocation = async () => {
    if (!readyPromise) {
        readyPromise = (async () => {
            const BGeo = loadBgeo();
            const config = await buildConfig(BGeo);
            const state = await BGeo.ready(config);
            attachListeners(BGeo);
            return state;
        })().catch((err) => {
            readyPromise = null;
            throw err;
        });
    }
    return readyPromise;
};

export const getTrackingState = async () => {
    try {
        const BGeo = loadBgeo();
        return await BGeo.getState();
    } catch (e) {
        return null;
    }
};

export const getOdometerMetres = async () => {
    try {
        const BGeo = loadBgeo();
        const metres = await BGeo.getOdometer();
        return Number.isFinite(metres) ? metres : 0;
    } catch (_) {
        return 0;
    }
};

/**
 * Start Journey — safe against double taps.
 */
export const startJourney = async ({ worker } = {}) => {
    if (busy) {
        return { ok: false, reason: "busy" };
    }
    busy = true;
    try {
        const existing = await loadActiveJourney();
        if (existing?.status === "active") {
            return {
                ok: false,
                reason: "already_active",
                journey: existing,
            };
        }

        const perms = await ensureTrackingPermissions();
        if (!perms.ok) {
            return {
                ok: false,
                reason: "permissions",
                permissions: perms,
            };
        }

        const BGeo = loadBgeo();
        await readyBackgroundLocation();

        await BGeo.resetOdometer();

        const state = await BGeo.start();
        const startedAt = Date.now();
        const localId = `local-${startedAt}`;

        const apiLimitation = AUDITED_JOURNEY_ENDPOINTS;

        const journey = {
            id: localId,
            remoteJourneyId: null,
            status: "active",
            startedAt,
            endedAt: null,
            worker: worker || null,
            route: [],
            lastPoint: null,
            segmentMetres: 0,
            odometerMetres: 0,
            distanceMetres: 0,
            speed: null,
            accuracy: null,
            lastUpdatedAt: startedAt,
            gpsStatus: "active",
            isMoving: !!state?.isMoving,
            apiLimitation,
        };

        await saveActiveJourney(journey);
        emit("status", journey);
        return { ok: true, journey, permissions: perms, state };
    } catch (error) {
        emit("error", error);
        return { ok: false, reason: "start_failed", error: error?.message || String(error) };
    } finally {
        busy = false;
    }
};

/**
 * Stop Journey — sync, preserve distance, stop SDK, cleanup listeners optional.
 */
export const stopJourney = async () => {
    if (busy) {
        return { ok: false, reason: "busy" };
    }
    busy = true;
    try {
        const journey = await loadActiveJourney();
        if (!journey || journey.status !== "active") {
            return { ok: false, reason: "no_active_journey", journey };
        }

        const odometerMetres = await getOdometerMetres();
        journey.odometerMetres = odometerMetres;
        journey.distanceMetres = resolveJourneyDistanceMetres({
            odometerMetres,
            segmentMetres: journey.segmentMetres || 0,
            mode: "reconcile",
        });

        const syncResult = await syncPendingLocations({ journeyId: journey.id });

        journey.status = "stopped";
        journey.endedAt = Date.now();
        journey.gpsStatus = "stopped";
        journey.syncResult = syncResult;
        journey.apiLimitation = AUDITED_JOURNEY_ENDPOINTS;

        await appendJourneyHistory({ ...journey });
        await saveActiveJourney(null);

        try {
            const BGeo = loadBgeo();
            await BGeo.stop();
        } catch (_) {
            // ignore stop failures after local persist
        }

        emit("status", journey);
        return { ok: true, journey, syncResult };
    } catch (error) {
        emit("error", error);
        return { ok: false, reason: "stop_failed", error: error?.message || String(error) };
    } finally {
        busy = false;
    }
};

export const restoreTrackingIfNeeded = async () => {
    try {
        const journey = await loadActiveJourney();
        if (journey?.status !== "active") {
            return { journey, state: null };
        }
        await readyBackgroundLocation();
        const state = await getTrackingState();
        if (state && !state.enabled) {
            const BGeo = loadBgeo();
            await BGeo.start();
        }
        return { journey, state };
    } catch (error) {
        console.log("restoreTrackingIfNeeded failed:", error?.message || error);
        return { journey: null, state: null, error: error?.message || String(error) };
    }
};

export const cleanupSubscriptions = () => {
    detachListeners();
};

export default {
    readyBackgroundLocation,
    startJourney,
    stopJourney,
    getTrackingState,
    getOdometerMetres,
    restoreTrackingIfNeeded,
    subscribeLocation,
    subscribeStatus,
    subscribeError,
    cleanupSubscriptions,
};
