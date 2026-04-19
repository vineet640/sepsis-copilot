import React from "react";

const STATUS = {
  "Septic Shock": "Serious infection affecting the whole body, including heart and blood pressure",
  "Severe Sepsis": "Serious infection causing strain on important organs",
  Sepsis: "Serious infection that has entered the bloodstream",
  SIRS: "The body is responding to an infection or illness",
  None: "Early monitoring: no infection confirmed yet",
};

const TRAJ = {
  rapid_worsen: "Condition was progressing quickly; care team responded",
  worsen: "Condition was becoming more serious over time",
  flat: "Condition remained stable",
  improve: "Condition improved with treatment",
  crash_recover: "Condition briefly worsened before treatment took effect",
};

export function plainStatus(s) {
  return STATUS[s] || s;
}

export function plainTrajectory(t) {
  return TRAJ[t] || t;
}

/** Full-width wrapper for patient-mode journey (21st layout width comes from HealthShell). */
export default function CareJourneyView({ patient, children }) {
  return <div className="w-full">{children}</div>;
}
