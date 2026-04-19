"""ElevenLabs TTS + S3; word-level timestamps for subtitle sync (approximate)."""
from __future__ import annotations

import os
import re
import time
from typing import Any

from s3_service import upload_audio

# Premade voice IDs (see ElevenLabs "Premade voices" / GET /v1/voices). Library-only IDs
# return 402 on free API tier; Rachel (21m00Tcm4TlvDq8ikWAM) is often treated as library for API.
VOICE_CALM_ID = os.getenv("ELEVENLABS_VOICE_CALM", "Xb7hH8MSUJpSbSDYk0k2")  # Alice (premade)
VOICE_URGENT_ID = os.getenv("ELEVENLABS_VOICE_URGENT", "ErXwobaYiN019PkySvjV")  # Antoni (premade)


def _normalize_tts_error(exc: Exception) -> str:
    """Readable message; avoid dumping huge HTTP bodies into JSON."""
    s = str(exc)
    if "paid_plan_required" in s or "payment_required" in s or "Free users cannot use library voices" in s:
        return (
            "ElevenLabs: this voice is not allowed on the free API tier (often Voice Library / non-premade voices). "
            "Use premade voice IDs (see ElevenLabs docs) or set ELEVENLABS_VOICE_CALM and ELEVENLABS_VOICE_URGENT "
            "to voices from GET /v1/voices, or upgrade."
        )
    if len(s) > 400:
        return s[:200] + "…"
    return s


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
        return {
            "audio_url": "",
            "duration_ms": 0,
            "voice_mode": voice_mode,
            "generation_time_ms": 0,
            "cached": False,
            "narration_text": text,
            "word_timestamps": _word_timestamps(text, 3000),
            "error": "no_api_key",
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
        }
    except Exception as e:
        return {
            "audio_url": "",
            "duration_ms": 0,
            "voice_mode": voice_mode,
            "generation_time_ms": int((time.time() - t0) * 1000),
            "cached": False,
            "narration_text": text,
            "word_timestamps": _word_timestamps(text, 3000),
            "error": _normalize_tts_error(e),
        }
