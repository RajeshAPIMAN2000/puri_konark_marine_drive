import { useEffect, useMemo, useState } from "react";
import { loadActiveJourney, loadJourneyHistory } from "../services/location/LocationSyncService";
import { subscribeStatus } from "../services/location/BackgroundLocationService";

/**
 * Builds worker marker list from active journey + optional extra workers.
 * Does not invent fake GPS coordinates for other workers.
 */
export default function useWorkerLocations({ extraWorkers = [], selfWorker } = {}) {
    const [activeJourney, setActiveJourney] = useState(null);
    const [history, setHistory] = useState([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState(selfWorker?.id || "self");

    useEffect(() => {
        let alive = true;
        (async () => {
            const journey = await loadActiveJourney();
            const hist = await loadJourneyHistory();
            if (!alive) return;
            setActiveJourney(journey);
            setHistory(hist);
        })();

        const unsub = subscribeStatus((j) => {
            if (!alive) return;
            if (j?.status === "active") setActiveJourney(j);
            if (j?.status === "stopped") setActiveJourney(null);
        });

        return () => {
            alive = false;
            unsub?.();
        };
    }, []);

    const workers = useMemo(() => {
        const list = [];

        const point = activeJourney?.lastPoint;
        if (point) {
            list.push({
                id: selfWorker?.id || "self",
                name: selfWorker?.name || "Current worker",
                initial: (selfWorker?.name || "C").charAt(0).toUpperCase(),
                latitude: point.latitude,
                longitude: point.longitude,
                status: activeJourney.gpsStatus || "active",
            });
        }

        // Only include extras that already have real coordinates
        extraWorkers.forEach((w) => {
            if (w?.latitude != null && w?.longitude != null) {
                list.push({
                    ...w,
                    status: w.status || "offline",
                });
            }
        });

        return list;
    }, [activeJourney, extraWorkers, selfWorker]);

    return {
        workers,
        activeJourney,
        history,
        selectedWorkerId,
        setSelectedWorkerId,
        currentLocation: activeJourney?.lastPoint || null,
        routePoints: activeJourney?.route || [],
    };
}
