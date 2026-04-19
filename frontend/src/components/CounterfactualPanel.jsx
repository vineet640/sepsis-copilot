import React, { useEffect, useState } from "react";
import { apiGet } from "../api.js";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";

export default function CounterfactualPanel({ encounterId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    (async () => {
      try {
        const d = await apiGet(`/counterfactual/${encounterId}?hypothetical_delay=60`);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setData({ error: String(e.message) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  return (
    <DashboardPanelCard
      title="If Antibiotics At 60 Minutes"
      description="Modeled change in risk if door-to-antibiotics had been 60 minutes versus actual timing."
    >
      {loading && <p className="text-sm text-muted-foreground">Loading modeled comparison…</p>}
      {data && !data.error && (
        <>
          <div className="mt-1 grid grid-cols-2 gap-3 text-sm">
            <div>
              <strong className="text-foreground">Actual</strong>
              <div className="mono text-foreground">
                {data.actual_risk?.risk_percent}% ({data.actual_risk?.risk_level})
              </div>
            </div>
            <div>
              <strong className="text-foreground">At 60 min door-to-abx</strong>
              <div className="mono text-foreground">
                {data.counterfactual_risk?.risk_percent}% ({data.counterfactual_risk?.risk_level})
              </div>
            </div>
          </div>
          <div className="mt-2 font-bold text-[var(--ios-green)]">Risk reduction: {data.delta_percent} percentage points</div>
          <p className="mt-2 text-sm text-muted-foreground">Computed using SOFA-based rule engine (not a frontend estimate).</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{data.narrative}</p>
        </>
      )}
      {data?.error && <p className="mt-2 text-sm text-destructive">{data.error}</p>}
    </DashboardPanelCard>
  );
}
