import React, { useEffect, useState } from "react";
import { apiGet } from "../api.js";
import { useMode } from "../context/ModeContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";

export default function CredibilityBanner() {
  const { isPatientMode } = useMode();
  const [open, setOpen] = useState(false);
  const [anchors, setAnchors] = useState([]);

  useEffect(() => {
    apiGet("/credibility-anchors")
      .then(setAnchors)
      .catch(() => setAnchors([]));
  }, []);

  if (isPatientMode) return null;

  return (
    <DashboardPanelCard title="Sources &amp; Credibility">
      <p className="text-sm text-muted-foreground">
        Risk scores aligned with: SOFA mortality tables (Ferreira 2001) · Surviving Sepsis Campaign 2021 · NHS NEWS2
      </p>
      <Button type="button" variant="soft" className="mt-2" onClick={() => setOpen(!open)}>
        Sources
      </Button>
      {open && (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground">
          {anchors.map((a, i) => (
            <li key={i}>
              <strong>{a.claim}</strong>{" "}
              <span className="text-muted-foreground">{a.source}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanelCard>
  );
}
