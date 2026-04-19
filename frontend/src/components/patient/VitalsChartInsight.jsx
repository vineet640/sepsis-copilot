import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { apiGet } from "@/api.js";

/**
 * Fetches a plain-language Gemini explanation of MAP / lactate / HR trends (TP1–TP4)
 * for the patient vitals chart.
 */
export default function VitalsChartInsight({ encounterId }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!encounterId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    apiGet(`/explain/vitals-chart/${encodeURIComponent(encounterId)}`)
      .then((j) => {
        if (!cancelled) setText(j.explanation || "");
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  return (
    <Card className="gap-0 border-border py-0">
      <CardHeader className="pb-3 pt-6">
        <CardTitle>What This Chart Means</CardTitle>
        <p className="text-xs text-muted-foreground">
          Plain-language reading of MAP, lactate, and heart rate over TP1–TP4 (Google Gemini).
        </p>
      </CardHeader>
      <CardContent className="pb-6">
        {loading ? <p className="text-sm text-muted-foreground">Loading explanation…</p> : null}
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        {!loading && !err ? <p className="text-sm leading-relaxed text-foreground">{text}</p> : null}
        <p className="mt-3 text-xs text-muted-foreground">Powered by Google Gemini</p>
      </CardContent>
    </Card>
  );
}
