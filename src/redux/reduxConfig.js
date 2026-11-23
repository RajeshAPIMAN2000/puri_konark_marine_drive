import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./reducers/index";

const configure = (preloadedState) =>
    configureStore({ reducer: rootReducer, preloadedState });

export default configure;
