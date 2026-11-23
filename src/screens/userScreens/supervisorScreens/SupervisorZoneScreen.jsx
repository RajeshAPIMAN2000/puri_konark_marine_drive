import React, { useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MyHeader } from "../../../components/commonComponents/MyHeader";
import StaticCrmMap from "../../../components/map/StaticCrmMap";
import SimpleIcon from "../../../components/commonComponents/SimpleIcon";
import { NAVY, WHITE } from "../../../constant/color";

const VENDORS = [
    { initial: "A", name: "Ananta Narayan Malik", area: "Bhudan Chhak – Chandrabhaga (Puri End)", coordinates: "19.824528, 85.856162", shops: "39 shops", phone: "9861010101", color: "#2161F5" },
    { initial: "B", name: "Ameet Arush Parida", area: "Chandrabhaga – Niali", coordinates: "19.838560, 85.862100", shops: "19 shops", phone: "9861020202", color: "#07839B" },
    { initial: "C", name: "Abinash Mohanty", area: "Solapua – Balugan", coordinates: "19.849628, 85.938642", shops: "20 shops", phone: "9861030303", color: "#8039E9" },
];

const ZONES = {
    A: { center: [19.824528, 85.856162], shops: 39, clusters: [2, 3, 19, 4, 11], points: [[19.818, 85.841], [19.833, 85.849], [19.839, 85.867], [19.824, 85.877], [19.812, 85.862]] },
    B: { center: [19.83856, 85.8821], shops: 19, clusters: [4, 4, 5, 3, 3], points: [[19.831, 85.870], [19.845, 85.870], [19.852, 85.889], [19.839, 85.899], [19.826, 85.887]] },
    C: { center: [19.849628, 85.938642], shops: 20, clusters: [6, 3, 5, 2, 4], points: [[19.842, 85.925], [19.856, 85.925], [19.864, 85.944], [19.850, 85.955], [19.837, 85.942]] },
    D: { center: [19.8702, 86.012], shops: 16, clusters: [3, 3, 4, 2, 4], points: [[19.862, 85.998], [19.877, 85.999], [19.884, 86.019], [19.871, 86.030], [19.857, 86.016]] },
};

const CORRIDOR_POLYGON = {
    id: "corridor",
    coordinates: [
        [19.95, 85.78],
        [19.95, 86.12],
        [19.8, 86.12],
        [19.8, 85.78],
    ],
    color: "#DC2626",
    fillColor: "#DC2626",
    fillOpacity: 0.04,
    dashArray: "8 6",
    weight: 2,
};

const VendorCard = ({ vendor }) => (
    <TouchableOpacity style={styles.vendorCard} activeOpacity={0.8}>
        <View style={[styles.avatar, { backgroundColor: vendor.color }]}><Text style={styles.avatarText}>{vendor.initial}</Text></View>
        <View style={styles.vendorDetails}>
            <Text numberOfLines={1} style={styles.vendorName}>{vendor.name}</Text>
            <Text numberOfLines={1} style={styles.vendorArea}>{vendor.area}</Text>
            <View style={styles.coordinateRow}><SimpleIcon name="map-marker-outline" size={14} color="#7488AD" /><Text style={styles.coordinates}>{vendor.coordinates}</Text></View>
        </View>
        <View style={styles.vendorMeta}>
            <Text style={styles.shopBadge}>{vendor.shops}</Text>
            <View style={styles.phoneBadge}><SimpleIcon name="phone" size={13} color={NAVY} /><Text style={styles.phoneText}>{vendor.phone}</Text></View>
        </View>
        <SimpleIcon name="chevron-right" size={19} color="#526B9B" />
    </TouchableOpacity>
);

export default function SupervisorZoneScreen() {
    const [selectedZone, setSelectedZone] = useState("A");
    const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
    const zoneMarkers = useMemo(() => {
        const info = ZONES[selectedZone];
        if (!info) return [];
        return info.points.map((pt, index) => ({
            id: `${selectedZone}-${index}`,
            latitude: pt[0],
            longitude: pt[1],
            label: String(info.clusters[index] || index + 1),
            color: "#102747",
        }));
    }, [selectedZone]);
    return (
        <View style={styles.root}>
            <StatusBar backgroundColor={WHITE} barStyle="dark-content" />
            <MyHeader title="Vendor Map & Registry" subtitle="" notificationCount={7} showProfile={false} titleAlign="center" />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}><SimpleIcon name="magnify" size={23} color={NAVY} /><TextInput placeholder="Search shop or owner..." placeholderTextColor="#91A2C3" style={styles.searchInput} /></View>
                    <TouchableOpacity style={styles.filterButton}><SimpleIcon name="filter-variant" size={20} color={NAVY} /><Text style={styles.filterText}>Filters</Text></TouchableOpacity>
                </View>
                <View style={styles.map}>
                    <StaticCrmMap
                        style={styles.webMap}
                        markers={zoneMarkers}
                        polygons={[CORRIDOR_POLYGON]}
                        initialCenter={{
                            latitude: ZONES[selectedZone].center[0],
                            longitude: ZONES[selectedZone].center[1],
                        }}
                        initialZoom={13}
                        showZoom
                    />
                    <View style={styles.zoneDropdownWrap}>
                        <TouchableOpacity style={styles.zonePill} onPress={() => setZoneMenuOpen((open) => !open)}>
                            <Text style={styles.zonePillText}>Zone {selectedZone}</Text><SimpleIcon name="chevron-down" size={15} color={NAVY} />
                        </TouchableOpacity>
                        {zoneMenuOpen && <View style={styles.zoneMenu}>{Object.keys(ZONES).map((zone) => (
                            <TouchableOpacity key={zone} style={styles.zoneOption} onPress={() => { setSelectedZone(zone); setZoneMenuOpen(false); }}>
                                <Text style={[styles.zoneOptionText, selectedZone === zone && styles.zoneOptionActive]}>Zone {zone}</Text>
                            </TouchableOpacity>
                        ))}</View>}
                    </View>
                </View>
                <View style={styles.vendorSheet}>
                    <View style={styles.sheetHandle} />
                    <View style={styles.sheetHeading}>
                        <View style={styles.headingText}><Text style={styles.sheetTitle}>Vendors in Zone {selectedZone}</Text><Text style={styles.sheetSubtitle}>{ZONES[selectedZone].shops} shops • Bhudan Chhak – Chandrabhaga (Puri End)</Text></View>
                        <View style={styles.unverifiedBadge}><Text style={styles.alertMark}>!</Text><Text style={styles.unverifiedText}>0 unverified</Text></View>
                    </View>
                    {VENDORS.map((vendor) => <VendorCard key={vendor.initial} vendor={vendor} />)}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7FAFE" },
    searchRow: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 9 },
    searchBox: { height: 48, flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 13, gap: 10 },
    searchInput: { flex: 1, color: NAVY, padding: 0, fontSize: 14 },
    filterButton: { height: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderWidth: 1, borderColor: "#DDE7F4", borderRadius: 13, gap: 7 },
    filterText: { color: "#23477D", fontSize: 13, fontWeight: "500" },
    map: { height: 380, overflow: "hidden", backgroundColor: "#E8EEF5", position: "relative" },
    webMap: { flex: 1, backgroundColor: "#E8EEF5" },
    zoneDropdownWrap: { position: "absolute", left: 14, top: 14, zIndex: 2 },
    zonePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9, elevation: 3 },
    zonePillText: { color: NAVY, fontSize: 13, fontWeight: "700" },
    zoneMenu: { marginTop: 5, backgroundColor: WHITE, borderRadius: 12, minWidth: 115, elevation: 6, overflow: "hidden" },
    zoneOption: { paddingHorizontal: 14, paddingVertical: 10 },
    zoneOptionText: { color: NAVY, fontSize: 13 },
    zoneOptionActive: { fontWeight: "800", color: "#2161F5" },
    vendorSheet: { marginTop: -4, backgroundColor: WHITE, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 18 }, sheetHandle: { alignSelf: "center", width: 58, height: 5, borderRadius: 4, backgroundColor: "#A4B2CA", marginBottom: 14 },
    sheetHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, headingText: { flex: 1, paddingRight: 8 }, sheetTitle: { color: "#0A174A", fontSize: 19, fontWeight: "800" }, sheetSubtitle: { color: "#8295B9", fontSize: 11, marginTop: 3 },
    unverifiedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF4DE", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 8, gap: 6 }, alertMark: { width: 17, height: 17, textAlign: "center", textAlignVertical: "center", borderRadius: 9, overflow: "hidden", backgroundColor: "#F28A08", color: WHITE, fontSize: 12, fontWeight: "800" }, unverifiedText: { color: "#E77900", fontSize: 11, fontWeight: "700" },
    vendorCard: { minHeight: 101, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E2EAF5", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 9, gap: 9, backgroundColor: WHITE },
    avatar: { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center" }, avatarText: { color: WHITE, fontSize: 25, fontWeight: "700" },
    vendorDetails: { flex: 1, minWidth: 0 }, vendorName: { color: NAVY, fontSize: 13, fontWeight: "800" }, vendorArea: { color: "#7A8FB5", fontSize: 10, marginTop: 3 }, coordinateRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }, coordinates: { color: "#7A8FB5", fontSize: 10 },
    vendorMeta: { alignItems: "flex-end", gap: 5 }, shopBadge: { color: NAVY, fontSize: 11, fontWeight: "700", backgroundColor: "#F0F4FA", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16 }, phoneBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F0F4FA", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 }, phoneText: { color: NAVY, fontSize: 10 },
});
