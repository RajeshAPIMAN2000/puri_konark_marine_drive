import React, { useMemo } from "react";
import { GeoJSONSource, Layer, Marker } from "@maplibre/maplibre-react-native";
import { View, StyleSheet } from "react-native";
import { GREEN, RED, NAVY } from "../../constant/color";
import { buildRouteCoordinates } from "../../services/location/LocationDistanceService";

export default function JourneyPolyline({
    points = [],
    sourceId = "journey-route",
    lineColor = NAVY,
    showEndpoints = true,
}) {
    const coordinates = useMemo(() => buildRouteCoordinates(points), [points]);

    const lineData = useMemo(() => {
        if (coordinates.length < 2) return null;
        return {
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates,
            },
        };
    }, [coordinates]);

    const start = coordinates[0];
    const end = coordinates.length > 1 ? coordinates[coordinates.length - 1] : null;

    return (
        <>
            {lineData ? (
                <GeoJSONSource id={sourceId} data={lineData}>
                    <Layer
                        id={`${sourceId}-line`}
                        type="line"
                        paint={{
                            "line-color": lineColor,
                            "line-width": 4,
                            "line-opacity": 0.9,
                        }}
                        layout={{
                            "line-cap": "round",
                            "line-join": "round",
                        }}
                    />
                </GeoJSONSource>
            ) : null}

            {showEndpoints && start ? (
                <Marker id={`${sourceId}-start`} lngLat={start} anchor="center">
                    <View style={[styles.endpoint, styles.start]} />
                </Marker>
            ) : null}

            {showEndpoints && end ? (
                <Marker id={`${sourceId}-end`} lngLat={end} anchor="center">
                    <View style={[styles.endpoint, styles.end]} />
                </Marker>
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    endpoint: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: "#fff",
    },
    start: { backgroundColor: GREEN },
    end: { backgroundColor: RED },
});
