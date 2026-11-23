import React, { createContext, useContext, useMemo, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({children}) =>{
    const [isDarkMode, setIsDarkMode] = useState(false);

    const value = useMemo(
        ()=>({
            isDarkMode, toggleTheme: () => setIsDarkMode(prev => !prev)
        }), [isDarkMode]
    );
    return(
        <>
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>        
        </>
    );
};

export const useTheme = () => useContext(ThemeContext);