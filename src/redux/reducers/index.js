import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./auth";
import skipSplashReducer from "./skipSplash";

export default combineReducers({
    authStatus: authReducer,
    skipSplash: skipSplashReducer,
});