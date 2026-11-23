import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "@maplibre/maplibre-react-native";
import { BLUE, GREEN, GREY, ORANGE, RED, WHITE } from "../../constant/color";

export const WORKER_STATUS_COLOR = {
    active: GREEN,
    weak: ORANGE,
    offline: GREY,
    selected: BLUE,
    stopped: RED,
};

export default function WorkerMarker({
    id,
    latitude,
    longitude,
    label,
    status = "active",
    selected = false,
    onPress,
}) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const color = selected
        ? WORKER_STATUS_COLOR.selected
        : WORKER_STATUS_COLOR[status] || GREY;

    return (
        <Marker
            id={id || `worker-${latitude}-${longitude}`}
            lngLat={[longitude, latitude]}
            anchor="bottom"
            onPress={onPress}
        >
            <View style={styles.wrap}>
                <View style={[styles.pin, { backgroundColor: color, borderColor: selected ? BLUE : WHITE }]}>
                    <Text allowFontScaling={false} style={styles.label}>
                        {label || "W"}
                    </Text>
                </View>
                <View style={[styles.tail, { borderTopColor: color }]} />
            </View>
        </Marker>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: "center" },
    pin: {
        minWidth: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    label: { color: WHITE, fontSize: 11, fontWeight: "800" },
    tail: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        marginTop: -1,
    },
});
