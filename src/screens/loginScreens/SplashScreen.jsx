import React, { useEffect, useRef } from "react";
import {
    Animated,
    Image,
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { WHITE } from "../../constant/color";
import { PKMDLOGO, SPLASHSCREEN } from "../../constant/imagePath";
import { requestAppPermissions } from "../../utils/permissions";

const SplashScreen = ({ navigation }) => {
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // System permission dialogs (location + camera) — no Alert.alert
        requestAppPermissions();

        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(progressWidth, {
                toValue: 1,
                duration: 2800,
                useNativeDriver: false,
            }),
        ]).start();

        const timer = setTimeout(() => {
            if (navigation?.navigate) {
                navigation.navigate("Login");
            }
        }, 3200);

        return () => clearTimeout(timer);
    }, []);

    const progressFill = progressWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ["8%", "42%"],
    });

    return (
        <>
            <StatusBar backgroundColor="#06101F" barStyle="light-content" translucent />

            <ImageBackground
                source={SPLASHSCREEN}
                style={styles.background}
                resizeMode="cover"
            >
                <View style={styles.overlay}>
                    <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
                        {/* Top-right tagline */}
                        <View style={styles.topRight}>
                            <Text allowFontScaling={false} style={styles.servingTxt}>
                                Serving Odisha
                            </Text>
                            <Text allowFontScaling={false} style={styles.servingTxt}>
                                Stronger Together
                            </Text>
                            <View style={styles.servingUnderline} />
                        </View>

                        {/* Center brand block */}
                        <View style={styles.centerBlock}>
                            <Image
                                source={PKMDLOGO}
                                style={styles.logo}
                                resizeMode="contain"
                            />

                            <View style={styles.tricolor}>
                                <View style={[styles.tricolorSegment, styles.saffron]} />
                                <View style={[styles.tricolorSegment, styles.flagWhite]} />
                                <View style={[styles.tricolorSegment, styles.flagGreen]} />
                            </View>

                            <Text allowFontScaling={false} style={styles.title}>
                                Puri-Konark
                            </Text>
                            <Text allowFontScaling={false} style={styles.title}>
                                Marine Drive
                            </Text>

                            <Text allowFontScaling={false} style={styles.subtitle}>
                                Vendor & Field Monitoring System
                            </Text>

                            <Text allowFontScaling={false} style={styles.description}>
                                Centralised CRM for field supervision,{"\n"}
                                roadside vendor registry, live fleet monitoring{"\n"}
                                and citizen grievance redressal.
                            </Text>
                        </View>

                        {/* Bottom footer */}
                        <View style={styles.footer}>
                            <View style={styles.progressTrack}>
                                <Animated.View
                                    style={[styles.progressFill, { width: progressFill }]}
                                />
                            </View>

                            <Text allowFontScaling={false} style={styles.footerTitle}>
                                Government of Odisha
                            </Text>
                            <Text allowFontScaling={false} style={styles.footerSub}>
                                Coastal Infrastructure Division • PKMD-2026
                            </Text>
                        </View>
                    </Animated.View>
                </View>
            </ImageBackground>
        </>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(6, 16, 31, 0.35)",
        paddingTop: StatusBar.currentHeight || 28,
        paddingHorizontal: 24,
        paddingBottom: 36,
    },
    content: {
        flex: 1,
    },
    topRight: {
        alignItems: "flex-end",
        marginTop: 8,
        marginBottom: 12,
    },
    servingTxt: {
        color: WHITE,
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
        textAlign: "right",
        lineHeight: 17,
    },
    servingUnderline: {
        width: 78,
        height: 1,
        backgroundColor: "rgba(255,255,255,0.85)",
        marginTop: 6,
    },
    centerBlock: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 28,
    },
    logo: {
        width: 280,
        height: 96,
        marginBottom: 14,
        alignSelf: "center",
    },
    tricolor: {
        flexDirection: "row",
        width: 72,
        height: 5,
        borderRadius: 1,
        overflow: "hidden",
        marginBottom: 28,
    },
    tricolorSegment: {
        flex: 1,
        height: "100%",
    },
    saffron: {
        backgroundColor: "#EA5F0B",
    },
    flagWhite: {
        backgroundColor: WHITE,
    },
    flagGreen: {
        backgroundColor: "#138808",
    },
    title: {
        color: WHITE,
        fontSize: 34,
        fontWeight: "700",
        textAlign: "center",
        lineHeight: 40,
        letterSpacing: 0.3,
    },
    subtitle: {
        color: "rgba(230, 236, 245, 0.92)",
        fontSize: 15,
        fontWeight: "500",
        textAlign: "center",
        marginTop: 10,
        letterSpacing: 0.2,
    },
    description: {
        color: "rgba(255, 255, 255, 0.82)",
        fontSize: 12,
        fontWeight: "400",
        textAlign: "center",
        lineHeight: 18,
        marginTop: 18,
        paddingHorizontal: 18,
    },
    footer: {
        alignItems: "center",
        paddingBottom: 8,
    },
    progressTrack: {
        width: 92,
        height: 3,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.28)",
        overflow: "hidden",
        marginBottom: 18,
    },
    progressFill: {
        height: "100%",
        backgroundColor: WHITE,
        borderRadius: 2,
    },
    footerTitle: {
        color: WHITE,
        fontSize: 15,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 6,
    },
    footerSub: {
        color: "rgba(255,255,255,0.72)",
        fontSize: 11,
        fontWeight: "400",
        textAlign: "center",
        letterSpacing: 0.2,
    },
});

export default SplashScreen;
