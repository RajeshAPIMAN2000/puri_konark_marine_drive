import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { NAVY, WHITE } from "../constant/color";
import { getObjByKey } from "../utils/Storage";
import { BottomTabNavigation, ROLE_SCREEN_LINKS } from "./BottomTabNavigation";

const Stack = createStackNavigator();

export const resolveUserRole = (loginResponse) => {
    const candidates = [
        loginResponse?.role,
        loginResponse?.userRole,
        loginResponse?.roleName,
        loginResponse?.roleType,
        loginResponse?.user_type,
        loginResponse?.userType,
        loginResponse?.user?.role,
        loginResponse?.user?.userRole,
        loginResponse?.data?.role,
        loginResponse?.data?.userRole,
        loginResponse?.data?.roleName,
        loginResponse?.data?.roleType,
        loginResponse?.data?.user_type,
        loginResponse?.data?.userType,
        loginResponse?.data?.user?.role,
        loginResponse?.data?.user?.userRole,
        loginResponse?.userDetails?.role,
    ];
    const value = candidates.find((item) => typeof item === "string" && item.trim()) || "Field Staff";
    const role = value.toLowerCase().replace(/[^a-z]/g, "");

    if (role.includes("superadmin") || role === "admin") return "superAdmin";
    if (role.includes("fieldstaff")) return "fieldStaff";
    if (role.includes("grievanceofficer") || role.includes("grivanceofficer")) return "grievanceOfficer";
    if (role.includes("supervisor")) return "supervisor";
    // API: "authority" | "authority_viewer" | "nodal_officer" → Authority Viewer tabs
    if (
        role === "authority" ||
        role.includes("authorityviewer") ||
        role.includes("authority") ||
        role.includes("nodal")
    ) {
        return "nodalOfficer";
    }
    return "fieldStaff";
};

const ROLE_LABELS = {
    superAdmin: "Super Admin",
    nodalOfficer: "Authority Viewer",
    supervisor: "Supervisor",
    fieldStaff: "Field Staff",
    grievanceOfficer: "Grievance Officer",
};

export default function AuthNavigation() {
    const [role, setRole] = useState(null);

    useEffect(() => {
        let active = true;
        getObjByKey("loginResponse").then((response) => {
            if (active) setRole(resolveUserRole(response));
        }).catch(() => {
            if (active) setRole("superAdmin");
        });
        return () => { active = false; };
    }, []);

    if (!role) {
        return <View style={styles.loading}><ActivityIndicator size="large" color={NAVY} /></View>;
    }

    const extraScreens = ROLE_SCREEN_LINKS[role] || [];
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Main">
            <Stack.Screen name="Main">
                {(props) => <BottomTabNavigation {...props} role={role} />}
            </Stack.Screen>
            {extraScreens.map(([name, component]) => (
                <Stack.Screen key={name} name={name} component={component} initialParams={{ role }} />
            ))}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: WHITE },
});
