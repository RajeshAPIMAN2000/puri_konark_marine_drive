import { BASE_URL } from "../../constant/url";
import { GETNETWORK, POSTNETWORK } from "../../utils/Network";

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
    if (result.error && result.data == null && result.count == null && result.ok == null) {
        return false;
    }
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

export const formatNotificationAgo = (iso) => {
    if (!iso) return "—";
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return String(iso);
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    try {
        return new Date(ts).toLocaleDateString();
    } catch (_) {
        return `${days}d ago`;
    }
};

export const mapNotification = (item) => {
    if (!item || typeof item !== "object") return null;
    const id = item.id;
    if (id == null) return null;
    return {
        raw: item,
        id,
        userId: item.userId ?? null,
        targetRole: item.targetRole || null,
        title: toErrorText(item.title, "Notification"),
        message: toErrorText(item.message || item.body || item.detail, ""),
        isRead: Boolean(item.isRead),
        createdAt: item.createdAt || null,
        ago: formatNotificationAgo(item.createdAt),
        roleLabel: item.targetRole
            ? String(item.targetRole).replace(/_/g, " ")
            : "you",
    };
};

/** GET /notifications */
export const fetchNotifications = async (params = {}) => {
    const url = withQuery("notifications", {
        page: params.page || 1,
        limit: params.limit || 25,
        unreadOnly:
            params.unreadOnly === true || params.unreadOnly === "true"
                ? "true"
                : undefined,
    });
    const result = await GETNETWORK(url, true);
    const data = extractList(result).map(mapNotification).filter(Boolean);
    return {
        result,
        ok: isApiSuccess(result),
        data,
        meta: result?.meta || {},
        message: toErrorText(
            result?.error || result?.message,
            "Failed to load notifications"
        ),
    };
};

/** GET /notifications/unread-count */
export const fetchUnreadNotificationCount = async () => {
    const result = await GETNETWORK(`${BASE_URL}notifications/unread-count`, true);
    const count = Number(
        result?.count ?? result?.data?.count ?? result?.meta?.count ?? 0
    );
    return {
        result,
        ok: isApiSuccess(result),
        count: Number.isFinite(count) ? count : 0,
        message: toErrorText(
            result?.error || result?.message,
            "Failed to load unread count"
        ),
    };
};

/** POST /notifications/:id/read */
export const markNotificationRead = async (id) => {
    const result = await POSTNETWORK(
        `${BASE_URL}notifications/${id}/read`,
        {},
        true
    );
    return {
        result,
        ok: isApiSuccess(result) || Boolean(result?.data),
        data: result?.data ? mapNotification(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            "Failed to mark notification as read"
        ),
    };
};

/** POST /notifications/read-all */
export const markAllNotificationsRead = async () => {
    const result = await POSTNETWORK(
        `${BASE_URL}notifications/read-all`,
        {},
        true
    );
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        result?.success === true;
    return {
        result,
        ok,
        message: toErrorText(
            result?.error || result?.message,
            "Failed to mark all as read"
        ),
    };
};
