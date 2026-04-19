"""Load and cache combined sepsis CSV as plain dicts (JSON-serializable)."""
from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import pandas as pd

_DATA: list[dict[str, Any]] | None = None
_BY_ID: dict[str, dict[str, Any]] | None = None

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "combined_sepsis_data_v7.csv"


def _clean_value(v: Any) -> Any:
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    if pd.isna(v):
        return None
    if hasattr(v, "item"):
        try:
            return v.item()
        except Exception:
            pass
    if isinstance(v, (pd.Timestamp,)):
        return str(v)
    return v


def _row_to_dict(row: pd.Series) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in row.items():
        out[str(k)] = _clean_value(v)
    return out


def load_data() -> list[dict[str, Any]]:
    global _DATA, _BY_ID
    if _DATA is not None:
        return _DATA
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    _DATA = [_row_to_dict(df.iloc[i]) for i in range(len(df))]
    _BY_ID = {str(p["encounter_id"]): p for p in _DATA if p.get("encounter_id")}
    return _DATA


def get_all_patients() -> list[dict[str, Any]]:
    return load_data()


def get_patient(encounter_id: str) -> dict[str, Any] | None:
    load_data()
    assert _BY_ID is not None
    return _BY_ID.get(str(encounter_id))
