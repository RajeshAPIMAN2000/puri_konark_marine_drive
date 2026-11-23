import { BASE_URL } from "../../constant/url";
import { GETNETWORK, POSTNETWORK } from "../../utils/Network";

/** Odisha bounds used by backend for fix-coordinates. */
export const ODISHA_LAT = { min: 17.5, max: 22.5 };
export const ODISHA_LNG = { min: 81.5, max: 87.5 };

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
    // Successful POST bodies often look like { data: { id, status } } with no statusCode
    if (result.data != null) return true;
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

const formatAgo = (iso) => {
    if (!iso) return "—";
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return String(iso);
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const detectIssueType = (item) => {
    const vendor = item?.vendor || {};
    const lat = Number(vendor.latitude ?? vendor.lat);
    const lng = Number(vendor.longitude ?? vendor.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasCoords) return "Missing coordinates";
    if (
        lat < ODISHA_LAT.min ||
        lat > ODISHA_LAT.max ||
        lng < ODISHA_LNG.min ||
        lng > ODISHA_LNG.max
    ) {
        return "Invalid coordinates";
    }
    if (vendor.status && String(vendor.status).toLowerCase() === "inactive") {
        return "Inactive vendor";
    }
    return toErrorText(item?.type || item?.reason || item?.issueType, "Import issue");
};

export const mapImportIssue = (item) => {
    if (!item || typeof item !== "object") return null;
    const supervisor = item.supervisor || {};
    const vendor = item.vendor || {};
    const status = String(item.status || "open").toLowerCase();
    const lat = Number(vendor.latitude ?? vendor.lat);
    const lng = Number(vendor.longitude ?? vendor.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const location = hasCoords
        ? `${lat}, ${lng}`
        : toErrorText(vendor.location || vendor.coords, "--, --");
    const zoneCode = toErrorText(
        supervisor.zoneCode || vendor.zoneCode || "—",
        "—"
    );
    const name = toErrorText(
        vendor.name ||
            vendor.shopName ||
            vendor.businessName ||
            `Vendor #${vendor.id || item.vendorId || "—"}`,
        "Vendor"
    );
    const vendorInactive =
        String(vendor.status || "").toLowerCase() === "inactive";
    const needsCoords =
        !hasCoords ||
        vendorInactive ||
        lat < ODISHA_LAT.min ||
        lat > ODISHA_LAT.max ||
        lng < ODISHA_LNG.min ||
        lng > ODISHA_LNG.max;

    return {
        raw: item,
        id: item.id,
        supervisorId: item.supervisorId ?? supervisor.id ?? null,
        vendorId: item.vendorId ?? vendor.id ?? null,
        status,
        isOpen: status === "open",
        createdAt: item.createdAt || null,
        ago: formatAgo(item.createdAt),
        resolvedBy: item.resolvedBy || null,
        resolvedNote: item.resolvedNote || "",
        supervisorName: toErrorText(supervisor.name, "—"),
        zoneCode,
        zone: String(zoneCode).slice(0, 2).toUpperCase() || "—",
        vendorStatus: toErrorText(vendor.status, "—"),
        name,
        location,
        latitude: hasCoords ? lat : null,
        longitude: hasCoords ? lng : null,
        type: detectIssueType(item),
        detail: toErrorText(
            item.detail ||
                item.message ||
                item.note ||
                (needsCoords
                    ? "Coordinates need review before the vendor can appear correctly on the map."
                    : "Import row held for review."),
            "Import row held for review."
        ),
        needsCoords,
        fixed: needsCoords, // UI: show Fix coordinates when coords need correction
    };
};

export const isValidOdishaCoords = (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return (
        lat >= ODISHA_LAT.min &&
        lat <= ODISHA_LAT.max &&
        lng >= ODISHA_LNG.min &&
        lng <= ODISHA_LNG.max
    );
};

/** GET /import-issues */
export const fetchImportIssues = async (params = {}) => {
    const url = withQuery("import-issues", {
        status: params.status,
        supervisorId: params.supervisorId,
        page: params.page || 1,
        limit: params.limit || 30,
    });
    const result = await GETNETWORK(url, true);
    const data = extractList(result).map(mapImportIssue).filter(Boolean);
    return {
        result,
        ok: isApiSuccess(result),
        data,
        meta: result?.meta || {},
        message: toErrorText(
            result?.error || result?.message,
            "Failed to load import issues"
        ),
    };
};

/** POST /import-issues/:id/resolve */
export const resolveImportIssue = async (id, note) => {
    const payload = {};
    if (note != null && String(note).trim()) {
        payload.note = String(note).trim();
    }
    const result = await POSTNETWORK(
        `${BASE_URL}import-issues/${id}/resolve`,
        payload,
        true
    );
    return {
        result,
        ok: isApiSuccess(result),
        data: result?.data ? mapImportIssue({ ...result.data, id }) : null,
        message: toErrorText(
            result?.error || result?.message,
            "Failed to resolve import issue"
        ),
    };
};

/** POST /import-issues/:id/fix-coordinates */
export const fixImportIssueCoordinates = async (id, latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!isValidOdishaCoords(lat, lng)) {
        return {
            result: null,
            ok: false,
            data: null,
            message:
                "Coordinates must be within Odisha (lat 17.5–22.5, lng 81.5–87.5)",
        };
    }
    const result = await POSTNETWORK(
        `${BASE_URL}import-issues/${id}/fix-coordinates`,
        { latitude: lat, longitude: lng },
        true
    );
    return {
        result,
        ok: isApiSuccess(result),
        data: result?.data ? mapImportIssue({ ...result.data, id }) : null,
        vendor: result?.vendor || null,
        message: toErrorText(
            result?.error || result?.message,
            "Failed to fix coordinates"
        ),
    };
};
