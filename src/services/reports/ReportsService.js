import { BASE_URL } from "../../constant/url";
import { getObjByKey } from "../../utils/Storage";
import {
    DELETENETWORK,
    GETNETWORK,
    getAuthBearerToken,
    POSTNETWORK,
} from "../../utils/Network";

export const MEDIA_BASE_URL = String(BASE_URL || "").replace(/\/?api\/v1\/?$/i, "/");

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
    if (result.error && !result.data && result.statusCode >= 400) return false;
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

export const toZoneCode = (label) => {
    if (!label || label === "All zones") return undefined;
    const raw = String(label).trim();
    if (/^Z[A-Z0-9]+$/i.test(raw)) return raw.toUpperCase();
    const m = raw.match(/Zone\s*([A-Z0-9]+)/i);
    if (m) return `Z${String(m[1]).toUpperCase()}`;
    return raw;
};

export const resolveReportPhotoUrl = (value) => {
    if (!value) return null;
    if (typeof value === "object") {
        const nested =
            value.uri || value.url || value.path || value.photoUrl || value.photoPath;
        return resolveReportPhotoUrl(nested);
    }
    let raw = String(value).trim();
    if (!raw || raw === "null" || raw === "undefined") return null;
    raw = raw.replace(/\\/g, "/");
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    const base = MEDIA_BASE_URL.endsWith("/") ? MEDIA_BASE_URL : `${MEDIA_BASE_URL}/`;
    if (raw.startsWith("/")) {
        try {
            return `${new URL(base).origin}${raw}`;
        } catch (_) {
            return `${base}${raw.replace(/^\//, "")}`;
        }
    }
    return `${base}${raw.replace(/^\.\//, "")}`;
};

const formatAgo = (iso) => {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "—";
    const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const mapReport = (item) => {
    if (!item || typeof item !== "object") return null;
    const photoUrl = resolveReportPhotoUrl(
        item.photoUrl || item.photoPath || item.photo || item.imageUrl
    );
    const lat = item.latitude ?? item.lat;
    const lng = item.longitude ?? item.lng;
    const coords =
        lat != null && lng != null && lat !== "" && lng !== ""
            ? `${lat}, ${lng}`
            : "—";
    const createdAt = item.createdAt || item.created_at || null;
    const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
    const todayStart = dayStart(new Date());
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
    let period = "older";
    if (Number.isFinite(createdMs)) {
        if (createdMs >= todayStart) period = "today";
        else if (createdMs >= weekStart) period = "week";
    }

    const title = toErrorText(item.title, "Field report");
    const description = toErrorText(item.description, "");
    const reporterName = toErrorText(
        item.reporter?.name || item.reporterName || item.user?.name,
        "—"
    );
    const supervisorName = toErrorText(
        item.supervisor?.name || item.supervisorName,
        "—"
    );
    const zoneCode = toErrorText(
        item.zoneCode || item.supervisor?.zoneCode || item.zone,
        "—"
    );

    return {
        raw: item,
        id: item.id,
        userId: item.userId ?? item.reporter?.id ?? null,
        supervisorId: item.supervisorId ?? item.supervisor?.id ?? null,
        zoneCode,
        zone: zoneCode,
        title,
        description,
        desc: description,
        photoUrl,
        photoPath: item.photoPath || null,
        latitude: lat != null ? String(lat) : "",
        longitude: lng != null ? String(lng) : "",
        coords,
        gpsAccuracy: item.gpsAccuracy ?? null,
        source: item.source || "mobile",
        reporter: reporterName,
        reporterId: item.reporter?.id ?? item.userId ?? null,
        supervisor: supervisorName,
        supervisorZone: item.supervisor?.zoneCode || zoneCode,
        createdAt,
        ago: formatAgo(createdAt),
        date: createdAt
            ? new Date(createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
              })
            : "—",
        period,
        media: photoUrl ? 1 : 0,
        image: photoUrl ? { uri: photoUrl } : null,
        photo: photoUrl ? { uri: photoUrl } : null,
        location: coords,
        status: "submitted",
        mine: false,
    };
};

/** GET /reports */
export const fetchFieldReports = async (params = {}) => {
    const url = withQuery("reports", {
        page: params.page || 1,
        limit: params.limit || 20,
        zoneCode: params.zoneCode ? toZoneCode(params.zoneCode) : undefined,
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
    });
    const result = await GETNETWORK(url, true);
    const list = extractList(result).map(mapReport).filter(Boolean);
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
        message: toErrorText(result?.error || result?.message, "Failed to load reports"),
    };
};

/**
 * POST /reports — multipart/form-data (photo optional).
 * Uses Bearer token from loginResponse (same as GETNETWORK/POSTNETWORK).
 * When no photo, falls back to POSTNETWORK JSON.
 */
export const createFieldReport = async (payload = {}) => {
    const description = String(payload.description || "").trim();
    if (description.length < 5 || description.length > 2000) {
        return {
            ok: false,
            data: null,
            message: "Description must be 5–2000 characters",
        };
    }

    const title = String(payload.title || "").trim();
    if (title.length > 160) {
        return { ok: false, data: null, message: "Title must be at most 160 characters" };
    }

    const fields = {
        description,
        source: "mobile",
    };
    if (title) fields.title = title;
    if (payload.supervisorId != null && payload.supervisorId !== "") {
        fields.supervisorId = String(payload.supervisorId);
    }
    if (payload.latitude != null && payload.latitude !== "") {
        fields.latitude = String(payload.latitude);
    }
    if (payload.longitude != null && payload.longitude !== "") {
        fields.longitude = String(payload.longitude);
    }
    if (payload.gpsAccuracy != null && payload.gpsAccuracy !== "") {
        fields.gpsAccuracy = String(payload.gpsAccuracy);
    }

    let result;
    if (payload.photo?.uri || payload.photoUri) {
        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, v));
        const photo = payload.photo?.uri
            ? payload.photo
            : {
                  uri: payload.photoUri,
                  type: "image/jpeg",
                  name: "report.jpg",
              };
        form.append("photo", {
            uri: photo.uri,
            type: photo.type || "image/jpeg",
            name: photo.fileName || photo.name || "report.jpg",
        });

        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return { ok: false, data: null, message: "Please login again" };
        }

        const response = await fetch(`${BASE_URL}reports`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${authToken}`,
                // Do not set Content-Type — RN sets multipart boundary
            },
            body: form,
        });
        const text = await response.text();
        try {
            result = text ? JSON.parse(text) : {};
        } catch (_) {
            result = { message: text || "Create failed" };
        }
        result = { ...result, statusCode: response.status, ok: response.ok };
    } else {
        result = await POSTNETWORK(`${BASE_URL}reports`, fields, true);
    }

    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        Number(result?.statusCode) === 201;
    return {
        result,
        ok,
        data: result?.data ? mapReport(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "Report submitted" : "Failed to submit report"
        ),
    };
};

/** DELETE /reports/:id — Super Admin only */
export const deleteFieldReport = async (id) => {
    if (id == null || id === "") {
        return { ok: false, message: "Report id is required" };
    }
    const result = await DELETENETWORK(`${BASE_URL}reports/${id}`, true);
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
            ok ? "Report deleted" : "Failed to delete report"
        ),
    };
};

/** Mark mine=true using loginResponse user id */
export const markMineReports = async (list = []) => {
    try {
        const loginRes = await getObjByKey("loginResponse");
        const user =
            loginRes?.user ||
            loginRes?.data?.user ||
            loginRes?.data ||
            loginRes ||
            {};
        const myId = user?.id ?? user?.userId ?? null;
        if (myId == null) return list;
        return list.map((r) => ({
            ...r,
            mine: String(r.reporterId ?? r.userId) === String(myId),
        }));
    } catch (_) {
        return list;
    }
};
