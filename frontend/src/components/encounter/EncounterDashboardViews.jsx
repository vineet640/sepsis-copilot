import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { Activity, AlertCircle, Bell, ChevronRight, Clock, FileText, Pill, Stethoscope, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/careTrackProcesses.js";
import { EncounterPageHeader } from "@/components/encounter/EncounterPageHeader.jsx";
import { RiskGaugeCard } from "@/components/encounter/RiskGaugeCard.jsx";
import { riskLevelGlow, riskVisual } from "@/lib/riskVisual.js";

export { riskLevelGlow, riskVisual };

export function getTimelineIcon(type) {
  switch (type) {
    case "medication":
      return <Pill className="h-4 w-4" />;
    case "vital":
      return <Activity className="h-4 w-4" />;
    case "procedure":
      return <Stethoscope className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function patientInitials(name, encounterId) {
  if (!name || typeof name !== "string" || name.trim().toLowerCase() === "undefined") return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0]?.[0] && parts[1]?.[0]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase().slice(0, 2);
  }
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (encounterId || "P").toString().replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "P";
}

export function ClinicianEncounterDashboard({
  data,
  timelineReplaySlot = null,
  vitalTrendsSlot = null,
  aiInsightsSlot = null,
  leftFooterSlot = null,
  middleExtrasSlot = null,
  rightExtrasSlot = null,
}) {
  return (
    <div className="app-page">
      <EncounterPageHeader data={data} />

      <div className="app-encounter-body">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
          <div className="flex min-h-0 flex-col gap-3 lg:col-span-3">
            <RiskGaugeCard
              id="dash-panel-risk"
              title="Risk Assessment"
              riskLevel={data?.riskLevel}
              riskScore={data?.riskScore}
              underScoreCaption="Risk Score"
            >
              {data.riskModelExplanation ? (
                <div className="mt-4 w-full border-t border-border pt-4 text-left">
                  <p className="text-xs font-medium text-foreground">How This Score Is Modeled</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{data.riskModelExplanation}</p>
                  {data.riskDriversClinician?.length ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-foreground">Drivers For This Patient</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-snug text-muted-foreground">
                        {data.riskDriversClinician.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </RiskGaugeCard>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle>Organ Dysfunction (TP4)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {(data.organDysfunction || []).map((o) => (
                    <div
                      key={o.name}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-center text-xs font-medium",
                        o.on
                          ? "border-red-500/50 bg-red-500/10 text-foreground"
                          : "border-green-500/40 bg-green-500/10 text-foreground"
                      )}
                    >
                      {o.name}: {o.on ? "Yes" : "No"}
                    </div>
                  ))}
                </div>
                {(!data.organDysfunction || data.organDysfunction.length === 0) && (
                  <p className="text-sm text-muted-foreground">No organ dysfunction fields for this encounter.</p>
                )}
              </CardContent>
            </Card>

            {data.processTrackSteps?.length ? (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <CardTitle>Care Track Timing</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minutes for each modeled process on this encounter (from arrival / recognition milestones).
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[min(380px,58vh)]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-2 pr-2 font-medium">Process</th>
                          <th className="pb-2 text-right font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.processTrackSteps.map((step) => (
                          <tr key={step.key} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pr-2 align-top leading-snug text-foreground">{step.label}</td>
                            <td className="whitespace-nowrap py-2 text-right font-mono tabular-nums text-foreground">
                              {formatMinutes(step.minutes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : null}

            {leftFooterSlot ? <div className="flex shrink-0 flex-col gap-3">{leftFooterSlot}</div> : null}
          </div>

          <div className="flex min-h-0 flex-col gap-3 lg:col-span-6">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle>Patient Timeline</CardTitle>
                <p className="text-xs text-muted-foreground">Key clinical moments for this encounter.</p>
              </CardHeader>
              <CardContent className="px-3 sm:px-4">
                {!data.timeline?.length ? (
                  <p className="text-sm text-muted-foreground">No timeline events for this encounter.</p>
                ) : null}
                {data.timeline?.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3">
                    {data.timeline.map((event, idx) => {
                      const raw = `${event.title} ${event.description || ""}`.toLowerCase();
                      const borderAccent = raw.includes("shock")
                        ? "border-t-red-500"
                        : raw.includes("severe")
                          ? "border-t-amber-500"
                          : "border-t-primary/70";
                      return (
                        <div
                          key={idx}
                          className={`flex min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-border bg-card/50 ${borderAccent} border-t-[3px] shadow-sm`}
                        >
                          <div className="flex items-center justify-between gap-1 border-b border-border/60 px-2.5 py-1.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                              {getTimelineIcon(event.type)}
                            </div>
                            <span className="min-w-0 truncate text-xs text-muted-foreground">{event.time}</span>
                          </div>
                          <div className="flex min-h-[4rem] flex-1 flex-col px-2.5 py-2">
                            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{event.title}</p>
                            <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {timelineReplaySlot ? (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle>Timeline Replay</CardTitle>
                  <p className="text-xs text-muted-foreground">Step through modeled timepoints TP1 to TP4.</p>
                </CardHeader>
                <CardContent className="min-w-0">{timelineReplaySlot}</CardContent>
              </Card>
            ) : null}

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle>Vital Signs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-border">
                  {data.vitals.map((vital, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{vital.label}</p>
                          <p className="text-xs text-muted-foreground">{vital.timestamp}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">{vital.value}</p>
                            <p className="text-xs text-muted-foreground">{vital.unit}</p>
                          </div>
                          <div
                            className={`h-2 w-2 rounded-full ${
                              vital.status === "critical"
                                ? "bg-red-500"
                                : vital.status === "warning"
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                            }`}
                          />
                        </div>
                      </div>
                      {idx < data.vitals.length - 1 && <Separator className="ml-4" />}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle>Vital Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vitalTrendsSlot ? (
                  <div className="min-h-[200px] min-w-0">{vitalTrendsSlot}</div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border">
                    <div className="text-center">
                      <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Chart visualization</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {middleExtrasSlot ? <div className="flex shrink-0 flex-col gap-3">{middleExtrasSlot}</div> : null}
          </div>

          <div className="flex min-h-0 flex-col gap-3 lg:col-span-3">
            {aiInsightsSlot ? (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <CardTitle>AI Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>{aiInsightsSlot}</CardContent>
              </Card>
            ) : null}

            {rightExtrasSlot ? <div className="flex shrink-0 flex-col gap-3">{rightExtrasSlot}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompactPatientJourney({ data }) {
  const rv = riskVisual(data?.riskLevel);
  const riskDisplay = data.riskScore != null ? `${data.riskScore}%` : "-";

  return (
    <div className="app-page">
      <div className="app-sticky-subheader z-40">
        <div className="app-content-width flex h-14 items-center justify-between">
          <h1 className="app-card-heading">Patient Journey</h1>
          <Button variant="ghost" size="icon" type="button" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="app-encounter-body space-y-4 pb-12">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{patientInitials(data.patientName, data.encounterId)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {data.patientName}
                </h2>
                <p className="app-meta-line">
                  {data.patientDemographics ?? data.patientAge} • {data.patientMRN}
                </p>
                <Badge variant="outline" className="mt-2 font-mono text-xs">
                  {data.encounterId}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-border bg-gradient-to-br ${
            data.riskLevel === "Low"
              ? "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
              : "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Risk Score</p>
                <p className={`app-metric-value mt-1 ${rv.text}`}>{riskDisplay}</p>
              </div>
              <AlertCircle className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Chief Presentation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{data.chiefComplaint}</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Latest Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {data.vitals.slice(0, 4).map((vital, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{vital.label}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{vital.value}</p>
                  <p className="text-xs text-muted-foreground">{vital.unit}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Organ Dysfunction (TP4)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(data.organDysfunction || []).map((o, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={o.on ? "border-red-300 bg-red-50 text-red-800 dark:bg-red-950" : "border-green-300 bg-green-50 text-green-800 dark:bg-green-950"}
                >
                  {o.name}: {o.on ? "Yes" : "No"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button className="h-auto flex-col gap-2 py-4" type="button">
            <TrendingUp className="h-6 w-6" />
            <span className="text-sm">View Trends</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" type="button">
            <Activity className="h-6 w-6" />
            <span className="text-sm">Compare Data</span>
          </Button>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Care Team Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">DN</AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-foreground">Dr. Nguyen</p>
                  <p className="mt-1 text-sm text-foreground">Patient stable, continue monitoring vitals q15min</p>
                  <p className="mt-1 text-xs text-muted-foreground">10:30 AM</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">RN</AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-foreground">Nurse Roberts</p>
                  <p className="mt-1 text-sm text-foreground">Acknowledged. Next vitals at 11:00 AM</p>
                  <p className="mt-1 text-xs text-muted-foreground">10:32 AM</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button size="icon" type="button">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
