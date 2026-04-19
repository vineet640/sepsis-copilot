/**
 * ED sepsis pathway process times (minutes) from bundled CSV `tat_*` fields.
 * Order follows a typical door → recognition → treatment arc.
 */
export const CARE_TRACK_STEPS = [
  { key: "tat_door_to_triage_start_min", label: "Door → triage start" },
  { key: "tat_triage_start_to_complete_min", label: "Triage (start → complete)" },
  { key: "tat_door_to_primary_eval_min", label: "Door → primary evaluation" },
  { key: "tat_door_to_recognition_min", label: "Door → sepsis recognition" },
  { key: "tat_iv_process_total_min", label: "IV access (total)" },
  { key: "tat_lab_process_total_min", label: "Laboratory (total)" },
  { key: "tat_abx_process_total_min", label: "Antibiotic chain (order → first dose)" },
  { key: "tat_door_to_abx_admin_min", label: "Door → first antibiotic" },
  { key: "tat_recognition_to_abx_admin_min", label: "Recognition → first antibiotic" },
  { key: "tat_door_to_pressor_start_min", label: "Door → vasopressor start" },
];

export const CARE_TRACK_KEYS = CARE_TRACK_STEPS.map((s) => s.key);

/** @returns {number | null} */
export function parseTatMinutes(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** @param {Record<string, unknown>} p — patient row */
export function buildProcessTrackFromPatient(p) {
  if (!p || typeof p !== "object") return [];
  return CARE_TRACK_STEPS.map(({ key, label }) => ({
    key,
    label,
    minutes: parseTatMinutes(p[key]),
  }));
}

/** @param {number | null | undefined} m */
export function formatMinutes(m) {
  if (m == null || !Number.isFinite(m)) return "-";
  return `${Math.round(m)} min`;
}

/**
 * Cohort averages for browse dashboard (filtered rows may include `process_tats` from API).
 * @param {Array<Record<string, unknown>>} rows
 */
export function averageProcessTimes(rows) {
  if (!rows?.length) {
    return CARE_TRACK_STEPS.map(({ key, label }) => ({ key, label, avgMinutes: null, n: 0 }));
  }
  return CARE_TRACK_STEPS.map(({ key, label }) => {
    const vals = [];
    for (const r of rows) {
      const raw = r?.process_tats?.[key] ?? r?.[key];
      const m = parseTatMinutes(raw);
      if (m != null) vals.push(m);
    }
    const n = vals.length;
    const avgMinutes = n ? vals.reduce((a, b) => a + b, 0) / n : null;
    return { key, label, avgMinutes, n };
  });
}
