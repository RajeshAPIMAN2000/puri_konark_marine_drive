import { useCallback, useEffect, useMemo, useState } from "react";
import {
    buildActivityFeed,
    buildCategoryBars,
    buildDashboardStats,
    buildZoneBars,
    fetchDashboardSummary,
} from "../services/dashboard/DashboardSummaryService";

/** Always return a string so <Text>{error}</Text> never receives an object. */
const toErrorText = (value) => {
    if (value == null || value === false) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
    if (typeof value?.error?.message === "string") return value.error.message;
    if (typeof value?.msg === "string") return value.msg;
    try {
        return JSON.stringify(value);
    } catch (_) {
        return "Failed to load dashboard";
    }
};

/**
 * Shared dashboard/summary loader for all role dashboards.
 * Uses GETNETWORK(BASE_URL + dashboard/summary, true) with Bearer token.
 */
export default function useDashboardSummary() {
    const [raw, setRaw] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchDashboardSummary();
            console.log("Dashboard summary success:", result);

            if (!result) {
                const msg = "Failed to load dashboard";
                console.log("Dashboard summary error:", msg);
                setError(msg);
                setRaw(null);
                return null;
            }

            const hasPayload =
                result.kpis ||
                result.charts ||
                result.feed ||
                result.data?.kpis ||
                result.data?.charts;

            if (!hasPayload) {
                const msg =
                    toErrorText(result?.message) ||
                    toErrorText(result?.error) ||
                    toErrorText(result) ||
                    "Failed to load dashboard";
                console.log("Dashboard summary error:", msg, result);
                setError(msg);
                setRaw(null);
                return null;
            }

            const payload = result?.data?.kpis ? result.data : result;
            setRaw(payload || null);
            return payload;
        } catch (err) {
            const msg = toErrorText(err) || "Failed to load dashboard";
            console.log("Dashboard summary error:", msg, err);
            setError(msg);
            setRaw(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const kpis = raw?.kpis || {};
    const charts = raw?.charts || {};
    const feed = raw?.feed || [];
    const scoped = !!raw?.scoped;

    const stats = useMemo(() => buildDashboardStats(kpis), [kpis]);
    const zoneBars = useMemo(
        () => buildZoneBars(charts.vendorsByZone),
        [charts.vendorsByZone]
    );
    const categories = useMemo(
        () => buildCategoryBars(charts.grievanceByCategory),
        [charts.grievanceByCategory]
    );
    const activities = useMemo(() => buildActivityFeed(feed), [feed]);
    const avgResolutionHours = Number(charts.avgResolutionHours ?? 0);
    const fleetUptime = Number(charts.fleetUptime ?? 0);
    const slaHours = Number(charts.slaHours ?? 48);
    const grievanceTrend = Array.isArray(charts.grievanceTrend)
        ? charts.grievanceTrend
        : [];

    return {
        loading,
        error,
        raw,
        kpis,
        charts,
        feed,
        scoped,
        stats,
        zoneBars,
        categories,
        activities,
        avgResolutionHours,
        fleetUptime,
        slaHours,
        grievanceTrend,
        refresh: load,
    };
}
