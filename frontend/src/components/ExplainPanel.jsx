import React, { useState } from "react";
import { apiGet } from "../api.js";
import { useMode } from "../context/ModeContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";
import { cn } from "@/lib/utils";

export default function ExplainPanel({ encounterId, tone: controlledTone, onToneChange, embedded = false, className }) {
  const { mode } = useMode();
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [internalTone, setInternalTone] = useState("clinician");
  const subMode = controlledTone !== undefined ? controlledTone : internalTone;
  const setSubMode = onToneChange ?? setInternalTone;

  const load = async () => {
    setLoading(true);
    try {
      const m = mode === "patient" ? "patient" : subMode;
      const d = await apiGet(`/explain/${encounterId}?mode=${m}`);
      setExplanation(d.explanation || "");
    } catch (e) {
      setExplanation(String(e.message));
    }
    setLoading(false);
  };

  const inner = (
    <>
      {mode === "clinician" && (
        <div className="health-segmented mb-3" role="group" aria-label="Explanation tone">
          <button type="button" className={subMode === "clinician" ? "active" : ""} onClick={() => setSubMode("clinician")}>
            Clinician
          </button>
          <button type="button" className={subMode === "patient" ? "active" : ""} onClick={() => setSubMode("patient")}>
            Patient Tone
          </button>
        </div>
      )}
      <Button type="button" variant="primary" onClick={load} disabled={loading}>
        {loading ? "..." : "Generate explanation"}
      </Button>
      <p
        className={cn(
          mode === "patient" ? "mt-3 text-[1.05rem] leading-relaxed" : "mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
        )}
      >
        {explanation}
      </p>
      {explanation ? (
        <p className="mb-0 mt-3 text-xs font-normal text-muted-foreground/80">Powered by Google Gemini</p>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className={cn("space-y-3", className)}>{inner}</div>;
  }

  return <DashboardPanelCard title="AI Clinical Explanation">{inner}</DashboardPanelCard>;
}
