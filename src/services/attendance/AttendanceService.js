import { BASE_URL } from "../../constant/url";
import { GETNETWORK, POSTNETWORK } from "../../utils/Network";
import { ensureLocationPermission } from "../../utils/permissions";
import { getCurrentPosition } from "../../utils/deviceServices";

export const ATTENDANCE_STATUS_LABEL = {
    checked_in: "On duty (checked in)",
    checked_out: "Checked out",
};

export const MANUAL_STATUS_OPTIONS = [
    { key: "checked_in", label: "On duty (checked in)" },
    { key: "checked_out", label: "Checked out" },
];

const pad = (n) => String(n).padStart(2, "0");

export const toErrorText = (value, fallback = "Something went wrong") => {
    if (value == null || value === "") return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
    if (typeof value?.error?.message === "string") return value.error.message;
    if (Array.isArray(value?.errors) && value.errors.length) {
        return value.errors
            .map((e) => (typeof e === "string" ? e : e?.message || JSON.stringify(e)))
            .join(", ");
    }
    try {
        return JSON.stringify(value);
    } catch (_) {
        return fallback;
    }
};

export const isApiSuccess = (result) => {
    if (!result) return false;
    if (result.ok === false) return false;
    if (result.success === false) return false;
    if (result.error) return false;
    const code = Number(result.statusCode || result.status || 0);
    if (code >= 400) return false;
    return true;
};

export const todayIsoIst = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}`;
};

export const formDateToIso = (ddmmyyyy) => {
    const [dd, mm, yyyy] = String(ddmmyyyy || "").split(/[-\s]/).map(Number);
    if (!dd || !mm || !yyyy) return null;
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
};

export const isoToFormDate = (iso) => {
    const raw = String(iso || "").slice(0, 10);
    const [yyyy, mm, dd] = raw.split("-").map(Number);
    if (!yyyy || !mm || !dd) return "";
    return `${pad(dd)}-${pad(mm)}-${yyyy}`;
};

export const isoToDisplayDate = (iso) => {
    const raw = String(iso || "").slice(0, 10);
    if (!raw || raw.length < 10) return "—";
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = d.getMonth() === 8 ? "Sept" : months[d.getMonth()];
    return `${d.getDate()} ${month} ${d.getFullYear()}`;
};

export const formatPunchTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
};

export const formatCoords = (lat, lng) => {
    if (lat == null || lng == null) return "—";
    const a = Number(lat);
    const b = Number(lng);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
    return `${a.toFixed(5)}, ${b.toFixed(5)}`;
};

const placeNameCache = new Map();

const shortenPlaceName = (displayName) => {
    const parts = String(displayName || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    if (!parts.length) return "";
    // Prefer road / locality style short label
    return parts.slice(0, 3).join(", ");
};

/**
 * Reverse-geocode lat/lng → human place name (OpenStreetMap Nominatim).
 * Cached in-memory; falls back to formatted coordinates.
 */
export const reverseGeocode = async (lat, lng) => {
    const a = Number(lat);
    const b = Number(lng);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
    const key = `${a.toFixed(4)},${b.toFixed(4)}`;
    if (placeNameCache.has(key)) return placeNameCache.get(key);

    const coordsLabel = formatCoords(a, b);
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
            a
        )}&lon=${encodeURIComponent(b)}&zoom=16&addressdetails=0`;
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "User-Agent": "PKMD-CRM-Mobile/1.0 (attendance)",
            },
        });
        if (!res.ok) {
            placeNameCache.set(key, coordsLabel);
            return coordsLabel;
        }
        const json = await res.json();
        const name =
            shortenPlaceName(json?.display_name || json?.name) || coordsLabel;
        placeNameCache.set(key, name);
        return name;
    } catch (_) {
        placeNameCache.set(key, coordsLabel);
        return coordsLabel;
    }
};

/** Resolve place names for a list of { lat, lng } (deduped). */
export const resolvePlaceNames = async (points = []) => {
    const unique = [];
    const seen = new Set();
    points.forEach((p) => {
        const a = Number(p?.lat);
        const b = Number(p?.lng);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        const key = `${a.toFixed(4)},${b.toFixed(4)}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push({ lat: a, lng: b, key });
    });
    const map = {};
    for (let i = 0; i < unique.length; i += 1) {
        const p = unique[i];
        // Nominatim usage policy: gentle pacing
        // eslint-disable-next-line no-await-in-loop
        map[p.key] = await reverseGeocode(p.lat, p.lng);
        if (i < unique.length - 1) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 110));
        }
    }
    return map;
};

export const placeKey = (lat, lng) => {
    const a = Number(lat);
    const b = Number(lng);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return `${a.toFixed(4)},${b.toFixed(4)}`;
};

/** Convert "dd-mm-yyyy HH:mm" (24h) to ISO with IST offset. */
export const formDateTimeToIso = (value) => {
    const text = String(value || "").trim();
    const m = text.match(
        /^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?/i
    );
    if (!m) return null;
    let hour = Number(m[4] ?? 9);
    const minute = Number(m[5] ?? 0);
    const ampm = (m[6] || "").toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return `${m[3]}-${m[2]}-${m[1]}T${pad(hour)}:${pad(minute)}:00+05:30`;
};

export const statusLabel = (status) => {
    if (!status) return "Not marked";
    return ATTENDANCE_STATUS_LABEL[status] || String(status).replace(/_/g, " ");
};

const readPositionOnce = (options = {}) =>
    new Promise((resolve) => {
        getCurrentPosition(
            (pos) => {
                const latitude = pos?.coords?.latitude;
                const longitude = pos?.coords?.longitude;
                const accuracy = pos?.coords?.accuracy;
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    resolve({
                        ok: false,
                        error: "Could not read device GPS coordinates.",
                    });
                    return;
                }
                resolve({ ok: true, latitude, longitude, accuracy });
            },
            (err) =>
                resolve({
                    ok: false,
                    error:
                        err?.message ||
                        "Please turn on device location and try again.",
                    code: err?.code,
                }),
            options
        );
    });

/**
 * Returns { ok, latitude, longitude, accuracy, error }.
 * Uses permission + Turn-on GPS dialog, then:
 * 1) fast network / cached fix
 * 2) high-accuracy GPS retry (avoids "Location request timed out")
 */
export const getCurrentCoords = async () => {
    try {
        const granted = await ensureLocationPermission();
        if (!granted) {
            return {
                ok: false,
                error: "Location permission is required. Please allow location access.",
            };
        }

        // Pass 1: quick fix (network / recent cache) — works indoors better
        const fast = await readPositionOnce({
            enableHighAccuracy: false,
            timeout: 25000,
            maximumAge: 120000,
        });
        if (fast.ok) return fast;

        // Pass 2: GPS retry with longer timeout
        const precise = await readPositionOnce({
            enableHighAccuracy: true,
            timeout: 45000,
            maximumAge: 15000,
            skipLocationPrompt: true,
        });
        if (precise.ok) return precise;

        const timedOut = String(fast.error || precise.error || "")
            .toLowerCase()
            .includes("timed out");
        return {
            ok: false,
            error: timedOut
                ? "Location timed out. Move outdoors or turn on Location / GPS, then try Check In again."
                : precise.error ||
                  fast.error ||
                  "Please turn on device location and try again.",
        };
    } catch (e) {
        return {
            ok: false,
            error: e?.message || "Could not get current location.",
        };
    }
};

const withQuery = (path, params = {}) => {
    const entries = Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
    );
    if (!entries.length) return `${BASE_URL}${path}`;
    const qs = entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
    return `${BASE_URL}${path}?${qs}`;
};

export const fetchTodayAttendance = async () => {
    const result = await GETNETWORK(`${BASE_URL}attendance/today`, true);
    return {
        result,
        ok: isApiSuccess(result),
        data: result?.data ?? null,
        dutyDate: result?.dutyDate || todayIsoIst(),
    };
};

export const fetchAttendanceWorkers = async () => {
    const result = await GETNETWORK(`${BASE_URL}attendance/workers`, true);
    const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];
    return { result, ok: isApiSuccess(result), data: list };
};

export const fetchAttendanceRoster = async ({ date } = {}) => {
    const url = withQuery("attendance/roster", { date });
    const result = await GETNETWORK(url, true);
    return {
        result,
        ok: isApiSuccess(result),
        dutyDate: result?.dutyDate || date || todayIsoIst(),
        groups: Array.isArray(result?.groups) ? result.groups : [],
        summary: result?.summary || {
            supervisors: 0,
            workers: 0,
            present: 0,
            onDuty: 0,
            absent: 0,
        },
    };
};

export const fetchAttendanceRegister = async (params = {}) => {
    const url = withQuery("attendance", {
        page: params.page || 1,
        limit: params.limit || 20,
        userId: params.userId,
        status: params.status,
        date: params.date,
        from: params.from,
        to: params.to,
        zoneCode: params.zoneCode,
    });
    const result = await GETNETWORK(url, true);
    const list = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];
    return {
        result,
        ok: isApiSuccess(result),
        data: list,
        meta: result?.meta || {},
        summary: result?.summary || {},
    };
};

export const postManualAttendance = async (payload) => {
    const result = await POSTNETWORK(`${BASE_URL}attendance/manual`, payload, true);
    return {
        result,
        ok: isApiSuccess(result) && !!(result?.data || result?.success !== false),
        data: result?.data || null,
    };
};

export const postCheckIn = async (payload = {}) => {
    const result = await POSTNETWORK(`${BASE_URL}attendance/check-in`, payload, true);
    const conflict =
        Number(result?.statusCode) === 409 ||
        String(result?.error?.message || result?.message || "")
            .toLowerCase()
            .includes("already");
    const ok = isApiSuccess(result) && !result?.error;
    return {
        result,
        ok,
        conflict,
        data: result?.data || null,
        // Prefer backend response text for both success and error
        message: ok
            ? toErrorText(result?.message, "Checked in successfully")
            : toErrorText(
                  result?.error || result?.message || result,
                  conflict ? "Already checked in" : "Check-in failed"
              ),
    };
};

export const postCheckOut = async (payload = {}) => {
    const result = await POSTNETWORK(`${BASE_URL}attendance/check-out`, payload, true);
    const ok = isApiSuccess(result) && !result?.error;
    return {
        result,
        ok,
        alreadyDone: !!result?.alreadyDone,
        skipped: !!result?.skipped,
        data: result?.data || null,
        message: ok
            ? toErrorText(
                  result?.message,
                  result?.alreadyDone
                      ? "Already checked out for today"
                      : "Checked out successfully"
              )
            : toErrorText(result?.error || result?.message || result, "Check-out failed"),
    };
};

export const mapWorkerOption = (w) => ({
    id: w?.id,
    name: w?.name || `Worker #${w?.id}`,
    phone: w?.phone || "—",
    role: w?.role || "field_staff",
    supervisorId: w?.supervisorId ?? w?.supervisor?.id ?? null,
    zone:
        w?.supervisor?.assignedRoadSegment ||
        w?.supervisor?.zoneCode ||
        w?.zoneCode ||
        "—",
    letter: String(w?.name || "?").charAt(0).toUpperCase(),
    color: w?.supervisor?.color || "#2563EB",
});

export const mapRosterGroup = (group) => {
    const supervisor = group?.supervisor || {};
    const workers = (group?.workers || []).map((row) => {
        const user = row?.user || {};
        const attendance = row?.attendance || null;
        const status = attendance?.status || null;
        return {
            id: user.id,
            name: user.name || "—",
            phone: user.phone || "—",
            role: user.role || "field_staff",
            status: status ? statusLabel(status) : "Not marked",
            statusKey: status,
            attendance,
            checkIn: formatPunchTime(attendance?.checkInAt),
            checkOut: formatPunchTime(attendance?.checkOutAt),
            checkInLat: attendance?.checkInLat ?? null,
            checkInLng: attendance?.checkInLng ?? null,
            checkOutLat: attendance?.checkOutLat ?? null,
            checkOutLng: attendance?.checkOutLng ?? null,
            loginLocation: formatCoords(attendance?.checkInLat, attendance?.checkInLng),
            logoutLocation: formatCoords(attendance?.checkOutLat, attendance?.checkOutLng),
            loginLocationName: formatCoords(attendance?.checkInLat, attendance?.checkInLng),
            logoutLocationName: formatCoords(
                attendance?.checkOutLat,
                attendance?.checkOutLng
            ),
        };
    });
    return {
        id: supervisor.id,
        name: supervisor.name || "Supervisor",
        zone:
            supervisor.assignedRoadSegment ||
            supervisor.zoneCode ||
            "—",
        zoneCode: supervisor.zoneCode || "",
        color: supervisor.color || "#2563EB",
        initial: String(supervisor.name || "S").charAt(0).toUpperCase(),
        present: group?.present ?? 0,
        onDuty: group?.onDuty ?? 0,
        absent: group?.absent ?? 0,
        workers,
    };
};

export const mapRegisterRecord = (item) => {
    const status = item?.status || "";
    const name = item?.staff?.name || item?.markedBy?.name || `User #${item?.userId}`;
    return {
        id: item?.id,
        userId: item?.userId,
        name,
        letter: String(name).charAt(0).toUpperCase(),
        color: "#2563EB",
        zone: item?.zoneCode || item?.supervisor?.zoneCode || "—",
        dutyDate: item?.dutyDate,
        dutyDateDisplay: isoToDisplayDate(item?.dutyDate),
        status,
        statusLabel: statusLabel(status),
        checkIn: formatPunchTime(item?.checkInAt),
        checkOut: formatPunchTime(item?.checkOutAt),
        checkInLat: item?.checkInLat ?? null,
        checkInLng: item?.checkInLng ?? null,
        checkOutLat: item?.checkOutLat ?? null,
        checkOutLng: item?.checkOutLng ?? null,
        loginLocation: formatCoords(item?.checkInLat, item?.checkInLng),
        logoutLocation: formatCoords(item?.checkOutLat, item?.checkOutLng),
        loginLocationName: formatCoords(item?.checkInLat, item?.checkInLng),
        logoutLocationName: formatCoords(item?.checkOutLat, item?.checkOutLng),
        notes: item?.notes || "",
        raw: item,
    };
};
