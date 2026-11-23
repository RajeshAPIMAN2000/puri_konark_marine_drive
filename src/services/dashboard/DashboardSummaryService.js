import { BASE_URL } from "../../constant/url";
import { GETNETWORK } from "../../utils/Network";
import {
    BLUE,
    GREEN,
    ORANGE,
    PINK,
    PURPLE,
    RED,
    TEAL,
} from "../../constant/color";
import {
    FIELDATTENDANCE,
    GRIVANCE,
    REPORTS,
    SUPERVISOR,
    VECHILES,
    VENDOR,
} from "../../constant/imagePath";

const ZONE_COLORS = [BLUE, TEAL, PURPLE, PINK, ORANGE, GREEN, RED, "#64748B"];
const CATEGORY_COLORS = [
    ORANGE,
    PURPLE,
    TEAL,
    RED,
    PINK,
    BLUE,
    "#1E3A8A",
    "#94A3B8",
];

export const fetchDashboardSummary = async () => {
    const url = `${BASE_URL}dashboard/summary`;
    const result = await GETNETWORK(url, true);
    return result;
};

export const formatRelativeTime = (iso) => {
    if (!iso) return "";
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return String(iso);
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const buildDashboardStats = (kpis = {}) => {
    const vendors = kpis.vendors || {};
    const supervisors = kpis.supervisors || {};
    const grievances = kpis.grievances || {};
    const vehicles = kpis.vehicles || {};
    const reports = kpis.reports || {};
    const attendance = kpis.attendance || {};

    return [
        {
            icon: VENDOR,
            iconBg: "#E8F0FE",
            value: String(vendors.total ?? 0),
            label: "Vendors on Record",
            sub: `${vendors.active ?? 0} active · ${vendors.unverified ?? 0} unverified`,
            subColor: GREEN,
        },
        {
            icon: SUPERVISOR,
            iconBg: "#F3E8FF",
            value: String(supervisors.count ?? 0),
            label: "Supervisors / Zones",
            sub: "Role-scoped zones",
            subColor: "#8A94A6",
        },
        {
            icon: GRIVANCE,
            iconBg: "#FEE2E2",
            value: String(grievances.open ?? 0),
            label: "Open Grievances",
            sub: `${grievances.createdLast7Days ?? 0} created last 7 days`,
            subColor: RED,
        },
        {
            icon: VECHILES,
            iconBg: "#DCFCE7",
            value: `${vehicles.active ?? 0}/${vehicles.total ?? 0}`,
            label: "Vehicles Active",
            sub: `${vehicles.idle ?? 0} idle · ${vehicles.offline ?? 0} offline`,
            subColor: "#8A94A6",
        },
        {
            icon: REPORTS,
            iconBg: "#E0F2FE",
            value: String(reports.today ?? 0),
            label: "Reports Today",
            sub: `${reports.last7Days ?? 0} in last 7 days`,
            subColor: "#8A94A6",
        },
        {
            icon: FIELDATTENDANCE,
            iconBg: "#D1FAE5",
            value: String(attendance.presentToday ?? 0),
            label: "Field Attendance",
            sub: `${attendance.onDutyNow ?? 0} still on duty`,
            subColor: GREEN,
        },
    ];
};

export const buildZoneBars = (vendorsByZone = []) =>
    (Array.isArray(vendorsByZone) ? vendorsByZone : []).map((item, index) => {
        const zone = String(item.zone || item.name || `Z${index + 1}`);
        const label = zone.replace(/^ZONE-?/i, "").charAt(0).toUpperCase() || String(index + 1);
        return {
            label: label || String(index + 1),
            value: Number(item.count ?? item.value ?? 0),
            color: item.color || ZONE_COLORS[index % ZONE_COLORS.length],
            name: item.name || zone,
        };
    });

export const buildCategoryBars = (grievanceByCategory = []) =>
    (Array.isArray(grievanceByCategory) ? grievanceByCategory : []).map((item, index) => ({
        label: item.name || item.category || `Category ${index + 1}`,
        value: Number(item.value ?? item.count ?? 0),
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

const asText = (value, fallback = "") => {
    if (value == null) return fallback;
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value?.message === "string") return value.message;
    if (typeof value?.title === "string") return value.title;
    try {
        return JSON.stringify(value);
    } catch (_) {
        return fallback;
    }
};

export const buildActivityFeed = (feed = []) =>
    (Array.isArray(feed) ? feed : []).map((item) => {
        const type = String(item?.type || "").toLowerCase();
        let icon = GRIVANCE;
        let iconBg = "#FEE2E2";
        if (type === "report") {
            icon = REPORTS;
            iconBg = "#E0F2FE";
        } else if (type === "fleet") {
            icon = VECHILES;
            iconBg = "#F3E8FF";
        }
        return {
            id: asText(item?.id, `${type}-${item?.at || Date.now()}`),
            type,
            icon,
            iconBg,
            title: asText(item?.title, "Activity"),
            sub: asText(item?.meta, ""),
            time: formatRelativeTime(item?.at),
            link: asText(item?.link, ""),
            at: item?.at,
        };
    });
