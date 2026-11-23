import { BASE_URL } from "../../constant/url";
import { GETNETWORK, PATCHNETWORK, POSTNETWORK } from "../../utils/Network";

export const USER_ROLE_OPTIONS = [
    { key: "super_admin", label: "Super Admin" },
    { key: "authority", label: "Authority Viewer" },
    { key: "supervisor", label: "Zone Supervisor" },
    { key: "field_staff", label: "Field Staff" },
    { key: "grievance_officer", label: "Grievance Officer" },
];

export const ROLE_LABEL_BY_KEY = USER_ROLE_OPTIONS.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
}, {});

export const ROLE_KEY_BY_LABEL = USER_ROLE_OPTIONS.reduce((acc, item) => {
    acc[item.label] = item.key;
    return acc;
}, {});

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
    if (result.error && !result.data && Number(result.statusCode || 0) >= 400) return false;
    const code = Number(result.statusCode || result.status || 0);
    if (code >= 400) return false;
    return true;
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

const extractList = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.data)) return result.data.data;
    return [];
};

const initialsOf = (name) =>
    String(name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "U";

const AVATAR_COLORS = [
    "#64748B",
    "#7C3AED",
    "#16A34A",
    "#2563EB",
    "#DC2626",
    "#0F766E",
    "#EA5F0B",
    "#DB2777",
];

const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    let hours = d.getHours();
    const am = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getFullYear()}, ${String(hours).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${am}`;
};

export const roleKeyFromLabel = (labelOrKey) => {
    const raw = String(labelOrKey || "").trim();
    if (!raw) return "";
    if (ROLE_LABEL_BY_KEY[raw]) return raw;
    if (ROLE_KEY_BY_LABEL[raw]) return ROLE_KEY_BY_LABEL[raw];
    const lower = raw.toLowerCase().replace(/\s+/g, "_");
    if (ROLE_LABEL_BY_KEY[lower]) return lower;
    return raw;
};

export const roleRequiresSupervisor = (role) => {
    const key = roleKeyFromLabel(role);
    return key === "supervisor" || key === "field_staff";
};

export const mapUser = (item, index = 0) => {
    if (!item || typeof item !== "object") return null;
    const roleKey = roleKeyFromLabel(item.role || item.roleKey);
    const roleLabel =
        item.roleLabel ||
        ROLE_LABEL_BY_KEY[roleKey] ||
        toErrorText(item.role, "User");
    const supervisorName = toErrorText(
        item.supervisor?.name || item.supervisorName,
        ""
    );
    const zoneCode = toErrorText(
        item.supervisor?.zoneCode || item.zoneCode || item.assignedZone,
        ""
    );
    const zone =
        supervisorName && zoneCode
            ? `${zoneCode} — ${supervisorName}`
            : supervisorName || (zoneCode ? `Zone ${zoneCode}` : "—");
    const active = item.active !== false && item.status !== "Inactive";

    return {
        raw: item,
        id: item.id,
        name: toErrorText(item.name, "User"),
        email: toErrorText(item.email, ""),
        phone: toErrorText(item.phone || item.mobile, ""),
        role: roleKey,
        roleLabel,
        supervisorId: item.supervisorId ?? item.supervisor?.id ?? null,
        supervisorName,
        zoneCode,
        zone,
        active,
        status: active ? "Active" : "Inactive",
        createdAt: item.createdAt || null,
        date: formatDate(item.createdAt),
        initials: initialsOf(item.name),
        color: AVATAR_COLORS[Number(item.id || index) % AVATAR_COLORS.length],
    };
};

/** GET /users */
export const fetchUsers = async (params = {}) => {
    const role = params.role ? roleKeyFromLabel(params.role) : undefined;
    const url = withQuery("users", {
        page: params.page || 1,
        limit: params.limit || 15,
        role: role && role !== "all" ? role : undefined,
        q: params.q || undefined,
    });
    const result = await GETNETWORK(url, true);
    const list = extractList(result)
        .map((item, idx) => mapUser(item, idx))
        .filter(Boolean);
    const meta = result?.meta || result?.data?.meta || {};
    return {
        result,
        ok: isApiSuccess(result),
        data: list,
        meta: {
            page: Number(meta.page || params.page || 1),
            limit: Number(meta.limit || params.limit || 15),
            total: Number(meta.total ?? list.length),
            totalPages: Number(meta.totalPages || 1),
        },
        message: toErrorText(result?.error || result?.message, "Failed to load users"),
    };
};

/** POST /users */
export const createUser = async (payload = {}) => {
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const role = roleKeyFromLabel(payload.role);
    const phone = String(payload.phone || "").trim();
    const supervisorId =
        payload.supervisorId != null && payload.supervisorId !== ""
            ? Number(payload.supervisorId)
            : null;

    if (name.length < 2 || name.length > 120) {
        return { ok: false, data: null, message: "Name must be 2–120 characters" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, data: null, message: "Enter a valid email address" };
    }
    if (password.length < 6 || password.length > 72) {
        return { ok: false, data: null, message: "Password must be 6–72 characters" };
    }
    if (!ROLE_LABEL_BY_KEY[role]) {
        return { ok: false, data: null, message: "Select a valid user role" };
    }
    if (roleRequiresSupervisor(role) && !supervisorId) {
        return {
            ok: false,
            data: null,
            message: "Supervisor/zone assignment is required for this role",
        };
    }
    if (phone && phone.length > 20) {
        return { ok: false, data: null, message: "Phone must be at most 20 characters" };
    }

    const body = { name, email, password, role };
    if (phone) body.phone = phone;
    if (supervisorId) body.supervisorId = supervisorId;

    const result = await POSTNETWORK(`${BASE_URL}users`, body, true);
    const ok =
        isApiSuccess(result) ||
        result?.ok === true ||
        Number(result?.statusCode) === 201;
    return {
        result,
        ok,
        data: result?.data ? mapUser(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "User created" : "Failed to create user"
        ),
    };
};

/** PATCH /users/:id */
export const updateUser = async (id, payload = {}) => {
    if (id == null || id === "") {
        return { ok: false, data: null, message: "User id is required" };
    }
    const body = {};
    if (payload.name != null) body.name = String(payload.name).trim();
    if (payload.phone != null) body.phone = String(payload.phone).trim();
    if (payload.password != null && String(payload.password).length) {
        body.password = String(payload.password);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "supervisorId")) {
        body.supervisorId =
            payload.supervisorId == null || payload.supervisorId === ""
                ? null
                : Number(payload.supervisorId);
    }
    if (typeof payload.active === "boolean") body.active = payload.active;

    const result = await PATCHNETWORK(`${BASE_URL}users/${id}`, body, true);
    const ok = isApiSuccess(result) || result?.ok === true;
    return {
        result,
        ok,
        data: result?.data ? mapUser(result.data) : null,
        message: toErrorText(
            result?.error || result?.message,
            ok ? "User updated" : "Failed to update user"
        ),
    };
};
