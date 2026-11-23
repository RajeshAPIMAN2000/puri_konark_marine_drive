import { deleteByKeys, getObjByKey, storeObjByKey } from "../../utils/Storage";
import { BASE_URL } from "../../constant/url";
import { BGEO_LOCATION_UPLOAD_URL } from "../../constant/mapEnv";
import { POSTNETWORK } from "../../utils/Network";

const PENDING_KEY = "pkmd_pending_locations";
const JOURNEY_KEY = "pkmd_active_journey";
const HISTORY_KEY = "pkmd_journey_history";

/**
 * Frontend-only sync helpers.
 *
 * Audit finding: this RN app has no existing Start/Stop Journey or location-upload
 * API service wired to BASE_URL. We therefore:
 *  - Persist journeys + points locally
 *  - Only POST when an explicit upload URL / known contract is configured
 *  - Never invent backend payloads that would require schema changes
 */

export const getConfiguredUploadUrl = () => {
    if (BGEO_LOCATION_UPLOAD_URL && String(BGEO_LOCATION_UPLOAD_URL).trim()) {
        return String(BGEO_LOCATION_UPLOAD_URL).trim();
    }
    return null;
};

export const loadActiveJourney = async () => getObjByKey(JOURNEY_KEY);

export const saveActiveJourney = async (journey) => {
    if (!journey) {
        await deleteByKeys([JOURNEY_KEY]);
        return;
    }
    await storeObjByKey(JOURNEY_KEY, journey);
};

export const loadJourneyHistory = async () => {
    const list = await getObjByKey(HISTORY_KEY);
    return Array.isArray(list) ? list : [];
};

export const appendJourneyHistory = async (journey) => {
    const list = await loadJourneyHistory();
    list.unshift(journey);
    await storeObjByKey(HISTORY_KEY, list.slice(0, 100));
};

export const loadPendingLocations = async () => {
    const list = await getObjByKey(PENDING_KEY);
    return Array.isArray(list) ? list : [];
};

export const enqueuePendingLocations = async (points = []) => {
    if (!points.length) return;
    const existing = await loadPendingLocations();
    const merged = [...existing, ...points].slice(-5000);
    await storeObjByKey(PENDING_KEY, merged);
};

export const clearPendingLocations = async () => {
    await storeObjByKey(PENDING_KEY, []);
};

/**
 * Attempt sync of pending points if (and only if) an upload URL is configured.
 * Returns { synced, skipped, reason, response }.
 */
export const syncPendingLocations = async ({ journeyId } = {}) => {
    const uploadUrl = getConfiguredUploadUrl();
    const pending = await loadPendingLocations();

    if (!pending.length) {
        return { synced: 0, skipped: true, reason: "empty_queue" };
    }

    if (!uploadUrl) {
        // Preserve offline queue; no backend location contract in this frontend.
        return {
            synced: 0,
            skipped: true,
            reason: "no_location_upload_endpoint",
            pending: pending.length,
            note:
                "No Start/Stop/Location Update API is defined in the existing RN services. " +
                "Points remain queued locally. Set BGEO_LOCATION_UPLOAD_URL when backend contract exists.",
        };
    }

    try {
        const payload = {
            journeyId: journeyId || null,
            locations: pending,
            source: "bgeo-js-sync",
        };
        const response = await POSTNETWORK(uploadUrl, payload, true);
        await clearPendingLocations();
        return { synced: pending.length, skipped: false, response };
    } catch (error) {
        return {
            synced: 0,
            skipped: false,
            reason: "sync_failed",
            error: error?.message || String(error),
            pending: pending.length,
        };
    }
};

/**
 * Existing authenticated API surface used elsewhere in this app.
 * Exposed for future journey wiring without inventing new routes.
 */
export const existingApiBase = () => BASE_URL;

/**
 * Probe helpers — these paths are NOT called unless product confirms contracts.
 * Kept as documentation of what was searched for in the frontend audit.
 */
export const AUDITED_JOURNEY_ENDPOINTS = {
    startJourney: null,
    stopJourney: null,
    locationUpdate: null,
    journeyHistory: null,
    note:
        "Frontend audit found no journey/start/stop/location-update service functions. " +
        "Existing BASE_URL callers: users/login, users/register, users/verifyOtp, versions/get, enterFCMTokenDetails.",
};
