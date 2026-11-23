import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AdminDashboard from "../screens/userScreens/adminScreens/AdminDashbaorScreen";
import AdminFleet from "../screens/userScreens/adminScreens/CameraScreen";
import AdminGrievances from "../screens/userScreens/adminScreens/GrivancesScreen";
import CitizenGrievance from "../screens/userScreens/adminScreens/CitizenGrivanceScreen";
import AdminQRCodeScreen from "../screens/userScreens/adminScreens/AdminQRCodeScreen";
import AdminAttendance from "../screens/userScreens/adminScreens/AdminAttendanceScreen";
import AdminReports from "../screens/userScreens/adminScreens/FieldReportScreen";
import AdminActivities from "../screens/userScreens/adminScreens/ActivityLogsScreen";
import AdminSettings from "../screens/userScreens/adminScreens/UserandSettingsScreen";
import ProfileScreen from "../screens/userScreens/ProfileScreen";
import AuthorityDashboard from "../screens/userScreens/authorityViewerScreens/AuthorityViewerDashbaordScreen";
import AuthorityMap from "../screens/userScreens/authorityViewerScreens/AuthorityViewerMapScreen";
import AuthorityFleet from "../screens/userScreens/authorityViewerScreens/AuthorityViewerLiveScreen";
import AuthorityGrievances from "../screens/userScreens/authorityViewerScreens/AuthorityViewerGrivanceScreen";
import AuthorityReports from "../screens/userScreens/authorityViewerScreens/AuthorityViewerFieldReportScreen";
import AuthorityAttendance from "../screens/userScreens/authorityViewerScreens/AuthorityViewerAttendanceScreen";
import SupervisorHome from "../screens/userScreens/supervisorScreens/SupervisorHomeScreen";
import SupervisorVendors from "../screens/userScreens/supervisorScreens/SupervisorVendorScreen";
import SupervisorFleet from "../screens/userScreens/grivanceOfficerScreens/GrivanceOfficerFleetMonitoringScreen";
import SupervisorGrievances from "../screens/userScreens/supervisorScreens/SupervisorGrivanceScreen";
import SupervisorZone from "../screens/userScreens/supervisorScreens/SupervisorZoneScreen";
import SupervisorAttendance from "../screens/userScreens/supervisorScreens/SupervisorAttendanceScreen";
import SupervisorReports from "../screens/userScreens/supervisorScreens/SupervisorReportsScreen";
import SupervisorActivities from "../screens/userScreens/supervisorScreens/SupervisorActivityScreen";
import FieldHome from "../screens/userScreens/fieldStaffScreens/FieldStaffHomeScreen";
import FieldAttendance from "../screens/userScreens/fieldStaffScreens/FieldStaffAttendanceScreen";
import FieldReports from "../screens/userScreens/fieldStaffScreens/FieldStaffReportScreen";
import FieldActivities from "../screens/userScreens/fieldStaffScreens/FieldStaffActivityScreen";
import FieldGrievances from "../screens/userScreens/fieldStaffScreens/FieldStaffGrivanceScreen";
import OfficerHome from "../screens/userScreens/grivanceOfficerScreens/GrivanceOfficerHomeScreen";
import OfficerQueue from "../screens/userScreens/grivanceOfficerScreens/GrivanceOfficerGrivanceScreen";
import OfficerMap from "../screens/userScreens/grivanceOfficerScreens/GrivanceOfficerVendorMapScreen";
import OfficerFleet from "../screens/userScreens/grivanceOfficerScreens/GrivanceOfficerFleetMonitoringScreen";
import NotificationScreen from "../screens/userScreens/NotificationScreen";
import LiveTrackingScreen from "../screens/tracking/LiveTrackingScreen";
import JourneyHistoryScreen from "../screens/tracking/JourneyHistoryScreen";
import FloatingPillTabBar from "./FloatingPillTabBar";

const Tab = createBottomTabNavigator();

const withRole = (Component, role) => (props) => (
    <Component {...props} role={role} />
);

const ROLE_TABS = {
    superAdmin: [
        { name: "Home", component: AdminDashboard },
        { name: "Vendor", component: SupervisorVendors },
        { name: "QR Codes", component: AdminQRCodeScreen },
        { name: "Attendance", component: AdminAttendance },
        { name: "Profile", component: ProfileScreen },
    ],
    // Authority Viewer
    nodalOfficer: [
        { name: "Dashboard", component: AuthorityDashboard },
        { name: "Attendance", component: AuthorityAttendance },
        { name: "Fleet Monitoring", component: AuthorityFleet },
        { name: "Profile", component: ProfileScreen },
    ],
    supervisor: [
        { name: "Dashboard", component: SupervisorHome },
        { name: "My Zones", component: SupervisorZone },
        { name: "Attendance", component: SupervisorAttendance },
        {
            name: "Fleet Monitoring",
            component: withRole(SupervisorFleet, "supervisor"),
        },
        { name: "Profile", component: ProfileScreen },
    ],
    fieldStaff: [
        { name: "Field App", component: FieldHome },
        { name: "My Attendance", component: FieldAttendance },
        { name: "My Activity", component: FieldActivities },
        { name: "My Report", component: FieldReports },
        { name: "Profile", component: ProfileScreen },
    ],
    grievanceOfficer: [
        { name: "Dashboard", component: OfficerHome },
        { name: "Vendor Map", component: OfficerMap },
        {
            name: "Fleet Monitoring",
            component: withRole(OfficerFleet, "grievanceOfficer"),
        },
        { name: "Profile", component: ProfileScreen },
    ],
};

export const BottomTabNavigation = ({ role = "superAdmin" }) => {
    const tabs = ROLE_TABS[role] || ROLE_TABS.superAdmin;
    return (
        <Tab.Navigator
            initialRouteName={tabs[0].name}
            tabBar={(props) => <FloatingPillTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: "absolute",
                    backgroundColor: "transparent",
                    borderTopWidth: 0,
                    elevation: 0,
                },
            }}
        >
            {tabs.map((tab) => (
                <Tab.Screen
                    key={tab.name}
                    name={tab.name}
                    component={tab.component}
                    options={{ tabBarLabel: tab.name }}
                />
            ))}
        </Tab.Navigator>
    );
};

/** Stack screens opened from Profile (and other deep links) — not bottom tabs. */
export const ROLE_SCREEN_LINKS = {
    superAdmin: [
        ["Journey History", JourneyHistoryScreen],
        ["Field Reports", AdminReports],
        ["Activity Logs", AdminActivities],
        ["Attendance", AdminAttendance],
        ["Users and Settings", AdminSettings],
        ["Fleet Monitoring", AdminFleet],
        ["Fleet", AdminFleet],
        ["Notifications", NotificationScreen],
        ["Citizen Grievance", CitizenGrievance],
        ["Grievances", AdminGrievances],
        ["QR Codes", AdminQRCodeScreen],
        ["Vendors", SupervisorVendors],
        ["Vendor Map", OfficerMap],
    ],
    nodalOfficer: [
        ["Field Reports", AuthorityReports],
        ["Notifications", NotificationScreen],
        ["Grievances", AuthorityGrievances],
        ["Vendor Map", AuthorityMap],
        ["Live Tracking", LiveTrackingScreen],
        ["Journey History", JourneyHistoryScreen],
    ],
    supervisor: [
        ["Activity Logs", SupervisorActivities],
        ["Field Reports", SupervisorReports],
        ["Reports", SupervisorReports],
        ["Journey History", JourneyHistoryScreen],
        ["Notifications", NotificationScreen],
        ["Grievances", SupervisorGrievances],
        ["Vendors", SupervisorVendors],
    ],
    fieldStaff: [
        ["Zone Grievance", FieldGrievances],
        ["Grievances", FieldGrievances],
        ["Journey History", JourneyHistoryScreen],
        ["Notifications", NotificationScreen],
        ["Live Tracking", LiveTrackingScreen],
    ],
    grievanceOfficer: [
        ["Grievance Queue", OfficerQueue],
        ["Queue", OfficerQueue],
        ["Notifications", NotificationScreen],
        ["Live Tracking", LiveTrackingScreen],
        ["Journey History", JourneyHistoryScreen],
    ],
};

export default BottomTabNavigation;
