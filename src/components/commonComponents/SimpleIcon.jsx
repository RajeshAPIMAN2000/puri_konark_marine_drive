import React from "react";
import { Text } from "react-native";

const GLYPHS = {
    "camera-outline": "▣", "file-document-outline": "▤", "flag-outline": "⚑",
    "account-multiple-outline": "♧", "map-marker-outline": "⌖", "chevron-right": "›",
    "calendar-blank-outline": "▦", "chevron-down": "⌄", "storefront-outline": "▱",
    "account-group-outline": "♧", "bullhorn-outline": "⚑", "car-outline": "▰",
    "calendar-check-outline": "▣", "clock-outline": "◷", "access-point": "◉",
    "home-variant": "◆", "home-variant-outline": "⌂", "bell-ring-outline": "♧",
    history: "◷", "account-circle-outline": "◉", "map-outline": "◇", "dots-horizontal": "•••",
    magnify: "⌕", "filter-variant": "☷", "layers-outline": "▱", "crosshairs-gps": "⊙", phone: "⌕",
};

export default function SimpleIcon({ name, color = "#0B1F3A", size = 20 }) {
    return (
        <Text
            accessible={false}
            style={{ color, fontSize: size, lineHeight: size + 2, fontWeight: "600", textAlign: "center" }}
        >
            {GLYPHS[name] || "•"}
        </Text>
    );
}
