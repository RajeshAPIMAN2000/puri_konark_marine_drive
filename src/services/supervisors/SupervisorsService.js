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
    return [];
};

export const normalizeZoneCode = (value) => {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "";
    if (/^[A-Z]$/.test(raw)) return raw;
    const m = raw.match(/ZONE\s*([A-Z])/i) || raw.match(/^Z([A-Z0-9])/i);
    return m ? String(m[1]).toUpperCase().slice(0, 1) : raw.slice(0, 1);
};

export const mapSupervisor = (item) => {
    if (!item || typeof item !== "object") return null;
    const zoneCode = normalizeZoneCode(item.zoneCode || item.zone || item.code) || "—";
    const name = toErrorText(item.name, "Supervisor");
    const mobile = toErrorText(item.mobile || item.phone, "");
    const segment = toErrorText(
        item.assignedRoadSegment || item.segment || item.roadSegment,
        "—"
    );
    const color = String(item.color || "#1D4ED8");
    const notes = item.notes != null ? String(item.notes) : "";
    const vendorCount = Number(item.vendorCount ?? item.vendors ?? 0) || 0;

    return {
        raw: item,
        id: item.id,
        name,
        mobile,
        phone: mobile,
        zoneCode,
        letter: zoneCode,
        zone: zoneCode === "—" ? "—" : `Zone ${zoneCode}`,
        assignedRoadSegment: segment,
        segment,
        color,
        notes,
        vendorCount,
        vendors: vendorCount,
    };
};

/** GET /supervisors */
export const fetchSupervisors = async (params = {}) => {
    const url = withQuery("supervisors", {
        page: params.page || 1,
        limit: params.limit || 50,
        zoneCode: params.zoneCode ? normalizeZoneCode(params.zoneCode) : undefined,
    });
    const result = await GETNETWORK(url, true);
    const list = extractList(result).map(mapSupervisor).filter(Boolean);
    const meta = result?.meta || result?.data?.meta || {};
    return {
        result,
        ok: isApiSuccess(result),
        data: list,
        meta: {
            page: Number(meta.page || params.page || 1),
            limit: Number(meta.limit || params.limit || 50),
            total: Number(meta.total ?? list.length),
            totalPages: Number(meta.totalPages || 1),
        },
        message: toErrorText(result?.error || result?.message, "Failed to load supervisors"),
    };
};

/** GET /supervisors/self */
export const fetchSelfSupervisor = async () => {
    const result = await GETNETWORK(`${BASE_URL}supervisors/self`, true);
    const raw =
        result?.data && typeof result.data === "object" && !Array.isArray(result.data)
            ? result.data
            : null;
    return {
        result,
        ok: isApiSuccess(result) && !!raw,
        data: raw ? mapSupervisor(raw) : null,
        message: toErrorText(
            result?.error || result?.message,
            "Failed to load assigned supervisor"
        ),
    };
};

/** POST /supervisors — Super Admin */
export const createSupervisor = async (payload = {}) => {
    const name = String(payload.name || "").trim();
    const mobile = String(payload.mobile || payload.phone || "").trim();
    const zoneCode = normalizeZoneCode(payload.zoneCode || payload.code);
    const assignedRoadSegment = String(
        payload.assignedRoadSegment || payload.segment || ""
    ).trim();
    const color = String(payload.color || "#1D4ED8").trim() || "#1D4ED8";
    const notes = String(payload.notes || "").trim();

    if (name.length < 2 || name.length > 120) {
        return { ok: false, data: null, message: "Name must be 2–120 characters" };
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        return { ok: false, data: null, message: "Enter a valid 10-digit Indian mobile" };
    }
    if (!/^[A-Z]$/.test(zoneCode)) {
        return { ok: false, data: null, message: "Zone code must be a single letter A–Z" };
    }
    if (assignedRoadSegment.length < 2 || assignedRoadSegment.length > 160) {
        return {
            ok: false,
            data: null,
            message: "Assigned road segment must be 2–160 characters",
        };
    }

    const body = {
        name,
        mobile,
        zoneCode,
        assignedRoadSegment,
        color,
    };
    if (notes) body.notes = notes;

    const result = await POSTNETWORK(`${BASE_URL}supervisors`, body, true);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        Number(result?.statusCode) === 201;
    return {
        result,
        ok,
        data: result?.data ? mapSupervisor(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "Supervisor created" : "Failed to create supervisor"
        ),
    };
};

/** PATCH /supervisors/:id — Super Admin */
export const updateSupervisor = async (id, payload = {}) => {
    if (id == null || id === "") {
        return { ok: false, data: null, message: "Supervisor id is required" };
    }
    const body = {};
    if (payload.name != null) body.name = String(payload.name).trim();
    if (payload.mobile != null || payload.phone != null) {
        body.mobile = String(payload.mobile || payload.phone || "").trim();
    }
    if (payload.zoneCode != null || payload.code != null) {
        body.zoneCode = normalizeZoneCode(payload.zoneCode || payload.code);
    }
    if (payload.assignedRoadSegment != null || payload.segment != null) {
        body.assignedRoadSegment = String(
            payload.assignedRoadSegment || payload.segment || ""
        ).trim();
    }
    if (payload.color != null) body.color = String(payload.color).trim();
    if (payload.notes != null) body.notes = String(payload.notes).trim();

    const result = await PATCHNETWORK(`${BASE_URL}supervisors/${id}`, body, true);
    const ok = isApiSuccess(result) || result?.ok === true;
    return {
        result,
        ok,
        data: result?.data ? mapSupervisor(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "Supervisor updated" : "Failed to update supervisor"
        ),
    };
};

/** DELETE /supervisors/:id — Super Admin */
export const deleteSupervisor = async (id) => {
    if (id == null || id === "") {
        return { ok: false, message: "Supervisor id is required" };
    }
    const result = await DELETENETWORK(`${BASE_URL}supervisors/${id}`, true);
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
            ok ? "Supervisor deleted" : "Failed to delete supervisor"
        ),
    };
};
