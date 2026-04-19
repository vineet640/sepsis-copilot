import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_PATIENT_ENCOUNTER_ID } from "@/constants/demoPatient.js";

const STORAGE_KEY = "sepsis_copilot_auth";

const AuthContext = createContext({
  role: null,
  patientEncounterId: null,
  isAuthenticated: false,
  loginClinical: () => {},
  loginPatient: () => {},
  logout: () => {},
});

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { role: null, patientEncounterId: null };
    const o = JSON.parse(raw);
    return {
      role: o.role === "patient" || o.role === "clinical" ? o.role : null,
      patientEncounterId: typeof o.patientEncounterId === "string" ? o.patientEncounterId : null,
    };
  } catch {
    return { role: null, patientEncounterId: null };
  }
}

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => loadStored().role);
  const [patientEncounterId, setPatientEncounterId] = useState(() => loadStored().patientEncounterId);

  const persist = useCallback((nextRole, nextEncounter) => {
    setRole(nextRole);
    setPatientEncounterId(nextEncounter);
    try {
      if (nextRole == null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ role: nextRole, patientEncounterId: nextEncounter ?? null })
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loginClinical = useCallback(() => {
    try {
      localStorage.setItem("sepsis_copilot_mode", "clinician");
    } catch {
      /* ignore */
    }
    persist("clinical", null);
  }, [persist]);

  const loginPatient = useCallback((encounterId = DEMO_PATIENT_ENCOUNTER_ID) => {
    persist("patient", encounterId);
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const value = useMemo(
    () => ({
      role,
      patientEncounterId,
      isAuthenticated: role === "clinical" || role === "patient",
      loginClinical,
      loginPatient,
      logout,
    }),
    [role, patientEncounterId, loginClinical, loginPatient, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
