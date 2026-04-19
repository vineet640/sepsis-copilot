import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClinicianEncounterDashboard, CompactPatientJourney } from "@/components/encounter/EncounterDashboardViews.jsx";
import { Button } from "@/components/ui/button.jsx";
import { DEFAULT_ENCOUNTER_DEMO_DATA } from "@/lib/encounterDashboardData.js";
import ExplainPanel from "../components/ExplainPanel.jsx";
import { useAuth } from "@/context/AuthContext.jsx";

/** Sample encounter for the showcase route when the API is running. */
const DEMO_EXPLAIN_ENCOUNTER_ID = "H1_ENC_0001";

export default function EncounterDashboardShowcase() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [view, setView] = useState("full");
  const [geminiTone, setGeminiTone] = useState("clinician");

  useEffect(() => {
    if (auth.role === "patient" && auth.patientEncounterId) {
      navigate(`/patient/${encodeURIComponent(auth.patientEncounterId)}`, { replace: true });
    }
  }, [auth.role, auth.patientEncounterId, navigate]);

  return (
    <div className="app-page">
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setView(view === "full" ? "compact" : "full")} variant="default" size="sm" type="button">
          {view === "full" ? "Compact View" : "Full View"}
        </Button>
      </div>
      {view === "full" ? (
        <ClinicianEncounterDashboard
          data={DEFAULT_ENCOUNTER_DEMO_DATA}
          aiInsightsSlot={
            <ExplainPanel embedded encounterId={DEMO_EXPLAIN_ENCOUNTER_ID} tone={geminiTone} onToneChange={setGeminiTone} />
          }
        />
      ) : (
        <CompactPatientJourney data={DEFAULT_ENCOUNTER_DEMO_DATA} />
      )}
    </div>
  );
}
