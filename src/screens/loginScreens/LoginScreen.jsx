import React, { useEffect, useRef, useState } from "react";
import {
    StatusBar,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ImageBackground,
    ScrollView,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
} from "react-native";
import { BUTTON, WHITE } from "../../constant/color";
import {
    EMAIL,
    HIDE,
    LOGIN,
    LOGINSCREEN,
    LOGO,
    PASSWORD,
    SHOW,
} from "../../constant/imagePath";
import { TextInputComponent } from "../../components/commonComponents/TextInputComponent";
import { CustomButton } from "../../components/commonComponents/Button";
import { ToastMessage } from "../../components/commonComponents/ToastMessage";
import { POSTNETWORK } from "../../utils/Network";
import { BASE_URL } from "../../constant/url";
import { storeObjByKey } from "../../utils/Storage";
import { useDispatch } from "react-redux";
import { checkuserToken, setSkipSplash } from "../../redux/actions/auth";

const NAVY = "#0B1F3A";
const SUBTITLE_BLUE = "#3D6FA8";
const LABEL_GREY = "#8A94A6";
const BORDER_GREY = "#D5DBE5";
const DESC_GREY = "#6B7280";
const GREEN = "#16A34A";
const RED = "#DC2626";

const LoginScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const scrollRef = useRef(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [keyboardPad, setKeyboardPad] = useState(0);
    const [toastMessage, setToastMessage] = useState({
        type: "",
        msg: "",
        visible: false,
    });

    // const [otp, setOtp] = useState("");
    // const [isOtpSent, setIsOtpSent] = useState(false);
    // const [isOtpEntered, setIsOtpEntered] = useState(false);
    // const [isEmailEditable, setIsEmailEditable] = useState(true);
    // const [isLoaderVisible, setIsLoaderVisible] = useState(false);
    // const [isExitAlertVisible, setIsExitAlertVisible] = useState(false);
    // const [alertVisible, setAlertVisible] = useState(false);
    // const [forceUpdate, setForceUpdate] = useState(false);
    // const [toastMessage, setToastMessage] = useState({
    //     type: "",
    //     msg: "",
    //     visible: false,
    // });
    // const [updateAlertVisible, setUpdateAlertVisible] = useState(true);

    useEffect(() => {
        const showEvent =
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent =
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const onShow = Keyboard.addListener(showEvent, (e) => {
            setKeyboardPad(Math.max(0, (e?.endCoordinates?.height || 0) - 24));
            setTimeout(() => {
                scrollRef.current?.scrollToEnd?.({ animated: true });
            }, 80);
        });
        const onHide = Keyboard.addListener(hideEvent, () => setKeyboardPad(0));
        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, []);

    // // Register Navigation functionality
    // const onRegisterNavigate = () => {
    //     navigation.navigate("Register");
    // };

    // // Home Page Navigation Functionality
    // const onHomeNavigate = () => {
    //     navigation.navigate("Main");
    // };

    // const onExitApp = () => {
    //     setIsExitAlertVisible(false);
    //     BackHandler.exitApp();
    // };

    // const onAlertClose = () => {
    //     setIsExitAlertVisible(false);
    // };

    // const AppVersionUpdateClose = () => {
    //     setAlertVisible(false);
    // };

    // // Function to send OTP
    // const onSendOtp = async () => {
    //     if (email) {
    //         const url = `${BASE_URL}users/login?email=${email}`;
    //         setIsLoaderVisible(true);
    //         GETNETWORK(url).then((result) => {
    //             setIsLoaderVisible(false);
    //             setToastMessage({
    //                 type: result?.statusCode == 200 ? "success" : "error",
    //                 msg: result?.message,
    //                 visible: true,
    //             });
    //             if (result?.statusCode == 200) {
    //                 setIsOtpSent(true);
    //                 setIsEmailEditable(false);
    //             } else {
    //                 setIsOtpSent(false);
    //             }
    //         }).catch((error) => {
    //             setIsLoaderVisible(false);
    //             setToastMessage({
    //                 type: "error",
    //                 msg: "Failed to send OTP. Please try again.",
    //                 visible: true,
    //             });
    //             console.error(error);
    //         });
    //     } else {
    //         setToastMessage({
    //             type: "error",
    //             msg: "Please Enter Your Email",
    //             visible: true,
    //         });
    //     }
    // };

    // const handleOtpChange = (otpValue) => {
    //     setOtp(otpValue);
    //     if (otpValue.length === 4) {
    //         setIsOtpEntered(true);
    //     } else {
    //         setIsOtpEntered(false);
    //     }
    // };

    // const onChangeEmailPress = () => {
    //     setIsOtpSent(false);
    //     setIsOtpEntered(false);
    //     setIsEmailEditable(true);
    // };

    // const dispatch = useDispatch();
    // const verifyOtp = async () => {
    //     if (email && otp) {
    //         try {
    //             const url = `${BASE_URL}users/verifyOtp`;
    //             const obj = {
    //                 email: email,
    //                 otp: otp,
    //             };
    //             POSTNETWORK(url, obj).then((result) => {
    //                 setToastMessage({
    //                     type: result?.statusCode == 200 ? "success" : "error",
    //                     msg: result?.message,
    //                     visible: true,
    //                 });
    
    //                 if (result?.statusCode == 200) {
    //                     storeObjByKey("loginResponse", result?.data).then(() => {
    //                         dispatch(checkuserToken());
    //                     });
    //                 }
    //             });
    //         } catch (error) {
    //             console.error(error);
    //         }
    //     }
    // };

    // useFocusEffect(
    //     useCallback(() => {
    //         setEmail("");
    //         setOtp("");
    //         setIsOtpSent(false);
    //         setIsOtpEntered(false);
    //         setIsEmailEditable(true);
    //     }, [])
    // );

    // useEffect(() => {
    //     const backAction = () => {
    //         setIsExitAlertVisible(true);
    //         return true;
    //     };
    //     const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    //     return () => backHandler.remove();
    // }, []);

    const showToast = (msg, type = "error") => {
        setToastMessage({
            type,
            msg: msg || (type === "success" ? "Success" : "Something went wrong"),
            visible: true,
        });
    };

    const onSignIn = async () => {
        if (isLoading) return;

        const trimmedEmail = String(email || "").trim();
        const trimmedPassword = String(password || "").trim();

        if (!trimmedEmail) {
            showToast("Please enter your email", "error");
            return;
        }
        if (!trimmedPassword) {
            showToast("Please enter your password", "error");
            return;
        }

        setIsLoading(true);
        try {
            const url = `${BASE_URL}auth/login`;
            const payload = {
                email: trimmedEmail,
                password: trimmedPassword,
            };
            const result = await POSTNETWORK(url, payload);
            console.log("Login API response:", result);

            const accessToken =
                result?.accessToken ||
                result?.token ||
                result?.data?.accessToken ||
                result?.data?.token;

            const isSuccess =
                !!accessToken ||
                result?.statusCode == 200 ||
                result?.status == 200 ||
                result?.success === true;

            if (isSuccess) {
                const successMsg = result?.message || "Login successful";
                console.log("Login success:", successMsg, result);

                // Persist full auth payload for role routing + Bearer token usage
                const userObj =
                    result?.user ||
                    result?.data?.user ||
                    (result?.data && typeof result.data === "object" && result.data.role
                        ? result.data
                        : null);
                const loginData = {
                    ...(result?.data && typeof result.data === "object" ? result.data : {}),
                    ...result,
                    ...(userObj || {}),
                    user: userObj,
                    // Ensure role is always at top-level for AuthNavigation.resolveUserRole
                    role:
                        userObj?.role ||
                        result?.role ||
                        result?.data?.role ||
                        result?.userRole ||
                        null,
                    accessToken,
                    token: accessToken,
                    refreshToken: result?.refreshToken || result?.data?.refreshToken || null,
                    data: accessToken,
                };

                await storeObjByKey("loginResponse", loginData);
                showToast(successMsg, "success");
                // Successful login clears skip-splash so next cold start shows Splash again
                dispatch(setSkipSplash(false));
                dispatch(checkuserToken());
            } else {
                const errorMsg =
                    result?.message || result?.error || "Login failed. Please try again.";
                console.log("Login error:", errorMsg, result);
                showToast(errorMsg, "error");
            }
        } catch (error) {
            console.log("Login error:", error?.message || error);
            showToast("Login failed. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />

            <ImageBackground
                source={LOGINSCREEN}
                style={styles.background}
                resizeMode="cover"
            >
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
                >
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingBottom: 28 + keyboardPad },
                        ]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Language selector */}
                        <View style={styles.topBar}>
                            <TouchableOpacity style={styles.langBtn} activeOpacity={0.8}>
                                <Text allowFontScaling={false} style={styles.langTxt}>
                                    🌐  EN ▾
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Brand header */}
                        <View style={styles.headerBlock}>
                            <Image
                                source={LOGO}
                                style={styles.logo}
                                resizeMode="contain"
                            />

                            <View style={styles.tricolor}>
                                <View style={[styles.tricolorSegment, styles.saffron]} />
                                <View style={[styles.tricolorSegment, styles.flagWhite]} />
                                <View style={[styles.tricolorSegment, styles.flagGreen]} />
                            </View>

                            <Text allowFontScaling={false} style={styles.title}>
                                Puri-Konark Marine Drive
                            </Text>
                            <Text allowFontScaling={false} style={styles.subtitle}>
                                Vendor & Field Monitoring System
                            </Text>
                            <Text allowFontScaling={false} style={styles.description}>
                                Centralised CRM for field supervision, roadside vendor{"\n"}
                                registry, live fleet monitoring and citizen grievance{"\n"}
                                redressal.
                            </Text>
                        </View>

                        {/* Login card */}
                        <View style={styles.card}>
                            <View style={styles.secureRow}>
                                <View style={styles.secureIconBox}>
                                    <Text allowFontScaling={false} style={styles.secureIconTxt}>
                                        🛡️
                                    </Text>
                                </View>
                                <View style={styles.secureTextCol}>
                                    <Text allowFontScaling={false} style={styles.secureTitle}>
                                        Secure Sign In
                                    </Text>
                                    <Text allowFontScaling={false} style={styles.secureSub}>
                                        Use your PKMD government credentials
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.inputWrap}>
                                <TextInputComponent
                                    placeholder="Enter Your Email"
                                    type="email"
                                    width="100%"
                                    inputdata={email}
                                    setInputdata={setEmail}
                                    image={EMAIL}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    borderColor={BORDER_GREY}
                                    height={46}
                                    iconSize={22}
                                />
                            </View>

                            <View style={styles.passwordRow}>
                                <View style={styles.passwordInput}>
                                    <TextInputComponent
                                        placeholder="Enter Your Password"
                                        type={showPassword ? "" : "password"}
                                        width="100%"
                                        inputdata={password}
                                        setInputdata={setPassword}
                                        image={PASSWORD}
                                        autoCapitalize="none"
                                        borderColor={BORDER_GREY}
                                        height={46}
                                        iconSize={22}
                                        onFocus={() => {
                                            setTimeout(() => {
                                                scrollRef.current?.scrollToEnd?.({
                                                    animated: true,
                                                });
                                            }, 120);
                                        }}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.eyeBtn}
                                    onPress={() => setShowPassword((prev) => !prev)}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={showPassword ? SHOW : HIDE}
                                        style={styles.eyeIcon}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            </View>

                            <CustomButton
                                onPress={onSignIn}
                                text={isLoading ? "Signing in..." : "Sign in to CRM"}
                                color={WHITE}
                                backgroundColor={BUTTON}
                                width="100%"
                                height={44}
                                fontSize={14}
                                borderRadius={10}
                                image={LOGIN}
                            />
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text allowFontScaling={false} style={styles.footerTitle}>
                                Government of Odisha
                            </Text>
                            <Text allowFontScaling={false} style={styles.footerSub}>
                                Coastal Infrastructure Division • PKMD-2026
                            </Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>

            {toastMessage.visible && (
                <ToastMessage
                    message={toastMessage.msg}
                    visible={toastMessage.visible}
                    setVisible={({ visible }) =>
                        setToastMessage((prev) => ({ ...prev, visible }))
                    }
                    bacgroundColor={toastMessage.type === "success" ? GREEN : RED}
                    textColor={WHITE}
                    type={toastMessage.type}
                    duration={3000}
                    position="bottom"
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    background: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: (StatusBar.currentHeight || 28) + 8,
        paddingBottom: 28,
    },
    topBar: {
        alignItems: "flex-end",
        marginBottom: 4,
    },
    langBtn: {
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER_GREY,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    langTxt: {
        color: NAVY,
        fontSize: 12,
        fontWeight: "600",
    },
    headerBlock: {
        alignItems: "center",
        marginBottom: 16,
    },
    logo: {
        width: 260,
        height: 90,
        marginBottom: 10,
        alignSelf: "center",
        // Asset has extra right padding — nudge left so artwork sits mid-screen
        marginLeft: -48,
    },
    tricolor: {
        flexDirection: "row",
        width: 56,
        height: 4,
        borderRadius: 1,
        overflow: "hidden",
        marginBottom: 14,
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
        color: NAVY,
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 4,
    },
    subtitle: {
        color: SUBTITLE_BLUE,
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 8,
    },
    description: {
        color: DESC_GREY,
        fontSize: 11,
        textAlign: "center",
        lineHeight: 16,
        paddingHorizontal: 8,
    },
    card: {
        backgroundColor: WHITE,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 14,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    secureRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    secureIconBox: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: "#E8F1FB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    secureIconTxt: {
        fontSize: 15,
    },
    secureTextCol: {
        flex: 1,
    },
    secureTitle: {
        color: NAVY,
        fontSize: 14,
        fontWeight: "700",
    },
    secureSub: {
        color: LABEL_GREY,
        fontSize: 11,
        marginTop: 1,
    },
    inputWrap: {
        width: "100%",
        marginBottom: 4,
        marginTop: -4,
    },
    passwordRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        marginTop: -4,
        marginBottom: 10,
    },
    passwordInput: {
        flex: 1,
    },
    eyeBtn: {
        position: "absolute",
        right: 16,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        zIndex: 2,
        paddingHorizontal: 4,
    },
    eyeIcon: {
        width: 18,
        height: 18,
        tintColor: LABEL_GREY,
    },
    footer: {
        alignItems: "center",
        marginTop: 22,
        marginBottom: 8,
    },
    footerTitle: {
        color: WHITE,
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 4,
        textShadowColor: "rgba(0,0,0,0.35)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    footerSub: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 11,
        textAlign: "center",
        textShadowColor: "rgba(0,0,0,0.35)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});

export default LoginScreen;
