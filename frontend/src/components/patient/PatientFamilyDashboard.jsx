import React from "react";
import { Activity, Info, Shield, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { cn } from "@/lib/utils";
import { getTimelineIcon } from "@/components/encounter/EncounterDashboardViews.jsx";
import { RiskGaugeCard } from "@/components/encounter/RiskGaugeCard.jsx";
import { EncounterPageHeader } from "@/components/encounter/EncounterPageHeader.jsx";
import VitalsChart from "@/components/VitalsChart.jsx";
import VitalsChartInsight from "@/components/patient/VitalsChartInsight.jsx";
import AudioPlayer from "@/components/AudioPlayer.jsx";
import { PatientAnsweredQuestionsCard, PatientAskTeamCard } from "@/components/patient/PatientTeamQuestions.jsx";
import SolanaLog from "@/components/SolanaLog.jsx";
import { RISK_MODEL_PATIENT_SUMMARY } from "@/lib/encounterDashboardData.js";

function vitalLabelPatient(label) {
  if (/spo/i.test(label)) return "Oxygen level";
  return label;
}

function patientAttentionLabel(level) {
  switch (level) {
    case "Low":
      return "Doing well";
    case "Moderate":
      return "Watch closely";
    case "High":
      return "Attention";
    case "Critical":
      return "High attention";
    default:
      return "Monitoring";
  }
}

/**
 * Patient & family encounter view — layout aligned with the bundled PatientFacingView spec,
 * fed by {@link buildEncounterDashboardData} and live patient row fields.
 */
export default function PatientFamilyDashboard({
  data,
  patient,
  encounterId,
  onPlayNarration,
  loadingAudio,
  audio,
  audioErrorText,
}) {
  const vitalsShow = (data.vitals || []).slice(0, 4);
  const timelineEvents = data.timeline || [];
  const comorbidities = data.comorbidityBadges || [];
  const actions = data.recommendedActions || [];
  const nextA = actions[0];
  const nextB = actions[1];

  const admissionForCard = data.admissionDate || "-";
  let admissionLong = admissionForCard;
  try {
    const d = new Date(patient?.ed_arrival_ts || data.admissionDate);
    if (!Number.isNaN(d.getTime())) {
      admissionLong = d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  } catch {
    /* keep string */
  }

  const chiefLower = (data.chiefComplaint || "your care").toLowerCase();

  return (
    <div className="app-page font-sans [&_.app-card-heading]:font-sans [&_.app-metric-value]:font-sans [&_.font-display]:font-sans">
      <EncounterPageHeader data={data} />

      <div className="app-encounter-body pb-10">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
          <div className="flex flex-col gap-3 lg:col-span-3">
            <RiskGaugeCard
              title="How You&apos;re Doing"
              riskLevel={data?.riskLevel}
              riskScore={data?.riskScore}
              underScoreCaption={patientAttentionLabel(data.riskLevel)}
            >
              <div className="mt-4 w-full border-t border-border pt-4 text-left">
                <p className="text-xs font-medium text-foreground">What This Number Means</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {data.riskModelExplanationPatient ?? RISK_MODEL_PATIENT_SUMMARY}
                </p>
              </div>
            </RiskGaugeCard>

            {comorbidities.length > 0 ? (
              <Card className="gap-0 border-border py-0">
                <CardHeader className="pb-3 pt-6">
                  <CardTitle>Health Background</CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <ScrollArea className="h-[min(180px,35vh)]">
                    <div className="space-y-2 pr-3">
                      {comorbidities.map((c) => (
                        <div
                          key={c}
                          className="app-surface-inset px-3 py-2 text-sm capitalize text-foreground"
                        >
                          {c.replace(/_/g, " ")}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : null}

            <Card className="gap-0 border-border py-0">
              <CardHeader className="pb-3 pt-6">
                <CardTitle>Your Care Record</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Access to this summary is logged for transparency. See below for details.
                  </p>
                </div>
                <div className="mt-3 min-w-0">
                  <SolanaLog encounterId={encounterId} embedded />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-6">
            <Card className="gap-0 border-border py-0">
              <CardHeader className="pb-3 pt-6">
                <CardTitle>Timeline</CardTitle>
                <p className="text-xs text-muted-foreground">Key moments from this hospital stay.</p>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3">
                  {timelineEvents.map((event, idx) => {
                    const raw = `${event.title} ${event.description || ""}`.toLowerCase();
                    const borderAccent = raw.includes("shock")
                      ? "border-t-red-500"
                      : raw.includes("severe")
                        ? "border-t-amber-500"
                        : "border-t-primary/70";
                    return (
                      <div
                        key={`${event.time}-${idx}`}
                        className={`app-surface-inset flex min-w-0 max-w-full flex-col overflow-hidden ${borderAccent} border-t-[3px]`}
                      >
                        <div className="flex items-center justify-between gap-1 border-b border-border/50 px-2 py-1.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                            {getTimelineIcon(event.type)}
                          </div>
                          <span className="min-w-0 truncate text-xs text-muted-foreground">{event.time}</span>
                        </div>
                        <div className="min-h-[3.5rem] px-2 py-1.5">
                          <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{event.title}</p>
                          <p className="mt-0.5 line-clamp-4 text-xs leading-snug text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {timelineEvents.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No timeline events for this stay yet.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="gap-0 border-border py-0">
              <CardHeader className="pb-3 pt-6">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <CardTitle>What&apos;s Happening</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-6">
                <ScrollArea className="h-[7rem]">
                  <div className="space-y-3 pr-3">
                    <p className="text-sm leading-relaxed text-foreground">
                      Your care team is tracking {chiefLower}. We&apos;re monitoring your heart, breathing, and labs to keep
                      you safe and comfortable.
                    </p>
                    <p className="text-xs text-muted-foreground">Admitted: {admissionLong}</p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="gap-0 border-border py-0">
              <CardHeader className="pb-3 pt-6">
                <CardTitle>Your Vital Signs</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="app-surface-inset overflow-hidden">
                  {vitalsShow.map((vital, idx) => (
                    <React.Fragment key={`${vital.label}-${idx}`}>
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{vitalLabelPatient(vital.label)}</p>
                          <p className="text-xs text-muted-foreground">{vital.timestamp}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">{vital.value}</p>
                            <p className="text-xs text-muted-foreground">{vital.unit}</p>
                          </div>
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              vital.status === "critical"
                                ? "bg-red-500"
                                : vital.status === "warning"
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                            )}
                          />
                        </div>
                      </div>
                      {idx < vitalsShow.length - 1 ? <Separator className="ml-4" /> : null}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 border-border py-0">
              <CardHeader className="pb-3 pt-6">
                <CardTitle>How Things Are Changing</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="min-h-[220px] min-w-0">
                  <VitalsChart patient={patient} embedded />
                </div>
              </CardContent>
            </Card>

            <VitalsChartInsight encounterId={encounterId} />
          </div>

          <div className="flex flex-col gap-3 lg:col-span-3">
            <Card className="gap-0 border-border py-0">
              <CardHeader className="pb-3 pt-6">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <CardTitle>Your Narrated Update</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-6">
                <p className="text-xs text-muted-foreground">Hear a clear summary of what your care team is seeing.</p>
                <Button type="button" variant="primary" className="w-full" onClick={onPlayNarration} disabled={loadingAudio}>
                  {loadingAudio ? "…" : "Play narrated update"}
                </Button>
                {loadingAudio ? (
                  <p className="text-xs text-muted-foreground">Preparing your narrated update&hellip;</p>
                ) : null}
                {audio?.error ? (
                  <ScrollArea className="h-[4.5rem]">
                    <p className="pr-3 text-sm text-destructive">Audio unavailable: {audioErrorText(audio.error)}</p>
                  </ScrollArea>
                ) : null}
                {audio && !audio.error && audio.audio_url ? (
                  <AudioPlayer
                    audioUrl={audio.audio_url}
                    wordTimestamps={audio.word_timestamps}
                    narrationText={audio.narration_text}
                    generationTimeMs={audio.generation_time_ms}
                    voiceMode={audio.voice_mode}
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card className="gap-0 border-border py-0">
              <CardHeader className="pb-3 pt-6">
                <CardTitle>What Happens Next</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <ScrollArea className="h-[9rem]">
                  <div className="space-y-3 pr-3">
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Activity className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{nextA?.action || "Continue monitoring"}</p>
                        <p className="text-xs text-muted-foreground">
                          {nextA?.rationale || "Your team will keep checking vitals and labs on a regular schedule."}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Shield className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{nextB?.action || "Care team nearby"}</p>
                        <p className="text-xs text-muted-foreground">
                          {nextB?.rationale || "Ask us any time if something doesn’t feel right."}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div id="patient-chat-section" className="w-full scroll-mt-24 space-y-3">
              <PatientAskTeamCard encounterId={encounterId} />
              <PatientAnsweredQuestionsCard encounterId={encounterId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
