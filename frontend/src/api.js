/**
 * Backend base URL.
 * - In dev, default to "" so requests go through the Vite dev server proxy (avoids CORS issues).
 * - Set VITE_API_BASE in .env for production or to hit a remote API during dev.
 */
const envBase = import.meta.env.VITE_API_BASE;
const trimmed = typeof envBase === "string" ? envBase.trim() : "";
export const API_BASE =
  trimmed !== ""
    ? trimmed.replace(/\/$/, "")
    : import.meta.env.DEV
      ? ""
      : "http://127.0.0.1:8000";

/** Turn FastAPI / fetch error bodies into a short user-facing string (no header dumps). */
export async function readApiErrorMessage(r) {
  const t = await r.text();
  try {
    const j = JSON.parse(t);
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) {
      return j.detail
        .map((x) => (typeof x?.msg === "string" ? x.msg : JSON.stringify(x)))
        .join("; ")
        .slice(0, 400);
    }
    if (j.detail != null) return String(j.detail).slice(0, 400);
  } catch {
    /* not JSON */
  }
  return t.replace(/\s+/g, " ").trim().slice(0, 400) || `HTTP ${r.status}`;
}

export async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json();
}

export async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json();
}

export async function apiDelete(path) {
  const r = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json();
}
