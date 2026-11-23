import { SKIP_SPLASH } from "../types";

/** In-memory only: true after logout so LoginNavigation opens on Login (not Splash). */
export default function skipSplashReducer(state = false, action) {
    switch (action.type) {
        case SKIP_SPLASH:
            return !!action.payload;
        default:
            return state;
    }
}
