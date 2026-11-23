import { clearAll, getObjByKey } from "../../utils/Storage";
import { isAccessTokenExpired } from "../../utils/authSession";
import { AUTH_STATUS, SKIP_SPLASH } from "../types";

const resolveAuthToken = (loginRes) =>
    loginRes?.accessToken ||
    loginRes?.token ||
    loginRes?.data?.accessToken ||
    loginRes?.data?.token ||
    (typeof loginRes?.data === "string" ? loginRes.data : null);

export const setSkipSplash = (value) => ({
    type: SKIP_SPLASH,
    payload: !!value,
});

/**
 * @param {{ preferLoginOnExpire?: boolean }} options
 * preferLoginOnExpire: when token expired mid-session / on resume → Login (no Splash).
 * Cold start leaves preferLoginOnExpire false so Splash still shows first.
 */
export const checkuserToken = (options = {}) => {
    return async (dispatch) => {
        try {
            const res = await getObjByKey("loginResponse");
            const token = resolveAuthToken(res);
            if (!token) {
                dispatch({ type: AUTH_STATUS, payload: false });
                return;
            }
            if (isAccessTokenExpired(token)) {
                try {
                    await clearAll();
                } catch (_) {
                    /* ignore */
                }
                dispatch({
                    type: SKIP_SPLASH,
                    payload: !!options.preferLoginOnExpire,
                });
                dispatch({ type: AUTH_STATUS, payload: false });
                return;
            }
            dispatch({ type: SKIP_SPLASH, payload: false });
            dispatch({ type: AUTH_STATUS, payload: true });
        } catch (_) {
            dispatch({ type: AUTH_STATUS, payload: false });
        }
    };
};

/** Logout: clear session and go straight to Login (no Splash). */
export const logoutUser = () => {
    return async (dispatch) => {
        try {
            await clearAll();
        } catch (_) {
            // ignore storage clear errors
        }
        dispatch({ type: SKIP_SPLASH, payload: true });
        dispatch({ type: AUTH_STATUS, payload: false });
    };
};
