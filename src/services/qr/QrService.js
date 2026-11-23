import { BASE_URL } from "../../constant/url";
import {
    DELETENETWORK,
    GETNETWORK,
    PATCHNETWORK,
    POSTNETWORK,
} from "../../utils/Network";

export const toErrorText = (value, fallback = "Something went wrong") => {
    if (value == null || value === "") return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
    if (typeof value?.error?.message === "string") return value.error.message;
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
    if (result.error && result.data == null) return false;
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

const formatCreated = (iso) => {
    if (!iso) return "—";
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return String(iso);
    try {
        return new Date(ts).toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch (_) {
        return String(iso);
    }
};

export const mapQrCode = (item) => {
    if (!item || typeof item !== "object") return null;
    const supervisor = item.supervisor && typeof item.supervisor === "object" ? item.supervisor : {};
    const vendor = item.vendor && typeof item.vendor === "object" ? item.vendor : {};
    const code = toErrorText(item.code, "");
    const zoneCode = toErrorText(item.zoneCode || supervisor.zoneCode, "—");
    const locationName = toErrorText(item.locationName, "—");
    return {
        raw: item,
        id: item.id,
        code,
        // legacy UI aliases used by existing cards/modals
        place: locationName,
        locationName,
        zone: zoneCode,
        zoneCode,
        zoneName: toErrorText(
            supervisor.assignedRoadSegment || item.zoneName || zoneCode,
            zoneCode
        ),
        active: item.active !== false,
        notes: toErrorText(item.notes, ""),
        created: formatCreated(item.createdAt || item.created || item.updatedAt),
        createdAt: item.createdAt || item.created || null,
        supervisorId: item.supervisorId ?? supervisor.id ?? null,
        supervisorName: toErrorText(supervisor.name, "—"),
        vendorId: item.vendorId ?? vendor.id ?? null,
        vendorName: toErrorText(vendor.shopName || vendor.name, "—"),
        vendorOwner: toErrorText(vendor.ownerName || vendor.owner, ""),
        supervisor,
        vendor,
    };
};

/** GET /qr */
export const fetchQrCodes = async (params = {}) => {
    const url = withQuery("qr", {
        page: params.page || 1,
        limit: params.limit || 30,
        zoneCode: params.zoneCode,
        active:
            params.active === true || params.active === false
                ? String(params.active)
                : params.active === "true" || params.active === "false"
                  ? params.active
                  : undefined,
    });
    const result = await GETNETWORK(url, true);
    const data = extractList(result).map(mapQrCode).filter(Boolean);
    return {
        result,
        ok: isApiSuccess(result),
        data,
        meta: result?.meta || {},
        message: toErrorText(result?.error || result?.message, "Failed to load QR codes"),
    };
};

/** POST /qr */
export const createQrCode = async (payload = {}) => {
    const body = {
        locationName: String(payload.locationName || "").trim(),
        zoneCode: String(payload.zoneCode || "").trim(),
    };
    if (!body.locationName) {
        return { ok: false, data: null, message: "Location name is required" };
    }
    if (!body.zoneCode) {
        return { ok: false, data: null, message: "Zone code is required" };
    }
    if (payload.vendorId != null && payload.vendorId !== "") {
        body.vendorId = Number(payload.vendorId);
    }
    if (payload.notes != null && String(payload.notes).trim()) {
        body.notes = String(payload.notes).trim();
    }
    const result = await POSTNETWORK(`${BASE_URL}qr`, body, true);
    return {
        result,
        ok: isApiSuccess(result) || Boolean(result?.data) || Number(result?.statusCode) === 201,
        data: result?.data ? mapQrCode(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            result?.data ? `Generated ${result.data.code || "QR code"}` : "Failed to generate QR code"
        ),
    };
};

/** PATCH /qr/:id */
export const updateQrCode = async (id, payload = {}) => {
    if (id == null) {
        return { ok: false, data: null, message: "QR id is required" };
    }
    const body = {};
    if (typeof payload.active === "boolean") body.active = payload.active;
    if (payload.locationName != null) body.locationName = String(payload.locationName).trim();
    if (payload.notes != null) body.notes = String(payload.notes).trim();
    const result = await PATCHNETWORK(`${BASE_URL}qr/${id}`, body, true);
    return {
        result,
        ok: isApiSuccess(result) || Boolean(result?.data),
        data: result?.data ? mapQrCode({ ...payload, ...result.data, id }) : null,
        message: toErrorText(result?.error || result?.message, "Failed to update QR code"),
    };
};

/** DELETE /qr/:id */
export const deleteQrCode = async (id) => {
    if (id == null) {
        return { ok: false, message: "QR id is required" };
    }
    const result = await DELETENETWORK(`${BASE_URL}qr/${id}`, true);
    const status = Number(result?.statusCode || 0);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        status === 204 ||
        status === 200;
    return {
        result,
        ok,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "QR code deleted" : "Failed to delete QR code"
        ),
    };
};
