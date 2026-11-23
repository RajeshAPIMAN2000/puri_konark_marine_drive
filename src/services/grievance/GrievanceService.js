import { BASE_URL } from "../../constant/url";
import { getObjByKey } from "../../utils/Storage";
import {
    DELETENETWORK,
    GETNETWORK,
    PATCHNETWORK,
    POSTNETWORK,
} from "../../utils/Network";

/** UI label ↔ API category value (must match backend CATEGORIES). */
export const GRIEVANCE_CATEGORIES = [
    { key: "garbage_waste", label: "Garbage / Waste", color: "#F07800" },
    { key: "street_lighting", label: "Street Lighting", color: "#087F9D" },
    { key: "road_surface", label: "Road Surface", color: "#475569" },
    { key: "water_drainage", label: "Water / Drainage", color: "#1763E8" },
    { key: "vendor_dispute", label: "Vendor Dispute", color: "#8739E8" },
    { key: "encroachment", label: "Encroachment", color: "#DE298B" },
    { key: "safety", label: "Safety", color: "#E32626" },
];

export const GRIEVANCE_CATEGORY_OPTIONS = GRIEVANCE_CATEGORIES.map((c) => c.label);

export const GRIEVANCE_ZONE_OPTIONS = ["Z01", "Z02", "Z03", "Z04", "Z05", "Z06", "Z07"];

export const GRIEVANCE_STATUS = {
    open: "open",
    assigned: "assigned",
    in_progress: "in_progress",
    resolved: "resolved",
};

export const GRIEVANCE_STATUS_LABEL = {
    open: "Open",
    assigned: "Assigned",
    in_progress: "In Progress",
    resolved: "Resolved",
};

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
    if (result.error && !result.data) return false;
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

const resolveAuthToken = (loginRes) =>
    loginRes?.accessToken ||
    loginRes?.token ||
    loginRes?.data?.accessToken ||
    loginRes?.data?.token ||
    (typeof loginRes?.data === "string" ? loginRes.data : null);

const categoryMeta = (value) => {
    const raw = String(value || "").trim();
    const byKey = GRIEVANCE_CATEGORIES.find(
        (c) => c.key === raw || c.key === raw.toLowerCase()
    );
    if (byKey) return byKey;
    const byLabel = GRIEVANCE_CATEGORIES.find(
        (c) => c.label.toLowerCase() === raw.toLowerCase()
    );
    if (byLabel) return byLabel;
    return {
        key: raw || "other",
        label: raw || "Other",
        color: "#64748B",
    };
};

export const categoryKeyFromLabel = (label) => {
    const found = GRIEVANCE_CATEGORIES.find(
        (c) => c.label.toLowerCase() === String(label || "").toLowerCase()
    );
    return found?.key || String(label || "").trim();
};

const formatAgo = (iso) => {
    if (!iso) return "—";
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return String(iso);
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const formatDateLabel = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const buildSla = (item) => {
    const status = String(item?.status || "").toLowerCase();
    const hours = Number(item?.hoursOpen);
    const hoursTxt = Number.isFinite(hours) ? `${hours}h open` : null;
    if (status === "resolved") {
        return {
            type: "resolved",
            text: hoursTxt ? `Resolved in ${hours}h` : "Resolved",
            breach: false,
        };
    }
    if (item?.slaBreached) {
        return {
            type: "breach",
            text: hoursTxt ? `SLA breach · ${hoursTxt}` : "SLA breach",
            breach: true,
        };
    }
    if (item?.slaWarning) {
        return {
            type: "warning",
            text: hoursTxt ? `SLA warning · ${hoursTxt}` : "SLA warning",
            breach: false,
        };
    }
    return {
        type: "ok",
        text: hoursTxt || "Within SLA",
        breach: false,
    };
};

/** Host for media files: strip trailing /api/v1/ from BASE_URL. */
export const MEDIA_BASE_URL = String(BASE_URL || "").replace(/\/?api\/v1\/?$/i, "/");

/**
 * Turn API photoUrl / photoPath into a loadable https URI.
 * Handles absolute URLs and relative paths like "grievances/x.jpg".
 */
export const resolveGrievancePhotoUrl = (value) => {
    if (!value) return null;
    if (typeof value === "object") {
        const nested =
            value.uri || value.url || value.path || value.photoUrl || value.photoPath;
        return resolveGrievancePhotoUrl(nested);
    }
    let raw = String(value).trim();
    if (!raw || raw === "null" || raw === "undefined") return null;
    raw = raw.replace(/\\/g, "/");
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    const base = MEDIA_BASE_URL.endsWith("/") ? MEDIA_BASE_URL : `${MEDIA_BASE_URL}/`;
    if (raw.startsWith("/")) {
        try {
            const origin = new URL(base).origin;
            return `${origin}${raw}`;
        } catch (_) {
            return `${base}${raw.replace(/^\//, "")}`;
        }
    }
    return `${base}${raw.replace(/^\.\//, "")}`;
};

export const mapGrievance = (item) => {
    if (!item || typeof item !== "object") return null;
    const cat = categoryMeta(item.categoryLabel || item.category);
    const status = String(item.status || "open").toLowerCase();
    const statusUi =
        status === "in_progress" ? "progress" : status;
    const sla = buildSla(item);
    const ticketNo = toErrorText(item.ticketNo || item.id, "—");
    const locationName = toErrorText(item.locationName, "—");
    const zoneCode = toErrorText(item.zoneCode, "—");
    const description = toErrorText(item.description, "");
    const photoUrl = resolveGrievancePhotoUrl(
        item.photoUrl ||
            item.photoPath ||
            item.photo ||
            item.imageUrl ||
            item.image ||
            item.fileUrl
    );

    return {
        raw: item,
        id: item.id,
        ticketNo,
        locationName,
        zoneCode,
        category: cat.key,
        categoryLabel: cat.label,
        categoryColor: cat.color,
        description,
        contactNumber: item.contactNumber || "",
        status,
        statusUi,
        statusLabel: GRIEVANCE_STATUS_LABEL[status] || status,
        assignedToUserId: item.assignedToUserId ?? null,
        resolutionNote: item.resolutionNote || "",
        escalated: !!item.escalated,
        resolvedAt: item.resolvedAt || null,
        hoursOpen: item.hoursOpen,
        slaHours: item.slaHours,
        slaBreached: !!item.slaBreached,
        slaWarning: !!item.slaWarning,
        photoUrl,
        assignee: item.assignee || null,
        supervisor: item.supervisor || null,
        qrCode: item.qrCode || null,
        createdAt: item.createdAt || null,
        ago: formatAgo(item.createdAt),
        dateLabel: formatDateLabel(item.createdAt),
        place: `${locationName} · ${zoneCode}`,
        sla,
        // Screen aliases
        title: description,
        detail: description,
        summary: description,
        desc: description,
        color: cat.color,
        catBg: `${cat.color}22`,
        catFg: cat.color,
        image: photoUrl ? { uri: photoUrl } : null,
    };
};

const countByStatus = (list) => {
    const counts = {
        all: list.length,
        open: 0,
        assigned: 0,
        progress: 0,
        in_progress: 0,
        resolved: 0,
    };
    list.forEach((g) => {
        const s = g.status;
        if (s === "open") counts.open += 1;
        else if (s === "assigned") counts.assigned += 1;
        else if (s === "in_progress") {
            counts.progress += 1;
            counts.in_progress += 1;
        } else if (s === "resolved") counts.resolved += 1;
    });
    return counts;
};

/** GET /grievances */
export const fetchGrievances = async (params = {}) => {
    const url = withQuery("grievances", {
        page: params.page || 1,
        limit: params.limit || 50,
        supervisorId: params.supervisorId,
        status: params.status,
        category: params.category,
        zoneCode: params.zoneCode,
        sla: params.sla,
        q: params.q,
    });
    const result = await GETNETWORK(url, true);
    const data = extractList(result).map(mapGrievance).filter(Boolean);
    return {
        result,
        ok: isApiSuccess(result),
        data,
        meta: result?.meta || {},
        counts: countByStatus(data),
        message: toErrorText(result?.error || result?.message, "Failed to load grievances"),
    };
};

/** GET /grievances/:id */
export const fetchGrievanceById = async (id) => {
    const result = await GETNETWORK(`${BASE_URL}grievances/${id}`, true);
    return {
        result,
        ok: isApiSuccess(result),
        data: result?.data ? mapGrievance(result.data) : null,
        message: toErrorText(result?.error || result?.message, "Failed to load grievance"),
    };
};

/** POST /grievances — multipart when photo present, else JSON */
export const createGrievance = async (payload = {}) => {
    const category = payload.category || categoryKeyFromLabel(payload.categoryLabel);
    const bodyFields = {
        category,
        locationName: String(payload.locationName || "").trim(),
        zoneCode: String(payload.zoneCode || "").trim(),
        description: String(payload.description || "").trim(),
    };
    if (payload.contactNumber) {
        bodyFields.contactNumber = String(payload.contactNumber).trim();
    }

    let result;
    if (payload.photo?.uri) {
        const form = new FormData();
        Object.entries(bodyFields).forEach(([k, v]) => form.append(k, v));
        form.append("photo", {
            uri: payload.photo.uri,
            type: payload.photo.type || "image/jpeg",
            name: payload.photo.fileName || payload.photo.name || "grievance.jpg",
        });

        const loginRes = await getObjByKey("loginResponse");
        const authToken = resolveAuthToken(loginRes);
        const response = await fetch(`${BASE_URL}grievances`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${authToken}`,
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
        result = await POSTNETWORK(`${BASE_URL}grievances`, bodyFields, true);
    }

    return {
        result,
        ok: isApiSuccess(result) || result?.ok === true,
        data: result?.data ? mapGrievance(result.data) : null,
        message: toErrorText(result?.error || result?.message, "Failed to create grievance"),
    };
};

/** PATCH /grievances/:id */
export const updateGrievance = async (id, payload = {}) => {
    const result = await PATCHNETWORK(
        `${BASE_URL}grievances/${id}`,
        payload,
        true
    );
    return {
        result,
        ok: isApiSuccess(result) || result?.ok === true,
        data: result?.data ? mapGrievance(result.data) : null,
        message: toErrorText(result?.error || result?.message, "Failed to update grievance"),
    };
};

/** DELETE /grievances/:id */
export const deleteGrievance = async (id) => {
    const result = await DELETENETWORK(`${BASE_URL}grievances/${id}`, true);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        Number(result?.statusCode) === 204 ||
        Number(result?.statusCode) === 200;
    return {
        result,
        ok,
        message: toErrorText(result?.error || result?.message, "Failed to delete grievance"),
    };
};

export const groupGrievancesByStatus = (list = []) => {
    const order = [
        { key: "open", title: "Open", color: "#58A5F5" },
        { key: "assigned", title: "Assigned", color: "#A58BF7" },
        { key: "in_progress", title: "In Progress", color: "#62C784" },
        { key: "resolved", title: "Resolved", color: "#15A05A" },
    ];
    return order.map((g) => {
        const items = list.filter((item) => item.status === g.key);
        return { ...g, count: items.length, items };
    });
};
