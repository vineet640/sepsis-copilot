import React, { useEffect, useMemo, useRef } from "react";
import { API_BASE } from "../api.js";

function buildTranscript(wordTimestamps, narrationText) {
  if (narrationText && String(narrationText).trim()) return String(narrationText).trim();
  if (!wordTimestamps?.length) return "";
  return wordTimestamps.map((w) => w.word).join(" ");
}

/**
 * Narration playback with transcript and ElevenLabs attribution.
 * Autoplays when a new source URL is ready (browser may still block without user gesture).
 */
export default function AudioPlayer({
  audioUrl,
  wordTimestamps = [],
  narrationText,
  generationTimeMs = 0,
  voiceMode = "calm",
  embedded = false,
}) {
  const ref = useRef(null);

  const src =
    audioUrl && audioUrl.startsWith("http")
      ? audioUrl
      : audioUrl
        ? `${API_BASE}${audioUrl}`
        : "";

  const transcript = useMemo(
    () => buildTranscript(wordTimestamps, narrationText),
    [wordTimestamps, narrationText]
  );

  useEffect(() => {
    const a = ref.current;
    if (!a || !src) return;
    const onReady = () => {
      a.play().catch(() => {});
    };
    if (a.readyState >= 2) onReady();
    else a.addEventListener("canplay", onReady, { once: true });
    return () => {
      a.removeEventListener("canplay", onReady);
    };
  }, [src]);

  if (!src) {
    return (
      <div className={embedded ? "text-sm text-muted-foreground" : "card"}>
        <p className="text-muted-foreground">
          Audio is not available. Add ElevenLabs and cloud storage keys on the server to enable narration.
        </p>
      </div>
    );
  }

  const modeLabel = voiceMode === "calm" ? "Calm narration" : "Clinical brief";

  return (
    <div className={embedded ? "space-y-3 text-left" : "card"} style={{ textAlign: embedded ? "left" : "left" }}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="risk-badge risk-mod">{modeLabel}</span>
        {generationTimeMs ? <span>Ready in {generationTimeMs} ms</span> : null}
      </div>
      {transcript ? (
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">Transcript</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{transcript}</p>
        </div>
      ) : null}
      <audio ref={ref} src={src} controls className="w-full max-w-lg" />
      <p className="text-xs font-normal text-muted-foreground/80">Powered by ElevenLabs</p>
    </div>
  );
}
