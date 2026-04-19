import React, { useEffect, useLayoutEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api.js";
import { useMode } from "../context/ModeContext.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import TimelineReplay from "../components/TimelineReplay.jsx";
import VitalsChart from "../components/VitalsChart.jsx";
import AudioPlayer from "../components/AudioPlayer.jsx";
import ActionCard from "../components/ActionCard.jsx";
import ClinicianPatientQuestionsPanel from "../components/ClinicianPatientQuestionsPanel.jsx";
import RecentlyViewed, { SaveCaseButton } from "../components/RecentlyViewed.jsx";
import SolanaLog from "../components/SolanaLog.jsx";
import PatientFamilyDashboard from "../components/patient/PatientFamilyDashboard.jsx";
import { ClinicianEncounterDashboard } from "@/components/encounter/EncounterDashboardViews.jsx";
import { DashboardPanelCard } from "@/components/encounter/DashboardPanelCard.jsx";
import { buildEncounterDashboardData } from "@/lib/encounterDashboardData.js";
import { Button } from "@/components/ui/button.jsx";

function sessionId() {
  let s = localStorage.getItem("sepsis_session_id");
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem("sepsis_session_id", s);
  }
  return s;
}

function audioErrorText(err) {
  if (!err) return "";
  const s = String(err);
  return s.length > 500 ? `${s.slice(0, 500)}…` : s;
}

export default function PatientDashboard() {
  const { encounterId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const { isPatientMode, setMode } = useMode();
  const effectivePatientMode = auth.role === "patient" || isPatientMode;
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [audio, setAudio] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  useLayoutEffect(() => {
    if (auth.role === "clinical") {
      setMode("clinician");
    }
  }, [encounterId, auth.role, setMode]);

  useEffect(() => {
    if (auth.role === "patient" && auth.patientEncounterId && encounterId !== auth.patientEncounterId) {
      navigate(`/patient/${encodeURIComponent(auth.patientEncounterId)}`, { replace: true });
    }
  }, [auth.role, auth.patientEncounterId, encounterId, navigate]);

  useEffect(() => {
    const sid = sessionId();
    setErr("");
    apiGet(
      `/patient/${encodeURIComponent(encounterId)}?mode=${effectivePatientMode ? "patient" : "clinician"}&session_id=${encodeURIComponent(sid)}`
    )
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  }, [encounterId, effectivePatientMode]);

  useEffect(() => {
    setAudio(null);
    setLoadingAudio(false);
  }, [effectivePatientMode]);

  const patient = data?.patient;
  const risk = data?.risk;
  const actions = data?.actions;
  const timelineRisks = data?.timeline_risks;
  const apiTimeline = data?.timeline;

  const encounterData = patient
    ? buildEncounterDashboardData({
        patient,
        risk: risk || {},
        actions: actions || [],
        timeline: apiTimeline || [],
        timelineRisks: timelineRisks || [],
      })
    : null;

  const playPatientNarration = async () => {
    setLoadingAudio(true);
    setAudio(null);
    try {
      const explanation_mode = effectivePatientMode ? "patient" : "clinician";
      const a = await apiPost(`/narrate/${encodeURIComponent(encounterId)}`, {
        voice_mode: "calm",
        speed: 1,
        explanation_mode,
      });
      setAudio(a);
    } catch (e) {
      setAudio({ error: String(e.message) });
    } finally {
      setLoadingAudio(false);
    }
  };

  if (err) {
    return <p className="app-content-width py-8 text-sm text-destructive">{err}</p>;
  }
  if (!patient) {
    return <p className="app-content-width py-8 text-sm text-muted-foreground">Loading...</p>;
  }

  if (effectivePatientMode) {
    return (
      <PatientFamilyDashboard
        data={encounterData}
        patient={patient}
        encounterId={encounterId}
        onPlayNarration={playPatientNarration}
        loadingAudio={loadingAudio}
        audio={audio}
        audioErrorText={audioErrorText}
      />
    );
  }

  return (
    <ClinicianEncounterDashboard
      data={encounterData}
      timelineReplaySlot={<TimelineReplay patient={patient} timelineRisks={timelineRisks} embedded />}
      vitalTrendsSlot={<VitalsChart patient={patient} embedded />}
      leftFooterSlot={
        <>
          <SolanaLog encounterId={encounterId} />
          <div className="px-1 pt-1">
            <SaveCaseButton encounterId={encounterId} />
          </div>
        </>
      }
      rightExtrasSlot={
        <>
          <DashboardPanelCard
            title="Clinical narration"
            description="Generate a spoken summary of this encounter. The transcript appears below when ready."
          >
            <Button type="button" variant="primary" onClick={playPatientNarration} disabled={loadingAudio}>
              Generate narration
            </Button>
            {loadingAudio && (
              <p className="mt-2 text-xs text-muted-foreground">
                Preparing spoken summary and audio&hellip;
              </p>
            )}
            {audio && !audio.error && audio.audio_url ? (
              <div className="mt-4">
                <AudioPlayer
                  embedded
                  audioUrl={audio.audio_url}
                  wordTimestamps={audio.word_timestamps}
                  narrationText={audio.narration_text}
                  generationTimeMs={audio.generation_time_ms}
                  voiceMode={audio.voice_mode}
                />
              </div>
            ) : null}
            {audio?.error ? (
              <p className="mt-3 text-sm leading-normal text-destructive">Audio unavailable: {audioErrorText(audio.error)}</p>
            ) : null}
          </DashboardPanelCard>

          <div id="dash-panel-actions" className="scroll-mt-24 space-y-4">
            <ActionCard actions={encounterData?.recommendedActions} />
          </div>
          <ClinicianPatientQuestionsPanel encounterId={encounterId} />
          <RecentlyViewed />
        </>
      }
    />
  );
}
