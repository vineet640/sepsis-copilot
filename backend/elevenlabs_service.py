"""ElevenLabs TTS; audio served from API memory; word-level timestamps for subtitle sync (approximate)."""
from __future__ import annotations

import os
import re
import time
from typing import Any

from audio_storage import upload_audio

# Premade voice IDs (see ElevenLabs "Premade voices" / GET /v1/voices). Library-only IDs
# return 402 on free API tier; Rachel (21m00Tcm4TlvDq8ikWAM) is often treated as library for API.
VOICE_CALM_ID = os.getenv("ELEVENLABS_VOICE_CALM", "Xb7hH8MSUJpSbSDYk0k2")  # Alice (premade)
VOICE_URGENT_ID = os.getenv("ELEVENLABS_VOICE_URGENT", "ErXwobaYiN019PkySvjV")  # Antoni (premade)


def _normalize_tts_error(exc: Exception) -> str:
    """Readable message; avoid dumping huge HTTP bodies or httpx header blobs into JSON."""
    s = str(exc)
    # httpx / requests often stringify Response headers — useless in UI
    if "headers:" in s and ("date" in s.lower() or "server" in s.lower()):
        if "402" in s or "payment" in s.lower() or "quota" in s.lower():
            return "ElevenLabs: payment or quota issue — check your API plan."
        if "401" in s or "403" in s or "Unauthorized" in s:
            return "ElevenLabs: invalid or unauthorized API key."
        return "ElevenLabs request failed (network or API error). Check ELEVENLABS_API_KEY and try again."
    if "paid_plan_required" in s or "payment_required" in s or "Free users cannot use library voices" in s:
        return (
            "ElevenLabs: this voice is not allowed on the free API tier (often Voice Library / non-premade voices). "
            "Use premade voice IDs (see ElevenLabs docs) or set ELEVENLABS_VOICE_CALM and ELEVENLABS_VOICE_URGENT "
            "to voices from GET /v1/voices, or upgrade."
        )
    if len(s) > 200:
        return s[:160] + "…"
    return s


def narration_word_timestamps(text: str, duration_ms: int) -> list[dict[str, Any]]:
    """Exported for fallback responses outside this module."""
    return _word_timestamps(text, duration_ms)


def _word_timestamps(text: str, duration_ms: int) -> list[dict[str, Any]]:
    words = re.findall(r"\S+", text)
    if not words:
        return []
    per = duration_ms / len(words)
    out = []
    t = 0
    for w in words:
        out.append({"word": w, "start_ms": int(t), "end_ms": int(t + per)})
        t += per
    return out


async def generate_audio(
    text: str,
    encounter_id: str,
    voice_mode: str = "calm",
    speed: float = 1.0,
    explanation_mode: str = "patient",
) -> dict[str, Any]:
    t0 = time.time()
    voice_id = VOICE_CALM_ID if voice_mode == "calm" else VOICE_URGENT_ID
    safe_em = re.sub(r"[^a-z0-9_-]", "", (explanation_mode or "patient").lower())[:24] or "patient"
    key = f"audio/{encounter_id}_{voice_mode}_{safe_em}.mp3"

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        duration_ms = max(3000, len(text) * 60)
        return {
            "audio_url": "",
            "duration_ms": duration_ms,
            "voice_mode": voice_mode,
            "generation_time_ms": 0,
            "cached": False,
            "narration_text": text,
            "word_timestamps": _word_timestamps(text, duration_ms),
            "speech_available": False,
            "speech_notice": "Spoken audio needs ELEVENLABS_API_KEY on the server. You can still read the text below.",
        }

    try:
        from elevenlabs.client import ElevenLabs

        client = ElevenLabs(api_key=api_key)
        start = time.time()
        audio_iter = client.text_to_speech.convert(
            voice_id,
            text=text,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(audio_iter) if not isinstance(audio_iter, (bytes, bytearray)) else bytes(audio_iter)
        generation_time_ms = int((time.time() - start) * 1000)
        up = upload_audio(audio_bytes, key)
        duration_ms = max(3000, len(text) * 60)
        return {
            "audio_url": up["url"],
            "duration_ms": duration_ms,
            "voice_mode": voice_mode,
            "generation_time_ms": generation_time_ms,
            "upload_time_ms": up.get("upload_time_ms", 0),
            "cached": False,
            "narration_text": text,
            "word_timestamps": _word_timestamps(text, duration_ms),
            "speech_available": True,
        }
    except Exception as e:
        duration_ms = max(3000, len(text) * 60)
        return {
            "audio_url": "",
            "duration_ms": duration_ms,
            "voice_mode": voice_mode,
            "generation_time_ms": int((time.time() - t0) * 1000),
            "cached": False,
            "narration_text": text,
            "word_timestamps": _word_timestamps(text, duration_ms),
            "speech_available": False,
            "speech_notice": _normalize_tts_error(e),
        }
