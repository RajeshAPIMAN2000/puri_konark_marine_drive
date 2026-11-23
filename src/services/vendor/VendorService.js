import { BASE_URL } from "../../constant/url";
import {
    DELETENETWORK,
    GETNETWORK,
    PATCHNETWORK,
    POSTNETWORK,
} from "../../utils/Network";
import { getObjByKey } from "../../utils/Storage";

export const VENDOR_STATUSES = ["active", "inactive", "unverified"];

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
    if (result.error && !result.data && Number(result.statusCode || 0) >= 400) return false;
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
    if (Array.isArray(result?.vendors)) return result.vendors;
    return [];
};

export const mapVendor = (item) => {
    if (!item || typeof item !== "object") return null;
    const lat = item.latitude ?? item.lat;
    const lng = item.longitude ?? item.lng;
    const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    const status = String(item.status || (hasCoords ? "active" : "unverified")).toLowerCase();
    const shopName = toErrorText(item.shopName || item.name || item.shop, "Vendor");
    const ownerName = toErrorText(item.ownerName || item.owner, "—");
    const mobile = toErrorText(item.mobileNumber || item.mobile || item.phone, "—");
    const zoneCode = toErrorText(item.zoneCode || item.supervisor?.zoneCode, "—");
    const color = String(item.zoneColor || item.color || item.supervisor?.color || "#1D4ED8");
    const initial = String(shopName).trim().charAt(0).toUpperCase() || "V";

    return {
        raw: item,
        id: item.id,
        shopName,
        shop: shopName,
        name: shopName,
        ownerName,
        owner: ownerName,
        mobileNumber: mobile,
        phone: mobile,
        mobile,
        latitude: hasCoords ? Number(lat) : null,
        longitude: hasCoords ? Number(lng) : null,
        coords: hasCoords ? `${lat}, ${lng}` : "—",
        location: hasCoords ? `${lat}, ${lng}` : "—",
        sideRemark: item.sideRemark != null ? String(item.sideRemark) : "",
        status,
        statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
        supervisorId: item.supervisorId ?? item.supervisor?.id ?? null,
        supervisorName: toErrorText(item.supervisor?.name, "—"),
        supervisorMobile: toErrorText(item.supervisor?.mobile, ""),
        zoneCode,
        zone: zoneCode === "—" ? "—" : `Zone ${zoneCode}`,
        zoneColor: color,
        color,
        roadSegment: toErrorText(item.roadSegment || item.assignedRoadSegment, ""),
        flagged: !!item.flagged,
        initial,
        verified: status === "active",
    };
};

/** Resolve logged-in role for UI gates (delete = super_admin only). */
export const getLoginRoleKey = async () => {
    try {
        const loginRes = await getObjByKey("loginResponse");
        const user = loginRes?.user || loginRes?.data?.user || loginRes?.data || loginRes || {};
        const role = String(user?.role || loginRes?.role || "").toLowerCase();
        if (role.includes("super")) return "super_admin";
        if (role.includes("authority") || role.includes("nodal")) return "authority";
        if (role.includes("supervisor")) return "supervisor";
        if (role.includes("grievance") || role.includes("officer")) return "grievance_officer";
        if (role.includes("field")) return "field_staff";
        return role || "";
    } catch (_) {
        return "";
    }
};

/** GET /vendors */
export const fetchVendors = async (params = {}) => {
    const url = withQuery("vendors", {
        page: params.page || 1,
        limit: params.limit || 20,
        supervisorId: params.supervisorId || undefined,
        status: params.status && params.status !== "all" ? params.status : undefined,
        q: params.q || undefined,
    });
    const result = await GETNETWORK(url, true);
    const list = extractList(result).map(mapVendor).filter(Boolean);
    const meta = result?.meta || result?.data?.meta || {};
    return {
        result,
        ok: isApiSuccess(result),
        data: list,
        meta: {
            page: Number(meta.page || params.page || 1),
            limit: Number(meta.limit || params.limit || 20),
            total: Number(meta.total ?? list.length),
            totalPages: Number(meta.totalPages || 1),
        },
        message: toErrorText(result?.error || result?.message, "Failed to load vendors"),
    };
};

/** GET /vendors/map */
export const fetchVendorsMap = async () => {
    const result = await GETNETWORK(`${BASE_URL}vendors/map`, true);
    const zonesRaw = Array.isArray(result?.zones)
        ? result.zones
        : Array.isArray(result?.data?.zones)
          ? result.data.zones
          : [];
    const vendorsRaw = Array.isArray(result?.vendors)
        ? result.vendors
        : Array.isArray(result?.data?.vendors)
          ? result.data.vendors
          : extractList(result);
    const vendors = vendorsRaw.map(mapVendor).filter(Boolean);
    const zones = zonesRaw.map((z) => ({
        code: String(z.code || z.zoneCode || ""),
        name: toErrorText(z.name || z.roadSegment || z.assignedRoadSegment, "Zone"),
        supervisor: z.supervisor || null,
        vendorCount: Number(z.vendorCount ?? 0),
        unverifiedCount: Number(z.unverifiedCount ?? 0),
        range: z.range || null,
        bbox: z.bbox || null,
        centroid: z.centroid || null,
        color: z.supervisor?.color || z.color || "#1D4ED8",
    }));
    return {
        result,
        ok: isApiSuccess(result) || zones.length > 0 || vendors.length > 0,
        zones,
        vendors,
        flaggedCount: Number(result?.flaggedCount ?? result?.data?.flaggedCount ?? 0),
        message: toErrorText(result?.error || result?.message, "Failed to load vendor map"),
    };
};

/** GET /vendors/:id */
export const fetchVendorById = async (id) => {
    const result = await GETNETWORK(`${BASE_URL}vendors/${id}`, true);
    const raw =
        result?.data && typeof result.data === "object" && !Array.isArray(result.data)
            ? result.data
            : null;
    return {
        result,
        ok: isApiSuccess(result) && !!raw,
        data: raw ? mapVendor(raw) : null,
        message: toErrorText(result?.error || result?.message, "Failed to load vendor"),
    };
};

/** POST /vendors */
export const createVendor = async (payload = {}) => {
    const shopName = String(payload.shopName || "").trim();
    const ownerName = String(payload.ownerName || "").trim();
    const mobileNumber = String(payload.mobileNumber || payload.mobile || "").trim();
    const sideRemark = String(payload.sideRemark || "").trim();
    const status = payload.status ? String(payload.status).toLowerCase() : undefined;
    const supervisorId =
        payload.supervisorId != null && payload.supervisorId !== ""
            ? Number(payload.supervisorId)
            : undefined;
    const latitude =
        payload.latitude != null && payload.latitude !== ""
            ? Number(payload.latitude)
            : undefined;
    const longitude =
        payload.longitude != null && payload.longitude !== ""
            ? Number(payload.longitude)
            : undefined;

    if (!shopName || shopName.length > 160) {
        return { ok: false, data: null, message: "Shop name is required (1–160 characters)" };
    }
    if (!ownerName || ownerName.length > 120) {
        return { ok: false, data: null, message: "Owner name is required (1–120 characters)" };
    }
    if (!mobileNumber || mobileNumber.length > 24) {
        return { ok: false, data: null, message: "Mobile number is required" };
    }
    if (status && !VENDOR_STATUSES.includes(status)) {
        return { ok: false, data: null, message: "Status must be active, inactive, or unverified" };
    }

    const body = { shopName, ownerName, mobileNumber };
    if (supervisorId) body.supervisorId = supervisorId;
    if (Number.isFinite(latitude)) body.latitude = latitude;
    if (Number.isFinite(longitude)) body.longitude = longitude;
    if (sideRemark) body.sideRemark = sideRemark;
    if (status) body.status = status;

    const result = await POSTNETWORK(`${BASE_URL}vendors`, body, true);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        Number(result?.statusCode) === 201;
    return {
        result,
        ok,
        data: result?.data ? mapVendor(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "Vendor registered" : "Failed to register vendor"
        ),
    };
};

/** PATCH /vendors/:id — send both lat/lng together when moving a marker */
export const updateVendor = async (id, payload = {}) => {
    if (id == null || id === "") {
        return { ok: false, data: null, message: "Vendor id is required" };
    }
    const body = {};
    if (payload.shopName != null) body.shopName = String(payload.shopName).trim();
    if (payload.ownerName != null) body.ownerName = String(payload.ownerName).trim();
    if (payload.mobileNumber != null || payload.mobile != null) {
        body.mobileNumber = String(payload.mobileNumber || payload.mobile || "").trim();
    }
    if (payload.sideRemark != null) body.sideRemark = String(payload.sideRemark).trim();
    if (payload.status != null) body.status = String(payload.status).toLowerCase();

    const hasLat = Object.prototype.hasOwnProperty.call(payload, "latitude");
    const hasLng = Object.prototype.hasOwnProperty.call(payload, "longitude");
    if (hasLat || hasLng) {
        // Always send both to avoid clearing the other coordinate on the backend.
        body.latitude =
            payload.latitude === null || payload.latitude === ""
                ? null
                : Number(payload.latitude);
        body.longitude =
            payload.longitude === null || payload.longitude === ""
                ? null
                : Number(payload.longitude);
    }

    const result = await PATCHNETWORK(`${BASE_URL}vendors/${id}`, body, true);
    const ok = isApiSuccess(result) || result?.ok === true;
    return {
        result,
        ok,
        data: result?.data ? mapVendor(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "Vendor updated" : "Failed to update vendor"
        ),
    };
};

/** DELETE /vendors/:id — Super Admin only */
export const deleteVendor = async (id) => {
    if (id == null || id === "") {
        return { ok: false, message: "Vendor id is required" };
    }
    const result = await DELETENETWORK(`${BASE_URL}vendors/${id}`, true);
    const status = Number(result?.statusCode || result?.status || 0);
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
            ok ? "Vendor deleted" : "Failed to delete vendor"
        ),
    };
};
