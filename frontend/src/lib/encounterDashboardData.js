/** Map API patient + risk + actions into ClinicianEncounterDashboard / CompactPatientJourney shape. */

import { buildProcessTrackFromPatient } from "./careTrackProcesses.js";

/** Shown on clinician encounter; aligns with backend `risk_engine.compute_risk`. */
export const RISK_MODEL_CLINICIAN_SUMMARY =
  "This estimate combines several signals: a baseline from the highest SOFA score (mapped to an in-hospital mortality curve), a hospital factor, illness trajectory (rapid worsening increases risk; improvement lowers it), a door-to-antibiotic delay factor, and a small adjustment when shock is present. The value is a modeled percentage for comparison across encounters, not a standalone prediction of outcome for any one patient.";

/** Plain-language version for patient and family (same ideas, minimal jargon). */
export const RISK_MODEL_PATIENT_SUMMARY =
  "This percentage blends how ill your labs and vitals suggest you are, whether you are getting worse or better, how quickly antibiotics were started, and a few hospital-level factors. Your care team uses it to compare and prioritize among similar situations. It supports shared decision making; it does not predict your personal outcome by itself.";

const FIRST_NAMES = [
  "Jordan",
  "Taylor",
  "Morgan",
  "Riley",
  "Casey",
  "Quinn",
  "Avery",
  "Reese",
  "Jamie",
  "Skylar",
];
const LAST_NAMES = [
  "Reyes",
  "Nguyen",
  "Patel",
  "Kim",
  "Garcia",
  "Okafor",
  "Silva",
  "Bennett",
  "Murphy",
  "Chang",
];

const INVALID_ID_TOKENS = new Set(["undefined", "null", "nan", ""]);

/** Deterministic display name from encounter id (no PHI). Never returns "undefined" / empty. */
export function fakeNameFromEncounter(encounterId) {
  let raw = "";
  if (encounterId != null && encounterId !== "") {
    raw = String(encounterId).trim();
  }
  if (INVALID_ID_TOKENS.has(raw.toLowerCase())) {
    raw = "";
  }
  const s = raw || "unknown";
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const first = FIRST_NAMES[u % FIRST_NAMES.length];
  const last = LAST_NAMES[(u >> 8) % LAST_NAMES.length];
  if (typeof first !== "string" || typeof last !== "string" || !first?.trim() || !last?.trim()) {
    return "Jordan Kim";
  }
  const out = `${first.trim()} ${last.trim()}`;
  if (!out || /\bundefined\b/i.test(out)) {
    return "Jordan Kim";
  }
  return out;
}

function fmtDateTime(ts) {
  if (ts == null || ts === "") return "-";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return String(ts);
  }
}

function fmtTimeOnly(ts) {
  if (ts == null || ts === "") return "-";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return String(ts);
  }
}

function vitalStatus(kind, raw) {
  if (raw == null || raw === "") return "normal";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "normal";
  switch (kind) {
    case "map":
      return n < 65 ? "warning" : "normal";
    case "spo2":
      return n < 92 ? "warning" : "normal";
    case "hr":
      return n > 120 || n < 50 ? "warning" : "normal";
    case "rr":
      return n > 30 || n < 8 ? "warning" : "normal";
    case "lac":
      return n >= 4 ? "critical" : n >= 2 ? "warning" : "normal";
    case "temp":
      return n >= 38.3 || n <= 36.0 ? "warning" : "normal";
    case "sofa":
      return n >= 11 ? "critical" : n >= 6 ? "warning" : "normal";
    default:
      return "normal";
  }
}

const ORGAN_KEYS = [
  ["circulatory", "Circulatory"],
  ["respiratory", "Respiratory"],
  ["renal", "Renal"],
  ["hepatic", "Hepatic"],
  ["coagulation", "Coagulation"],
  ["lactate", "Lactate"],
];

function organDysfunctionFromPatient(p, tp = 4) {
  const prefix = `tp${tp}_organ_dysfxn_`;
  return ORGAN_KEYS.map(([k, label]) => ({
    name: label,
    on: p[`${prefix}${k}`] === "Y" || p[`${prefix}${k}`] === true,
  }));
}

/**
 * @param {object} opts
 * @param {object} opts.patient
 * @param {object} [opts.risk]
 * @param {object[]} [opts.actions]
 * @param {object[]} [opts.timeline] API timeline_events
 * @param {object[]} [opts.timelineRisks] optional, for extra timeline context
 */
export function buildEncounterDashboardData({ patient, risk, actions = [], timeline = [], timelineRisks = [] }) {
  const p = patient || {};
  const encounterId = p.encounter_id ?? "-";
  const patientName = fakeNameFromEncounter(encounterId) || "Patient";
  const patientDemographics = [p.age_band, p.sex].filter(Boolean).join(" · ") || "-";
  const patientMRN = p.hospital_id || encounterId;

  const rp = risk?.risk_percent;
  const riskScore = rp != null && Number.isFinite(Number(rp)) ? Math.round(Number(rp)) : null;
  const riskLevel = risk?.risk_level ?? "Moderate";

  const parts = [];
  if (p.highest_sepsis_status) parts.push(String(p.highest_sepsis_status));
  if (p.trajectory_type) parts.push(`Trajectory: ${p.trajectory_type}`);
  if (p.present_on_admission === "Y") parts.push("Present on admission");
  const chiefComplaint = parts.length ? parts.join(" · ") : "Sepsis pathway evaluation";

  const admissionDate = fmtDateTime(p.ed_arrival_ts);

  const ts = "Latest (modeled TP4)";
  const vitals = [
    {
      label: "Heart rate",
      value: p.tp4_heart_rate != null ? String(Math.round(Number(p.tp4_heart_rate))) : "-",
      unit: "bpm",
      status: vitalStatus("hr", p.tp4_heart_rate),
      timestamp: ts,
    },
    {
      label: "MAP",
      value: p.tp4_map != null ? String(Math.round(Number(p.tp4_map))) : "-",
      unit: "mmHg",
      status: vitalStatus("map", p.tp4_map),
      timestamp: ts,
    },
    {
      label: "SpO₂",
      value: p.tp4_spo2 != null ? String(Math.round(Number(p.tp4_spo2))) : "-",
      unit: "%",
      status: vitalStatus("spo2", p.tp4_spo2),
      timestamp: ts,
    },
    {
      label: "Respiratory rate",
      value: p.tp4_resp_rate != null ? String(Math.round(Number(p.tp4_resp_rate))) : "-",
      unit: "/min",
      status: vitalStatus("rr", p.tp4_resp_rate),
      timestamp: ts,
    },
    {
      label: "Temperature",
      value: p.tp4_temp_c != null ? String(Number(p.tp4_temp_c).toFixed(1)) : "-",
      unit: "°C",
      status: vitalStatus("temp", p.tp4_temp_c),
      timestamp: ts,
    },
    {
      label: "Lactate",
      value: p.tp4_lactate != null ? String(Number(p.tp4_lactate).toFixed(1)) : "-",
      unit: "mmol/L",
      status: vitalStatus("lac", p.tp4_lactate),
      timestamp: ts,
    },
    {
      label: "SOFA",
      value: p.tp4_sofa_score != null ? String(p.tp4_sofa_score) : "-",
      unit: "score",
      status: vitalStatus("sofa", p.tp4_sofa_score),
      timestamp: ts,
    },
  ];

  const timelineEvents = (timeline || []).map((ev, idx) => {
    const tr = timelineRisks?.[idx];
    const riskHint =
      tr && tr.risk_percent != null
        ? ` · Modeled risk ${Math.round(Number(tr.risk_percent))}% (${tr.risk_level ?? "-"})`
        : "";
    return {
      time: fmtTimeOnly(ev.timestamp),
      title: `TP${ev.tp}: ${ev.sepsis_status ?? "Status"}`,
      description: `SOFA ${ev.sofa ?? "-"}${riskHint}`,
      type: "vital",
    };
  });

  const organDysfunction = organDysfunctionFromPatient(p, 4);

  const recommendedActions = (actions || []).map((a) => ({
    priority: a.priority || "routine",
    action: a.action || "",
    rationale: a.rationale || "",
    metric: a.metric || "",
  }));

  const aiSuggestions = [];
  for (const d of risk?.drivers || []) {
    aiSuggestions.push(d);
  }
  for (const a of actions.slice(0, 8)) {
    const line = [a.action, a.rationale].filter(Boolean).join(". ");
    if (line) aiSuggestions.push(line);
  }
  if (aiSuggestions.length === 0) {
    aiSuggestions.push("No additional AI suggestions. Review vitals and bundle metrics.");
  }

  const demographicsLine = [p.hospital_name, p.payer_mix, p.race_ethnicity].filter(Boolean).join(" · ");
  const comorbidityBadges = ["has_diabetes", "has_ckd", "has_chf", "has_malignancy", "has_immunocompromised"]
    .filter((k) => p[k] === "Y")
    .map((k) => k.replace("has_", ""));

  const riskDriversClinician = Array.isArray(risk?.drivers) ? [...risk.drivers] : [];

  return {
    encounterId,
    patientName,
    patientDemographics,
    patientMRN,
    demographicsLine,
    comorbidityBadges,
    riskScore,
    riskLevel,
    riskModelExplanation: RISK_MODEL_CLINICIAN_SUMMARY,
    riskModelExplanationPatient: RISK_MODEL_PATIENT_SUMMARY,
    riskDriversClinician,
    chiefComplaint,
    admissionDate,
    processTrackSteps: buildProcessTrackFromPatient(p),
    vitals,
    timeline: timelineEvents.length
      ? timelineEvents
      : [{ time: "-", title: "No timeline rows", description: "Timestamp data missing for this encounter.", type: "note" }],
    organDysfunction,
    recommendedActions,
    aiSuggestions,
    hospitalName: p.hospital_name ?? "",
  };
}

const DEMO_ENCOUNTER_ID = "ENC-2024-001234";

/** Static sample payload for `/demo/encounter` showcase route */
export const DEFAULT_ENCOUNTER_DEMO_DATA = {
  encounterId: DEMO_ENCOUNTER_ID,
  patientName: fakeNameFromEncounter(DEMO_ENCOUNTER_ID),
  patientDemographics: "67 · F",
  patientMRN: "MRN-789456",
  riskScore: 73,
  riskLevel: "High",
  riskModelExplanation: RISK_MODEL_CLINICIAN_SUMMARY,
  riskModelExplanationPatient: RISK_MODEL_PATIENT_SUMMARY,
  riskDriversClinician: [
    "SOFA score 9",
    "Door-to-antibiotics 72 min",
    "Trajectory: flat",
    "NEWS 8",
  ],
  chiefComplaint: "Chest pain and shortness of breath",
  admissionDate: "2024-01-15 08:30",
  vitals: [
    { label: "Heart Rate", value: "92", unit: "bpm", status: "warning", timestamp: "10:45 AM" },
    { label: "Blood Pressure", value: "145/92", unit: "mmHg", status: "warning", timestamp: "10:45 AM" },
    { label: "SpO2", value: "94", unit: "%", status: "warning", timestamp: "10:45 AM" },
    { label: "Temperature", value: "98.6", unit: "°F", status: "normal", timestamp: "10:45 AM" },
    { label: "Respiratory Rate", value: "22", unit: "/min", status: "warning", timestamp: "10:45 AM" },
    { label: "Glucose", value: "128", unit: "mg/dL", status: "normal", timestamp: "09:30 AM" },
  ],
  timeline: [
    { time: "10:45 AM", title: "Vitals Recorded", description: "BP elevated, HR increased", type: "vital" },
    { time: "10:30 AM", title: "Medication Administered", description: "Aspirin 325mg PO", type: "medication" },
    { time: "09:15 AM", title: "Physician Note", description: "Initial assessment completed", type: "note" },
    { time: "08:45 AM", title: "ECG Performed", description: "ST elevation noted in leads II, III, aVF", type: "procedure" },
    { time: "08:30 AM", title: "Patient Admitted", description: "ED arrival via ambulance", type: "note" },
  ],
  organDysfunction: [
    { name: "Circulatory", on: false },
    { name: "Respiratory", on: true },
    { name: "Renal", on: false },
    { name: "Hepatic", on: false },
    { name: "Coagulation", on: false },
    { name: "Lactate", on: true },
  ],
  recommendedActions: [
    {
      priority: "immediate",
      action: "Administer broad-spectrum antibiotics per protocol",
      rationale: "Hour-1 bundle: target door-to-antibiotics under 60 minutes when infection is suspected.",
      metric: "Review lactate and cultures",
    },
    {
      priority: "urgent",
      action: "Repeat lactate and reassess perfusion",
      rationale: "Trending lactate guides resuscitation endpoints.",
      metric: "Lactate clearance q2 to q4h",
    },
  ],
  aiSuggestions: [
    "BP pattern shows 15% increase over last 6 hours - trending toward hypertensive crisis",
    "Heart rate variability decreased 23% - correlates with similar cases in cohort",
    "SpO2 pattern matches 87% of COPD exacerbation cases in training data",
    "Risk score trajectory suggests intervention window closing in 2-4 hours",
  ],
  hospitalName: "Regional Medical Center",
  demographicsLine: "Regional Medical Center · Commercial · Non-Hispanic White",
  comorbidityBadges: ["diabetes", "chf"],
  processTrackSteps: buildProcessTrackFromPatient({
    tat_door_to_triage_start_min: 8,
    tat_triage_start_to_complete_min: 11,
    tat_door_to_primary_eval_min: 28,
    tat_door_to_recognition_min: 41,
    tat_iv_process_total_min: 22,
    tat_lab_process_total_min: 48,
    tat_abx_process_total_min: 35,
    tat_door_to_abx_admin_min: 58,
    tat_recognition_to_abx_admin_min: 19,
    tat_door_to_pressor_start_min: null,
  }),
};
