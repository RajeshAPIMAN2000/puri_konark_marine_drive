import React, { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { GREY, NAVY, WHITE } from "../../constant/color";

const MONTHS_LONG = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

/**
 * Lightweight date modal (no react-native-date-picker dependency).
 * API shaped like the previous DatePicker modal usage:
 *   open, date, onConfirm(Date), onCancel, mode ("date")
 */
function DateModal({
    open = false,
    date = new Date(),
    onConfirm,
    onCancel,
    mode = "date",
}) {
    const initial =
        date instanceof Date && !Number.isNaN(date.getTime())
            ? date
            : new Date();
    const [cursor, setCursor] = useState(
        new Date(initial.getFullYear(), initial.getMonth(), 1)
    );
    const [selected, setSelected] = useState(initial);

    useEffect(() => {
        if (!open) return;
        const next =
            date instanceof Date && !Number.isNaN(date.getTime())
                ? date
                : new Date();
        setSelected(next);
        setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
    }, [open, date]);

    if (mode !== "date") {
        // Only date mode is supported — keep API compatible.
    }

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const close = () => onCancel?.();

    return (
        <Modal
            visible={!!open}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={close}
        >
            <Pressable style={styles.backdrop} onPress={close}>
                <Pressable style={styles.card} onPress={() => {}}>
                    <View style={styles.head}>
                        <TouchableOpacity
                            onPress={() => setCursor(new Date(year, month - 1, 1))}
                            hitSlop={8}
                        >
                            <Text allowFontScaling={false} style={styles.nav}>
                                ‹
                            </Text>
                        </TouchableOpacity>
                        <Text allowFontScaling={false} style={styles.title}>
                            {MONTHS_LONG[month]} {year}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setCursor(new Date(year, month + 1, 1))}
                            hitSlop={8}
                        >
                            <Text allowFontScaling={false} style={styles.nav}>
                                ›
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.grid}>
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                            <Text
                                key={`${d}-${i}`}
                                allowFontScaling={false}
                                style={styles.dow}
                            >
                                {d}
                            </Text>
                        ))}
                        {cells.map((day, i) => {
                            const isSelected =
                                day &&
                                selected.getDate() === day &&
                                selected.getMonth() === month &&
                                selected.getFullYear() === year;
                            return (
                                <TouchableOpacity
                                    key={`day-${i}`}
                                    disabled={!day}
                                    style={[
                                        styles.day,
                                        isSelected && styles.dayOn,
                                    ]}
                                    onPress={() => {
                                        if (!day) return;
                                        setSelected(new Date(year, month, day));
                                    }}
                                >
                                    <Text
                                        allowFontScaling={false}
                                        style={[
                                            styles.dayTxt,
                                            isSelected && styles.dayTxtOn,
                                        ]}
                                    >
                                        {day || ""}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={close}
                            activeOpacity={0.85}
                        >
                            <Text allowFontScaling={false} style={styles.cancelTxt}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.okBtn}
                            onPress={() => onConfirm?.(selected)}
                            activeOpacity={0.85}
                        >
                            <Text allowFontScaling={false} style={styles.okTxt}>
                                Confirm
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 14,
    },
    head: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    title: { color: NAVY, fontWeight: "700", fontSize: 15 },
    nav: { color: NAVY, fontSize: 24, paddingHorizontal: 8 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    dow: {
        width: "14.28%",
        textAlign: "center",
        color: GREY,
        fontSize: 11,
        marginBottom: 4,
    },
    day: {
        width: "14.28%",
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },
    dayOn: { backgroundColor: NAVY },
    dayTxt: { color: NAVY, fontSize: 13 },
    dayTxtOn: { color: WHITE, fontWeight: "700" },
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 12,
        gap: 8,
    },
    cancelBtn: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: WHITE,
    },
    cancelTxt: { color: NAVY, fontWeight: "600", fontSize: 13 },
    okBtn: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: NAVY,
    },
    okTxt: { color: WHITE, fontWeight: "700", fontSize: 13 },
});

export default DateModal;
