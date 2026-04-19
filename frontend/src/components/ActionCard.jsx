import React from "react";
import { useMode } from "../context/ModeContext.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";
import { cn } from "@/lib/utils";

export default function ActionCard({ actions }) {
  const { isPatientMode } = useMode();
  if (isPatientMode) return null;

  const borderClass = (p) =>
    p === "immediate"
      ? "border-l-destructive"
      : p === "urgent"
        ? "border-l-[var(--ios-orange)]"
        : "border-l-[var(--ios-green)]";

  return (
    <DashboardPanelCard title="Recommended Actions">
      {!actions?.length ? (
        <p className="text-sm text-muted-foreground">No recommended actions from the rule engine.</p>
      ) : null}
      {actions?.length ? (
      <ul className="m-0 list-none space-y-3 p-0">
        {actions.map((a, i) => (
          <li
            key={i}
            className={cn("border-l-4 pl-3", borderClass(a.priority))}
          >
            <strong className="text-sm text-foreground">
              {a.priority === "immediate"
                ? "Act Now"
                : a.priority === "urgent"
                  ? "Urgent"
                  : "Continue monitoring"}
            </strong>
            <span className="text-sm text-foreground">: {a.action}</span>
            <div className="mt-1 text-xs text-muted-foreground">{a.rationale}</div>
            <div className="mono mt-1 text-[0.75rem] text-muted-foreground">{a.metric}</div>
          </li>
        ))}
      </ul>
      ) : null}
      <p className="mb-0 mt-4 text-[0.7rem] text-muted-foreground">
        Generated from the clinical rule engine. Not a substitute for clinical judgment.
      </p>
    </DashboardPanelCard>
  );
}
