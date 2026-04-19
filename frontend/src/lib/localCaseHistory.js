/** Browser-only fallback when /save-case or /recently-viewed fail (API down, Mongo, CORS). */

const SAVED_KEY = "first_hour_local_saved_v1";
const RECENT_KEY = "first_hour_local_recent_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* quota / private mode */
  }
}

export function getLocalSavedCases() {
  return readJson(SAVED_KEY, []);
}

export function addLocalSavedCase(encounterId) {
  const list = getLocalSavedCases().filter((x) => x.encounter_id !== encounterId);
  list.unshift({
    encounter_id: encounterId,
    saved_at: new Date().toISOString(),
    note: "",
    _localOnly: true,
  });
  writeJson(SAVED_KEY, list.slice(0, 200));
}

export function removeLocalSavedCase(encounterId) {
  const list = getLocalSavedCases().filter((x) => x.encounter_id !== encounterId);
  writeJson(SAVED_KEY, list);
}

export function pushLocalRecent(encounterId, hospitalId = "") {
  const prev = readJson(RECENT_KEY, []);
  const next = prev.filter((x) => x.encounter_id !== encounterId);
  next.unshift({
    encounter_id: encounterId,
    hospital_id: hospitalId,
    viewed_at: new Date().toISOString(),
    _localOnly: true,
  });
  writeJson(RECENT_KEY, next.slice(0, 50));
}

export function getLocalRecent() {
  return readJson(RECENT_KEY, []);
}
