import React, { useState, useEffect } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View, Image, BackHandler } from "react-native";
import DatePicker from 'react-native-date-picker';
import dayjs from 'dayjs';
import { BLACK, BRANDCOLOR, WHITE } from "../../constant/color";
import { TextInputComponent } from "../../components/commonComponents/TextInputComponent";
import { DOB, MAIL, NAME, PHONE, EDIT } from "../../constant/imagePath";
import { COMICSBOLD } from "../../constant/fontPath";
import { ToastMessage } from "../../components/commonComponents/ToastMessage";
import { CustomButton } from "../../components/commonComponents/Button";
import { OtpInput } from "../../components/otpScreenComponent/OtpInput";
import { MyAlert } from "../../components/commonComponents/MyAlert";
import { BASE_URL } from "../../constant/url";
import { POSTNETWORK } from "../../utils/Network";
import { MyLoader } from "../../components/commonComponents/MyLoader";
import { useDispatch } from "react-redux";
import { storeObjByKey } from "../../utils/Storage";
import { checkuserToken } from "../../redux/actions/auth";
import { HEIGHT, WIDTH } from "../../constant/config";

export default function RegisterScreen({ navigation }) {
    // State variables
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [dob, setDob] = useState('');
    const [contactNumber, setContactNumber] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [date, setDate] = useState(new Date());
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [isEditable, setIsEditable] = useState(true);
    const [alertVisible, setAlertVisible] = useState(false);
    const [isLoaderVisible, setIsLoaderVisible] = useState(false);
    const [isOtpEntered, setIsOtpEntered] = useState(false);

    useEffect(() => {
        const backAction = () => {
            setAlertVisible(true);
            return true;
        };

        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

        return () => backHandler.remove();
    }, []);

    const handleAlertClose = () => {
        setAlertVisible(false);
    };

    const handleAlertConfirm = () => {
        setAlertVisible(false);
        BackHandler.exitApp();
    };

    const onLoginNavigate = () => {
        navigation.navigate("Login");
    };

    const onHomeNavigate = () => {
        navigation.navigate("Main");
    }

    const handleSendOtp = async () => {
        if (name && email && contactNumber && dob) {
            try {
                const url = `${BASE_URL}users/register`
                const obj = {
                    "name": name,
                    "contact_no": contactNumber,
                    "email": email,
                    "dob": dob
                }
                setIsLoaderVisible(true);
                POSTNETWORK(url, obj).then(result => {
                    setIsLoaderVisible(false);
                    setToastMessage({
                        type: result?.statusCode == 201 ? "success" : "error",
                        msg: result?.message,
                        visible: true
                    });
                    console.log("result", result);

                    if (result?.statusCode == 201) {
                        setToastMessage({
                            type: "success",
                            msg: "OTP is send to your mail adress. Please check you mail...",
                            visible: true
                        });
                        setIsEditable(false);
                        setIsOtpSent(true);
                    } else {
                        setToastMessage({
                            type: "error",
                            msg: result?.message || "OTP Verification failed. Please try again",
                            visible: true
                        });
                    };
                });
            } catch (error) {
                console.error(error);
                setToastMessage({
                    type: "error",
                    msg: "An error occur during registration",
                    visible: true
                });
            };
        } else {
            setToastMessage({
                type: "error",
                msg: "Please fillup all the fields while you are registering",
                visible: true
            });
        };
    };

    const handleOtpChange = (otpValue) => {
        setOtp(otpValue);
        setIsOtpEntered(otpValue.length === 4);
    };

    const dispatch = useDispatch();

    const verifyOtp = async () => {
        if (email && otp) {
            try {
                const url = `${BASE_URL}users/verifyOtp`;
                const obj = {
                    "email": email,
                    "otp": otp
                };
                const result = await POSTNETWORK(url, obj);
                setToastMessage({
                    type: result?.statusCode === 200 ? "success" : "error",
                    msg: result?.message,
                    visible: true
                });

                if (result?.statusCode === 200) {
                    // onHomeNavigate();
                    storeObjByKey("loginResponse", result?.data).then(() => {
                        dispatch(checkuserToken());
                    })
                }
            } catch (error) {
                console.error(error);
                setToastMessage({
                    type: "error",
                    msg: "An error occurred during OTP verification. Please try again.",
                    visible: true
                });
            }
        } else {
            setToastMessage({
                type: "error",
                msg: "Please enter both email and OTP.",
                visible: true
            });
        }
    };

    const handleDateConfirm = (selectedDate) => {
        const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');
        setDob(formattedDate);
        setDatePickerVisible(false);
    };

    const handleEditInformation = () => {
        setOtp("");
        setIsOtpSent(false);
        setIsEditable(true);
    };

    return (
        <>
            <StatusBar backgroundColor={WHITE} barStyle={"dark-content"} />

            <View style={styles.container}>
                <View style={styles.childContainer}>
                    <Text allowFontScaling={false} style={styles.txtHeader}>Registration Form</Text>

                    <View style={{ height: 30 }} />

                    <View style={styles.txtInputContainer}>
                        <TextInputComponent
                            placeholder="Enter Your Name"
                            type="name"
                            inputdata={name}
                            setInputdata={setName}
                            image={NAME}
                            borderColor={BRANDCOLOR}
                            width={"100%"}
                            editable={isEditable}
                        />
                    </View>

                    <View style={styles.txtInputContainer}>
                        <TextInputComponent
                            placeholder="Enter Your Email Address"
                            type="email"
                            inputdata={email}
                            setInputdata={setEmail}
                            autoCapitalize={'none'}
                            image={MAIL}
                            borderColor={BRANDCOLOR}
                            width={"100%"}
                            keyboardType={"email-address"}
                            editable={isEditable}
                        />
                    </View>

                    <View style={styles.txtInputContainer}>
                        <TextInputComponent
                            placeholder="Enter Your Contact Number"
                            type="number"
                            inputdata={contactNumber}
                            setInputdata={setContactNumber}
                            image={PHONE}
                            borderColor={BRANDCOLOR}
                            width={"100%"}
                            keyboardType={"phone-pad"}
                            maxLength={10}
                            editable={isEditable}
                        />
                    </View>

                    <View style={styles.txtInputContainer}>
                        <TextInputComponent
                            placeholder="Enter Your Date of Birth"
                            type="other"
                            inputdata={dob}
                            image={DOB}
                            borderColor={BRANDCOLOR}
                            width={"100%"}
                            setInputdata={setDob}
                            editable={false}
                            onTouch={() => {
                                if (isEditable) setDatePickerVisible(true);
                            }}
                        />
                    </View>

                    {!isEditable && (
                        <TouchableOpacity style={styles.editInfoContainer} onPress={handleEditInformation}>
                            <View style={styles.penIconContainer}>
                                <Image source={EDIT} style={styles.penIcon} />
                            </View>
                            <Text allowFontScaling={false} style={styles.editInfoText}>Edit Information</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 50 }} />

                    {!isOtpSent ? (
                        <CustomButton
                            color={WHITE}
                            text="Send OTP"
                            onPress={handleSendOtp}
                            fontFamily={COMICSBOLD}
                        />
                    ) : (
                        <>
                            {/* Adding a container with proper layout to display the OTP input */}
                            <View style={styles.otpInputContainer}>
                                <OtpInput onOtpChange={handleOtpChange} />

                                <View style={{ height: 20 }} />

                                <CustomButton
                                    color={WHITE}
                                    text="Register"
                                    onPress={verifyOtp}
                                    fontFamily={COMICSBOLD}
                                    disabled={!isOtpEntered}
                                />
                            </View>
                        </>
                    )}
                </View>

                <View style={{ height: 80 }} />

                <View style={styles.loginTxtView}>
                    <Text
                    allowFontScaling={false}
                        onPress={onLoginNavigate}
                        style={{
                            ...styles.regText,
                            fontSize: 16,
                            color: BLACK
                        }}
                    >
                        Have an account?
                        <Text
                        allowFontScaling={false}
                            style={{
                                ...styles.regText,
                                fontSize: 16,
                                color: BRANDCOLOR
                            }}
                        >
                            {" Login Here"}
                        </Text>
                    </Text>
                </View>

                {/* Date Picker */}
                <DatePicker
                    modal
                    mode="date"
                    open={datePickerVisible}
                    date={date}
                    onConfirm={handleDateConfirm}
                    onCancel={() => setDatePickerVisible(false)}
                />

                {/* Toast Message */}
                {toastMessage.visible && (
                    <ToastMessage
                        message={toastMessage.msg}
                        visible={toastMessage.visible}
                        setVisible={({ visible }) => setToastMessage((prev) => ({ ...prev, visible }))}
                        bacgroundColor={toastMessage.type == "success" ? "green" : "red"}
                        textColor={WHITE}
                        type={toastMessage.type}
                        duration={3000}
                    />
                )}

                {/* Alert */}
                <MyAlert
                    visible={alertVisible}
                    title="Exit App"
                    message="Are you sure you want to exit?"
                    textRight="Yes"
                    textLeft="Cancel"
                    onPressRight={handleAlertConfirm}
                    onPressLeft={handleAlertClose}
                    onRequestClose={handleAlertClose}
                    backgroundColor={BRANDCOLOR}
                    titleColor={WHITE}
                    textColor={WHITE}
                    buttonColor={WHITE}
                    borderColor={WHITE}
                />

                {/* Loader */}
                <MyLoader visible={isLoaderVisible} />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
        justifyContent: "center",
    },
    childContainer: {
        // backgroundColor: WHITE,
        alignItems: "center",
        alignItems: "center",
        marginTop: HEIGHT * 0.03
    },
    txtInputContainer: {
        // backgroundColor: WHITE,
        width: "80%",
        marginVertical: HEIGHT * 0.01,
        alignSelf: "center"

    },
    regText: {
        color: WHITE,
        fontSize: 20,
        fontFamily: COMICSBOLD
    },
    loginTxtView: {
        width: 300,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 40
    },
    editInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: HEIGHT * 0.02,
    },
    penIconContainer: {
        backgroundColor: BRANDCOLOR,
        borderRadius: 200,
        padding: 5,
        marginRight: WIDTH * 0.02
    },
    penIcon: {
        height: 20,
        width: 20,
        tintColor: WHITE
    },
    editInfoText: {
        fontSize: 16,
        color: BLACK,
        // marginLeft: 200,
        fontFamily: COMICSBOLD
    }, txtHeader: {
        fontFamily: COMICSBOLD,
        fontSize: WIDTH * 0.07,
        color: BLACK
    },
    otpInputContainer: {
        // width: "100%", // Ensure it takes up the full width
        justifyContent: "center", // Center content vertically
        alignItems: "center", // Center content horizontally
    }
});
