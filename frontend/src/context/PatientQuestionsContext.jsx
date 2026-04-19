import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "sepsis_copilot_patient_questions_v1";

/**
 * @typedef {{ id: string; text: string; askedAt: number; doctorAnswer?: string; answeredAt?: number }} PatientQuestion
 */

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

const PatientQuestionsContext = createContext(null);

export function PatientQuestionsProvider({ children }) {
  const [byEncounter, setByEncounter] = useState(loadAll);

  useEffect(() => {
    saveAll(byEncounter);
  }, [byEncounter]);

  const getForEncounter = useCallback(
    (encounterId) => {
      const list = byEncounter[encounterId];
      return Array.isArray(list) ? list : [];
    },
    [byEncounter]
  );

  const askQuestion = useCallback((encounterId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const id = crypto.randomUUID();
    const q = { id, text: trimmed, askedAt: Date.now() };
    setByEncounter((prev) => {
      const list = Array.isArray(prev[encounterId]) ? prev[encounterId] : [];
      return { ...prev, [encounterId]: [...list, q] };
    });
    return id;
  }, []);

  const answerQuestion = useCallback((encounterId, questionId, doctorAnswer) => {
    const trimmed = doctorAnswer.trim();
    if (!trimmed) return;
    setByEncounter((prev) => {
      const list = Array.isArray(prev[encounterId]) ? [...prev[encounterId]] : [];
      const idx = list.findIndex((x) => x.id === questionId);
      if (idx === -1) return prev;
      list[idx] = {
        ...list[idx],
        doctorAnswer: trimmed,
        answeredAt: Date.now(),
      };
      return { ...prev, [encounterId]: list };
    });
  }, []);

  const value = useMemo(
    () => ({
      getForEncounter,
      askQuestion,
      answerQuestion,
    }),
    [getForEncounter, askQuestion, answerQuestion]
  );

  return <PatientQuestionsContext.Provider value={value}>{children}</PatientQuestionsContext.Provider>;
}

export function usePatientQuestions() {
  const ctx = useContext(PatientQuestionsContext);
  if (!ctx) throw new Error("usePatientQuestions must be used within PatientQuestionsProvider");
  return ctx;
}
