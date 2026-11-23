import { useCallback, useEffect, useRef, useState } from "react";
import {
    restoreTrackingIfNeeded,
    startJourney,
    stopJourney,
    subscribeError,
    subscribeLocation,
    subscribeStatus,
} from "../services/location/BackgroundLocationService";
import { loadActiveJourney } from "../services/location/LocationSyncService";

/**
 * Hook for Start/Stop Journey UI. Tracking itself is owned by BackgroundLocationService
 * and continues when this component unmounts.
 */
export default function useBackgroundTracking({ worker } = {}) {
    const [journey, setJourney] = useState(null);
    const [lastSample, setLastSample] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        let unsubLoc;
        let unsubStatus;
        let unsubErr;

        (async () => {
            try {
                const existing = await loadActiveJourney();
                if (mounted.current) setJourney(existing);
                // Only touch native BGeo when a journey is already active
                if (existing?.status === "active") {
                    await restoreTrackingIfNeeded();
                }
            } catch (err) {
                if (mounted.current) {
                    setError(err?.message || String(err));
                }
            }
        })();

        unsubLoc = subscribeLocation(({ sample, journey: j }) => {
            if (!mounted.current) return;
            if (sample) setLastSample(sample);
            if (j) setJourney(j);
        });
        unsubStatus = subscribeStatus((j) => {
            if (!mounted.current) return;
            if (j?.status) setJourney(j);
            else if (j == null) setJourney(null);
        });
        unsubErr = subscribeError((err) => {
            if (!mounted.current) return;
            setError(err?.message || String(err));
        });

        return () => {
            mounted.current = false;
            unsubLoc?.();
            unsubStatus?.();
            unsubErr?.();
        };
    }, []);

    const start = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const result = await startJourney({ worker });
            if (result.journey) setJourney(result.journey);
            if (!result.ok) {
                setError(result.reason || "start_failed");
            }
            return result;
        } catch (err) {
            setError(err?.message || String(err));
            return { ok: false, reason: "start_failed" };
        } finally {
            setBusy(false);
        }
    }, [worker]);

    const stop = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const result = await stopJourney();
            if (result.ok) {
                setJourney(result.journey);
            } else {
                setError(result.reason || "stop_failed");
            }
            return result;
        } catch (err) {
            setError(err?.message || String(err));
            return { ok: false, reason: "stop_failed" };
        } finally {
            setBusy(false);
        }
    }, []);

    return {
        journey,
        lastSample,
        busy,
        error,
        isActive: journey?.status === "active",
        start,
        stop,
        setJourney,
    };
}
