import { BASE_URL } from "../../constant/url";
import { GETNETWORK, POSTNETWORK, PUTNETWORK } from "../../utils/Network";

export const DEFAULT_SETTING_KEYS = [
    "app_name",
    "organization",
    "helpline_number",
    "support_email",
    "maintenance_mode",
    "notification_enabled",
];

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
    if (result.error && !result.data && Number(result.statusCode || 0) >= 400) return false;
    const code = Number(result.statusCode || result.status || 0);
    if (code >= 400) return false;
    return true;
};

const asBoolString = (value, fallback = false) => {
    if (value === true || value === "true" || value === 1 || value === "1") return "true";
    if (value === false || value === "false" || value === 0 || value === "0") return "false";
    return fallback ? "true" : "false";
};

export const normalizeSettings = (raw = {}) => {
    const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
        app_name: String(src.app_name ?? src.appName ?? "PKMD CRM"),
        organization: String(src.organization ?? ""),
        helpline_number: String(src.helpline_number ?? src.helplineNumber ?? ""),
        support_email: String(src.support_email ?? src.supportEmail ?? ""),
        maintenance_mode: asBoolString(src.maintenance_mode ?? src.maintenanceMode, false),
        notification_enabled: asBoolString(
            src.notification_enabled ?? src.notificationEnabled,
            true
        ),
        // Preserve any extra keys from API
        ...Object.keys(src).reduce((acc, key) => {
            if (!(key in acc)) acc[key] = String(src[key]);
            return acc;
        }, {}),
    };
};

/** GET /system/settings */
export const fetchSystemSettings = async () => {
    const result = await GETNETWORK(`${BASE_URL}system/settings`, true);
    const dataRaw =
        (result?.data && typeof result.data === "object" && !Array.isArray(result.data)
            ? result.data
            : null) ||
        (result && typeof result === "object" && !Array.isArray(result) && result.app_name
            ? result
            : {});
    const ok = isApiSuccess(result);
    return {
        result,
        ok,
        data: normalizeSettings(dataRaw),
        message: toErrorText(result?.error || result?.message, "Failed to load settings"),
    };
};

/** PUT /system/settings — Super Admin only */
export const updateSystemSettings = async (payload = {}) => {
    const body = {};
    Object.entries(payload || {}).forEach(([key, value]) => {
        if (key == null || key === "") return;
        if (typeof value === "boolean") body[key] = value ? "true" : "false";
        else if (value == null) body[key] = "";
        else body[key] = String(value);
    });

    const result = await PUTNETWORK(`${BASE_URL}system/settings`, body, true);
    const dataRaw =
        result?.data && typeof result.data === "object" && !Array.isArray(result.data)
            ? result.data
            : body;
    const ok = isApiSuccess(result) || result?.ok === true;
    return {
        result,
        ok,
        data: normalizeSettings(dataRaw),
        message: toErrorText(
            result?.error || result?.message,
            ok ? "Settings saved" : "Failed to save settings"
        ),
    };
};

/** POST /system/reset-seed — Super Admin only (destructive) */
export const resetDemoSeed = async () => {
    const result = await POSTNETWORK(`${BASE_URL}system/reset-seed`, {}, true);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        result?.success === true ||
        Number(result?.statusCode) === 200;
    return {
        result,
        ok,
        summary: result?.summary || result?.data?.summary || result?.data || null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "Demo seed reset completed" : "Failed to reset demo seed"
        ),
    };
};
