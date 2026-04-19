import React, { useEffect, useState } from "react";
import TimelineStrip from "./TimelineStrip.jsx";
import { Button } from "@/components/ui/button.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";

function TimelineReplayControls({ patient, timelineRisks, tp, setTp, setPlaying }) {
  const n = tp + 1;
  const prefix = `tp${n}_`;
  const map = patient?.[`${prefix}map`];
  const lac = patient?.[`${prefix}lactate`];
  const hr = patient?.[`${prefix}heart_rate`];
  const sofa = patient?.[`${prefix}sofa_score`];
  const st = patient?.[`${prefix}sepsis_status`];
  const rr = timelineRisks[tp];

  return (
    <>
      <TimelineStrip currentTp={n} />
      <Button type="button" variant="primary" className="mt-3" onClick={() => { setTp(0); setPlaying(true); }}>
        Replay patient timeline
      </Button>
      <div className="mono mt-3 text-[0.85rem] leading-relaxed text-foreground">
        <div>
          TP{n}: {st}
        </div>
        <div>
          MAP {map ?? "-"} | Lactate {lac ?? "-"} | HR {hr ?? "-"} | SOFA {sofa ?? "-"}
        </div>
        {rr && (
          <div className="mt-2 font-semibold text-[var(--ios-green)]">
            Modeled risk: {rr.risk_percent}% ({rr.risk_level})
          </div>
        )}
      </div>
    </>
  );
}

/** @param {{ patient: object, timelineRisks?: object[], embedded?: boolean }} props */
export default function TimelineReplay({ patient, timelineRisks = [], embedded = false }) {
  const [playing, setPlaying] = useState(false);
  const [tp, setTp] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTp((t) => {
        if (t >= 3) {
          setPlaying(false);
          return 3;
        }
        return t + 1;
      });
    }, 1500);
    return () => clearInterval(id);
  }, [playing]);

  const controls = (
    <TimelineReplayControls
      patient={patient}
      timelineRisks={timelineRisks}
      tp={tp}
      setTp={setTp}
      setPlaying={setPlaying}
    />
  );

  if (embedded) {
    return <div className="min-w-0 space-y-2">{controls}</div>;
  }

  return (
    <DashboardPanelCard
      title="Timeline Replay"
      description="Step through modeled timepoints TP1 to TP4."
    >
      {controls}
    </DashboardPanelCard>
  );
}
