import React, { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureStore } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";
import rootReducer from "../redux/reducers/index";
import { checkuserToken, logoutUser } from "../redux/actions/auth";
import LoginNavigation from "./LoginNavigation";
import AuthNavigation from "./AuthNavigation";
import { restoreTrackingIfNeeded } from "../services/location/BackgroundLocationService";
import { setUnauthorizedHandler } from "../utils/authSession";

const store = configureStore({ reducer: rootReducer });

function AppNavigator() {
    const dispatch = useDispatch();
    const authStatus = useSelector((state) => state.authStatus);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        dispatch(checkuserToken());
    }, [dispatch]);

    useEffect(() => {
        // API 401 / expired token while using the app → Login (skip Splash)
        setUnauthorizedHandler(() => {
            dispatch(logoutUser());
        });
        return () => setUnauthorizedHandler(null);
    }, [dispatch]);

    useEffect(() => {
        const sub = AppState.addEventListener("change", (nextState) => {
            const wasBackground =
                appState.current === "background" || appState.current === "inactive";
            appState.current = nextState;
            if (wasBackground && nextState === "active") {
                // Resume: if token expired → Login directly (no Splash)
                dispatch(checkuserToken({ preferLoginOnExpire: true }));
            }
        });
        return () => sub.remove();
    }, [dispatch]);

    useEffect(() => {
        if (!authStatus) return;
        restoreTrackingIfNeeded().catch((err) => {
            console.log("restoreTrackingIfNeeded skipped:", err?.message || err);
        });
    }, [authStatus]);

    return authStatus ? <AuthNavigation /> : <LoginNavigation />;
}

export default function Navigation() {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <NavigationContainer>
                    <AppNavigator />
                </NavigationContainer>
            </SafeAreaProvider>
        </Provider>
    );
}
