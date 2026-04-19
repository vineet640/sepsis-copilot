import React from "react";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";

const ORGANS = [
  ["circulatory", "Circulatory"],
  ["respiratory", "Respiratory"],
  ["renal", "Renal"],
  ["hepatic", "Hepatic"],
  ["coagulation", "Coagulation"],
  ["lactate", "Lactate"],
];

export default function OrganGrid({ patient, tp = 4 }) {
  const p = `tp${tp}_organ_dysfxn_`;
  return (
    <DashboardPanelCard title={`Organ Dysfunction (TP${tp})`}>
      <div className="grid grid-cols-3 gap-2 text-[0.8rem]">
        {ORGANS.map(([k, label]) => {
          const v = patient?.[`${p}${k}`];
          const on = v === "Y" || v === true;
          return (
            <div
              key={k}
              className="rounded-lg px-2 py-2 text-center font-medium"
              style={{
                border: `1px solid ${on ? "var(--ios-red)" : "var(--ios-green)"}`,
                background: on
                  ? "color-mix(in srgb, var(--ios-red) 16%, transparent)"
                  : "color-mix(in srgb, var(--ios-green) 12%, transparent)",
              }}
            >
              {label}: {on ? "Yes" : "No"}
            </div>
          );
        })}
      </div>
    </DashboardPanelCard>
  );
}
