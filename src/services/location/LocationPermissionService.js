import { PermissionsAndroid, Platform } from "react-native";
import { ensureDeviceLocationOn } from "../../utils/deviceServices";

/**
 * Runtime location permission flow for BGeo background tracking.
 * Does not declare duplicate AndroidManifest permissions already merged by BGeo AAR
 * except ACCESS_BACKGROUND_LOCATION (app-owned per Google Play policy).
 */

export const ensureForegroundLocationPermission = async () => {
    if (Platform.OS !== "android") return true;

    const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

    const fineGranted = await PermissionsAndroid.check(fine);
    if (fineGranted) return true;

    const result = await PermissionsAndroid.requestMultiple([fine, coarse]);
    return (
        result[fine] === PermissionsAndroid.RESULTS.GRANTED ||
        result[coarse] === PermissionsAndroid.RESULTS.GRANTED
    );
};

export const ensureBackgroundLocationPermission = async () => {
    if (Platform.OS !== "android") return true;

    const bg = PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION;
    if (!bg) return true;

    const already = await PermissionsAndroid.check(bg);
    if (already) return true;

    // Android 10+: must request background after foreground is granted
    const foregroundOk = await ensureForegroundLocationPermission();
    if (!foregroundOk) return false;

    const result = await PermissionsAndroid.request(bg);
    return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const ensureNotificationPermission = async () => {
    if (Platform.OS !== "android") return true;
    const notif = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!notif) return true;
    const already = await PermissionsAndroid.check(notif);
    if (already) return true;
    const result = await PermissionsAndroid.request(notif);
    return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const ensureActivityRecognitionPermission = async () => {
    if (Platform.OS !== "android") return true;
    const activity = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
    if (!activity) return true;
    const already = await PermissionsAndroid.check(activity);
    if (already) return true;
    const result = await PermissionsAndroid.request(activity);
    return result === PermissionsAndroid.RESULTS.GRANTED;
};

/**
 * Full pre-flight for Start Journey.
 * Returns { ok, gpsEnabled, foreground, background, notification, activity }
 */
export const ensureTrackingPermissions = async () => {
    const foreground = await ensureForegroundLocationPermission();
    const gpsEnabled = foreground ? await ensureDeviceLocationOn() : false;
    const notification = await ensureNotificationPermission();
    const activity = await ensureActivityRecognitionPermission();
    // Background is strongly recommended but Start can proceed with When-In-Use
    // if the user denies Always — tracking quality will degrade when app is killed.
    const background = foreground
        ? await ensureBackgroundLocationPermission()
        : false;

    return {
        ok: foreground && gpsEnabled,
        gpsEnabled: !!gpsEnabled,
        foreground: !!foreground,
        background: !!background,
        notification: !!notification,
        activity: !!activity,
    };
};

export const getGpsSignalStatus = ({ accuracy, enabled, providerEnabled }) => {
    if (!enabled || providerEnabled === false) return "offline";
    if (accuracy == null) return "active";
    if (accuracy <= 25) return "active";
    if (accuracy <= 75) return "weak";
    return "weak";
};
