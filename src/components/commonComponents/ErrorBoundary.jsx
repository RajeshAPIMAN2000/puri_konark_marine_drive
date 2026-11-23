import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GREY, NAVY, WHITE } from "../../constant/color";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: "" };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            message: error?.message || "Something went wrong",
        };
    }

    componentDidCatch(error) {
        console.log("ErrorBoundary caught:", error?.message || error);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <View style={styles.box}>
                    <Text allowFontScaling={false} style={styles.title}>
                        {this.props.title || "Unable to load this view"}
                    </Text>
                    <Text allowFontScaling={false} style={styles.msg}>
                        {String(this.state.message || "")}
                    </Text>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    box: {
        flex: 1,
        minHeight: 160,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: WHITE,
        padding: 16,
    },
    title: { color: NAVY, fontSize: 14, fontWeight: "700", marginBottom: 6 },
    msg: { color: GREY, fontSize: 12, textAlign: "center" },
});
