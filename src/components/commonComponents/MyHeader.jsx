import React, { useCallback, useEffect, useState } from "react";
import {
    Image,
    ImageBackground,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { BLUE, GREY, LIGHTBLUE, LIGHTGREY, NAVY, RED, WHITE } from "../../constant/color";
import { BANNER, PROFILE } from "../../constant/imagePath";
import { fetchUnreadNotificationCount } from "../../services/notifications/NotificationsService";

export const MyHeader = ({
    backgroundColor = WHITE,
    height = 64,
    title = "PKMD CRM",
    subtitle = "Puri-Konark Marine Drive",
    notificationCount: _notificationCountProp,
    avatarInitials = "SA",
    onMenuPress = () => {},
    onNotificationPress,
    onProfilePress = () => {},
    showMenu = true,
    showNotification = true,
    showProfile = true,
    showProfileLeft = false,
    // legacy props kept for compatibility (unused in dashboard header)
    midText = "",
    leftHeaderBtn = true,
    leftHeaderBtnPress,
    rightHeaderBtn = false,
    rightHeaderBtnPress,
    showSearchIcon = false,
    showLogo = false,
    variant = "default",
    titleAlign = "center",
}) => {
    const navigation = useNavigation();
    const handleMenu = leftHeaderBtnPress || onMenuPress;
    const handleProfile = rightHeaderBtnPress || onProfilePress;
    const displayTitle = midText || title;
    const statusBarHeight = StatusBar.currentHeight || (Platform.OS === "ios" ? 44 : 0);
    const branded = variant === "brand";
    // Content screens: center the screen heading. Brand/home can opt into left via titleAlign="left".
    const centerTitle =
        titleAlign === "center" ||
        (titleAlign === "auto" && (showProfileLeft || !showMenu));
    const showLeftSlot = showProfileLeft || showMenu || titleAlign === "left";

    // Live unread badge from API (hardcoded notificationCount props are ignored).
    const [unreadCount, setUnreadCount] = useState(0);
    void _notificationCountProp;
    void leftHeaderBtn;
    void rightHeaderBtn;
    void showSearchIcon;
    void showLogo;
    void avatarInitials;

    const refreshUnreadCount = useCallback(async () => {
        if (!showNotification) return;
        try {
            const res = await fetchUnreadNotificationCount();
            if (res.ok) setUnreadCount(res.count || 0);
        } catch (_) {
            /* keep prior count */
        }
    }, [showNotification]);

    useEffect(() => {
        refreshUnreadCount();
        const timer = setInterval(refreshUnreadCount, 60000);
        return () => clearInterval(timer);
    }, [refreshUnreadCount]);

    const openNotifications = useCallback(() => {
        if (typeof onNotificationPress === "function") {
            onNotificationPress();
            return;
        }
        try {
            const parent = navigation.getParent?.();
            if (parent?.navigate) {
                parent.navigate("Notifications");
            } else {
                navigation.navigate("Notifications");
            }
        } catch (_) {
            // Header may render outside a navigator during splash/tests
        }
    }, [navigation, onNotificationPress]);

    const badgeCount = unreadCount > 0 ? unreadCount : 0;
    const iconColor = branded ? WHITE : NAVY;

    const leftControl = showProfileLeft ? (
        <Pressable
            onPress={handleProfile}
            style={({ pressed }) => [styles.avatarBtn, styles.leftAvatarBtn, pressed && styles.pressed]}
            hitSlop={8}
        >
            <Image source={PROFILE} style={styles.leftAvatarImg} resizeMode="cover" />
        </Pressable>
    ) : showMenu ? (
        <Pressable
            onPress={handleMenu}
            style={({ pressed }) => [
                styles.actionChip,
                branded && styles.brandActionChip,
                pressed && styles.pressed,
            ]}
            hitSlop={8}
        >
            <View style={styles.menuGlyph}>
                <View style={[styles.menuLine, branded && styles.brandMenuLine]} />
                <View style={[styles.menuLine, styles.menuLineMid, branded && styles.brandMenuLine]} />
                <View style={[styles.menuLine, branded && styles.brandMenuLine]} />
            </View>
        </Pressable>
    ) : titleAlign === "left" ? (
        <View style={styles.brandMark}>
            <View style={[styles.brandMarkBar, branded && styles.brandMarkBarLight]} />
        </View>
    ) : (
        <View style={styles.sideSpacer} />
    );

    const header = (
        <View
            style={[
                styles.wrapper,
                branded ? styles.wrapperBranded : styles.wrapperDefault,
                { backgroundColor: branded ? "transparent" : backgroundColor, paddingTop: statusBarHeight },
            ]}
        >
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle={branded ? "light-content" : "dark-content"}
            />
            <View style={[styles.container, { minHeight: height, backgroundColor: branded ? "transparent" : WHITE }]}>
                {leftControl}

                <View style={[styles.titleBlock, centerTitle && styles.titleBlockCenter, !showLeftSlot && styles.titleBlockFlush]}>
                    <Text
                        allowFontScaling={false}
                        numberOfLines={1}
                        style={[
                            styles.title,
                            branded && styles.brandTitle,
                            centerTitle && styles.titleCenter,
                        ]}
                    >
                        {displayTitle}
                    </Text>
                    {!!subtitle && (
                        <Text
                            allowFontScaling={false}
                            numberOfLines={1}
                            style={[
                                styles.subtitle,
                                branded && styles.brandSubtitle,
                                centerTitle && styles.subtitleCenter,
                            ]}
                        >
                            {subtitle}
                        </Text>
                    )}
                </View>

                <View style={styles.rightCluster}>
                    {showNotification ? (
                        <Pressable
                            onPress={openNotifications}
                            style={({ pressed }) => [
                                styles.actionChip,
                                branded && styles.brandActionChip,
                                pressed && styles.pressed,
                            ]}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Notifications"
                        >
                            <Icon name="bell-outline" size={20} color={iconColor} />
                            {badgeCount > 0 ? (
                                <View style={styles.badge}>
                                    <Text allowFontScaling={false} style={styles.badgeTxt}>
                                        {badgeCount > 9 ? "9+" : badgeCount}
                                    </Text>
                                </View>
                            ) : null}
                        </Pressable>
                    ) : null}

                    {showProfile && !showProfileLeft ? (
                        <Pressable
                            onPress={handleProfile}
                            style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Profile"
                        >
                            <Image source={PROFILE} style={styles.avatarImg} resizeMode="cover" />
                        </Pressable>
                    ) : null}

                    {!showNotification && !(showProfile && !showProfileLeft) ? <View style={styles.sideSpacer} /> : null}
                </View>
            </View>
            {!branded ? <View style={styles.accentLine} /> : null}
        </View>
    );

    return branded ? (
        <ImageBackground
            source={BANNER}
            style={styles.brandBackground}
            imageStyle={styles.brandBackgroundImage}
            resizeMode="stretch"
        >
            {header}
        </ImageBackground>
    ) : (
        header
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        zIndex: 10,
    },
    wrapperDefault: {
        backgroundColor: WHITE,
        borderBottomWidth: 0,
        ...Platform.select({
            ios: {
                shadowColor: "#0B1F3A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    wrapperBranded: {
        backgroundColor: "transparent",
    },
    brandBackground: {
        width: "100%",
        backgroundColor: "#1459B8",
    },
    brandBackgroundImage: {
        opacity: 1,
    },
    container: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: WHITE,
    },
    actionChip: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: LIGHTGREY,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E6EAF0",
    },
    brandActionChip: {
        backgroundColor: "rgba(255,255,255,0.14)",
        borderColor: "rgba(255,255,255,0.28)",
    },
    pressed: {
        opacity: 0.82,
        transform: [{ scale: 0.97 }],
    },
    menuGlyph: {
        alignItems: "flex-start",
        justifyContent: "center",
    },
    menuLine: {
        width: 16,
        height: 2,
        borderRadius: 1,
        backgroundColor: NAVY,
        marginVertical: 1.5,
    },
    menuLineMid: {
        width: 11,
    },
    brandMenuLine: {
        backgroundColor: WHITE,
    },
    brandMark: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 2,
    },
    brandMarkBar: {
        width: 4,
        height: 28,
        borderRadius: 2,
        backgroundColor: BLUE,
    },
    brandMarkBarLight: {
        backgroundColor: WHITE,
    },
    sideSpacer: {
        width: 40,
    },
    titleBlock: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 10,
        minWidth: 0,
    },
    titleBlockFlush: {
        paddingLeft: 2,
    },
    titleBlockCenter: {
        alignItems: "center",
    },
    title: {
        color: NAVY,
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.15,
        lineHeight: 22,
    },
    titleCenter: {
        textAlign: "center",
        fontSize: 16,
    },
    brandTitle: {
        color: WHITE,
    },
    subtitle: {
        color: GREY,
        fontSize: 11.5,
        marginTop: 2,
        fontWeight: "500",
        letterSpacing: 0.1,
        lineHeight: 15,
    },
    subtitleCenter: {
        textAlign: "center",
        fontSize: 10.5,
    },
    brandSubtitle: {
        color: "#D6E7FF",
    },
    rightCluster: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    badge: {
        position: "absolute",
        top: -2,
        right: -2,
        minWidth: 17,
        height: 17,
        borderRadius: 9,
        backgroundColor: RED,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 3,
        borderWidth: 2,
        borderColor: WHITE,
    },
    badgeTxt: {
        color: WHITE,
        fontSize: 9,
        fontWeight: "800",
        lineHeight: 11,
    },
    avatarBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: LIGHTBLUE,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#C9DCF8",
    },
    leftAvatarBtn: {
        marginRight: 2,
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    leftAvatarImg: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    accentLine: {
        height: 2,
        width: "100%",
        backgroundColor: BLUE,
        opacity: 0.18,
    },
});
