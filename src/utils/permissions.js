import { PermissionsAndroid, Platform } from "react-native";

/**
 * Requests Android runtime permissions via the system dialog
 * (same pattern as SplashScreen / standard Android apps).
 * Does not use Alert.alert.
 */
export const requestAppPermissions = async () => {
    if (Platform.OS !== "android") return true;

    try {
        const perms = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            PermissionsAndroid.PERMISSIONS.CAMERA,
        ];
        // Media / gallery upload permissions (API level dependent)
        if (PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES) {
            perms.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        }
        if (PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE) {
            perms.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
        if (PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE) {
            perms.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        }
        await PermissionsAndroid.requestMultiple(perms);
        return true;
    } catch (e) {
        return false;
    }
};

export const ensureMediaPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
        const media = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        if (media) {
            const already = await PermissionsAndroid.check(media);
            if (already) return true;
            const result = await PermissionsAndroid.request(media);
            return result === PermissionsAndroid.RESULTS.GRANTED;
        }
        const storage = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        if (storage) {
            const already = await PermissionsAndroid.check(storage);
            if (already) return true;
            const result = await PermissionsAndroid.request(storage);
            return result === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    } catch (_) {
        return false;
    }
};

export const ensureLocationPermission = async () => {
    if (Platform.OS !== "android") return true;

    const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    const already = await PermissionsAndroid.check(fine);
    if (already) return true;

    const result = await PermissionsAndroid.request(fine);
    return result === PermissionsAndroid.RESULTS.GRANTED;
};

/** Prefer LocationPermissionService for journey Start/Stop flows. */
export { ensureTrackingPermissions } from "../services/location/LocationPermissionService";

export const ensureCameraPermission = async () => {
    if (Platform.OS !== "android") return true;

    const cam = PermissionsAndroid.PERMISSIONS.CAMERA;
    const already = await PermissionsAndroid.check(cam);
    if (already) return true;

    const result = await PermissionsAndroid.request(cam);
    return result === PermissionsAndroid.RESULTS.GRANTED;
};
