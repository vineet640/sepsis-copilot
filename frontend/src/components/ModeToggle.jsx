import React from "react";
import { useMode } from "../context/ModeContext.jsx";

export default function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="mode-segmented" role="group" aria-label="View mode">
      <button
        type="button"
        className={mode === "clinician" ? "active" : ""}
        onClick={() => setMode("clinician")}
      >
        Clinician
      </button>
      <button
        type="button"
        className={mode === "patient" ? "active" : ""}
        onClick={() => setMode("patient")}
      >
        Patient
      </button>
    </div>
  );
}
