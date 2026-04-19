"""Google Gemini — explanations, counterfactual narrative, patient Q&A, simplify."""
from __future__ import annotations

import logging
import os
from typing import Any

try:
    import google.generativeai as genai
except ImportError:
    genai = None  # type: ignore

logger = logging.getLogger(__name__)

# Try in order: quota / model availability varies by key (see GEMINI_MODEL to override).
# gemini-1.5-* is often 404 on newer API surfaces; 2.0-flash may hit free-tier RPM limits.
_DEFAULT_MODEL_CHAIN = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]


def _model_names() -> list[str]:
    custom = (os.getenv("GEMINI_MODEL") or "").strip()
    if custom:
        return [x.strip() for x in custom.split(",") if x.strip()]
    return _DEFAULT_MODEL_CHAIN


def _generate_with_fallback(prompt: str) -> str:
    """Call Gemini; try each model name until one returns text."""
    if genai is None:
        return ""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return ""
    genai.configure(api_key=key)
    last_err: Exception | None = None
    for name in _model_names():
        try:
            model = genai.GenerativeModel(name)
            resp = model.generate_content(prompt)
            text = _response_text(resp)
            if text:
                return text
        except Exception as e:
            last_err = e
            logger.warning("Gemini model %s failed: %s", name, e)
            continue
    if last_err:
        logger.warning("All Gemini models failed (last error): %s", last_err)
    return ""


def _model_for(name: str):
    if genai is None:
        return None
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    genai.configure(api_key=key)
    return genai.GenerativeModel(name)


def _model():
    """First model in chain (backward compatible for callers)."""
    names = _model_names()
    return _model_for(names[0]) if names else None


def _response_text(resp: Any) -> str:
    """Extract text; handle safety blocks where .text raises."""
    if resp is None:
        return ""
    try:
        t = (resp.text or "").strip()
        if t:
            return t
    except (ValueError, AttributeError):
        pass
    try:
        c = resp.candidates[0]
        parts = getattr(c.content, "parts", []) or []
        chunks = []
        for p in parts:
            if hasattr(p, "text") and p.text:
                chunks.append(p.text)
        return " ".join(chunks).strip()
    except (IndexError, AttributeError, TypeError):
        return ""


def _comorbidities(p: dict[str, Any]) -> str:
    parts = []
    if str(p.get("has_diabetes", "N")).upper() == "Y":
        parts.append("diabetes")
    if str(p.get("has_ckd", "N")).upper() == "Y":
        parts.append("CKD")
    if str(p.get("has_chf", "N")).upper() == "Y":
        parts.append("CHF")
    if str(p.get("has_malignancy", "N")).upper() == "Y":
        parts.append("malignancy")
    if str(p.get("has_immunocompromised", "N")).upper() == "Y":
        parts.append("immunocompromised")
    return ", ".join(parts) or "none documented"


async def generate_explanation(patient: dict[str, Any], risk: dict[str, Any], mode: str) -> str:
    if not os.getenv("GEMINI_API_KEY"):
        return _fallback_explain(patient, risk, mode)
    prompt = f"""
You are a clinical decision support assistant ({mode} mode).
Patient: {patient.get('encounter_id')} at {patient.get('hospital_name')}.
Highest sepsis status: {patient.get('highest_sepsis_status')}, trajectory {patient.get('trajectory_type')}.
SOFA {risk.get('sofa')}, NEWS {risk.get('news')}, estimated mortality risk {risk.get('risk_percent')}% ({risk.get('risk_level')}).
Shock: {patient.get('shock_flag')}. Door-to-abx min: {patient.get('tat_door_to_abx_admin_min')}.
Drivers: {', '.join(risk.get('drivers', []))}.
Write 4–6 complete sentences. {'Use plain language for a family member — no medical jargon.' if mode == 'patient' else 'Use clinical precision and cite specific values where relevant.'}
Output rules:
- Each sentence must be grammatically complete (clear subject and predicate) and end with proper punctuation (. ? or !).
- Do not use bullet points, numbered lists, or isolated phrases or fragments.
- Do not truncate mid-sentence; finish each thought before starting the next.
"""
    out = _generate_with_fallback(prompt)
    return out or _fallback_explain(patient, risk, mode)


def _vitals_series_text(patient: dict[str, Any]) -> str:
    lines = []
    for i in range(1, 5):
        p = f"tp{i}_"
        lines.append(
            f"TP{i}: MAP={patient.get(p + 'map')}, lactate={patient.get(p + 'lactate')}, "
            f"heart rate={patient.get(p + 'heart_rate')}"
        )
    return "\n".join(lines)


def _fallback_vitals_chart_insight(patient: dict[str, Any]) -> str:
    """Plain-language trend when Gemini is unavailable."""
    pts = [1, 2, 3, 4]
    maps = [patient.get(f"tp{i}_map") for i in pts]
    lac = [patient.get(f"tp{i}_lactate") for i in pts]
    hrs = [patient.get(f"tp{i}_heart_rate") for i in pts]

    def _fmt(nums: list[Any], name: str) -> str:
        floats: list[float] = []
        for x in nums:
            if x is None or x == "":
                continue
            try:
                floats.append(float(x))
            except (TypeError, ValueError):
                continue
        if len(floats) < 2:
            return f"{name} is recorded at some time points."
        lo, hi = min(floats), max(floats)
        first, last = floats[0], floats[-1]
        if abs(hi - lo) < 1e-6:
            return f"{name} stays near {hi:g} across these checks."
        trend = "rises" if last > first else "falls" if last < first else "changes"
        return (
            f"{name} goes from about {first:g} toward about {last:g} "
            f"({trend} over the series)."
        )

    return (
        "MAP (mean pressure in your arteries) tells whether blood pressure is enough to perfuse organs; "
        "lactate is a blood lab that can rise with stress or poor tissue oxygen delivery; "
        "heart rate often speeds up with illness, pain, or dehydration. "
        f"{_fmt(maps, 'MAP')} {_fmt(lac, 'Lactate')} {_fmt(hrs, 'Heart rate')} "
        "Your nurses and doctors use these together with how you look and feel—not any single number alone."
    )


async def generate_vitals_chart_insight(patient: dict[str, Any]) -> str:
    """Explain MAP / lactate / HR vitals chart for families (matches VitalsChart TP1–4 series)."""
    if not os.getenv("GEMINI_API_KEY"):
        return _fallback_vitals_chart_insight(patient)
    series = _vitals_series_text(patient)
    prompt = f"""
You help families understand a hospital vitals trend chart.

The chart shows three lines across four time points (TP1–TP4):
- MAP (mean arterial pressure, mmHg): reflects whether blood pressure is adequate; clinicians often watch around ~65 mmHg as one reference.
- Lactate (mmol/L): can rise with stress, infection, or when the body is working hard to deliver oxygen.
- Heart rate (beats per minute): often rises with fever, pain, dehydration, or stress.

Recorded values (use only these; do not invent numbers):
{series}

Write 4–6 complete sentences in plain, reassuring language for a non-medical family member:
1. In one sentence each, say in simple terms what MAP, lactate, and heart rate mean on this chart.
2. Describe how each line moves from TP1 to TP4 (stable, up, or down) using only the numbers given.
3. End by reminding them the care team interprets these together with the exam and other labs.

Output rules:
- Complete sentences; no bullet points or numbered lists.
- Do not diagnose or say "you have"; describe trends and education only.
"""
    out = (_generate_with_fallback(prompt) or "").strip()
    return out or _fallback_vitals_chart_insight(patient)


def _fallback_explain(patient: dict[str, Any], risk: dict[str, Any], mode: str) -> str:
    if mode == "patient":
        return (
            f"This record shows a serious infection response. The care team is tracking organ support "
            f"and blood pressure. Current risk level is {risk.get('risk_level', 'unknown')}. "
            f"Ask your nurse any time you have questions."
        )
    return (
        f"Encounter {patient.get('encounter_id')}: {patient.get('highest_sepsis_status')} with SOFA {risk.get('sofa')}, "
        f"NEWS {risk.get('news')}, rule-estimated mortality risk {risk.get('risk_percent')}% ({risk.get('risk_level')}). "
        f"Key drivers: {', '.join(risk.get('drivers', [])[:3])}."
    )


async def generate_counterfactual(
    patient: dict[str, Any],
    actual_risk: dict[str, Any],
    counterfactual_risk: dict[str, Any],
) -> str:
    actual_delay = patient.get("tat_door_to_abx_admin_min")
    delta = actual_risk["risk_percent"] - counterfactual_risk["risk_percent"]
    fallback = (
        f"Earlier antibiotics (60 min door-to-abx) would reduce modeled risk by about {delta:.1f} percentage points "
        f"({actual_risk['risk_percent']}% → {counterfactual_risk['risk_percent']}%) using the SOFA-based rule engine."
    )
    if not os.getenv("GEMINI_API_KEY"):
        return fallback
    prompt = f"""
Actual scenario:
- Antibiotics given at: {actual_delay} min (or not given)
- Computed mortality risk: {actual_risk["risk_percent"]}%
- SOFA: {actual_risk.get("sofa")}, trajectory: {patient.get("trajectory_type")}

Counterfactual scenario (antibiotics at 60 min):
- Computed mortality risk: {counterfactual_risk["risk_percent"]}%
- Risk reduction: {delta} percentage points

This delta was computed using a SOFA-based clinical rule engine aligned with published sepsis bundle outcomes data.

In 3 sentences:
1. Explain mechanistically why earlier antibiotics reduce this specific patient's risk (cite their specific values)
2. Note: "Our rule engine estimates a {delta:.1f}pp reduction — consistent with evidence that each hour of antibiotic delay increases mortality 7–10% in septic shock"
3. Identify one systemic bottleneck at this hospital archetype ({patient.get("hospital_name")}) that causes these delays
"""
    out = _generate_with_fallback(prompt)
    return out or fallback


async def generate_equity_note(patient: dict[str, Any]) -> str:
    pm = patient.get("payer_mix", "")
    re = patient.get("race_ethnicity", "")
    delay = patient.get("tat_door_to_abx_admin_min")
    static = (
        f"Equity context: payer {pm}, race/ethnicity {re}. Literature shows sepsis process measures vary by site and "
        f"social determinants — interpret with caution (synthetic demo data)."
    )
    if not os.getenv("GEMINI_API_KEY"):
        return static
    prompt = f"""
Briefly (3 sentences) relate sepsis disparities literature to this case:
payer_mix={pm}, race_ethnicity={re}, door-to-abx={delay} min.
Cite that disparities are multifactorial; no blame on individuals.
"""
    out = _generate_with_fallback(prompt)
    return out or static


def _fallback_chat_answer(patient: dict[str, Any], risk: dict[str, Any], question: str, mode: str) -> str:
    """Non-LLM answer when Gemini is unavailable."""
    q = (question or "").lower()
    if "abx" in q or "antibiotic" in q or "delay" in q:
        return (
            f"For this encounter, door-to-antibiotic time is {patient.get('tat_door_to_abx_admin_min', 'not documented')} minutes. "
            f"Modeled risk is {risk.get('risk_percent')}% ({risk.get('risk_level')}). "
            "Discuss timing and bundle completion with the treating team."
        )
    if mode == "patient":
        return (
            f"Your record shows {patient.get('highest_sepsis_status')} with the care team monitoring labs and blood pressure. "
            f"Ask your nurse or doctor about: {question}"
        )
    return (
        f"Summary: {patient.get('highest_sepsis_status')}, SOFA {patient.get('highest_sofa_score')}, "
        f"NEWS {patient.get('highest_news_score')}, risk {risk.get('risk_percent')}% — align assessment with bedside findings."
    )


async def answer_patient_question(
    patient: dict[str, Any],
    risk: dict[str, Any],
    question: str,
    mode: str,
) -> str:
    ctx = f"""
Patient context:
- Status: {patient.get('highest_sepsis_status')}, trajectory: {patient.get('trajectory_type')}
- SOFA: {patient.get('highest_sofa_score')}, NEWS: {patient.get('highest_news_score')}
- Lactate trend: {patient.get('tp1_lactate')} → {patient.get('tp4_lactate')}
- MAP trend: {patient.get('tp1_map')} → {patient.get('tp4_map')}
- Antibiotics delay: {patient.get('tat_door_to_abx_admin_min')} min
- Comorbidities: {_comorbidities(patient)}
- Risk: {risk.get('risk_percent')}%
- Shock: {patient.get('shock_flag')}

Question: "{question}"

Answer in 2–4 sentences. Stay grounded in the patient data above.
"""
    if mode == "clinician":
        system = (
            "You are a clinical decision support AI. Answer questions about specific patients using their clinical data. "
            "Be precise and cite values. Do not diagnose — support clinical reasoning."
        )
    else:
        system = (
            "You are a compassionate health communicator helping a patient or family member understand their care. "
            "Never use medical jargon. Be honest but kind. Explain everything in plain language."
        )
        ctx += "\nUse plain language, no jargon."
    if not os.getenv("GEMINI_API_KEY"):
        return "AI chat unavailable — add GEMINI_API_KEY to enable."
    # Single string prompt — google-generativeai does not reliably accept [system, user] as two strings.
    full_prompt = f"{system}\n\n{ctx}"
    out = _generate_with_fallback(full_prompt)
    if out:
        return out
    fb = _fallback_chat_answer(patient, risk, question, mode)
    return (
        f"{fb}\n\n(Gemini returned no text; showing a data-only fallback. "
        "If this persists, set GEMINI_MODEL=gemini-1.5-flash in backend/.env and restart.)"
    )


async def generate_simplified_explanation(patient: dict[str, Any], current_explanation: str) -> str:
    if not os.getenv("GEMINI_API_KEY"):
        return current_explanation[:500]
    prompt = f"""
Rewrite this explanation so a 10-year-old could understand it:

"{current_explanation}"

Rules:
- Maximum 3 short sentences; each must be a complete, grammatical sentence ending with proper punctuation.
- No words longer than 3 syllables if avoidable
- Use analogies (e.g. "the body's alarm system went off")
- Still be accurate — do not change the meaning
- No bullet points or sentence fragments
Patient is at {patient.get('hospital_name')}.
"""
    out = _generate_with_fallback(prompt)
    return out or current_explanation
