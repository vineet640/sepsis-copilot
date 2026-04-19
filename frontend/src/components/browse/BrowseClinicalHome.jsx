import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  Clock,
  FileText,
  Heart,
  Search,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import HealthShell from "@/components/health/HealthShell.jsx";
import PerformanceGauge from "@/components/browse/PerformanceGauge.jsx";
import RecentlyViewed from "@/components/RecentlyViewed.jsx";
import RiskBadge from "@/components/RiskBadge.jsx";
import { averageProcessTimes, formatMinutes } from "@/lib/careTrackProcesses.js";
import { fakeNameFromEncounter } from "@/lib/encounterDashboardData.js";
import { cn } from "@/lib/utils";

function computeMetrics(rows) {
  if (!rows?.length) {
    return {
      overallScore: 82,
      totalEncounters: 0,
      criticalCases: 0,
      avgRiskScore: 0,
      avgAntibioticDelay: 0,
      sepsisCases: 0,
      pendingActions: 0,
      riskTrend: "stable",
      delayTrend: "stable",
    };
  }
  const n = rows.length;
  const risks = rows.map((r) => Number(r.risk_percent));
  const avgRisk = risks.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / n;
  const delays = rows
    .map((r) => r.tat_door_to_abx_admin_min)
    .filter((v) => v != null && Number.isFinite(Number(v)));
  const avgDelay = delays.length ? delays.reduce((a, b) => a + Number(b), 0) / delays.length : 0;
  const criticalCases = rows.filter(
    (r) => r.risk_level === "Critical" || (Number(r.risk_percent) || 0) >= 70
  ).length;
  const sepsisCases = rows.filter(
    (r) =>
      String(r.highest_sepsis_status || "").includes("Septic") ||
      String(r.highest_sepsis_status || "").includes("Sepsis")
  ).length;
  const pendingActions = rows.reduce((a, r) => a + (Number(r.action_count) || 0), 0);
  const overallScore = Math.max(
    0,
    Math.min(100, Math.round(100 - avgRisk * 0.45 - (avgDelay > 60 ? 12 : 0) - (avgDelay > 90 ? 8 : 0)))
  );
  return {
    overallScore,
    totalEncounters: n,
    criticalCases,
    avgRiskScore: Math.round(avgRisk),
    avgAntibioticDelay: Math.round(avgDelay),
    sepsisCases,
    pendingActions,
    riskTrend: "stable",
    delayTrend: "stable",
  };
}

function riskDistribution(rows) {
  let high = 0;
  let medium = 0;
  let low = 0;
  rows.forEach((r) => {
    const p = Number(r.risk_percent) || 0;
    if (p >= 70) high += 1;
    else if (p >= 40) medium += 1;
    else low += 1;
  });
  const total = rows.length || 1;
  return {
    high,
    medium,
    low,
    pctHigh: (high / total) * 100,
    pctMedium: (medium / total) * 100,
    pctLow: (low / total) * 100,
  };
}

function getTrendIcon(trend) {
  if (trend === "down") return <TrendingUp className="h-4 w-4 rotate-180 text-primary" />;
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-red-500" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function getDelayColor(delay) {
  if (delay == null || !Number.isFinite(Number(delay))) return "text-muted-foreground";
  const d = Number(delay);
  if (d > 60) return "font-bold text-red-500";
  return "text-foreground";
}

/** @param {string} q */
function rowMatchesSearch(r, q) {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  const hay = [
    r.encounter_id,
    fakeNameFromEncounter(r.encounter_id),
    r.hospital_id,
    r.hospital_name,
    r.highest_sepsis_status,
    r.risk_level,
    String(r.risk_percent ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}

function filterRows(rows, search, riskLevel, hospitalId) {
  return rows.filter((r) => {
    if (!rowMatchesSearch(r, search)) return false;
    if (riskLevel !== "all" && String(r.risk_level) !== riskLevel) return false;
    if (hospitalId !== "all" && String(r.hospital_id) !== hospitalId) return false;
    return true;
  });
}

/** @typedef {'risk_desc'|'risk_asc'|'delay_asc'|'delay_desc'|'encounter_asc'|'patient_asc'|'hospital_asc'|'actions_desc'} SortKey */

/** @param {SortKey} sortKey */
function sortRows(rows, sortKey) {
  const out = [...rows];
  const num = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));
  const str = (v) => String(v ?? "").toLowerCase();
  switch (sortKey) {
    case "risk_desc":
      return out.sort((a, b) => (num(b.risk_percent) ?? 0) - (num(a.risk_percent) ?? 0));
    case "risk_asc":
      return out.sort((a, b) => (num(a.risk_percent) ?? 0) - (num(b.risk_percent) ?? 0));
    case "delay_asc":
      return out.sort((a, b) => {
        const da = num(a.tat_door_to_abx_admin_min);
        const db = num(b.tat_door_to_abx_admin_min);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    case "delay_desc":
      return out.sort((a, b) => {
        const da = num(a.tat_door_to_abx_admin_min);
        const db = num(b.tat_door_to_abx_admin_min);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return db - da;
      });
    case "encounter_asc":
      return out.sort((a, b) => str(a.encounter_id).localeCompare(str(b.encounter_id)));
    case "patient_asc":
      return out.sort((a, b) =>
        str(fakeNameFromEncounter(a.encounter_id)).localeCompare(str(fakeNameFromEncounter(b.encounter_id))) ||
        str(a.encounter_id).localeCompare(str(b.encounter_id))
      );
    case "hospital_asc":
      return out.sort((a, b) => {
        const ha = str(a.hospital_name || a.hospital_id);
        const hb = str(b.hospital_name || b.hospital_id);
        return ha.localeCompare(hb) || str(a.encounter_id).localeCompare(str(b.encounter_id));
      });
    case "actions_desc":
      return out.sort((a, b) => (num(b.action_count) ?? 0) - (num(a.action_count) ?? 0));
    default:
      return out;
  }
}

function riskLevelFill(level) {
  switch (level) {
    case "Critical":
      return "#dc2626";
    case "High":
      return "#ea580c";
    case "Moderate":
      return "#ca8a04";
    case "Low":
      return "#2563eb";
    default:
      return "var(--chart-1)";
  }
}

/** Risk % vs door-to-abx delay (each point = one encounter). Histogram fallback if no delay times. */
function RiskCohortChart({ rows }) {
  const scatterData = useMemo(() => {
    return rows
      .map((r) => {
        const raw = r.tat_door_to_abx_admin_min;
        const abxMin = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
        const risk = Math.min(100, Math.max(0, Number(r.risk_percent) || 0));
        if (abxMin == null) return null;
        return {
          abxMin,
          risk,
          encounter_id: r.encounter_id,
          patientName: fakeNameFromEncounter(r.encounter_id),
          hospital: r.hospital_name || r.hospital_id || "-",
          risk_level: r.risk_level || "Moderate",
        };
      })
      .filter(Boolean);
  }, [rows]);

  const histData = useMemo(() => {
    const bands = [
      { label: "0 to 20", lo: 0, hi: 20, last: false },
      { label: "20 to 40", lo: 20, hi: 40, last: false },
      { label: "40 to 60", lo: 40, hi: 60, last: false },
      { label: "60 to 80", lo: 60, hi: 80, last: false },
      { label: "80 to 100", lo: 80, hi: 100, last: true },
    ];
    return bands.map(({ label, lo, hi, last }) => ({
      label,
      count: rows.filter((r) => {
        const p = Number(r.risk_percent) || 0;
        return last ? p >= lo && p <= hi : p >= lo && p < hi;
      }).length,
    }));
  }, [rows]);

  const maxDelay = useMemo(() => {
    if (!scatterData.length) return 120;
    return Math.max(120, ...scatterData.map((d) => d.abxMin)) * 1.05;
  }, [scatterData]);

  if (rows.length === 0) {
    return (
      <div className="chart-shell flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-border/80">
        <p className="text-sm text-muted-foreground">No encounters match current filters.</p>
      </div>
    );
  }

  if (scatterData.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          No door-to-abx times in this cohort. Showing how many encounters fall in each modeled risk band.
        </p>
        <div className="chart-shell min-h-[280px] w-full min-w-0 p-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.6)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--chart-axis)" />
              <YAxis allowDecimals={false} stroke="var(--chart-axis)" tick={{ fontSize: 10 }} width={28} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-foreground">Risk {p.label}%</p>
                      <p className="text-muted-foreground">{p.count} encounter(s)</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Encounters">
                {histData.map((_, i) => (
                  <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="chart-shell min-h-[280px] w-full min-w-0 p-2">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 12, right: 12, left: 8, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.55)" />
            <XAxis
              type="number"
              dataKey="abxMin"
              name="Door-to-abx"
              unit=" min"
              domain={[0, maxDelay]}
              tick={{ fontSize: 10 }}
              stroke="var(--chart-axis)"
              label={{ value: "Door-to-antibiotic (minutes)", position: "bottom", offset: 4, fontSize: 10, fill: "var(--chart-axis)" }}
            />
            <YAxis
              type="number"
              dataKey="risk"
              name="Risk"
              unit="%"
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              stroke="var(--chart-axis)"
              width={40}
              label={{ value: "Modeled risk %", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--chart-axis)" }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="max-w-[14rem] rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-foreground">{p.patientName}</p>
                    <p className="font-mono text-[0.65rem] text-muted-foreground">{p.encounter_id ?? "-"}</p>
                    <p className="truncate text-muted-foreground">{p.hospital}</p>
                    <p className="mt-1 text-foreground">
                      Modeled risk: <span className="font-semibold">{Math.round(p.risk)}%</span> ({p.risk_level})
                    </p>
                    <p className="text-foreground">
                      Door-to-abx: <span className="font-semibold">{Math.round(p.abxMin)} min</span>
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={60} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.85} />
            <ReferenceLine x={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.85} />
            <ReferenceLine y={40} stroke="rgba(148,163,184,0.35)" strokeDasharray="4 4" />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.7} />
            <Scatter name="Encounters" data={scatterData} fill="var(--chart-1)">
              {scatterData.map((e, i) => (
                <Cell key={e.encounter_id ?? i} fill={riskLevelFill(e.risk_level)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[0.65rem] leading-snug text-muted-foreground">
        Vertical lines: 60 / 90 min door-to-abx. Horizontal: 40% / 70% risk.{" "}
        {scatterData.length < rows.length ? (
          <>
            Plotted {scatterData.length} of {rows.length} (rest missing ABX time).
          </>
        ) : (
          <>{scatterData.length} encounter(s).</>
        )}
      </p>
    </div>
  );
}

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground sm:max-w-[220px]";

/**
 * Clinical home / browse — shadcn-style layout integrated with live `/patients` data.
 */
export default function BrowseClinicalHome({ rows = [], criticalEncounterId, onLoadCritical }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [riskLevel, setRiskLevel] = useState("all");
  const [hospitalId, setHospitalId] = useState("all");
  /** @type {[SortKey, function]} */
  const [sortKey, setSortKey] = useState(/** @type {SortKey} */ ("risk_desc"));

  const hospitalOptions = useMemo(() => {
    const set = new Map();
    rows.forEach((r) => {
      const id = r.hospital_id != null ? String(r.hospital_id) : "";
      if (!id) return;
      const label = r.hospital_name || id;
      if (!set.has(id)) set.set(id, label);
    });
    return [...set.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const f = filterRows(rows, search, riskLevel, hospitalId);
    return sortRows(f, sortKey);
  }, [rows, search, riskLevel, hospitalId, sortKey]);

  const metrics = useMemo(() => computeMetrics(filteredSorted), [filteredSorted]);
  const dist = useMemo(() => riskDistribution(filteredSorted), [filteredSorted]);
  const cohortProcessAverages = useMemo(() => averageProcessTimes(filteredSorted), [filteredSorted]);

  const goCritical = () => {
    if (criticalEncounterId) navigate(`/patient/${encodeURIComponent(criticalEncounterId)}`);
    else if (typeof onLoadCritical === "function") onLoadCritical();
  };

  return (
    <HealthShell
      eyebrow="Sepsis Copilot"
      title="Browse"
      subtitle="Encounters and modeled risk summaries across your cohort."
      wide
    >
      <div className="space-y-4">
        <Card className="overflow-hidden border border-border bg-gradient-to-br from-primary/[0.12] via-card to-card py-0 shadow-[var(--card-shadow)]">
          <CardContent className="py-4">
            <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col items-center gap-2 md:items-start">
                <p className="text-sm font-medium text-muted-foreground">Hospital performance score</p>
                <PerformanceGauge value={metrics.overallScore} />
                <p className="max-w-xs text-center text-xs text-muted-foreground md:text-left">
                  Based on cohort risk &amp; door-to-antibiotic times
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" variant="primary" onClick={goCritical}>
                  <Activity className="mr-2 h-4 w-4" />
                  Open highest-risk case
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="border border-border border-l-4 border-l-primary py-0">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <p className="app-metric-value text-card-foreground">{metrics.totalEncounters}</p>
              <p className="text-xs text-muted-foreground">Encounters (filtered)</p>
            </CardContent>
          </Card>

          <Card className="border border-border border-l-4 border-l-red-500 py-0">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <p className="app-metric-value text-red-400">{metrics.criticalCases}</p>
              <p className="text-xs text-muted-foreground">High risk</p>
            </CardContent>
          </Card>

          <Card className="border border-border border-l-4 border-l-amber-500 py-0">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-muted-foreground">Avg risk</p>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <p className="app-metric-value text-card-foreground">{metrics.avgRiskScore || "-"}</p>
                {getTrendIcon(metrics.riskTrend)}
              </div>
              <p className="text-xs text-muted-foreground">Score</p>
            </CardContent>
          </Card>

          <Card className="border border-border border-l-4 border-l-orange-400 py-0">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-400" />
                <p className="text-xs text-muted-foreground">Avg delay</p>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <p
                  className={cn(
                    "app-metric-value",
                    metrics.avgAntibioticDelay > 60 ? "text-red-500" : "text-card-foreground"
                  )}
                >
                  {metrics.avgAntibioticDelay || "-"}
                </p>
                {getTrendIcon(metrics.delayTrend)}
              </div>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </CardContent>
          </Card>

          <Card className="border border-border border-l-4 border-l-orange-300 py-0">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-300" />
                <p className="text-xs text-muted-foreground">Sepsis pathway</p>
              </div>
              <p className="app-metric-value text-card-foreground">{metrics.sepsisCases}</p>
              <p className="text-xs text-muted-foreground">Cases</p>
            </CardContent>
          </Card>

          <Card className="border border-border border-l-4 border-l-orange-600 py-0">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-orange-500" />
                <p className="text-xs text-muted-foreground">Actions</p>
              </div>
              <p className="app-metric-value text-card-foreground">{metrics.pendingActions}</p>
              <p className="text-xs text-muted-foreground">Total suggested</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <Card className="border-border">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Active Encounters</CardTitle>
                    <CardDescription className="text-xs">
                      Search, filter, and sort, then open an encounter
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled title="Export not wired yet">
                    <FileText className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Search className="h-3.5 w-3.5" />
                      Search
                    </label>
                    <input
                      type="search"
                      className="health-input h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                      placeholder="Name, encounter, hospital, status…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Risk level</label>
                      <select
                        className={selectClass}
                        value={riskLevel}
                        onChange={(e) => setRiskLevel(e.target.value)}
                      >
                        <option value="all">All levels</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Hospital</label>
                      <select
                        className={selectClass}
                        value={hospitalId}
                        onChange={(e) => setHospitalId(e.target.value)}
                      >
                        <option value="all">All hospitals</option>
                        {hospitalOptions.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        Sort
                      </label>
                      <select
                        className={selectClass}
                        value={sortKey}
                        onChange={(e) => setSortKey(/** @type {SortKey} */ (e.target.value))}
                      >
                        <option value="risk_desc">Risk (high → low)</option>
                        <option value="risk_asc">Risk (low → high)</option>
                        <option value="delay_asc">ABX delay (fastest first)</option>
                        <option value="delay_desc">ABX delay (slowest first)</option>
                        <option value="encounter_asc">Encounter ID (A to Z)</option>
                        <option value="patient_asc">Patient name (A to Z)</option>
                        <option value="hospital_asc">Hospital (A to Z)</option>
                        <option value="actions_desc">Suggested actions (most)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                          Encounter
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                          Hospital
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                          ABX delay
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Risk</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSorted.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            {rows.length === 0 ? "No patients loaded." : "No encounters match your filters."}
                          </td>
                        </tr>
                      ) : (
                        filteredSorted.map((r) => {
                          const delay = r.tat_door_to_abx_admin_min;
                          return (
                            <tr
                              key={r.encounter_id}
                              className="cursor-pointer border-t border-border hover:bg-muted/50"
                              onClick={() => navigate(`/patient/${encodeURIComponent(r.encounter_id)}`)}
                            >
                              <td className="px-4 py-3">
                                <Link
                                  className="font-mono text-sm font-medium text-primary hover:underline"
                                  to={`/patient/${encodeURIComponent(r.encounter_id)}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {r.encounter_id}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {fakeNameFromEncounter(r.encounter_id)}
                              </td>
                              <td className="max-w-[10rem] truncate px-4 py-3 text-xs text-muted-foreground" title={r.hospital_name || r.hospital_id}>
                                {r.hospital_name || r.hospital_id}
                              </td>
                              <td className="px-4 py-3 text-xs text-foreground">{r.highest_sepsis_status}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={cn("text-sm", getDelayColor(delay ?? 0))}>
                                  {delay ?? "-"}
                                  {delay != null ? " min" : ""}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <RiskBadge level={r.risk_level} percent={r.risk_percent} />
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-foreground">{r.action_count}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Risk vs Door-To-Antibiotics</CardTitle>
                <CardDescription className="text-xs">
                  Each point is one encounter: modeled mortality risk (Y) vs minutes from arrival to first antibiotic (X).
                  Color follows risk level. If no ABX times are available, a risk-band histogram is shown instead.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RiskCohortChart rows={filteredSorted} />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription className="text-xs">By modeled risk percent (filtered list)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">High (70 to 100)</span>
                    <span className="text-sm font-semibold text-red-500">{dist.high}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${dist.pctHigh}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Medium (40 to 69)</span>
                    <span className="text-sm font-semibold text-amber-500">{dist.medium}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${dist.pctMedium}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Low (0 to 39)</span>
                    <span className="text-sm font-semibold text-primary">{dist.low}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${dist.pctLow}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <CardTitle>Cohort Process Averages</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Mean minutes for each pathway step on the current filtered list. Averages use only encounters with a time for that step (n).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No encounters to aggregate.</p>
                ) : (
                  <ScrollArea className="h-[min(420px,60vh)]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-2 pr-2 font-medium">Process</th>
                          <th className="pb-2 text-right font-medium">Mean</th>
                          <th className="pb-2 pl-2 text-right font-medium">n</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohortProcessAverages.map((row) => (
                          <tr key={row.key} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pr-2 align-top leading-snug text-foreground">{row.label}</td>
                            <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums text-foreground">
                              {formatMinutes(row.avgMinutes)}
                            </td>
                            <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-muted-foreground">
                              {row.n}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Session History</CardTitle>
                <CardDescription className="text-xs">Recently viewed &amp; saved cases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <RecentlyViewed embedded />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </HealthShell>
  );
}
