/**
 * In-memory auth session helpers (not persisted).
 * Used so logout can skip Splash, while cold start still shows Splash.
 */

let unauthorizedHandler = null;
let handlingUnauthorized = false;

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = typeof handler === "function" ? handler : null;
};

export const notifyUnauthorized = () => {
    if (handlingUnauthorized) return;
    if (!unauthorizedHandler) return;
    handlingUnauthorized = true;
    try {
        unauthorizedHandler();
    } finally {
        setTimeout(() => {
            handlingUnauthorized = false;
        }, 800);
    }
};

/** Decode JWT payload without verifying signature (client-side expiry check). */
export const decodeJwtPayload = (token) => {
    try {
        const raw = String(token || "");
        const parts = raw.split(".");
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const atobFn = typeof globalThis.atob === "function" ? globalThis.atob : null;
        if (!atobFn) return null;
        const json = decodeURIComponent(
            Array.prototype.map
                .call(atobFn(padded), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(json);
    } catch (_) {
        return null;
    }
};

/** Returns true when JWT exp is present and already past. Opaque tokens return false. */
export const isAccessTokenExpired = (token) => {
    const payload = decodeJwtPayload(token);
    if (!payload || payload.exp == null) return false;
    const expMs = Number(payload.exp) * 1000;
    if (!Number.isFinite(expMs)) return false;
    // Small skew so we don't bounce on edge of expiry
    return Date.now() >= expMs - 5000;
};
