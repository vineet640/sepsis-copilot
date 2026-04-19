import React, { createContext, useContext, useLayoutEffect } from "react";

const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => {},
  isDark: true,
});

/** App is dark-only (command center). No light theme. */
export function ThemeProvider({ children }) {
  useLayoutEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", "#1c1917");
    }
  }, []);

  const value = {
    theme: "dark",
    setTheme: () => {},
    isDark: true,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
