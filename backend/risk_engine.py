"""SOFA-aligned rule-based mortality risk (same structure as generator logic)."""
from __future__ import annotations

import math
from typing import Any

HOSPITAL_MORTALITY_FACTOR = {
    "H1": 0.82,
    "H2": 1.25,
    "H3": 1.10,
    "H4": 1.05,
    "H5": 0.95,
    "H6": 1.00,
}


def sofa_mortality_prob(sofa_score: float) -> float:
    s = int(max(0, min(sofa_score, 24)))
    if s <= 1:
        return 0.00
    if s <= 3:
        return 0.064
    if s <= 5:
        return 0.202
    if s <= 7:
        return 0.215
    if s <= 9:
        return 0.333
    if s <= 11:
        return 0.50
    return 0.95


def _f(x: Any, default: float = 0.0) -> float:
    if x is None or x == "":
        return default
    try:
        v = float(x)
        if math.isnan(v):
            return default
        return v
    except (TypeError, ValueError):
        return default


def _get_abx_delay_min(patient: dict[str, Any]) -> float | None:
    """Door-to-abx minutes; None if antibiotics not given or unknown."""
    has_abx = str(patient.get("has_abx", "N")).upper() == "Y"
    raw = patient.get("tat_door_to_abx_admin_min")
    if raw is None or raw == "":
        return None if not has_abx else 999.0
    if not has_abx:
        return None
    d = _f(raw, float("nan"))
    if math.isnan(d):
        return None
    return d


def _delay_risk_multiplier(delay_min: float | None) -> float:
    """Extra mortality pressure from antibiotic delay (rule-based, monotonic)."""
    if delay_min is None:
        return 1.18  # no antibiotics documented
    if delay_min >= 999:
        return 1.18
    if delay_min > 180:
        return 1.12
    if delay_min > 90:
        return 1.06
    if delay_min <= 60:
        return 0.98
    return 1.0


def compute_risk(patient: dict[str, Any]) -> dict[str, Any]:
    """
    Returns a dict with:
      risk_percent, risk_level, drivers (list of str), sofa, news, trajectory, shock_flag
    """
    sofa = _f(patient.get("highest_sofa_score"), 0)
    base_mort = sofa_mortality_prob(sofa) * 0.30
    hid = str(patient.get("hospital_id") or "H1")
    mort_factor = HOSPITAL_MORTALITY_FACTOR.get(hid, 1.0)
    adj_mort = min(base_mort * mort_factor, 0.95)

    traj = str(patient.get("trajectory_type") or "flat")
    if traj == "rapid_worsen":
        adj_mort = min(adj_mort * 1.20, 0.95)
    elif traj == "crash_recover":
        adj_mort = min(adj_mort * 0.70, 0.95)
    elif traj == "improve":
        adj_mort = min(adj_mort * 0.60, 0.95)

    delay = _get_abx_delay_min(patient)
    adj_mort = min(adj_mort * _delay_risk_multiplier(delay), 0.95)

    if str(patient.get("shock_flag", "N")).upper() == "Y":
        adj_mort = min(adj_mort * 1.08, 0.95)

    risk_percent = round(adj_mort * 100, 1)
    if risk_percent < 15:
        risk_level = "Low"
    elif risk_percent < 35:
        risk_level = "Moderate"
    elif risk_percent < 65:
        risk_level = "High"
    else:
        risk_level = "Critical"

    drivers: list[str] = []
    drivers.append(f"SOFA score {int(sofa)}")
    if delay is None:
        drivers.append("Antibiotics not documented or not given")
    else:
        drivers.append(f"Door-to-antibiotics {delay:.0f} min")
    drivers.append(f"Trajectory: {traj}")
    if str(patient.get("shock_flag", "N")).upper() == "Y":
        drivers.append("Shock present")
    news = int(round(_f(patient.get("highest_news_score"), 0)))
    drivers.append(f"NEWS {news}")

    return {
        "risk_percent": risk_percent,
        "risk_level": risk_level,
        "drivers": drivers[:5],
        "sofa": int(sofa),
        "news": news,
        "trajectory": traj,
        "shock_flag": str(patient.get("shock_flag", "N")),
        "abx_delay_min": delay,
    }


def recompute_risk_counterfactual(patient: dict[str, Any], hypothetical_abx_delay: int) -> dict[str, Any]:
    """
    Recompute risk assuming antibiotics at hypothetical_abx_delay minutes (door-to-abx).
    """
    modified = dict(patient)
    modified["tat_door_to_abx_admin_min"] = float(hypothetical_abx_delay)
    modified["has_abx"] = "Y"
    return compute_risk(modified)


def compute_risk_at_tp(patient: dict[str, Any], tp_index: int) -> dict[str, Any]:
    """
    Approximate risk using only data through tp{1-4} (for timeline replay animation).
    tp_index: 0..3 -> tp1..tp4
    """
    n = max(1, min(4, tp_index + 1))
    prefix = f"tp{n}_"
    sub = dict(patient)
    sofa = _f(patient.get(f"{prefix}sofa_score"), _f(patient.get("highest_sofa_score"), 0))
    sub["highest_sofa_score"] = sofa
    sub["highest_news_score"] = _f(patient.get(f"{prefix}news_score"), 0)
    sub["trajectory_type"] = patient.get("trajectory_type", "flat")
    sub["shock_flag"] = patient.get("shock_flag", "N")
    return compute_risk(sub)
