import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NAVY, WHITE } from "../../constant/color";

export default function MapControls({ onZoomIn, onZoomOut, onRecenter, style }) {
    return (
        <View style={[styles.wrap, style]} pointerEvents="box-none">
            <TouchableOpacity style={styles.btn} onPress={onZoomIn} activeOpacity={0.85}>
                <Text allowFontScaling={false} style={styles.txt}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={onZoomOut} activeOpacity={0.85}>
                <Text allowFontScaling={false} style={styles.txt}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.recenter]} onPress={onRecenter} activeOpacity={0.85}>
                <Text allowFontScaling={false} style={styles.recenterTxt}>◎</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: "absolute",
        right: 12,
        bottom: 170,
        gap: 8,
    },
    btn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: "#D7E2EF",
        alignItems: "center",
        justifyContent: "center",
        elevation: 3,
        shadowColor: "#0B1F3A",
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    txt: { color: NAVY, fontSize: 22, fontWeight: "700", lineHeight: 24 },
    recenter: { marginTop: 4 },
    recenterTxt: { color: NAVY, fontSize: 18, fontWeight: "700" },
});
