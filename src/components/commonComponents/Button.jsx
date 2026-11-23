import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BLACK, BUTTON, WHITE } from "../../constant/color";
import { COMICS, COMICSBOLD } from "../../constant/fontPath";

export const CustomButton = ({
    text = "",
    height = 50,
    width = "60%",
    backgroundColor = BUTTON,
    fontSize = 20,
    fontFamily = COMICS,
    color = WHITE,
    image = null,
    borderRadius = 15,
    onPress = () => {
        console.log("onPress not set");
    }
}) => {
    return (
        <Pressable
            onPress={onPress}
            style={{
                ...styles.btnView,
                height: height,
                width: width,
                backgroundColor: backgroundColor,
                borderRadius: borderRadius,
            }}
        >
            <View style={styles.contentRow}>
                {image ? (
                    <Image
                        source={image}
                        style={[styles.btnIcon, { tintColor: color }]}
                        resizeMode="contain"
                    />
                ) : null}
                <Text
                    allowFontScaling={false}
                    style={{
                        ...styles.sloganTxtView,
                        fontFamily: fontFamily,
                        color: color,
                        fontSize: fontSize,
                    }}
                >
                    {text}
                </Text>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    btnView: {
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 15,
        elevation: 6,
    },
    contentRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    btnIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
    sloganTxtView: {
        fontSize: 16,
        fontFamily: COMICSBOLD,
        color: BLACK,
    },
});
