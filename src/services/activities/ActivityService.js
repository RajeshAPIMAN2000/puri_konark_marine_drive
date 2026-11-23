import { BASE_URL } from "../../constant/url";
import { DELETENETWORK, GETNETWORK, POSTNETWORK } from "../../utils/Network";
import { getObjByKey } from "../../utils/Storage";

/** Keys accepted by POST /activities (WORK_STATUS_LABEL). */
export const WORK_STATUS_LABEL = {
    in_progress: "In Progress",
    on_track: "On Track",
    delayed: "Delayed",
    pending: "Pending",
    completed: "Completed",
};

export const WORK_STATUS_OPTIONS = Object.entries(WORK_STATUS_LABEL).map(
    ([key, label]) => ({ key, label })
);

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const pad = (n) => String(n).padStart(2, "0");

export const toErrorText = (value, fallback = "Something went wrong") => {
    if (value == null || value === "") return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.error === "string") return value.error;
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

export const formDateToIso = (ddmmyyyy) => {
    const [dd, mm, yyyy] = String(ddmmyyyy || "").split("-").map(Number);
    if (!dd || !mm || !yyyy) return null;
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
};

export const isoToFormDate = (iso) => {
    if (!iso) return "";
    const raw = String(iso).slice(0, 10);
    const [yyyy, mm, dd] = raw.split("-").map(Number);
    if (!yyyy || !mm || !dd) return "";
    return `${pad(dd)}-${pad(mm)}-${yyyy}`;
};

export const isoToDisplayDate = (iso) => {
    if (!iso) return "—";
    const raw = String(iso).slice(0, 10);
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(iso);
    const month = d.getMonth() === 8 ? "Sept" : MONTHS[d.getMonth()];
    return `${pad(d.getDate())} ${month} ${d.getFullYear()}`;
};

const zoneLetter = (zoneCode) => {
    const code = String(zoneCode || "").trim();
    if (!code) return "?";
    const match = code.match(/([A-Za-z])\s*$/);
    if (match) return match[1].toUpperCase();
    return code.charAt(0).toUpperCase();
};

export const mapActivityToCard = (item) => {
    const workStatus = String(item?.workStatus || "").toLowerCase();
    const statusLabel =
        item?.workStatusLabel ||
        WORK_STATUS_LABEL[workStatus] ||
        item?.workStatus ||
        "—";
    const name =
        item?.supervisor?.name ||
        item?.reporter?.name ||
        item?.supervisorName ||
        "—";
    const zoneCode = item?.zoneCode || item?.supervisor?.zoneCode || "—";
    const material = item?.materialUsage || "";
    const notes = item?.notes || "";
    const title =
        notes ||
        material ||
        `${statusLabel} — ${zoneCode}`;

    return {
        id: item?.id,
        raw: item,
        date: isoToDisplayDate(item?.activityDate),
        activityDateIso: String(item?.activityDate || "").slice(0, 10),
        zoneCode,
        letter: zoneLetter(zoneCode),
        name,
        title,
        subtitle: material,
        status: statusLabel,
        workStatus,
        manpower: String(item?.manpowerCount ?? "—"),
        material,
        notes,
        time: "",
        supervisorId: item?.supervisorId ?? item?.supervisor?.id ?? null,
        formDate: isoToFormDate(item?.activityDate),
    };
};

const extractList = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.data)) return result.data.data;
    if (Array.isArray(result?.data?.activities)) return result.data.activities;
    if (Array.isArray(result?.activities)) return result.activities;
    if (Array.isArray(result?.data?.rows)) return result.data.rows;
    return [];
};

export const isApiSuccess = (result) => {
    if (!result) return false;
    if (result.ok === false) return false;
    if (result.success === false) return false;
    if (result.statusCode && Number(result.statusCode) >= 400) return false;
    if (result.status && Number(result.status) >= 400) return false;
    return true;
};

export const fetchActivities = async () => {
    const url = `${BASE_URL}activities`;
    const result = await GETNETWORK(url, true);
    const list = extractList(result).map(mapActivityToCard);
    return { result, list, ok: isApiSuccess(result) };
};

export const createActivity = async (payload) => {
    const url = `${BASE_URL}activities`;
    const result = await POSTNETWORK(url, payload, true);
    return {
        result,
        ok: isApiSuccess(result) && !!(result?.data || result?.id || result?.success !== false),
        data: result?.data || result,
    };
};

export const deleteActivity = async (id) => {
    const url = `${BASE_URL}activities/${id}`;
    const result = await DELETENETWORK(url, true);
    return {
        result,
        ok: isApiSuccess(result) || result?.ok === true || Number(result?.statusCode) === 200 || Number(result?.statusCode) === 204,
    };
};

/**
 * Resolve supervisorId for create:
 * - Prefer explicit form value
 * - Else logged-in user id when role looks like supervisor
 */
export const resolveDefaultSupervisorId = async () => {
    try {
        const login = await getObjByKey("loginResponse");
        const user = login?.user || login?.data?.user || login || {};
        const role = String(
            user?.role || login?.role || user?.roleName || ""
        ).toLowerCase();
        const id =
            user?.supervisorId ||
            user?.id ||
            login?.supervisorId ||
            login?.userId ||
            login?.id;
        if (role.includes("supervisor") && id != null && id !== "") {
            return Number(id);
        }
        if (id != null && id !== "" && !role.includes("admin") && !role.includes("authority")) {
            const num = Number(id);
            return Number.isFinite(num) ? num : null;
        }
        return null;
    } catch (_) {
        return null;
    }
};

export const fetchSupervisorOptions = async () => {
    const candidates = [
        `${BASE_URL}supervisors`,
        `${BASE_URL}users?role=supervisor`,
        `${BASE_URL}users/supervisors`,
    ];
    for (const url of candidates) {
        try {
            const result = await GETNETWORK(url, true);
            if (!isApiSuccess(result)) continue;
            const rows = extractList(result);
            if (!rows.length) continue;
            return rows
                .map((row) => ({
                    id: Number(row?.id ?? row?.supervisorId),
                    name: row?.name || row?.fullName || `Supervisor #${row?.id}`,
                    zoneCode: row?.zoneCode || row?.zone || "",
                }))
                .filter((row) => Number.isFinite(row.id));
        } catch (_) {
            // try next
        }
    }
    return [];
};
