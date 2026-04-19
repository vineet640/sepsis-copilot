import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";

function VitalsChartInner({ patient }) {
  const pts = [1, 2, 3, 4].map((i) => ({
    name: `TP${i}`,
    map: patient?.[`tp${i}_map`],
    lactate: patient?.[`tp${i}_lactate`],
    hr: patient?.[`tp${i}_heart_rate`],
  }));

  return (
    <div className="h-[220px] w-full min-w-0 font-sans text-xs [&_.recharts-text]:font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pts}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="name" stroke="var(--chart-axis)" />
          <YAxis stroke="var(--chart-axis)" />
          <Tooltip />
          <ReferenceLine y={65} stroke="var(--chart-ref)" strokeDasharray="4 4" label="MAP 65" />
          <Line type="monotone" dataKey="map" stroke="var(--chart-map)" name="MAP" dot />
          <Line type="monotone" dataKey="lactate" stroke="var(--chart-lactate)" name="Lactate" dot />
          <Line type="monotone" dataKey="hr" stroke="var(--chart-hr)" name="HR" dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** @param {{ patient: object, embedded?: boolean }} props — use embedded inside encounter "Vital Trends" card to avoid duplicate chrome */
export default function VitalsChart({ patient, embedded = false }) {
  if (embedded) {
    return <VitalsChartInner patient={patient} />;
  }
  return (
    <DashboardPanelCard title="Vitals Trend" contentClassName="!px-4 pb-4 pt-0">
      <VitalsChartInner patient={patient} />
    </DashboardPanelCard>
  );
}
