import React, { useRef, useState } from "react";
import { Dimensions, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BLACK, BRANDCOLOR, WHITE } from "../../constant/color";
import { FlatList } from "react-native-gesture-handler";
import { ONBOARDING } from "../../assets/data/onBoardingData";
import { COMICS, COMICSBOLD } from "../../constant/fontPath";
import { LOGO } from "../../constant/imagePath";
import { HEIGHT, WIDTH } from "../../constant/config";

const OnBoardingScreen = ({ navigation }) => {
    const [screen, setScreen] = useState(1);

    // Function to navigate to Login screen
    const onLoginPressNavigate = () => {
        navigation.navigate("Login");
    }

    // To track the currently visible item on FlatList
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setScreen(viewableItems[0].item.id);
        }
    });

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 50, // When 50% of the item is visible, trigger the onViewableItemsChanged
        minimumViewTime: 100 // Minimum time an item is visible (in ms)
    };

    return (
        <>
            <View style={styles.container}>
                <StatusBar backgroundColor={WHITE} barStyle={"dark-content"} />

                {/* Top View */}
                <View style={styles.top}>
                    {/* Header Container */}
                    <View style={styles.headerContainer}>
                        {/* Image View */}
                        <View style={styles.imgContainer}>
                            {/* Logo */}
                            <Image
                                source={LOGO}
                                style={styles.imgLogo}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Text Container */}
                        <View style={styles.textContainer}>
                            <Text allowFontScaling={false} style={styles.txtHeader}>
                                "Crafting the{" "}
                                <Text allowFontScaling={false} style={[styles.txtHeader, { color: BRANDCOLOR }]}>
                                    architects
                                </Text>
                            </Text>
                            <Text allowFontScaling={false} style={[styles.txtHeader, { textAlign: "center" }]}>
                                of
                            </Text>
                            <Text allowFontScaling={false} style={styles.txtHeader}>
                                tomorrow's{" "}
                                <Text allowFontScaling={false} style={[styles.txtHeader, { color: BRANDCOLOR }]}>
                                    technology
                                </Text>
                                "
                            </Text>
                        </View>
                    </View>

                    {/* Onboarding FlatList */}
                    <FlatList
                        data={ONBOARDING}
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={item => item.id.toString()}
                        pagingEnabled={true}
                        onViewableItemsChanged={onViewableItemsChanged.current}
                        viewabilityConfig={viewabilityConfig}
                        scrollEventThrottle={16}
                        renderItem={({ item }) => {
                            return (
                                <View style={styles.item}>
                                    <View style={styles.itemImgContainer}>
                                        <Image
                                            style={styles.itemImg}
                                            source={item.image}
                                        />
                                    </View>
                                    <View style={styles.descTextContainer}>
                                        <Text allowFontScaling={false} style={styles.itemTitle}>{item.title}</Text>
                                        <Text allowFontScaling={false} style={styles.desc}>{item.desc}</Text>
                                    </View>
                                </View>
                            );
                        }}
                    />
                </View>

                {/* Bottom View */}
                <View style={styles.bottom}>
                    {/* Pagination Indicators */}
                    <View style={styles.indicatorContainer}>
                        {ONBOARDING.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.indicator,
                                    screen === index + 1 ? styles.activeIndicator : styles.inactiveIndicator
                                ]}
                            />
                        ))}
                    </View>

                    {/* Button Container */}
                    <TouchableOpacity
                        style={[
                            styles.button,
                            screen === ONBOARDING.length ? { backgroundColor: WHITE } : { backgroundColor: "transparent" }
                        ]}
                        onPress={onLoginPressNavigate}
                    >
                        <Text
                        allowFontScaling={false}
                            style={[styles.buttonText, { color: BLACK }]}
                        >
                            {screen === ONBOARDING.length ? 'Get Started' : "Skip"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE
    },
    item: {
        width: WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemImg: {
        width: WIDTH,
        height: HEIGHT,
        resizeMode: 'contain',
        marginTop: 450
    },
    top: {
        flex: 0.8,
    },
    itemTitle: {
        fontSize: WIDTH * 0.08,
        padding: 8,
        marginVertical: 12,
        color: BLACK,
        fontFamily: COMICSBOLD
    },
    desc: {
        fontSize: WIDTH * 0.045,
        marginHorizontal: WIDTH * 0.06,
        textAlign: 'center',
        color: 'rgba(38,50,56,0.75)',
        lineHeight: WIDTH * 0.06,
        fontFamily: COMICS
    },
    bottom: {
        flex: 0.2,
        justifyContent: 'center',
        alignItems: 'center'
    },
    indicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    indicator: {
        width: WIDTH * 0.025,
        height: WIDTH * 0.025,
        borderRadius: WIDTH * 0.0125,
        marginHorizontal: WIDTH * 0.0125
    },
    activeIndicator: {
        backgroundColor: BRANDCOLOR,
        width: WIDTH * 0.075,
        height: WIDTH * 0.025
    },
    inactiveIndicator: {
        backgroundColor: BLACK
    },
    button: {
        paddingVertical: HEIGHT * 0.02,
        paddingHorizontal: WIDTH * 0.1,
        borderRadius: WIDTH * 0.07
    },
    buttonText: {
        color: BLACK,
        fontFamily: COMICSBOLD,
        fontSize: WIDTH * 0.04
    },
    headerContainer: {
        height: HEIGHT * 0.12,
        flexDirection: "row",
        alignItems: "center",
        margin: WIDTH * 0.03,
        gap: WIDTH * 0.08
    },
    imgContainer: {
        flex: 1 / 3,
    },
    imgLogo: {
        height: HEIGHT * 0.08,
        width: WIDTH * 0.32,
    },
    textContainer: {
        flex: 2 / 3,
        alignItems: "center",
        justifyContent: "center"
    },
    txtHeader: {
        fontSize: WIDTH * 0.05,
        fontFamily: COMICSBOLD,
        color: BLACK
    },
    itemImgContainer: {
        justifyContent: "center",  // Center the image vertically
        alignItems: "center",      // Center the image horizontally
        height: HEIGHT,      // You can adjust the height as needed
        width: WIDTH,              // Full width of the screen
    },
    descTextContainer: {
        alignItems: "center",
        height: 700,
        width: WIDTH
    }
});

export default OnBoardingScreen;
