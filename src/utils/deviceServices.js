import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

const hasGeolocationNative = () =>
    !!(NativeModules.RNCGeolocation || NativeModules.RNFusedLocation);

const hasImagePickerNative = () =>
    !!(
        NativeModules.ImagePicker ||
        NativeModules.ImagePickerManager ||
        NativeModules.RNImagePicker
    );

/**
 * Shows the Android system "Location Accuracy / Turn on" dialog when
 * device location is off. Pressing Turn on enables location.
 * Does not use Alert.alert.
 */
export const ensureDeviceLocationOn = async () => {
    if (Platform.OS !== "android") return true;

    const native =
        TurboModuleRegistry.get("AndroidLocationEnabler") ||
        NativeModules.AndroidLocationEnabler;

    if (!native?.promptForEnableLocationIfNeeded) {
        console.warn("AndroidLocationEnabler native module is not linked");
        return false;
    }

    try {
        // Always ask Play Services. When device location is off this shows
        // the system "Location Accuracy / Turn on" dialog.
        const result = await native.promptForEnableLocationIfNeeded({
            interval: 10000,
            waitForAccurate: true,
        });
        return result === "enabled" || result === "already-enabled";
    } catch (e) {
        console.warn(
            "Location Turn on dialog failed",
            e?.code,
            e?.message
        );
        return false;
    }
};

/**
 * Safe GPS fetch — prompts Turn-on dialog first when location is off.
 */
export const getCurrentPosition = (onSuccess, onError, options = {}) => {
    const { skipLocationPrompt = false, ...geoOptions } = options;

    const runFetch = () => {
        if (!hasGeolocationNative()) {
            onError?.({
                code: 0,
                message:
                    "Location module not linked. Rebuild the Android app to enable GPS.",
            });
            return;
        }

        try {
            // eslint-disable-next-line global-require
            const Geolocation = require("@react-native-community/geolocation").default;
            Geolocation.getCurrentPosition(onSuccess, onError, {
                // Prefer a usable fix quickly; callers can override for high accuracy
                enableHighAccuracy: false,
                timeout: 30000,
                maximumAge: 60000,
                ...geoOptions,
            });
        } catch (e) {
            onError?.({
                code: 0,
                message: e?.message || "Geolocation unavailable",
            });
        }
    };

    if (Platform.OS !== "android" || skipLocationPrompt) {
        runFetch();
        return;
    }

    ensureDeviceLocationOn()
        .then((enabled) => {
            if (!enabled) {
                onError?.({
                    code: 1,
                    message: "Please turn on device location",
                });
                return;
            }
            setTimeout(runFetch, 800);
        })
        .catch(() => {
            onError?.({
                code: 1,
                message: "Please turn on device location",
            });
        });
};

export const openCamera = (options, callback) => {
    if (!hasImagePickerNative()) {
        callback?.({
            errorCode: "unlink",
            errorMessage:
                "Camera module not linked. Rebuild the Android app to enable camera.",
        });
        return;
    }

    try {
        // eslint-disable-next-line global-require
        const { launchCamera } = require("react-native-image-picker");
        launchCamera(
            {
                mediaType: "photo",
                cameraType: "back",
                quality: 0.8,
                maxWidth: 1600,
                maxHeight: 1600,
                saveToPhotos: false,
                includeBase64: false,
                ...options,
            },
            callback
        );
    } catch (e) {
        callback?.({
            errorCode: "exception",
            errorMessage: e?.message || "Camera unavailable",
        });
    }
};

export const isGeolocationReady = () =>
    Platform.OS !== "android" || hasGeolocationNative();

export const isCameraReady = () =>
    Platform.OS !== "android" || hasImagePickerNative();
