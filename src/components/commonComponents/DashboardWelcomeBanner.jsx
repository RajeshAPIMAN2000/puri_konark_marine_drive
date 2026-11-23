import React from "react";
import {
    Dimensions,
    ImageBackground,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { BANNER } from "../../constant/imagePath";

const { width: SCREEN_W } = Dimensions.get("window");

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning,";
    if (h < 17) return "Good Afternoon,";
    return "Good Evening,";
};

/**
 * Shared welcome banner used on role Dashboard / Home screens.
 * Same BANNER asset as Super Admin; title/subtitle are role-specific.
 */
export default function DashboardWelcomeBanner({
    title = "Super Admin",
    subtitle = "Here's what's happening today.",
    hPad = 12,
}) {
    return (
        <ImageBackground
            source={BANNER}
            style={[
                styles.banner,
                {
                    width: SCREEN_W - 20,
                    marginLeft: -hPad + 10,
                },
            ]}
            imageStyle={styles.bannerImage}
            resizeMode="stretch"
        >
            <View style={styles.bannerTextCol}>
                <Text allowFontScaling={false} style={styles.bannerGreeting}>
                    {getGreeting()}
                </Text>
                <Text allowFontScaling={false} style={styles.bannerName}>
                    {title}
                </Text>
                <Text allowFontScaling={false} style={styles.bannerSub}>
                    {subtitle}
                </Text>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    banner: {
        aspectRatio: 2.35,
        minHeight: 155,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        justifyContent: "flex-start",
        alignItems: "flex-start",
        paddingLeft: 22,
        paddingRight: 16,
        paddingTop: 18,
        paddingBottom: 14,
        alignSelf: "flex-start",
    },
    bannerImage: {
        borderRadius: 16,
        width: "100%",
        height: "100%",
    },
    bannerTextCol: {
        width: "48%",
        zIndex: 2,
        justifyContent: "flex-start",
    },
    bannerGreeting: {
        color: "#8B95A8",
        fontSize: 14,
        fontWeight: "400",
        marginBottom: 0,
        lineHeight: 18,
    },
    bannerName: {
        color: "#0B1F3A",
        fontSize: 22,
        fontWeight: "700",
        marginTop: 2,
        marginBottom: 2,
        lineHeight: 28,
    },
    bannerSub: {
        color: "#8B95A8",
        fontSize: 13,
        fontWeight: "400",
        lineHeight: 17,
        marginTop: 0,
    },
});
