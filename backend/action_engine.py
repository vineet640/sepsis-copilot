"""Rule-based recommended actions for sepsis bundle / escalation."""
from __future__ import annotations

import math
from typing import Any


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


def generate_recommended_actions(patient: dict[str, Any], risk: dict[str, Any]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []

    has_abx = str(patient.get("has_abx", "N")).upper() == "Y"
    raw_delay = patient.get("tat_door_to_abx_admin_min")
    delay: float | None
    if not has_abx or raw_delay is None or raw_delay == "":
        delay = None
    else:
        delay = _f(raw_delay, float("nan"))
        if math.isnan(delay):
            delay = None

    # 1–2 Antibiotics
    if delay is None:
        actions.append(
            {
                "priority": "immediate",
                "action": "Administer broad-spectrum antibiotics NOW",
                "rationale": "Hour-1 bundle requires antibiotics within 60 min of recognition",
                "metric": "Antibiotics not administered — document and start empiric therapy",
            }
        )
    elif delay > 180:
        actions.append(
            {
                "priority": "immediate",
                "action": "Administer broad-spectrum antibiotics NOW",
                "rationale": "Hour-1 bundle requires antibiotics within 60 min of recognition",
                "metric": f"Current delay: {delay:.0f} min (target: <60 min)",
            }
        )
    elif delay > 90:
        actions.append(
            {
                "priority": "urgent",
                "action": "Expedite antibiotic administration",
                "rationale": "Each 30-min delay in antibiotics increases mortality ~7%",
                "metric": f"Delay: {delay:.0f} min",
            }
        )

    raw_map = patient.get("tp4_map")
    tp4_map = _f(raw_map) if raw_map not in (None, "") else None
    shock = str(patient.get("shock_flag", "N")).upper() == "Y"

    # 3 MAP / shock
    if shock or (tp4_map is not None and tp4_map > 0 and tp4_map < 65):
        actions.append(
            {
                "priority": "immediate",
                "action": "Initiate vasopressor therapy / fluid resuscitation",
                "rationale": "MAP <65 indicates hemodynamic instability requiring intervention",
                "metric": (
                    f"MAP: {tp4_map:.0f} mmHg"
                    if tp4_map is not None
                    else "Shock flag present"
                ),
            }
        )

    tp4_lac = _f(patient.get("tp4_lactate"))
    if tp4_lac >= 4.0:
        actions.append(
            {
                "priority": "immediate",
                "action": "Repeat lactate and escalate to ICU evaluation",
                "rationale": "Lactate ≥4.0 mmol/L indicates tissue hypoperfusion (Septic Shock criterion)",
                "metric": f"Lactate: {tp4_lac:.1f} mmol/L",
            }
        )

    tp4_sofa = int(round(_f(patient.get("tp4_sofa_score"), 0)))
    disp = str(patient.get("disposition") or "")
    if tp4_sofa >= 6 and disp.upper() != "ICU":
        actions.append(
            {
                "priority": "urgent",
                "action": "Request ICU consultation",
                "rationale": "SOFA ≥6 correlates with >20% mortality; ICU-level care indicated",
                "metric": f"SOFA: {tp4_sofa}",
            }
        )

    tp4_news = int(round(_f(patient.get("tp4_news_score"), 0)))
    if tp4_news >= 7:
        actions.append(
            {
                "priority": "urgent",
                "action": "Continuous monitoring — high NEWS score",
                "rationale": "NEWS ≥7 requires urgent clinical review per NHS/RCP guidelines",
                "metric": f"NEWS: {tp4_news}",
            }
        )

    if str(patient.get("trajectory_type") or "") == "rapid_worsen":
        actions.append(
            {
                "priority": "urgent",
                "action": "Reassess treatment plan — rapid deterioration trajectory",
                "rationale": "Vitals trending toward shock; escalate bundle completion",
                "metric": "Trajectory: rapid worsening",
            }
        )

    if not actions:
        actions.append(
            {
                "priority": "monitor",
                "action": "Continue current management and monitoring",
                "rationale": "No immediate intervention criteria met at this time",
                "metric": f"Risk: {risk.get('risk_percent', 0)}%",
            }
        )

    return actions[:4]
