import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const ModeContext = createContext({
  mode: "clinician",
  setMode: () => {},
  isPatientMode: false,
});

const STORAGE_KEY = "sepsis_copilot_mode";
const AUTH_STORAGE_KEY = "sepsis_copilot_auth";

function initialModeFromStorage() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const o = raw ? JSON.parse(raw) : null;
    if (o?.role === "clinical") return "clinician";
    if (o?.role === "patient") return "patient";
    return localStorage.getItem(STORAGE_KEY) === "patient" ? "patient" : "clinician";
  } catch {
    return "clinician";
  }
}

export function ModeProvider({ children }) {
  const auth = useAuth();
  const [mode, setModeState] = useState(initialModeFromStorage);

  useEffect(() => {
    if (auth.role === "patient") {
      setModeState("patient");
      try {
        localStorage.setItem(STORAGE_KEY, "patient");
      } catch {
        /* ignore */
      }
    }
  }, [auth.role]);

  const setMode = useCallback(
    (m) => {
      if (auth.role === "patient" && m === "clinician") return;
      setModeState(m);
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {
        /* ignore */
      }
    },
    [auth.role]
  );

  useEffect(() => {
    document.body.classList.toggle("mode-patient", mode === "patient");
    document.body.classList.toggle("mode-clinician", mode === "clinician");
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isPatientMode: mode === "patient",
    }),
    [mode, setMode]
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  return useContext(ModeContext);
}
