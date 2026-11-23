import { BASE_URL } from "../../constant/url";
import {
    DELETENETWORK,
    GETNETWORK,
    PATCHNETWORK,
    POSTNETWORK,
} from "../../utils/Network";

/** Must match backend VEHICLE_TYPE_LABEL keys. */
export const VEHICLE_TYPE_LABEL = {
    truck: "Truck",
    patrol_van: "Patrol Van",
    sanitation: "Sanitation",
    maintenance: "Maintenance",
    van: "Van",
    car: "Car",
};

export const VEHICLE_TYPE_OPTIONS = Object.entries(VEHICLE_TYPE_LABEL).map(
    ([key, label]) => ({ key, label })
);

export const VEHICLE_STATUS_LABEL = {
    active: "Active",
    idle: "Idle",
    offline: "Offline",
};

export const VEHICLE_STATUS_OPTIONS = Object.entries(VEHICLE_STATUS_LABEL).map(
    ([key, label]) => ({ key, label })
);

export const toErrorText = (value, fallback = "Something went wrong") => {
    if (value == null || value === "") return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
    if (typeof value?.error?.message === "string") return value.error.message;
    if (Array.isArray(value?.errors) && value.errors.length) {
        return value.errors
            .map((e) => (typeof e === "string" ? e : e?.message || JSON.stringify(e)))
            .join(", ");
    }
    try {
        return JSON.stringify(value);
    } catch (_) {
        return fallback;
    }
};

export const isApiSuccess = (result) => {
    if (!result) return false;
    if (result.ok === false) return false;
    if (result.success === false) return false;
    if (result.error) return false;
    const code = Number(result.statusCode || result.status || 0);
    if (code >= 400) return false;
    return true;
};

const withQuery = (path, params = {}) => {
    const entries = Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
    );
    if (!entries.length) return `${BASE_URL}${path}`;
    const qs = entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
    return `${BASE_URL}${path}?${qs}`;
};

const extractList = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.data)) return result.data.data;
    return [];
};

const STATUS_COLORS = {
    active: "#16A34A",
    idle: "#F59E0B",
    offline: "#64748B",
};

export const formatRelativePing = (iso) => {
    if (!iso) return "—";
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return String(iso);
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "ping just now";
    if (mins < 60) return `ping ${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `ping ${hours}h ago`;
    return new Date(ts).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
};

export const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
};

export const formatDuration = (startIso, endIso) => {
    const a = Date.parse(startIso);
    const b = Date.parse(endIso);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return "—";
    const mins = Math.round((b - a) / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
};

export const mapVehicle = (item) => {
    const status = String(item?.status || "active").toLowerCase();
    const typeKey = String(item?.vehicleType || "").toLowerCase();
    return {
        id: item?.id,
        vehicleNumber: item?.vehicleNumber || "—",
        vehicleType: typeKey,
        vehicleTypeLabel:
            item?.vehicleTypeLabel ||
            VEHICLE_TYPE_LABEL[typeKey] ||
            item?.vehicleType ||
            "—",
        driverName: item?.driverName || "—",
        driverMobile: item?.driverMobile || "—",
        zoneCode: item?.zoneCode || "—",
        supervisorId: item?.supervisorId ?? item?.supervisor?.id ?? null,
        supervisorName: item?.supervisor?.name || "—",
        roadSegment: item?.supervisor?.assignedRoadSegment || "",
        status,
        statusLabel: VEHICLE_STATUS_LABEL[status] || status,
        statusColor: STATUS_COLORS[status] || STATUS_COLORS.active,
        latitude: Number.isFinite(Number(item?.latitude))
            ? Number(item.latitude)
            : null,
        longitude: Number.isFinite(Number(item?.longitude))
            ? Number(item.longitude)
            : null,
        streamUrl: item?.streamUrl || "",
        notes: item?.notes || "",
        lastPingAt: item?.lastPingAt || null,
        pingLabel: formatRelativePing(item?.lastPingAt),
        place:
            item?.supervisor?.assignedRoadSegment ||
            item?.zoneCode ||
            item?.notes ||
            "Corridor",
        raw: item,
    };
};

export const mapRecording = (item) => ({
    id: item?.id,
    vehicleId: item?.vehicleId ?? item?.vehicle?.id,
    vehicleNumber: item?.vehicle?.vehicleNumber || "—",
    vehicleType:
        item?.vehicle?.vehicleTypeLabel ||
        VEHICLE_TYPE_LABEL[item?.vehicle?.vehicleType] ||
        item?.vehicle?.vehicleType ||
        "—",
    zoneCode: item?.vehicle?.zoneCode || "—",
    videoUrl: item?.videoUrl || "",
    startTime: item?.startTime,
    endTime: item?.endTime,
    startLabel: formatDateTime(item?.startTime),
    endLabel: formatDateTime(item?.endTime),
    duration: formatDuration(item?.startTime, item?.endTime),
    note: item?.note || "",
    raw: item,
});

export const mapAlert = (item) => ({
    id: item?.id,
    vehicleId: item?.vehicleId ?? item?.vehicle?.id,
    vehicleNumber: toErrorText(
        item?.vehicle?.vehicleNumber || item?.vehicleNumber,
        "—"
    ),
    vehicleType: toErrorText(
        item?.vehicle?.vehicleType || item?.vehicleType,
        "—"
    ),
    type: toErrorText(item?.type, "alert"),
    message: toErrorText(item?.message, "Fleet alert"),
    acknowledged: !!item?.acknowledged,
    createdAt: item?.createdAt,
    createdLabel: formatDateTime(item?.createdAt),
    raw: item,
});

export const mapCorridorPoint = (item, index = 0) => ({
    id: `corridor-${item?.zoneCode || index}`,
    latitude: Number(item?.lat),
    longitude: Number(item?.lng),
    label: String(item?.zoneCode || item?.name || "C").charAt(0).toUpperCase(),
    color: "#2563EB",
    name: item?.name || item?.zoneCode || "Corridor",
    zoneCode: item?.zoneCode || "",
});

/** GET /fleet/vehicles */
export const fetchVehicles = async () => {
    const result = await GETNETWORK(`${BASE_URL}fleet/vehicles`, true);
    const list = extractList(result).map(mapVehicle);
    const corridor = (Array.isArray(result?.corridor) ? result.corridor : [])
        .map(mapCorridorPoint)
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    return { result, ok: isApiSuccess(result), data: list, corridor };
};

/** GET /fleet/vehicles/:id */
export const fetchVehicleById = async (id) => {
    const result = await GETNETWORK(`${BASE_URL}fleet/vehicles/${id}`, true);
    return {
        result,
        ok: isApiSuccess(result),
        data: result?.data ? mapVehicle(result.data) : null,
    };
};

/** POST /fleet/vehicles */
export const createVehicle = async (payload) => {
    const result = await POSTNETWORK(`${BASE_URL}fleet/vehicles`, payload, true);
    return {
        result,
        ok: isApiSuccess(result),
        data: result?.data ? mapVehicle(result.data) : null,
        message: toErrorText(result?.error || result?.message, "Failed to add vehicle"),
    };
};

/** PATCH /fleet/vehicles/:id */
export const updateVehicle = async (id, payload) => {
    const result = await PATCHNETWORK(
        `${BASE_URL}fleet/vehicles/${id}`,
        payload,
        true
    );
    return {
        result,
        ok: isApiSuccess(result) || result?.ok === true,
        data: result?.data ? mapVehicle(result.data) : null,
        message: toErrorText(result?.error || result?.message, "Failed to update vehicle"),
    };
};

/**
 * Switch Off — PATCH /fleet/vehicles/:id with status offline.
 * Backend creates a Fleet Alert + notification when status becomes offline.
 */
export const switchOffVehicle = async (id) => {
    const res = await updateVehicle(id, { status: "offline" });
    return {
        ...res,
        message: res.ok
            ? toErrorText(res.result?.message, "Vehicle switched off")
            : toErrorText(res.message, "Failed to switch off vehicle"),
    };
};

/** DELETE /fleet/vehicles/:id */
export const deleteVehicle = async (id) => {
    const result = await DELETENETWORK(`${BASE_URL}fleet/vehicles/${id}`, true);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        Number(result?.statusCode) === 204 ||
        Number(result?.statusCode) === 200;
    return {
        result,
        ok,
        message: toErrorText(result?.error || result?.message, "Failed to delete vehicle"),
    };
};

/** GET /fleet/recordings */
export const fetchRecordings = async (params = {}) => {
    const url = withQuery("fleet/recordings", {
        vehicleId: params.vehicleId,
        from: params.from,
        to: params.to,
        page: params.page || 1,
        limit: params.limit || 20,
    });
    const result = await GETNETWORK(url, true);
    return {
        result,
        ok: isApiSuccess(result),
        data: extractList(result).map(mapRecording),
        meta: result?.meta || {},
    };
};

/** POST /fleet/recordings */
export const createRecording = async (payload) => {
    const result = await POSTNETWORK(`${BASE_URL}fleet/recordings`, payload, true);
    return {
        result,
        ok: isApiSuccess(result),
        data: result?.data ? mapRecording(result.data) : null,
        message: toErrorText(result?.error || result?.message, "Failed to add recording"),
    };
};

/** DELETE /fleet/recordings/:id */
export const deleteRecording = async (id) => {
    const result = await DELETENETWORK(`${BASE_URL}fleet/recordings/${id}`, true);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        Number(result?.statusCode) === 204 ||
        Number(result?.statusCode) === 200;
    return {
        result,
        ok,
        message: toErrorText(result?.error || result?.message, "Failed to delete recording"),
    };
};

/** GET /fleet/alerts */
export const fetchFleetAlerts = async (params = {}) => {
    const url = withQuery("fleet/alerts", {
        page: params.page || 1,
        limit: params.limit || 20,
    });
    const result = await GETNETWORK(url, true);
    return {
        result,
        ok: isApiSuccess(result),
        data: extractList(result).map(mapAlert),
        meta: result?.meta || {},
    };
};

/** PATCH /fleet/alerts/:id — acknowledge */
export const acknowledgeFleetAlert = async (id) => {
    const result = await PATCHNETWORK(`${BASE_URL}fleet/alerts/${id}`, {}, true);
    return {
        result,
        ok: isApiSuccess(result) || result?.ok === true,
        data: result?.data ? mapAlert(result.data) : null,
        message: toErrorText(result?.error || result?.message, "Failed to acknowledge alert"),
    };
};

export const summarizeVehicles = (vehicles = []) => {
    const list = Array.isArray(vehicles) ? vehicles : [];
    return {
        total: list.length,
        active: list.filter((v) => v.status === "active").length,
        idle: list.filter((v) => v.status === "idle").length,
        offline: list.filter((v) => v.status === "offline").length,
    };
};

export const isValidIndianMobile = (value) =>
    /^[6-9]\d{9}$/.test(String(value || "").trim());

export const isValidUrl = (value) => {
    const text = String(value || "").trim();
    if (!text) return true;
    try {
        // eslint-disable-next-line no-new
        new URL(text);
        return true;
    } catch (_) {
        return false;
    }
};
