import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { MyHeader } from "../../components/commonComponents/MyHeader";
import {
    BLUE,
    GREY,
    LIGHTGREY,
    NAVY,
    ORANGE,
    PURPLE,
    RED,
    TEAL,
    WHITE,
} from "../../constant/color";
import {
    FIELDATTENDANCE,
    GRIVANCE,
    LONGITUTE,
    PROFILE,
    REPORTS,
    SUPERVISORS,
    VECHILES,
    ZONEGRIVANCE,
} from "../../constant/imagePath";
import { logoutUser } from "../../redux/actions/auth";
import { getObjByKey } from "../../utils/Storage";

const pick = (...values) =>
    values.find((v) => typeof v === "string" && v.trim()) || "";

const resolveRoleKey = (loginResponse) => {
    const candidates = [
        loginResponse?.role,
        loginResponse?.userRole,
        loginResponse?.roleName,
        loginResponse?.user?.role,
        loginResponse?.data?.role,
        loginResponse?.data?.user?.role,
    ];
    const value = candidates.find((item) => typeof item === "string" && item.trim()) || "";
    const role = value.toLowerCase().replace(/[^a-z]/g, "");
    if (role.includes("superadmin") || role === "admin") return "superAdmin";
    if (role.includes("fieldstaff")) return "fieldStaff";
    if (role.includes("grievanceofficer") || role.includes("grivanceofficer")) {
        return "grievanceOfficer";
    }
    if (role.includes("supervisor")) return "supervisor";
    // API: "authority" | "authority_viewer" | "nodal_officer" → Authority Viewer
    if (
        role === "authority" ||
        role.includes("authorityviewer") ||
        role.includes("authority") ||
        role.includes("nodal")
    ) {
        return "nodalOfficer";
    }
    return "superAdmin";
};

const formatRoleLabel = (roleKey, rawRole) => {
    if (rawRole && String(rawRole).trim()) {
        return String(rawRole)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const map = {
        superAdmin: "Super Admin",
        nodalOfficer: "Authority Viewer",
        supervisor: "Supervisor",
        fieldStaff: "Field Staff",
        grievanceOfficer: "Grievance Officer",
    };
    return map[roleKey] || "User";
};

const FLEET_LINK = {
    label: "Fleet Monitoring",
    screen: "Fleet Monitoring",
    desc: "Live cameras, vehicles & fleet alerts",
    icon: VECHILES,
    tint: BLUE,
    bg: "#E8F1FB",
};

const PROFILE_LINKS = {
    superAdmin: [
        FLEET_LINK,
        {
            label: "Journey",
            screen: "Journey History",
            desc: "Travel history & route details",
            icon: LONGITUTE,
            tint: BLUE,
            bg: "#E8F1FB",
        },
        {
            label: "Field Reports",
            screen: "Field Reports",
            desc: "Daily field activities & submissions",
            icon: REPORTS,
            tint: ORANGE,
            bg: "#FFF7E8",
        },
        {
            label: "Activity Logs",
            screen: "Activity Logs",
            desc: "System actions & user activities",
            icon: REPORTS,
            tint: PURPLE,
            bg: "#F3E8FF",
        },
        {
            label: "Attendance",
            screen: "Attendance",
            desc: "Staff attendance & field check-ins",
            icon: FIELDATTENDANCE,
            tint: TEAL,
            bg: "#E6FFFA",
        },
        {
            label: "Users & Settings",
            screen: "Users and Settings",
            desc: "Manage users, roles & app configuration",
            icon: SUPERVISORS,
            tint: RED,
            bg: "#FEE2E2",
        },
        {
            label: "Grievances",
            screen: "Grievances",
            desc: "Citizen complaints & SLA tracking",
            icon: REPORTS,
            tint: ORANGE,
            bg: "#FFF7E8",
        },
    ],
    // Authority Viewer — tabs: Dashboard / Attendance / Fleet Monitoring / Profile
    nodalOfficer: [
        {
            label: "Field Report",
            screen: "Field Reports",
            desc: "Daily field activities & submissions",
            icon: REPORTS,
            tint: ORANGE,
            bg: "#FFF7E8",
        },
    ],
    // Supervisor — tabs: Dashboard / My Zones / Attendance / Fleet Monitoring / Profile
    supervisor: [
        {
            label: "Activity Log",
            screen: "Activity Logs",
            desc: "System actions & user activities",
            icon: REPORTS,
            tint: PURPLE,
            bg: "#F3E8FF",
        },
        {
            label: "Field Report",
            screen: "Field Reports",
            desc: "Daily field activities & submissions",
            icon: REPORTS,
            tint: ORANGE,
            bg: "#FFF7E8",
        },
    ],
    // Grievance Officer — tabs: Dashboard / Vendor Map / Fleet Monitoring / Profile
    grievanceOfficer: [
        {
            label: "Grievance Queue",
            screen: "Grievance Queue",
            desc: "Citizen complaints awaiting action",
            icon: GRIVANCE,
            tint: ORANGE,
            bg: "#FFF7E8",
        },
    ],
    // Field Staff — tabs: Field App / My Attendance / My Activity / My Report / Profile
    fieldStaff: [
        {
            label: "Zone Grievance",
            screen: "Zone Grievance",
            desc: "Zone citizen complaints",
            icon: ZONEGRIVANCE,
            tint: ORANGE,
            bg: "#FFF7E8",
        },
    ],
};

export default function ProfileScreen() {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const [profile, setProfile] = useState(null);
    const [roleKey, setRoleKey] = useState("superAdmin");
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let alive = true;
        getObjByKey("loginResponse").then((res) => {
            if (!alive) return;
            const user = res?.user || res?.data?.user || res?.data || res || {};
            const key = resolveRoleKey(res);
            const rawRole = pick(
                user?.role,
                user?.roleName,
                user?.userRole,
                res?.role,
                res?.roleName,
                res?.data?.role
            );
            setRoleKey(key);
            setProfile({
                name: pick(
                    user?.name,
                    user?.fullName,
                    user?.full_name,
                    res?.name,
                    formatRoleLabel(key, rawRole)
                ),
                email: pick(user?.email, res?.email, "—"),
                phone: pick(
                    user?.phone,
                    user?.mobile,
                    user?.contactNumber,
                    res?.phone,
                    res?.mobile,
                    "—"
                ),
                role: formatRoleLabel(key, rawRole),
                photo: user?.photo || user?.avatar || user?.profileImage || null,
            });
        });
        return () => {
            alive = false;
        };
    }, []);

    const links = useMemo(() => PROFILE_LINKS[roleKey] || PROFILE_LINKS.superAdmin, [roleKey]);

    const openLink = useCallback(
        (screen) => {
            // Profile sits in tabs inside the auth stack; stack holds linked screens.
            const tabNav = navigation;
            const stackNav = tabNav.getParent?.() || tabNav;
            const state = stackNav.getState?.();
            const stackHasScreen = state?.routeNames?.includes?.(screen);
            if (stackHasScreen) {
                stackNav.navigate(screen);
                return;
            }
            if (tabNav.getState?.()?.routeNames?.includes?.(screen)) {
                tabNav.navigate(screen);
                return;
            }
            // Nested fallback (e.g. Main → Fleet tab)
            stackNav.navigate("Main", { screen });
        },
        [navigation]
    );

    const onLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try {
            await dispatch(logoutUser());
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <View style={styles.root}>
            <MyHeader
                title="Profile"
                subtitle="PURI–KONARK MARINE DRIVE"
                height={56}
                showMenu={false}
                showNotification={false}
                showProfile={false}
                titleAlign="left"
            />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <View style={styles.avatarWrap}>
                        <View style={styles.avatar}>
                            {profile?.photo ? (
                                <Image
                                    source={{ uri: profile.photo }}
                                    style={styles.avatarImg}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Image
                                    source={PROFILE}
                                    style={styles.avatarImg}
                                    resizeMode="cover"
                                />
                            )}
                        </View>
                        <View style={styles.cameraBadge}>
                            <Text allowFontScaling={false} style={styles.cameraTxt}>
                                ⌁
                            </Text>
                        </View>
                    </View>

                    <Text allowFontScaling={false} style={styles.name}>
                        {profile?.name || "Loading…"}
                    </Text>
                    <Text allowFontScaling={false} style={styles.role}>
                        {profile?.role || "—"}
                    </Text>
                    <Text allowFontScaling={false} style={styles.project}>
                        PURI-KONARK MARINE DRIVE
                    </Text>

                    <View style={styles.accessBadge}>
                        <Text allowFontScaling={false} style={styles.accessCheck}>
                            ✓
                        </Text>
                        <Text allowFontScaling={false} style={styles.accessTxt}>
                            {profile?.role || "User"} Access
                        </Text>
                    </View>

                    <View style={styles.contactRow}>
                        <View style={styles.contactCol}>
                            <Text allowFontScaling={false} style={styles.contactIcon}>
                                ✉
                            </Text>
                            <Text
                                allowFontScaling={false}
                                style={styles.contactTxt}
                                numberOfLines={2}
                            >
                                {profile?.email || "—"}
                            </Text>
                        </View>
                        <View style={styles.contactDivider} />
                        <View style={styles.contactCol}>
                            <Text allowFontScaling={false} style={styles.contactIcon}>
                                ☎
                            </Text>
                            <Text
                                allowFontScaling={false}
                                style={styles.contactTxt}
                                numberOfLines={1}
                            >
                                {profile?.phone || "—"}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.grid}>
                    {links.map((item) => (
                        <TouchableOpacity
                            key={item.screen}
                            style={styles.tile}
                            activeOpacity={0.88}
                            onPress={() => openLink(item.screen)}
                        >
                            <View style={[styles.tileIconWrap, { backgroundColor: item.bg }]}>
                                <Image
                                    source={item.icon}
                                    style={[styles.tileIcon, { tintColor: item.tint }]}
                                    resizeMode="contain"
                                />
                            </View>
                            <View style={styles.tileBody}>
                                <Text allowFontScaling={false} style={styles.tileTitle}>
                                    {item.label}
                                </Text>
                                <Text
                                    allowFontScaling={false}
                                    style={styles.tileDesc}
                                    numberOfLines={2}
                                >
                                    {item.desc}
                                </Text>
                            </View>
                            <Text allowFontScaling={false} style={styles.tileChevron}>
                                ›
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.logoutBtn}
                    activeOpacity={0.85}
                    onPress={onLogout}
                    disabled={loggingOut}
                >
                    {loggingOut ? (
                        <ActivityIndicator color={RED} />
                    ) : (
                        <>
                            <Text allowFontScaling={false} style={styles.logoutIcon}>
                                ⎋
                            </Text>
                            <Text allowFontScaling={false} style={styles.logoutTxt}>
                                Logout
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F2F7FD" },
    content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 110 },
    heroCard: {
        backgroundColor: WHITE,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 14,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    avatarWrap: { marginBottom: 12 },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: "#E8F1FB",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarImg: { width: 84, height: 84, borderRadius: 42 },
    cameraBadge: {
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: BLUE,
        borderWidth: 2,
        borderColor: WHITE,
        alignItems: "center",
        justifyContent: "center",
    },
    cameraTxt: { color: WHITE, fontSize: 11, fontWeight: "700" },
    name: { color: NAVY, fontSize: 20, fontWeight: "800" },
    role: { color: GREY, fontSize: 13, marginTop: 3, fontWeight: "600" },
    project: {
        color: GREY,
        fontSize: 11,
        marginTop: 4,
        letterSpacing: 0.3,
        fontWeight: "600",
    },
    accessBadge: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#E8F1FB",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    accessCheck: { color: BLUE, fontSize: 12, fontWeight: "800" },
    accessTxt: { color: NAVY, fontSize: 12, fontWeight: "700" },
    contactRow: {
        marginTop: 16,
        width: "100%",
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#EEF2F7",
        paddingTop: 12,
    },
    contactCol: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 4,
    },
    contactDivider: {
        width: 1,
        backgroundColor: "#E5EDF6",
        marginVertical: 2,
    },
    contactIcon: { color: BLUE, fontSize: 13 },
    contactTxt: { flex: 1, color: NAVY, fontSize: 11, fontWeight: "600" },
    grid: {
        marginTop: 14,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 10,
    },
    tile: {
        width: "48%",
        minHeight: 118,
        backgroundColor: WHITE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#DCE7F3",
        padding: 12,
        elevation: 1,
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    tileIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    tileIcon: { width: 16, height: 16 },
    tileBody: { flex: 1, paddingRight: 14 },
    tileTitle: { color: NAVY, fontSize: 13, fontWeight: "800" },
    tileDesc: { color: GREY, fontSize: 10, lineHeight: 13, marginTop: 4 },
    tileChevron: {
        position: "absolute",
        right: 10,
        top: "42%",
        color: "#8A9BB5",
        fontSize: 20,
        fontWeight: "600",
    },
    logoutBtn: {
        marginTop: 16,
        minHeight: 50,
        borderRadius: 14,
        backgroundColor: LIGHTGREY,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    logoutIcon: { color: RED, fontSize: 16, fontWeight: "700" },
    logoutTxt: { color: RED, fontSize: 15, fontWeight: "800" },
});
