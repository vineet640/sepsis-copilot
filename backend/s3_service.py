"""AWS S3 upload for generated audio."""
from __future__ import annotations

import os
import time
from typing import Any

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None  # type: ignore

_BUCKET = os.getenv("S3_BUCKET_NAME", "")
_REGION = os.getenv("AWS_REGION", "us-east-1")
_client: Any = None
_LOCAL_FALLBACK: dict[str, bytes] = {}


def _get_client():
    global _client
    if boto3 is None:
        return None
    if _client is None and _BUCKET:
        _client = boto3.client("s3", region_name=_REGION)
    return _client


def upload_audio(audio_bytes: bytes, key: str) -> dict[str, Any]:
    """Upload MP3 bytes; return url, upload_time_ms."""
    t0 = time.time()
    if not _BUCKET or _get_client() is None:
        _LOCAL_FALLBACK[key] = audio_bytes
        upload_ms = int((time.time() - t0) * 1000)
        return {
            "url": f"/static/audio/{key}",
            "upload_time_ms": upload_ms,
            "local": True,
        }
    try:
        cli = _get_client()
        cli.put_object(Bucket=_BUCKET, Key=key, Body=audio_bytes, ContentType="audio/mpeg")
        upload_ms = int((time.time() - t0) * 1000)
        url = f"https://{_BUCKET}.s3.{_REGION}.amazonaws.com/{key}"
        return {"url": url, "upload_time_ms": upload_ms, "local": False}
    except (ClientError, OSError):
        _LOCAL_FALLBACK[key] = audio_bytes
        return {
            "url": f"/static/audio/{key}",
            "upload_time_ms": int((time.time() - t0) * 1000),
            "local": True,
        }


def get_local_audio(key: str) -> bytes | None:
    return _LOCAL_FALLBACK.get(key)
