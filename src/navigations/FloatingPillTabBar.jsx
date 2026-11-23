import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { BLUE, GREY, NAVY, WHITE } from "../constant/color";

const TAB_ICONS = {
    Home: "home-variant",
    Dashboard: "view-dashboard",
    "Field App": "cellphone-check",
    Vendor: "storefront-outline",
    "Vendor Map": "map-marker-radius-outline",
    Vendors: "storefront-outline",
    "My Zones": "map-marker-radius-outline",
    "QR Codes": "qrcode-scan",
    Attendance: "calendar-check-outline",
    "My Attendance": "calendar-check-outline",
    Grievances: "flag-outline",
    Queue: "format-list-bulleted",
    Fleet: "truck-outline",
    "Fleet Monitoring": "truck-outline",
    Track: "crosshairs-gps",
    Reports: "file-document-outline",
    "My Report": "file-document-outline",
    "My Activity": "clipboard-text-outline",
    Profile: "account-outline",
    Search: "magnify",
    History: "history",
};

const isCenterQrTab = (routeName) => routeName === "QR Codes";

export default function FloatingPillTabBar({ state, descriptors, navigation }) {
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, 8);
    const centerIndex = state.routes.findIndex((route) => isCenterQrTab(route.name));
    const hasCenterQr = centerIndex >= 0;

    const onPressRoute = (route, focused) => {
        const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
        }
    };

    const renderSideItem = (route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label =
            options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;
        const iconName = TAB_ICONS[route.name] || "circle-outline";

        return (
            <Pressable
                key={route.key}
                onPress={() => onPressRoute(route, focused)}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                style={styles.sideItem}
            >
                <Icon
                    name={focused ? iconName.replace("-outline", "") || iconName : iconName}
                    size={22}
                    color={focused ? NAVY : GREY}
                />
                <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={[styles.label, focused && styles.labelActive]}
                >
                    {label}
                </Text>
            </Pressable>
        );
    };

    if (!hasCenterQr) {
        return (
            <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
                <View style={styles.pillFlat}>
                    {state.routes.map((route, index) => renderSideItem(route, index))}
                </View>
            </View>
        );
    }

    const leftRoutes = state.routes.slice(0, centerIndex);
    const centerRoute = state.routes[centerIndex];
    const rightRoutes = state.routes.slice(centerIndex + 1);
    const centerFocused = state.index === centerIndex;

    return (
        <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
            <View style={styles.barArea}>
                <View style={styles.pill}>
                    <View style={styles.sideGroup}>
                        {leftRoutes.map((route, i) => renderSideItem(route, i))}
                    </View>

                    <View style={styles.centerSpacer} />

                    <View style={styles.sideGroup}>
                        {rightRoutes.map((route, i) =>
                            renderSideItem(route, centerIndex + 1 + i)
                        )}
                    </View>
                </View>

                <Pressable
                    onPress={() => onPressRoute(centerRoute, centerFocused)}
                    accessibilityRole="button"
                    accessibilityState={centerFocused ? { selected: true } : {}}
                    style={styles.centerBtnWrap}
                >
                    <View style={[styles.centerBtn, centerFocused && styles.centerBtnActive]}>
                        <Icon name="qrcode-scan" size={28} color={WHITE} />
                    </View>
                    <Text
                        allowFontScaling={false}
                        style={[styles.centerLabel, centerFocused && styles.centerLabelActive]}
                    >
                        QR
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        paddingHorizontal: 14,
    },
    barArea: {
        width: "100%",
        maxWidth: 420,
        height: 78,
        justifyContent: "flex-end",
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 62,
        paddingHorizontal: 10,
        borderRadius: 34,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E5EDF6",
        ...Platform.select({
            ios: {
                shadowColor: "#0F172A",
                shadowOpacity: 0.14,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
            },
            android: {
                elevation: 12,
            },
        }),
    },
    pillFlat: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        maxWidth: 420,
        minHeight: 64,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 32,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#E5EDF6",
        elevation: 10,
    },
    sideGroup: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
    },
    centerSpacer: {
        width: 72,
    },
    sideItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        gap: 2,
    },
    label: {
        color: GREY,
        fontSize: 10,
        fontWeight: "600",
    },
    labelActive: {
        color: NAVY,
        fontWeight: "800",
    },
    centerBtnWrap: {
        position: "absolute",
        alignSelf: "center",
        top: 0,
        alignItems: "center",
        width: 72,
    },
    centerBtn: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: BLUE,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 4,
        borderColor: WHITE,
        ...Platform.select({
            ios: {
                shadowColor: BLUE,
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
            },
            android: {
                elevation: 14,
            },
        }),
    },
    centerBtnActive: {
        backgroundColor: NAVY,
    },
    centerLabel: {
        marginTop: 2,
        color: GREY,
        fontSize: 10,
        fontWeight: "700",
    },
    centerLabelActive: {
        color: NAVY,
        fontWeight: "800",
    },
});
