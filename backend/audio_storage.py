"""In-memory storage for generated MP3; served via the API at /static/audio/<key>."""
from __future__ import annotations

import time
from typing import Any

_LOCAL: dict[str, bytes] = {}


def upload_audio(audio_bytes: bytes, key: str) -> dict[str, Any]:
    """Store MP3 bytes in memory; return API-relative URL."""
    t0 = time.time()
    _LOCAL[key] = audio_bytes
    upload_ms = int((time.time() - t0) * 1000)
    return {
        "url": f"/static/audio/{key}",
        "upload_time_ms": upload_ms,
        "local": True,
    }


def get_local_audio(key: str) -> bytes | None:
    return _LOCAL.get(key)
