import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import StaticCrmMap from "../../../components/map/StaticCrmMap";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { ToastMessage } from "../../../components/commonComponents/ToastMessage";
import { GREEN, NAVY, WHITE } from "../../../constant/color";
import { LONGITUTE, CITIZENCONTACT } from "../../../constant/imagePath";
import {
    fetchImportIssues,
    fixImportIssueCoordinates,
    isValidOdishaCoords,
    resolveImportIssue,
    toErrorText,
} from "../../../services/vendor/ImportIssuesService";
import {
    fetchVendors,
    fetchVendorsMap,
} from "../../../services/vendor/VendorService";

const FLAGGED_PIN_COUNT = 6;

const CORRIDOR_POLYGON = {
    id: "corridor",
    coordinates: [
        [19.95, 85.78],
        [19.95, 86.12],
        [19.8, 86.12],
        [19.8, 85.78],
    ],
    color: "#DC2626",
    fillColor: "#DC2626",
    fillOpacity: 0.04,
    dashArray: "8 6",
    weight: 2,
};

const OVERVIEW_MARKERS = [
    { id: "c7", label: "7", kind: "cluster", latitude: 19.875, longitude: 85.78, color: "#102d4d" },
    { id: "c100", label: "100", kind: "cluster", latitude: 19.813, longitude: 85.845, color: "#102d4d" },
    { id: "c24", label: "24", kind: "cluster", latitude: 19.87, longitude: 86.02, color: "#102d4d" },
    { id: "s", label: "S", kind: "letter", latitude: 19.866, longitude: 86.112, color: "#e11d48" },
];

const VENDOR_POPUPS = {
    c7: {
        name: "Marine Drive Betel Cluster",
        zone: "B",
        status: "active",
        area: "Chandrabhaga - Niali",
        owner: "Collective vendors",
        mobile: "9777016981",
        coords: "19.87500, 85.78000",
        supervisor: "Ameet Arush Parida",
        supervisorMobile: "9861010102",
    },
    c100: {
        name: "Puri South Food Court",
        zone: "A",
        status: "active",
        area: "Bhudan Chhak - Chandrabhaga",
        owner: "Not Available",
        mobile: "9337675050",
        coords: "19.81300, 85.84500",
        supervisor: "Ananta Narayan Malik",
        supervisorMobile: "9861010103",
    },
    c24: {
        name: "Ramachandi Belt Stalls",
        zone: "D",
        status: "active",
        area: "Pipili - Ramachandi",
        owner: "Not Available",
        mobile: "9437153800",
        coords: "19.87000, 86.02000",
        supervisor: "Tapas Maharana",
        supervisorMobile: "9861010104",
    },
    s: {
        name: "sona tea stall",
        zone: "G",
        status: "active",
        area: "Niali – Chandika (North Loop)",
        owner: "Amin barik",
        mobile: "9360531662",
        coords: "19.93608, 85.8962",
        supervisor: "Bijay Jena",
        supervisorMobile: "9861010101",
    },
};

const ZONES = [
    { id: "A", name: "Ananta Narayan Malik", area: "Bhudan Chhak - Chandrabhaga", range: "19.824528-19.837328 N · 85.856162-85.879847 E", shops: 39, color: "#2161F5", center: [19.83, 85.868], phone: "9861010103" },
    { id: "B", name: "Ameet Arush Parida", area: "Chandrabhaga - Niali", range: "19.83856-19.936 N · 85.8621-85.89611 E", shops: 19, color: "#07839B", center: [19.87, 85.9], phone: "9861010102" },
    { id: "C", name: "Abinash Mohanty", area: "Solapua - Balugan", range: "19.849628-19.859687 N · 85.938642-85.969537 E", shops: 20, color: "#8039E9", center: [19.855, 85.95], phone: "9861010105" },
    { id: "D", name: "Tapas Maharana", area: "Pipili - Ramachandi", range: "19.854039-19.860052 N · 86.008336-86.040805 E", shops: 22, color: "#E62C79", center: [19.86, 86.02], phone: "9861010104" },
    { id: "E", name: "Sandeep Gochhayat", area: "Khandapada", range: "19.856165-19.856697 N · 86.0582-86.06783 E", shops: 10, color: "#F07800", center: [19.857, 86.063], phone: "9861010106" },
    { id: "F", name: "Mrutunjay Behera", area: "Konark Temple Belt", range: "19.858378-19.85893 N · 86.08307-86.086621 E", shops: 13, color: "#119B69", center: [19.858, 86.085], phone: "9861010107" },
    { id: "G", name: "Bijay Jena", area: "Niali - Chandika (North Loop)", range: "19.858962-19.96822 N · 85.892-85.8962 E", shops: 9, color: "#E6382E", center: [19.91, 85.895], phone: "9861010101" },
];

const VENDORS = [
    { initial: "A", zone: "A", name: "Shankar Betel Shop", owner: "Ashutosh Das", phone: "9777016981", location: "19.824534, 85.856162" },
    { initial: "A", zone: "A", name: "Punbasha Restaurant", owner: "Mana Gobinda Baral", phone: "9337675050", location: "19.824528, 85.856162" },
    { initial: "A", zone: "A", name: "Dakshinkali Dahi Bara Vendor", owner: "Aparati Chuala Singh", phone: "9556323206", location: "19.824528, 85.856189" },
    { initial: "A", zone: "A", name: "Gautam Betel Shop", owner: "Trinath Behera", phone: "9348385050", location: "19.82488, 85.858578" },
    { initial: "A", zone: "A", name: "Pradhan Dhaba", owner: "Not Available", phone: "--", location: "19.825168, 85.859061" },
    { initial: "A", zone: "A", name: "Mandakini Dhaba", owner: "Ashwin K. Jena", phone: "7978876053", location: "19.824951, 85.859018" },
    { initial: "A", zone: "A", name: "Hotel Fonex", owner: "Not Available", phone: "943715380", location: "19.824982, 85.858971" },
    { initial: "D", zone: "D", name: "Mahaveer Coconut Shop", owner: "Not Available", phone: "", location: "--, --" },
    { initial: "C", zone: "C", name: "Coconut Vendor", owner: "Not Available", phone: "", location: "19.849628, 19.849678" },
    { initial: "G", zone: "G", name: "sona tea stall", owner: "Amin barik", phone: "9360531662", location: "19.93608, 85.8962" },
];

const FILLER_SUFFIXES = ["Betel Shop", "Tea Stall", "Snacks Cart", "Coconut Vendor", "Dhaba", "Fruit Stall", "Juice Corner"];

const isCoordIssueType = (type) => {
    const t = String(type || "").toLowerCase();
    return t.includes("coord") || t.includes("missing") || t.includes("longitude") || t.includes("latitude");
};

const parseZoneRange = (range, center) => {
    const latMatch = String(range || "").match(/([\d.]+)\s*-\s*([\d.]+)\s*N/i);
    const lngMatch = String(range || "").match(/([\d.]+)\s*-\s*([\d.]+)\s*E/i);
    if (latMatch && lngMatch) {
        const latMin = parseFloat(latMatch[1]);
        const latMax = parseFloat(latMatch[2]);
        const lngMin = parseFloat(lngMatch[1]);
        const lngMax = parseFloat(lngMatch[2]);
        if ([latMin, latMax, lngMin, lngMax].every(Number.isFinite)) {
            return [
                [latMax, lngMin],
                [latMax, lngMax],
                [latMin, lngMax],
                [latMin, lngMin],
            ];
        }
    }
    const lat = Number(center?.[0]) || 19.85;
    const lng = Number(center?.[1]) || 85.86;
    const d = 0.02;
    return [
        [lat + d, lng - d],
        [lat + d, lng + d],
        [lat - d, lng + d],
        [lat - d, lng - d],
    ];
};

const partitionShopCounts = (total) => {
    if (total === 39) return [11, 4, 19, 2, 3];
    if (total <= 1) return [total];
    if (total <= 5) return [total];
    const parts = 5;
    const base = Math.floor(total / parts);
    const counts = Array(parts).fill(base);
    let rem = total - base * parts;
    for (let i = 0; i < rem; i += 1) counts[i] += 1;
    return counts.filter((n) => n > 0);
};

const SUB_CLUSTER_OFFSETS = [
    [0.012, -0.015],
    [-0.008, 0.018],
    [0.018, 0.01],
    [-0.015, -0.01],
    [0.005, 0.005],
    [0.01, -0.008],
    [-0.006, 0.012],
];

const buildZoneSubMarkers = (zone) => {
    const counts = partitionShopCounts(zone.shops);
    const [clat, clng] = zone.center;
    return counts.map((count, i) => {
        const [dlat, dlng] = SUB_CLUSTER_OFFSETS[i % SUB_CLUSTER_OFFSETS.length];
        return {
            id: `zone-${zone.id}-sub-${i}`,
            latitude: clat + dlat,
            longitude: clng + dlng,
            label: String(count),
            kind: "cluster",
            color: "#102d4d",
            zoneId: zone.id,
        };
    });
};

const getZoneShopNames = (zoneId, count) => {
    const listed = VENDORS.filter((v) => v.zone === zoneId).map((v) => v.name);
    let n = listed.length;
    while (listed.length < count) {
        const suffix = FILLER_SUFFIXES[n % FILLER_SUFFIXES.length];
        listed.push(`Zone ${zoneId} ${suffix} ${n + 1}`);
        n += 1;
    }
    return listed.slice(0, count);
};

const popupForMarker = (marker) => {
    if (VENDOR_POPUPS[marker.id]) {
        return { ...VENDOR_POPUPS[marker.id] };
    }
    const vendor = VENDORS.find((v) => marker.vendorId && v.name === marker.vendorId);
    if (vendor) {
        const zone = ZONES.find((z) => z.id === vendor.zone);
        return {
            name: vendor.name,
            zone: vendor.zone,
            status: "active",
            area: zone?.area || "",
            owner: vendor.owner,
            mobile: vendor.phone,
            coords: vendor.location,
            supervisor: zone?.name || "",
            supervisorMobile: zone?.phone || "",
        };
    }
    if (marker.zoneId) {
        const zone = ZONES.find((z) => z.id === marker.zoneId);
        if (!zone) return null;
        const isMain = String(marker.id).includes("-main");
        return {
            name: isMain ? `Zone ${zone.id} · ${zone.shops} shops` : `Zone ${zone.id} cluster (${marker.label})`,
            zone: zone.id,
            status: "active",
            area: zone.area,
            owner: zone.name,
            mobile: zone.phone,
            coords: `${marker.latitude.toFixed(5)}, ${marker.longitude.toFixed(5)}`,
            supervisor: zone.name,
            supervisorMobile: zone.phone,
        };
    }
    return null;
};

const callPhone = (phone) => {
    const clean = String(phone || "").replace(/[^\d+]/g, "");
    if (clean && clean !== "--") Linking.openURL(`tel:${clean}`);
};

const ZoneCard = ({ zone, compact = false, expanded = false, selected = false, onPress, shopNames = [] }) => {
    const cardStyle = [
        styles.zoneCard,
        compact && styles.zoneGridCard,
        selected && styles.zoneCardSelected,
        expanded && styles.zoneCardExpanded,
    ];

    const header = (
        <View style={styles.zoneCardHeader}>
            <View style={[styles.zoneAvatar, { backgroundColor: zone.color }]}>
                <Text style={styles.zoneInitial}>{zone.id}</Text>
            </View>
            <View style={styles.zoneInfo}>
                <View style={styles.zoneTopLine}>
                    <Text numberOfLines={compact ? 2 : 1} style={styles.zoneName}>
                        {zone.name}
                    </Text>
                    <Text style={styles.shopCount}>{zone.shops} shops</Text>
                </View>
                <Text numberOfLines={compact ? 2 : 1} style={styles.zoneArea}>
                    {zone.area}
                </Text>
                <Text numberOfLines={compact ? 4 : 1} style={styles.zoneRange}>
                    {zone.range}
                </Text>
                {expanded ? (
                    <View style={styles.zoneExpandedBadges}>
                        <View style={styles.zonePhoneRow}>
                            <Image source={CITIZENCONTACT} style={styles.metaIcon} />
                            <Text style={styles.zonePhoneText}>{zone.phone}</Text>
                            <TouchableOpacity onPress={() => callPhone(zone.phone)}>
                                <Text style={styles.callLink}>Call</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.unverifiedCount}>0 unverified</Text>
                    </View>
                ) : null}
            </View>
            {!compact && onPress ? (
                <Text style={[styles.zoneChevron, expanded && styles.zoneChevronOpen]}>
                    {expanded ? "⌄" : "›"}
                </Text>
            ) : null}
        </View>
    );

    if (compact || !onPress) {
        return <View style={cardStyle}>{header}</View>;
    }

    return (
        <View style={cardStyle}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [pressed && styles.zoneCardPressed]}
            >
                {header}
            </Pressable>
            {expanded ? (
                <View style={styles.zoneShopList}>
                    <ScrollView
                        style={styles.shopListScroll}
                        contentContainerStyle={styles.shopListContent}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        persistentScrollbar
                        keyboardShouldPersistTaps="handled"
                    >
                        {(shopNames || []).length === 0 ? (
                            <Text style={styles.shopListEmpty}>No shops listed</Text>
                        ) : (
                            shopNames.map((name, idx) => (
                                <View key={`${zone.id}-shop-${idx}`} style={styles.shopListRow}>
                                    <Text style={styles.shopListName} numberOfLines={2}>
                                        {name}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
};

const VendorCard = ({ vendor }) => (
    <View style={styles.vendorGridCard}>
        <View style={styles.vendorGridTop}>
            <View style={[styles.vendorAvatar, { backgroundColor: ZONES.find((z) => z.id === vendor.zone)?.color || NAVY }]}>
                <Text style={styles.zoneInitial}>{vendor.initial}</Text>
            </View>
            <View style={styles.activeBadge}>
                <Text style={styles.activeText}>Active</Text>
            </View>
        </View>
        <Text style={styles.vendorName}>{vendor.name}</Text>
        <Text style={styles.vendorOwner}>{vendor.owner}</Text>
        <View style={styles.vendorGridMeta}>
            <Image source={CITIZENCONTACT} style={styles.metaIcon} />
            <Text style={styles.vendorDetail}>{vendor.phone || "--"}</Text>
        </View>
        <View style={styles.vendorGridMeta}>
            <Image source={LONGITUTE} style={styles.metaIcon} />
            <Text style={styles.vendorDetail}>{vendor.location}</Text>
        </View>
    </View>
);

const IssueCard = ({ item, busy, onFixCoords, onResolve }) => {
    const resolved = !item.isOpen;
    const typeLabel = toErrorText(item.type, "Import issue");
    const coordStyle = isCoordIssueType(typeLabel) || item.needsCoords;
    const showFix = item.isOpen && (item.needsCoords || isCoordIssueType(typeLabel));

    return (
        <View style={styles.issueCard}>
            <View style={[styles.issueAvatar, { backgroundColor: "#20364F" }]}>
                <Text style={styles.zoneInitial}>{toErrorText(item.zone, "—")}</Text>
            </View>
            <View style={styles.issueBody}>
                <View style={styles.issueTop}>
                    <Text numberOfLines={1} style={styles.issueName}>
                        {toErrorText(item.name, "—")}
                    </Text>
                    <Text style={[styles.issueState, resolved && styles.resolvedState]}>{resolved ? "resolved" : "open"}</Text>
                </View>
                <Text numberOfLines={1} style={styles.issueSupervisor}>
                    {toErrorText(item.supervisorName, "—")} · {toErrorText(item.zoneCode, "—")}
                </Text>
                <View style={[styles.issueType, coordStyle ? styles.coordinateIssue : styles.mobileIssue]}>
                    <Text style={[styles.issueTypeText, coordStyle ? styles.coordinateText : styles.mobileText]}>{typeLabel}</Text>
                </View>
                <View style={styles.issueLine}>
                    <SimpleIcon name="map-marker-outline" size={13} color="#627997" />
                    <Text style={styles.issueText}>{toErrorText(item.location, "—")}</Text>
                </View>
                <Text style={styles.issueDescription}>{toErrorText(item.detail, "")}</Text>
            </View>
            <View style={styles.issueActions}>
                {showFix ? (
                    <TouchableOpacity disabled={busy} onPress={() => onFixCoords?.(item)}>
                        <Text style={[styles.fixAction, styles.fixLink]}>Fix coordinates</Text>
                    </TouchableOpacity>
                ) : null}
                {item.isOpen ? (
                    <TouchableOpacity disabled={busy} onPress={() => onResolve?.(item)}>
                        <Text style={styles.fixAction}>Mark resolved</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <Text style={styles.chevron}>›</Text>
        </View>
    );
};

export default function GrivanceOfficerVendorMapScreen() {
    const [tab, setTab] = useState("map");
    const [search, setSearch] = useState("");
    const [flaggedOnly, setFlaggedOnly] = useState(true);
    const [selectedZoneId, setSelectedZoneId] = useState(null);
    const [vendorModal, setVendorModal] = useState(null);
    const [pinFitBounds, setPinFitBounds] = useState(null);
    const [status, setStatus] = useState("All statuses");
    const [statusOpen, setStatusOpen] = useState(false);
    const [issueFilter, setIssueFilter] = useState("Open issues");
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [issuesRefreshing, setIssuesRefreshing] = useState(false);
    const [openIssuesCount, setOpenIssuesCount] = useState(0);
    const [issueBusyId, setIssueBusyId] = useState(null);
    const [coordIssue, setCoordIssue] = useState(null);
    const [coordLat, setCoordLat] = useState("");
    const [coordLng, setCoordLng] = useState("");
    const [coordSaving, setCoordSaving] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "" });
    const [apiVendors, setApiVendors] = useState([]);
    const [apiZones, setApiZones] = useState([]);
    const [mapLoading, setMapLoading] = useState(false);
    const pageScrollRef = useRef(null);

    const setPageScrollEnabled = useCallback((enabled) => {
        pageScrollRef.current?.setNativeProps?.({ scrollEnabled: enabled });
    }, []);

    const showToast = useCallback((message, type = "error") => {
        setToast({
            visible: true,
            message: toErrorText(message, type === "success" ? "Done" : "Something went wrong"),
            type,
        });
    }, []);

    const loadVendorMapData = useCallback(async () => {
        setMapLoading(true);
        try {
            const [mapRes, listRes] = await Promise.all([
                fetchVendorsMap(),
                fetchVendors({ page: 1, limit: 100 }),
            ]);
            if (mapRes.ok) {
                setApiZones(mapRes.zones || []);
                if (mapRes.vendors?.length) {
                    setApiVendors(mapRes.vendors);
                } else if (listRes.ok) {
                    setApiVendors(listRes.data || []);
                }
            } else if (listRes.ok) {
                setApiVendors(listRes.data || []);
            } else {
                showToast(mapRes.message || listRes.message, "error");
            }
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to load vendors"), "error");
        } finally {
            setMapLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadVendorMapData();
    }, [loadVendorMapData]);

    const loadOpenIssuesCount = useCallback(async () => {
        try {
            const res = await fetchImportIssues({ status: "open", limit: 30, page: 1 });
            if (res.ok) {
                const count =
                    Number(res.meta?.openIssuesCount) ||
                    Number(res.meta?.total) ||
                    res.data.filter((row) => row.isOpen).length;
                setOpenIssuesCount(count);
            }
        } catch (_) {
            /* keep prior count */
        }
    }, []);

    const loadIssues = useCallback(
        async ({ soft = false } = {}) => {
            if (soft) setIssuesRefreshing(true);
            else setIssuesLoading(true);
            try {
                const res = await fetchImportIssues({
                    status: issueFilter === "Open issues" ? "open" : undefined,
                    limit: 30,
                    page: 1,
                });
                if (!res.ok) {
                    showToast(res.message, "error");
                    setIssues([]);
                    return;
                }
                setIssues(res.data || []);
                if (issueFilter === "Open issues") {
                    const count =
                        Number(res.meta?.openIssuesCount) ||
                        Number(res.meta?.total) ||
                        (res.data || []).filter((row) => row.isOpen).length;
                    setOpenIssuesCount(count);
                }
            } catch (e) {
                showToast(toErrorText(e?.message || e, "Failed to load import issues"), "error");
                setIssues([]);
            } finally {
                setIssuesLoading(false);
                setIssuesRefreshing(false);
            }
        },
        [issueFilter, showToast]
    );

    useEffect(() => {
        loadOpenIssuesCount();
    }, [loadOpenIssuesCount]);

    useEffect(() => {
        loadIssues();
    }, [loadIssues]);

    useEffect(() => {
        if (tab === "quality") {
            loadIssues({ soft: issues.length > 0 });
        }
    }, [tab]);

    const vendors = useMemo(() => {
        const source = (apiVendors.length ? apiVendors : VENDORS).map((vendor) => ({
            name: vendor.shopName || vendor.name,
            owner: vendor.ownerName || vendor.owner,
            phone: vendor.mobileNumber || vendor.phone || vendor.mobile,
            location: vendor.coords || vendor.location || "—",
            zone: vendor.zoneCode || vendor.zone,
            status: vendor.status || "active",
            id: vendor.id,
            color: vendor.color || vendor.zoneColor,
            latitude: vendor.latitude,
            longitude: vendor.longitude,
        }));
        const q = search.trim().toLowerCase();
        const statusKey =
            status === "Active"
                ? "active"
                : status === "Inactive"
                  ? "inactive"
                  : status === "All statuses"
                    ? ""
                    : String(status).toLowerCase();
        return source.filter((vendor) => {
            const found =
                !q ||
                String(vendor.name || "").toLowerCase().includes(q) ||
                String(vendor.owner || "").toLowerCase().includes(q) ||
                String(vendor.phone || "").includes(q);
            const statusOk = !statusKey || String(vendor.status || "").toLowerCase() === statusKey;
            return found && statusOk;
        });
    }, [apiVendors, search, status]);

    const displayZones = useMemo(() => {
        if (!apiZones?.length) return ZONES;
        return apiZones.map((z) => {
            const lat = Number(z.centroid?.lat);
            const lng = Number(z.centroid?.lng);
            const r = z.range || {};
            const rangeText =
                r.latMin != null
                    ? `${r.latMin}-${r.latMax} N · ${r.lngMin}-${r.lngMax} E`
                    : "";
            return {
                id: z.code || "?",
                name: z.supervisor?.name || z.name || "Supervisor",
                area: z.name || "",
                range: rangeText,
                shops: Number(z.vendorCount || 0),
                color: z.color || "#2161F5",
                center: [
                    Number.isFinite(lat) ? lat : 19.83,
                    Number.isFinite(lng) ? lng : 85.85,
                ],
                phone: z.supervisor?.mobile || "—",
                unverified: Number(z.unverifiedCount || 0),
            };
        });
    }, [apiZones]);

    const visibleZones = useMemo(() => {
        const q = search.trim().toLowerCase();
        return displayZones.filter(
            (zone) =>
                !q ||
                String(zone.name || "").toLowerCase().includes(q) ||
                String(zone.area || "").toLowerCase().includes(q)
        );
    }, [displayZones, search]);

    const selectedZone = useMemo(
        () => (selectedZoneId ? displayZones.find((z) => z.id === selectedZoneId) : null),
        [displayZones, selectedZoneId]
    );

    const mapMarkers = useMemo(() => {
        const apiPins = (apiVendors || [])
            .filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude))
            .filter((v) => !flaggedOnly || v.flagged || v.status === "unverified")
            .map((v) => ({
                id: `vendor-${v.id}`,
                latitude: v.latitude,
                longitude: v.longitude,
                label: v.initial || "V",
                kind: "letter",
                color: v.flagged ? "#e11d48" : v.color || "#102d4d",
                vendorId: v.shopName,
                popup: {
                    name: v.shopName,
                    zone: v.zoneCode,
                    status: v.status,
                    area: v.roadSegment || v.zone,
                    owner: v.ownerName,
                    mobile: v.mobileNumber,
                    coords: v.coords,
                    supervisor: v.supervisorName,
                    supervisorMobile: v.supervisorMobile,
                },
            }));

        if (apiPins.length) {
            if (selectedZoneId) {
                return apiPins.filter(
                    (p) =>
                        String(p.popup?.zone || "").toUpperCase() ===
                        String(selectedZoneId).toUpperCase()
                );
            }
            return apiPins;
        }

        if (selectedZone) {
            return [
                {
                    id: `zone-${selectedZone.id}-main`,
                    latitude: selectedZone.center[0],
                    longitude: selectedZone.center[1],
                    label: String(selectedZone.shops),
                    kind: "cluster",
                    color: "#102d4d",
                    zoneId: selectedZone.id,
                },
                ...buildZoneSubMarkers(selectedZone),
            ];
        }
        return [...OVERVIEW_MARKERS];
    }, [apiVendors, flaggedOnly, selectedZone, selectedZoneId]);

    const mapPolygons = useMemo(() => {
        const list = [CORRIDOR_POLYGON];
        if (selectedZone) {
            list.push({
                id: `zone-${selectedZone.id}-rect`,
                coordinates: parseZoneRange(selectedZone.range, selectedZone.center),
                color: selectedZone.color,
                fillColor: selectedZone.color,
                fillOpacity: 0.08,
                dashArray: "8 6",
                weight: 2,
            });
        }
        return list;
    }, [selectedZone]);

    const mapFitBounds = useMemo(() => {
        if (pinFitBounds) return pinFitBounds;
        if (selectedZone) return parseZoneRange(selectedZone.range, selectedZone.center);
        return null;
    }, [selectedZone, pinFitBounds]);

    const onZonePress = (zoneId) => {
        setPinFitBounds(null);
        setSelectedZoneId((current) => (current === zoneId ? null : zoneId));
    };

    const onMarkerPress = useCallback((marker) => {
        const popup = popupForMarker(marker);
        if (!popup) return;
        setVendorModal({
            ...popup,
            markerId: marker.id,
            latitude: marker.latitude,
            longitude: marker.longitude,
        });
    }, []);

    const zoomToVendorPin = () => {
        if (!vendorModal) return;
        const lat = vendorModal.latitude;
        const lng = vendorModal.longitude;
        const d = 0.004;
        setPinFitBounds([
            [lat - d, lng - d],
            [lat + d, lng + d],
        ]);
    };

    const openFixModal = (item) => {
        setCoordIssue(item);
        setCoordLat(item.latitude != null ? String(item.latitude) : "");
        setCoordLng(item.longitude != null ? String(item.longitude) : "");
    };

    const reloadAfterAction = async () => {
        await Promise.all([loadIssues({ soft: true }), loadOpenIssuesCount()]);
    };

    const onMarkResolved = async (item) => {
        if (!item?.id) return;
        setIssueBusyId(item.id);
        try {
            const res = await resolveImportIssue(item.id, "Reviewed and accepted as-is");
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            showToast("Issue marked resolved", "success");
            await reloadAfterAction();
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to resolve issue"), "error");
        } finally {
            setIssueBusyId(null);
        }
    };

    const submitCoords = async () => {
        if (!coordIssue?.id) return;
        if (!isValidOdishaCoords(coordLat, coordLng)) {
            showToast("Coordinates must be within Odisha (lat 17.5–22.5, lng 81.5–87.5)", "error");
            return;
        }
        setCoordSaving(true);
        try {
            const res = await fixImportIssueCoordinates(coordIssue.id, coordLat, coordLng);
            if (!res.ok) {
                showToast(res.message, "error");
                return;
            }
            showToast("Coordinates updated", "success");
            setCoordIssue(null);
            await reloadAfterAction();
        } catch (e) {
            showToast(toErrorText(e?.message || e, "Failed to fix coordinates"), "error");
        } finally {
            setCoordSaving(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader
                title="Vendor Map & Registry"
                subtitle="All 7 supervisor zones · Puri-Konark Marine Drive corridor"
                showMenu={false}
                showNotification={false}
                showProfile={false}
                height={64}
            />
            <View style={styles.tabs}>
                {[
                    ["map", "Zone Map", "map-outline"],
                    ["registry", "Vendor Registry", "file-document-outline"],
                    ["quality", "Data Quality", "alert-outline"],
                ].map(([key, label, icon]) => (
                    <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
                        <SimpleIcon name={icon} size={16} color={tab === key ? WHITE : NAVY} />
                        <Text numberOfLines={1} style={[styles.tabText, tab === key && styles.tabTextActive]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === "map" && (
                <ScrollView
                    ref={pageScrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.page}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.searchBox}>
                        <SimpleIcon name="magnify" size={18} color="#7185A5" />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search shop or owner..."
                            placeholderTextColor="#8193B0"
                            style={styles.searchInput}
                        />
                    </View>
                    <TouchableOpacity style={styles.flagRow} onPress={() => setFlaggedOnly((value) => !value)}>
                        <View style={[styles.checkbox, flaggedOnly && styles.checkboxOn]}>
                            <Text style={styles.checkText}>{flaggedOnly ? "✓" : ""}</Text>
                        </View>
                        <Text style={styles.flagLabel}>Show flagged / unverified pins</Text>
                        <View style={styles.flagCount}>
                            <Text style={styles.flagCountText}>
                                {apiVendors.filter((v) => v.flagged || v.status === "unverified")
                                    .length || FLAGGED_PIN_COUNT}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {mapLoading ? (
                        <ActivityIndicator color={NAVY} style={{ marginVertical: 8 }} />
                    ) : null}
                    <View
                        style={styles.mapFrame}
                        onTouchStart={() => setPageScrollEnabled(false)}
                        onTouchEnd={() => setPageScrollEnabled(true)}
                        onTouchCancel={() => setPageScrollEnabled(true)}
                    >
                        <StaticCrmMap
                            style={styles.map}
                            markers={mapMarkers}
                            polygons={mapPolygons}
                            fitBounds={mapFitBounds}
                            onMarkerPress={onMarkerPress}
                            showZoom
                        />
                    </View>
                    {visibleZones.map((zone) => (
                        <ZoneCard
                            key={zone.id}
                            zone={zone}
                            selected={selectedZoneId === zone.id}
                            expanded={selectedZoneId === zone.id}
                            onPress={() => onZonePress(zone.id)}
                            shopNames={getZoneShopNames(zone.id, zone.shops)}
                        />
                    ))}
                </ScrollView>
            )}

            {tab === "registry" && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
                    <View style={styles.zoneGrid}>{displayZones.map((zone) => <ZoneCard key={zone.id} zone={zone} compact />)}</View>
                    <View style={styles.searchBox}>
                        <SimpleIcon name="magnify" size={18} color="#7185A5" />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search shop, owner, mobile..."
                            placeholderTextColor="#8193B0"
                            style={styles.searchInput}
                        />
                    </View>
                    <View style={styles.filterRow}>
                        <TouchableOpacity style={styles.selectButton}>
                            <Text style={styles.selectText}>All supervisors</Text>
                            <SimpleIcon name="chevron-down" size={15} color={NAVY} />
                        </TouchableOpacity>
                        <View style={styles.statusWrap}>
                            <TouchableOpacity style={styles.selectButton} onPress={() => setStatusOpen((open) => !open)}>
                                <Text style={styles.selectText}>{status}</Text>
                                <SimpleIcon name="chevron-down" size={15} color={NAVY} />
                            </TouchableOpacity>
                            {statusOpen && (
                                <View style={styles.menu}>
                                    {["All statuses", "Active", "Inactive"].map((value) => (
                                        <TouchableOpacity
                                            key={value}
                                            style={styles.menuItem}
                                            onPress={() => {
                                                setStatus(value);
                                                setStatusOpen(false);
                                            }}
                                        >
                                            <Text style={styles.menuText}>{value}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.vendorGrid}>
                        {vendors.map((vendor, i) => (
                            <VendorCard key={vendor.name + i} vendor={vendor} />
                        ))}
                    </View>
                </ScrollView>
            )}

            {tab === "quality" && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.page}
                    refreshControl={<RefreshControl refreshing={issuesRefreshing} onRefresh={() => loadIssues({ soft: true })} />}
                >
                    <View style={styles.qualityIntro}>
                        <View style={styles.qualityText}>
                            <Text style={styles.qualityTitle}>Vendor Import - Quarantine & Review</Text>
                            <Text style={styles.qualitySub}>
                                Rows with unusable coordinates or malformed mobiles are held here instead of corrupting the map.
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.issueDropdown} onPress={() => setStatusOpen((open) => !open)}>
                            <Text style={styles.selectText}>{issueFilter}</Text>
                            <SimpleIcon name="chevron-down" size={15} color={NAVY} />
                        </TouchableOpacity>
                    </View>
                    {statusOpen && (
                        <View style={styles.issueMenu}>
                            {["Open issues", "All issues"].map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setIssueFilter(value);
                                        setStatusOpen(false);
                                    }}
                                >
                                    <Text style={styles.menuText}>{value}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    {issuesLoading && !issuesRefreshing ? <ActivityIndicator color={NAVY} style={styles.issuesLoader} /> : null}
                    {issues.map((item) => (
                        <IssueCard
                            key={String(item.id)}
                            item={item}
                            busy={issueBusyId === item.id}
                            onFixCoords={openFixModal}
                            onResolve={onMarkResolved}
                        />
                    ))}
                    {!issuesLoading && issues.length === 0 ? (
                        <Text style={styles.emptyIssues}>No import issues match this filter.</Text>
                    ) : null}
                </ScrollView>
            )}

            <Modal visible={!!vendorModal} transparent animationType="fade" onRequestClose={() => setVendorModal(null)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setVendorModal(null)}>
                    <Pressable style={styles.vendorModalCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <View style={styles.vendorModalTitleWrap}>
                                <Text style={styles.vendorModalTitle}>{vendorModal?.name}</Text>
                                <Text style={styles.vendorModalSub}>
                                    Zone {vendorModal?.zone} · {vendorModal?.status}
                                </Text>
                                <Text style={styles.vendorModalArea}>{vendorModal?.area}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setVendorModal(null)} hitSlop={10}>
                                <Text style={styles.closeTxt}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.vendorModalRow}>
                            <Text style={styles.vendorModalLabel}>OWNER</Text>
                            <Text style={styles.vendorModalValue}>{vendorModal?.owner}</Text>
                        </View>
                        <View style={styles.vendorModalRow}>
                            <Text style={styles.vendorModalLabel}>MOBILE</Text>
                            <View style={styles.vendorModalInline}>
                                <Text style={styles.vendorModalValue}>{vendorModal?.mobile || "--"}</Text>
                                <TouchableOpacity onPress={() => callPhone(vendorModal?.mobile)}>
                                    <Text style={styles.callLink}>Call</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.vendorModalRow}>
                            <Text style={styles.vendorModalLabel}>COORDINATES</Text>
                            <Text style={styles.vendorModalValue}>{vendorModal?.coords}</Text>
                        </View>
                        <View style={styles.supervisorBox}>
                            <Text style={styles.supervisorBoxLabel}>REPORTING SUPERVISOR</Text>
                            <View style={styles.supervisorBoxRow}>
                                <Text style={styles.supervisorBoxName}>{vendorModal?.supervisor}</Text>
                                <TouchableOpacity
                                    style={styles.supervisorCallBtn}
                                    onPress={() => callPhone(vendorModal?.supervisorMobile)}
                                >
                                    <Text style={styles.supervisorCallText}>Call</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.zoomPinBtn} onPress={zoomToVendorPin}>
                            <SimpleIcon name="crosshairs-gps" size={16} color={WHITE} />
                            <Text style={styles.zoomPinText}>Zoom to pin</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={!!coordIssue} transparent animationType="fade" onRequestClose={() => setCoordIssue(null)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setCoordIssue(null)}>
                    <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text numberOfLines={1} style={styles.modalTitle}>
                                {toErrorText(coordIssue?.name, "Fix coordinates")}
                            </Text>
                            <TouchableOpacity onPress={() => setCoordIssue(null)} hitSlop={10}>
                                <Text style={styles.closeTxt}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalHint}>Enter valid Odisha coordinates (lat 17.5–22.5, lng 81.5–87.5).</Text>
                        <Text style={styles.coordLabel}>Latitude</Text>
                        <TextInput
                            value={coordLat}
                            onChangeText={setCoordLat}
                            keyboardType="decimal-pad"
                            placeholder="19.85"
                            placeholderTextColor="#8193B0"
                            style={styles.coordInput}
                        />
                        <Text style={styles.coordLabel}>Longitude</Text>
                        <TextInput
                            value={coordLng}
                            onChangeText={setCoordLng}
                            keyboardType="decimal-pad"
                            placeholder="85.86"
                            placeholderTextColor="#8193B0"
                            style={styles.coordInput}
                        />
                        <TouchableOpacity
                            style={[styles.modalSubmit, coordSaving && styles.modalSubmitDisabled]}
                            disabled={coordSaving}
                            onPress={submitCoords}
                        >
                            {coordSaving ? <ActivityIndicator color={WHITE} size="small" /> : <Text style={styles.modalSubmitText}>Save coordinates</Text>}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                setVisible={setToast}
                position="top"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    tabs: {
        flexDirection: "row",
        marginHorizontal: 12,
        marginTop: 9,
        marginBottom: 7,
        padding: 3,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 13,
        elevation: 1,
    },
    tab: { flex: 1, height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 4, borderRadius: 10 },
    tabActive: { backgroundColor: "#102D4C" },
    tabText: { color: "#263D5E", fontSize: 10, fontWeight: "600" },
    tabTextActive: { color: WHITE },
    page: { paddingHorizontal: 12, paddingBottom: 20, gap: 8 },
    searchBox: {
        height: 42,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D8E3EF",
        borderRadius: 12,
    },
    searchInput: { flex: 1, color: NAVY, fontSize: 12, padding: 0 },
    flagRow: {
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E0E8F2",
        borderRadius: 12,
        elevation: 1,
    },
    checkbox: { width: 21, height: 21, borderWidth: 1, borderColor: "#CBD7E5", borderRadius: 4, alignItems: "center", justifyContent: "center" },
    checkboxOn: { backgroundColor: "#EA5F0B", borderColor: "#EA5F0B" },
    checkText: { color: WHITE, fontSize: 14, fontWeight: "800" },
    flagLabel: { flex: 1, color: "#253D5D", fontSize: 12, fontWeight: "500" },
    flagCount: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#FFF1C7", alignItems: "center", justifyContent: "center" },
    flagCountText: { color: "#263D5E", fontSize: 11, fontWeight: "800" },
    mapFrame: { height: 340, borderRadius: 15, overflow: "hidden", borderWidth: 1, borderColor: "#D6E2EE" },
    map: { flex: 1, backgroundColor: "#D8E6ED" },
    zoneCard: {
        minHeight: 84,
        flexDirection: "column",
        alignItems: "stretch",
        padding: 9,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F2",
        borderRadius: 14,
        elevation: 1,
    },
    zoneCardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 9,
    },
    zoneCardSelected: { borderColor: "#2161F5", borderWidth: 2 },
    zoneCardExpanded: { backgroundColor: "#F8FBFF" },
    zoneCardPressed: { opacity: 0.92 },
    zoneChevron: { color: "#8A9BB5", fontSize: 20, marginTop: 8 },
    zoneChevronOpen: { color: NAVY },
    zoneExpandedBadges: { marginTop: 6, gap: 4 },
    zonePhoneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    zonePhoneText: { color: "#526B8E", fontSize: 10 },
    unverifiedCount: { color: "#A45B00", fontSize: 9, fontWeight: "700" },
    zoneShopList: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#E5EDF6",
    },
    shopListScroll: {
        height: 168,
        flexGrow: 0,
    },
    shopListContent: {
        paddingBottom: 4,
    },
    shopListRow: {
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E8EEF6",
    },
    shopListName: { color: "#263D5E", fontSize: 12, lineHeight: 17 },
    shopListEmpty: { color: "#8193B0", fontSize: 12, paddingVertical: 8 },
    callLink: { color: "#E75D00", fontSize: 10, fontWeight: "800" },
    zoneAvatar: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    zoneInitial: { color: WHITE, fontSize: 18, fontWeight: "800" },
    zoneInfo: { flex: 1, minWidth: 0 },
    zoneTopLine: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 5 },
    zoneName: { flex: 1, color: "#0D2147", fontSize: 12, lineHeight: 15, fontWeight: "800" },
    shopCount: {
        fontSize: 10,
        fontWeight: "800",
        backgroundColor: "#142E4B",
        overflow: "hidden",
        borderRadius: 13,
        paddingHorizontal: 8,
        paddingVertical: 4,
        color: WHITE,
    },
    zoneArea: { color: "#273D5C", fontSize: 10, lineHeight: 13, marginTop: 4 },
    zoneRange: { color: "#6F83A2", fontSize: 9, lineHeight: 12, marginTop: 5 },
    zoneGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 7 },
    zoneGridCard: { width: "48.5%", minHeight: 155, flexDirection: "column", alignItems: "stretch" },
    vendorGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
    vendorGridCard: {
        width: "48.5%",
        minHeight: 174,
        padding: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F2",
        borderRadius: 13,
        elevation: 1,
    },
    vendorGridTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
    vendorGridMeta: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 5 },
    vendorAvatar: { width: 39, height: 39, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    vendorName: { color: "#10274A", fontSize: 11, lineHeight: 15, fontWeight: "800" },
    vendorOwner: { color: "#4D6381", fontSize: 9, lineHeight: 13, marginTop: 3 },
    metaIcon: { width: 12, height: 12, tintColor: "#526B8E" },
    vendorDetail: { flex: 1, color: "#526B8E", fontSize: 9, lineHeight: 12, marginRight: 4 },
    activeBadge: { backgroundColor: "#E8FAEF", borderWidth: 1, borderColor: "#AFEBC6", borderRadius: 13, paddingHorizontal: 7, paddingVertical: 4 },
    activeText: { color: "#078541", fontSize: 9, fontWeight: "700" },
    chevron: { color: "#264563", fontSize: 21 },
    filterRow: { flexDirection: "row", gap: 8, zIndex: 2 },
    selectButton: {
        flex: 1,
        height: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 9,
        borderWidth: 1,
        borderColor: "#D8E3EF",
        borderRadius: 11,
        backgroundColor: WHITE,
    },
    selectText: { color: "#263D5E", fontSize: 10 },
    statusWrap: { flex: 1, position: "relative", zIndex: 3 },
    menu: {
        position: "absolute",
        top: 43,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#D8E3EF",
        elevation: 5,
    },
    menuItem: { paddingHorizontal: 9, paddingVertical: 8 },
    menuText: { color: NAVY, fontSize: 10 },
    qualityIntro: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 10,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DCE6F1",
        borderRadius: 13,
    },
    qualityText: { flex: 1 },
    qualityTitle: { color: "#10274A", fontSize: 13, fontWeight: "800" },
    qualitySub: { color: "#536A8A", fontSize: 10, lineHeight: 14, marginTop: 4 },
    issueDropdown: {
        height: 37,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: "#D8E3EF",
        borderRadius: 10,
    },
    issueMenu: { alignSelf: "flex-end", width: 125, backgroundColor: WHITE, borderWidth: 1, borderColor: "#D8E3EF", borderRadius: 10, elevation: 5 },
    issueCard: {
        minHeight: 110,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        padding: 9,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#DDE7F2",
        borderRadius: 13,
        elevation: 1,
    },
    issueAvatar: { width: 38, height: 38, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    issueBody: { flex: 1, minWidth: 0 },
    issueTop: { flexDirection: "row", alignItems: "center", gap: 5 },
    issueName: { flex: 1, color: "#10274A", fontSize: 11, fontWeight: "800" },
    issueSupervisor: { color: "#5E7392", fontSize: 9, marginTop: 2 },
    issueState: { color: "#DF2727", fontSize: 9, fontWeight: "700", backgroundColor: "#FFF0F0", borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
    resolvedState: { color: GREEN, backgroundColor: "#E8FAEF" },
    issueType: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
    mobileIssue: { backgroundColor: "#F1E9FF" },
    coordinateIssue: { backgroundColor: "#FFF3D0" },
    issueTypeText: { fontSize: 9, fontWeight: "700" },
    mobileText: { color: "#6939D8" },
    coordinateText: { color: "#A45B00" },
    issueLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    issueText: { color: "#5E7392", fontSize: 9 },
    issueDescription: { color: "#4C627F", fontSize: 9, lineHeight: 13, marginTop: 4 },
    issueActions: { alignItems: "flex-end", gap: 4, marginTop: 5, maxWidth: 72 },
    fixAction: { color: "#173454", fontSize: 9, fontWeight: "700", textAlign: "right" },
    fixLink: { color: "#E75D00" },
    issuesLoader: { marginVertical: 16 },
    emptyIssues: { color: "#5E7392", fontSize: 11, textAlign: "center", marginVertical: 12 },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(16,39,74,0.45)", justifyContent: "center", paddingHorizontal: 20 },
    modalCard: { backgroundColor: WHITE, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#D8E3EF" },
    vendorModalCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#D8E3EF",
        maxHeight: "85%",
    },
    modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
    modalTitle: { flex: 1, color: "#10274A", fontSize: 13, fontWeight: "800", marginRight: 8 },
    vendorModalTitleWrap: { flex: 1, marginRight: 8 },
    vendorModalTitle: { color: "#10274A", fontSize: 15, fontWeight: "800", textTransform: "capitalize" },
    vendorModalSub: { color: "#078541", fontSize: 11, fontWeight: "700", marginTop: 4 },
    vendorModalArea: { color: "#536A8A", fontSize: 10, marginTop: 3, lineHeight: 14 },
    vendorModalRow: { marginBottom: 10 },
    vendorModalLabel: { color: "#8193B0", fontSize: 9, fontWeight: "700", marginBottom: 3 },
    vendorModalValue: { color: "#263D5E", fontSize: 12, fontWeight: "600" },
    vendorModalInline: { flexDirection: "row", alignItems: "center", gap: 10 },
    supervisorBox: {
        marginTop: 4,
        marginBottom: 14,
        padding: 12,
        backgroundColor: "#F2F7FD",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#DCE6F1",
    },
    supervisorBoxLabel: { color: "#8193B0", fontSize: 9, fontWeight: "700", marginBottom: 6 },
    supervisorBoxRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    supervisorBoxName: { flex: 1, color: "#10274A", fontSize: 12, fontWeight: "800", marginRight: 8 },
    supervisorCallBtn: {
        backgroundColor: "#102D4C",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    supervisorCallText: { color: WHITE, fontSize: 11, fontWeight: "700" },
    zoomPinBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#2161F5",
    },
    zoomPinText: { color: WHITE, fontSize: 12, fontWeight: "700" },
    closeTxt: { color: "#526B8E", fontSize: 24, lineHeight: 24 },
    modalHint: { color: "#536A8A", fontSize: 10, lineHeight: 14, marginBottom: 10 },
    coordLabel: { color: "#263D5E", fontSize: 10, fontWeight: "600", marginBottom: 4, marginTop: 6 },
    coordInput: { height: 40, borderWidth: 1, borderColor: "#D8E3EF", borderRadius: 10, paddingHorizontal: 10, color: NAVY, fontSize: 12 },
    modalSubmit: { marginTop: 14, height: 42, borderRadius: 11, backgroundColor: "#102D4C", alignItems: "center", justifyContent: "center" },
    modalSubmitDisabled: { opacity: 0.7 },
    modalSubmitText: { color: WHITE, fontSize: 12, fontWeight: "700" },
});