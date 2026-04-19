import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../api.js";
import { Button } from "@/components/ui/button.jsx";
import HealthListRow from "./health/HealthListRow.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";

function sessionId() {
  let s = localStorage.getItem("sepsis_session_id");
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem("sepsis_session_id", s);
  }
  return s;
}

export default function RecentlyViewed({ embedded = false }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [saved, setSaved] = useState([]);
  const sid = sessionId();

  const refresh = () => {
    apiGet(`/recently-viewed?session_id=${encodeURIComponent(sid)}`)
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
    apiGet(`/saved-cases?session_id=${encodeURIComponent(sid)}`)
      .then((d) => setSaved(d.items || []))
      .catch(() => setSaved([]));
  };

  useEffect(() => {
    refresh();
  }, []);

  const inner = (
    <>
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
                apiDelete(`/save-case/${encodeURIComponent(x.encounter_id)}?session_id=${encodeURIComponent(sid)}`).then(
                  refresh
                );
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
        apiPost("/save-case", { session_id: sid, encounter_id: encounterId, note: "" }).then(() =>
          alert("Saved")
        )
      }
    >
      Save case
    </Button>
  );
}
