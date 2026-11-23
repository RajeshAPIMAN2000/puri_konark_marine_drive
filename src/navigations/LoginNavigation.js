import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useSelector } from "react-redux";
import SplashScreen from "../screens/loginScreens/SplashScreen";
import LoginScreen from "../screens/loginScreens/LoginScreen";

const Stack = createStackNavigator();

export default function LoginNavigation() {
    // After logout → Login. Cold start / process kill → Splash first.
    const skipSplash = useSelector((state) => state.skipSplash);
    const initialRouteName = skipSplash ? "Login" : "Splash";

    return (
        <Stack.Navigator
            key={skipSplash ? "login-direct" : "login-splash"}
            screenOptions={{ headerShown: false }}
            initialRouteName={initialRouteName}
        >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
    );
}
