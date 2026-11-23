import { getObjByKey } from "./Storage";
import { isAccessTokenExpired, notifyUnauthorized } from "./authSession";

const resolveAuthToken = (loginRes) =>
    loginRes?.accessToken ||
    loginRes?.token ||
    loginRes?.data?.accessToken ||
    loginRes?.data?.token ||
    (typeof loginRes?.data === "string" ? loginRes.data : null);

const handleAuthFailure = (status) => {
    if (Number(status) === 401) {
        notifyUnauthorized();
    }
};

const parseJsonSafe = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (_) {
        return { message: text };
    }
};

/** Same token source used by GETNETWORK / POSTNETWORK after login. */
export const getAuthBearerToken = async () => {
    const loginRes = await getObjByKey("loginResponse");
    const token = resolveAuthToken(loginRes);
    if (token && isAccessTokenExpired(token)) {
        notifyUnauthorized();
        return null;
    }
    return token;
};

/**
 * Authenticated GET for binary responses (Excel/PDF).
 * Mirrors GETNETWORK auth, but does not call response.json().
 */
export const DOWNLOADNETWORK = async (url, token = true, accept = "*/*") => {
    let headers = {
        Accept: accept,
    };
    if (token) {
        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return {
                ok: false,
                status: 401,
                message: "Not authenticated",
                blob: null,
                headers: {},
            };
        }
        headers = { ...headers, Authorization: "Bearer " + authToken };
    }
    try {
        const response = await fetch(url, { method: "GET", headers });
        const contentType = response.headers?.get?.("content-type") || "";
        if (!response.ok) {
            handleAuthFailure(response.status);
            let message = `Download failed (${response.status})`;
            try {
                const errBody = await response.text();
                if (errBody) {
                    try {
                        const parsed = JSON.parse(errBody);
                        message =
                            parsed?.message ||
                            parsed?.error ||
                            parsed?.error?.message ||
                            message;
                    } catch (_) {
                        message = errBody.slice(0, 180) || message;
                    }
                }
            } catch (_) {
                /* keep status message */
            }
            return {
                ok: false,
                status: response.status,
                message,
                blob: null,
                headers: {},
                contentType,
            };
        }
        const blob = await response.blob();
        return {
            ok: true,
            status: response.status,
            blob,
            headers: response.headers,
            contentType,
        };
    } catch (error) {
        console.error(error);
        return {
            ok: false,
            status: 0,
            message: error?.message || "Download failed",
            blob: null,
            headers: {},
        };
    }
};

export const POSTNETWORK = async (url, payload, token = false) => {
    let headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    if (token) {
        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return { ok: false, statusCode: 401, message: "Not authenticated" };
        }
        headers = { ...headers, Authorization: "Bearer " + authToken };
    }
    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
        handleAuthFailure(response.status);
        const body = await parseJsonSafe(response);
        return {
            ...(body && typeof body === "object" ? body : {}),
            statusCode: response.status,
            ok: response.ok,
        };
    } catch (error) {
        console.error("error" + error);
        return { ok: false, message: error?.message || "Post failed" };
    }
};

export const POSTNETWORKFORM = async (url, payload, token = false) => {
    let headers = {
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
    };
    if (token) {
        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return [{ ok: false, statusCode: 401, message: "Not authenticated" }];
        }
        headers = { ...headers, Authorization: "Bearer " + authToken };
    }
    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: payload,
            redirect: "follow",
        });
        handleAuthFailure(response.status);
        const body = await parseJsonSafe(response);
        return [
            {
                ...(body && typeof body === "object" ? body : {}),
                statusCode: response.status,
                ok: response.ok,
            },
        ];
    } catch (err) {
        console.log(err);
        return [{ ok: false, message: err?.message || "Upload failed" }];
    }
};

export const GETNETWORK = async (url, token = false) => {
    let headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    if (token) {
        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return { ok: false, statusCode: 401, message: "Not authenticated" };
        }
        headers = { ...headers, Authorization: "Bearer " + authToken };
    }
    try {
        const response = await fetch(url, {
            method: "GET",
            headers,
        });
        handleAuthFailure(response.status);
        const body = await parseJsonSafe(response);
        return {
            ...(body && typeof body === "object" ? body : {}),
            statusCode: response.status,
            ok: response.ok,
        };
    } catch (error) {
        console.error(error);
        return { ok: false, message: error?.message || "Get failed" };
    }
};

export const PATCHNETWORK = async (url, payload = {}, token = false) => {
    let headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    if (token) {
        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return { ok: false, statusCode: 401, message: "Not authenticated" };
        }
        headers = { ...headers, Authorization: "Bearer " + authToken };
    }
    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload ?? {}),
        });
        handleAuthFailure(response.status);
        const body = await parseJsonSafe(response);
        return {
            ...(body && typeof body === "object" ? body : {}),
            statusCode: response.status,
            ok: response.ok,
        };
    } catch (error) {
        console.error(error);
        return { ok: false, message: error?.message || "Patch failed" };
    }
};

export const PUTNETWORK = async (url, payload = {}, token = false) => {
    let headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    if (token) {
        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return { ok: false, statusCode: 401, message: "Not authenticated" };
        }
        headers = { ...headers, Authorization: "Bearer " + authToken };
    }
    try {
        const response = await fetch(url, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload ?? {}),
        });
        handleAuthFailure(response.status);
        const body = await parseJsonSafe(response);
        return {
            ...(body && typeof body === "object" ? body : {}),
            statusCode: response.status,
            ok: response.ok,
        };
    } catch (error) {
        console.error(error);
        return { ok: false, message: error?.message || "Put failed" };
    }
};

export const DELETENETWORK = async (url, token = false) => {
    let headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    if (token) {
        const authToken = await getAuthBearerToken();
        if (!authToken) {
            return { ok: false, statusCode: 401, message: "Not authenticated" };
        }
        headers = { ...headers, Authorization: "Bearer " + authToken };
    }
    try {
        const response = await fetch(url, {
            method: "DELETE",
            headers,
        });
        handleAuthFailure(response.status);
        const body = await parseJsonSafe(response);
        return {
            ...(body && typeof body === "object" ? body : {}),
            statusCode: response.status,
            ok: response.ok,
        };
    } catch (error) {
        console.error(error);
        return { ok: false, message: error?.message || "Delete failed" };
    }
};
