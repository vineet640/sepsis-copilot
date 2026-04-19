import React from "react";

export default function RiskBadge({ level, percent }) {
  const cls =
    level === "Low"
      ? "risk-low"
      : level === "Moderate"
        ? "risk-mod"
        : level === "High"
          ? "risk-high"
          : "risk-crit";
  const pulse = level === "High" || level === "Critical";
  return (
    <span className={`risk-badge ${cls}`}>
      {pulse ? <span className="risk-badge__pulse" aria-hidden /> : null}
      {level} {percent != null ? `${percent}%` : ""}
    </span>
  );
}
