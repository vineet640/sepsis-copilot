import React from "react";
import { Badge } from "@/components/ui/badge.jsx";

/**
 * Shared encounter hero for clinician and patient views — same badges, title,
 * demographics line, chief presentation, facility metadata, and comorbidity chips.
 */
export function EncounterPageHeader({ data }) {
  if (!data) return null;

  return (
    <div className="app-encounter-hero">
      <div className="app-content-width">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {data.encounterId}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
              {data.hospitalName ? (
                <Badge variant="outline" className="text-xs">
                  {data.hospitalName}
                </Badge>
              ) : null}
            </div>
            <div>
              <h1 className="app-title-hero">{data.patientName || "Patient"}</h1>
              <p className="app-meta-line">
                {data.patientDemographics ?? data.patientAge} • MRN: {data.patientMRN} • Arrived {data.admissionDate}
              </p>
            </div>
            <p className="text-base text-foreground">
              <span className="font-medium">Chief presentation:</span> {data.chiefComplaint}
            </p>
            {data.demographicsLine ? (
              <p className="text-sm text-muted-foreground">{data.demographicsLine}</p>
            ) : null}
            {data.comorbidityBadges?.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data.comorbidityBadges.map((b) => (
                  <span key={b} className="risk-badge risk-mod">
                    {b}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
