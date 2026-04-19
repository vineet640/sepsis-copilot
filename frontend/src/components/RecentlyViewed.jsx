import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../api.js";
import {
  addLocalSavedCase,
  getLocalRecent,
  getLocalSavedCases,
  removeLocalSavedCase,
} from "@/lib/localCaseHistory.js";
import { Button } from "@/components/ui/button.jsx";
import HealthListRow from "./health/HealthListRow.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";

function sessionId() {
  let s = localStorage.getItem("first_hour_session_id");
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem("first_hour_session_id", s);
  }
  return s;
}

const SAVED_CHANGED = "first-hour:saved-cases-changed";

function mergeRecent(apiItems, localItems) {
  const byId = new Map();
  for (const x of apiItems || []) {
    if (x?.encounter_id) byId.set(x.encounter_id, x);
  }
  for (const x of localItems || []) {
    if (x?.encounter_id && !byId.has(x.encounter_id)) byId.set(x.encounter_id, x);
  }
  return [...byId.values()]
    .sort((a, b) => String(b.viewed_at || "").localeCompare(String(a.viewed_at || "")))
    .slice(0, 8);
}

function mergeSaved(apiItems, localItems) {
  const byId = new Map();
  for (const x of apiItems || []) {
    if (x?.encounter_id) byId.set(x.encounter_id, x);
  }
  for (const x of localItems || []) {
    if (x?.encounter_id && !byId.has(x.encounter_id)) byId.set(x.encounter_id, x);
  }
  return [...byId.values()].sort((a, b) => String(b.saved_at || "").localeCompare(String(a.saved_at || "")));
}

export default function RecentlyViewed({ embedded = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [saved, setSaved] = useState([]);
  const [fallbackHint, setFallbackHint] = useState("");
  const sid = useMemo(() => sessionId(), []);

  const refresh = useCallback(() => {
    setFallbackHint("");
    apiGet(`/recently-viewed?session_id=${encodeURIComponent(sid)}`)
      .then((d) => setItems(mergeRecent(d.items || [], getLocalRecent())))
      .catch(() => {
        setItems(mergeRecent([], getLocalRecent()));
        setFallbackHint("Recently viewed: showing this browser only (API unavailable).");
      });
    apiGet(`/saved-cases?session_id=${encodeURIComponent(sid)}`)
      .then((d) => setSaved(mergeSaved(d.items || [], getLocalSavedCases())))
      .catch(() => {
        setSaved(mergeSaved([], getLocalSavedCases()));
        setFallbackHint((h) => h || "Saved cases: showing this browser only (API unavailable).");
      });
  }, [sid]);

  useEffect(() => {
    refresh();
  }, [location.pathname, refresh]);

  useEffect(() => {
    const onSaved = () => refresh();
    window.addEventListener(SAVED_CHANGED, onSaved);
    return () => window.removeEventListener(SAVED_CHANGED, onSaved);
  }, [refresh]);

  const inner = (
    <>
      {fallbackHint ? (
        <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[0.65rem] text-amber-950 dark:text-amber-100">
          {fallbackHint}
        </p>
      ) : null}
      {items.map((x) => (
        <HealthListRow
          key={x.encounter_id + x.viewed_at}
          label={x.encounter_id}
          value={x.hospital_id || "-"}
          to={`/patient/${x.encounter_id}`}
        />
      ))}
      <h4 className="mb-2 mt-4 px-4 text-[0.9375rem] font-semibold text-foreground">Saved cases</h4>
      {saved.map((x) => (
        <HealthListRow
          key={x.encounter_id}
          label={x.encounter_id}
          showChevron
          onClick={() => navigate(`/patient/${encodeURIComponent(x.encounter_id)}`)}
          value={
            <Button
              type="button"
              variant="soft"
              size="sm"
              className="text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                apiDelete(`/save-case/${encodeURIComponent(x.encounter_id)}?session_id=${encodeURIComponent(sid)}`)
                  .then(() => {
                    removeLocalSavedCase(x.encounter_id);
                    refresh();
                  })
                  .catch(() => {
                    removeLocalSavedCase(x.encounter_id);
                    refresh();
                  });
              }}
            >
              Remove
            </Button>
          }
        />
      ))}
    </>
  );

  if (embedded) return inner;

  return (
    <DashboardPanelCard
      title="Recently Viewed"
      description="Encounters you opened in this browser session."
    >
      {inner}
    </DashboardPanelCard>
  );
}

export function SaveCaseButton({ encounterId }) {
  const sid = sessionId();
  return (
    <Button
      type="button"
      variant="soft"
      onClick={() =>
        apiPost("/save-case", { session_id: sid, encounter_id: encounterId, note: "" })
          .then(() => {
            addLocalSavedCase(encounterId);
            window.dispatchEvent(new CustomEvent(SAVED_CHANGED));
            alert("Saved");
          })
          .catch(() => {
            addLocalSavedCase(encounterId);
            window.dispatchEvent(new CustomEvent(SAVED_CHANGED));
            alert("Saved in this browser only — server could not be reached.");
          })
      }
    >
      Save case
    </Button>
  );
}
