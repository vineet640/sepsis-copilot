"""Sepsis Copilot — FastAPI backend."""
from __future__ import annotations

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass
from contextlib import asynccontextmanager
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import mongo_service
import solana_service
from action_engine import generate_recommended_actions
from data_loader import get_all_patients, get_patient
from elevenlabs_service import generate_audio
from gemini_service import (
    answer_patient_question,
    generate_counterfactual,
    generate_equity_note,
    generate_explanation,
    generate_simplified_explanation,
    generate_vitals_chart_insight,
)
from risk_engine import compute_risk, compute_risk_at_tp, recompute_risk_counterfactual
from s3_service import get_local_audio


# Care pathway process times (minutes) — keys must match frontend `CARE_TRACK_KEYS` in careTrackProcesses.js
PROCESS_TAT_KEYS = [
    "tat_door_to_triage_start_min",
    "tat_triage_start_to_complete_min",
    "tat_door_to_primary_eval_min",
    "tat_door_to_recognition_min",
    "tat_iv_process_total_min",
    "tat_lab_process_total_min",
    "tat_abx_process_total_min",
    "tat_door_to_abx_admin_min",
    "tat_recognition_to_abx_admin_min",
    "tat_door_to_pressor_start_min",
]


def _json_safe(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, float):
        import math

        if math.isnan(obj) or math.isinf(obj):
            return None
    if hasattr(obj, "item"):
        try:
            return _json_safe(obj.item())
        except Exception:
            pass
    return obj


def timeline_events(p: dict[str, Any]) -> list[dict[str, Any]]:
    ev = []
    for i, prefix in enumerate(["tp1", "tp2", "tp3", "tp4"], start=1):
        ts = p.get(f"{prefix}_timestamp")
        st = p.get(f"{prefix}_sepsis_status")
        if ts:
            ev.append({"tp": i, "timestamp": str(ts), "sepsis_status": st, "sofa": p.get(f"{prefix}_sofa_score")})
    return ev


def _log_access_job(
    encounter_id: str,
    session_id: str,
    hospital_id: str,
    mode: str,
):
    try:
        r = solana_service.log_access_on_chain(
            encounter_id,
            "patient" if mode == "patient" else "clinician",
            hospital_id,
        )
        sig = r.get("signature") or None
        if not sig:
            sig = None
    except Exception:
        sig = None
    try:
        mongo_service.log_access_event(
            session_id,
            encounter_id,
            hospital_id,
            "patient" if mode == "patient" else "clinician",
            solana_sig=sig,
            push_recent=(mode == "clinician"),
        )
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    from data_loader import load_data

    pts = load_data()
    n = mongo_service.upsert_patients(pts)
    print(f"Sepsis Copilot ready — {n} patients loaded")
    try:
        r = solana_service.fund_wallet_lamports(10**9)
        print("Solana airdrop:", r)
    except Exception as e:
        print("Solana airdrop skipped:", e)
    yield


app = FastAPI(title="Sepsis Copilot API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:5173"), "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/patients")
def list_patients():
    out = []
    for p in get_all_patients():
        r = compute_risk(p)
        acts = generate_recommended_actions(p, r)
        row = {
            "encounter_id": p.get("encounter_id"),
            "hospital_id": p.get("hospital_id"),
            "hospital_name": p.get("hospital_name"),
            "highest_sepsis_status": p.get("highest_sepsis_status"),
            "tat_door_to_abx_admin_min": p.get("tat_door_to_abx_admin_min"),
            "risk_percent": r["risk_percent"],
            "risk_level": r["risk_level"],
            "action_count": len(acts),
            "process_tats": {k: _json_safe(p.get(k)) for k in PROCESS_TAT_KEYS},
        }
        out.append(_json_safe(row))
    out.sort(key=lambda x: x.get("risk_percent") or 0, reverse=True)
    return out


@app.get("/patient/{encounter_id}")
def get_one_patient(
    encounter_id: str,
    background_tasks: BackgroundTasks,
    mode: str = Query("clinician"),
    session_id: str = Query("default-session"),
):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    p = _json_safe(p)
    risk = compute_risk(p)
    actions = generate_recommended_actions(p, risk)
    background_tasks.add_task(
        _log_access_job,
        encounter_id,
        session_id,
        str(p.get("hospital_id", "")),
        mode,
    )
    timeline_risks = [compute_risk_at_tp(p, i) for i in range(4)]
    return {
        "patient": p,
        "risk": risk,
        "actions": actions,
        "timeline": timeline_events(p),
        "timeline_risks": [_json_safe(tr) for tr in timeline_risks],
    }


@app.get("/actions/{encounter_id}")
def get_actions(encounter_id: str):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    r = compute_risk(p)
    return {"actions": generate_recommended_actions(p, r)}


@app.get("/explain/{encounter_id}")
async def explain(encounter_id: str, mode: str = Query("clinician")):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    r = compute_risk(p)
    key = f"explain:{encounter_id}:{mode}"
    cached = mongo_service.get_cached_explain(key)
    if cached:
        return {"explanation": cached, "cached": True}
    text = await generate_explanation(p, r, mode)
    mongo_service.cache_explain(key, text)
    return {"explanation": text, "cached": False}


@app.get("/explain/simplified/{encounter_id}")
async def explain_simplified(encounter_id: str):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    r = compute_risk(p)
    base = await generate_explanation(p, r, "patient")
    key = f"simplified:{encounter_id}"
    cached = mongo_service.get_cached_explain(key)
    if cached:
        return {"explanation": cached, "cached": True}
    text = await generate_simplified_explanation(p, base)
    mongo_service.cache_explain(key, text)
    return {"explanation": text, "cached": False}


@app.get("/explain/vitals-chart/{encounter_id}")
async def explain_vitals_chart(encounter_id: str):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    key = f"vitals_chart:{encounter_id}"
    cached = mongo_service.get_cached_explain(key)
    if cached:
        return {"explanation": cached, "cached": True}
    text = await generate_vitals_chart_insight(p)
    mongo_service.cache_explain(key, text)
    return {"explanation": text, "cached": False}


@app.get("/counterfactual/{encounter_id}")
async def counterfactual(encounter_id: str, hypothetical_delay: int = 60):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    actual_risk = compute_risk(p)
    cf_risk = recompute_risk_counterfactual(p, hypothetical_delay)
    delta = actual_risk["risk_percent"] - cf_risk["risk_percent"]
    narrative = await generate_counterfactual(p, actual_risk, cf_risk)
    return {
        "actual_risk": actual_risk,
        "counterfactual_risk": cf_risk,
        "delta_percent": round(delta, 1),
        "narrative": narrative,
    }


@app.get("/equity/{encounter_id}")
async def equity(encounter_id: str):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    note = await generate_equity_note(p)
    return {"note": note}


class NarrateBody(BaseModel):
    voice_mode: str = "calm"
    speed: float = 1.0
    # Must match /explain?mode= — "clinician" vs "patient" tone for Gemini text before TTS.
    explanation_mode: str = "patient"


@app.post("/narrate/{encounter_id}")
async def narrate(encounter_id: str, body: NarrateBody):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    r = compute_risk(p)
    em = body.explanation_mode if body.explanation_mode in ("clinician", "patient") else "patient"
    key = f"explain:{encounter_id}:{em}"
    cached = mongo_service.get_cached_explain(key)
    if cached:
        text = cached
    else:
        text = await generate_explanation(p, r, em)
        mongo_service.cache_explain(key, text)
    return await generate_audio(
        text,
        encounter_id,
        voice_mode=body.voice_mode,
        speed=body.speed,
        explanation_mode=em,
    )


class ChatBody(BaseModel):
    question: str
    mode: str = "clinician"


@app.post("/chat/{encounter_id}")
async def chat(encounter_id: str, body: ChatBody):
    p = get_patient(encounter_id)
    if not p:
        raise HTTPException(404)
    r = compute_risk(p)
    ans = await answer_patient_question(p, r, body.question, body.mode)
    mongo_service.append_chat_turn(encounter_id, body.mode, body.question, ans)
    return {"answer": ans, "encounter_id": encounter_id}


@app.get("/recently-viewed")
def recently_viewed(session_id: str = Query(...)):
    return {"items": mongo_service.get_recently_viewed(session_id, 5)}


class SaveCaseBody(BaseModel):
    session_id: str
    encounter_id: str
    note: str = ""


@app.post("/save-case")
def save_case(body: SaveCaseBody):
    mongo_service.save_case(body.session_id, body.encounter_id, body.note)
    return {"ok": True}


@app.get("/saved-cases")
def saved_cases(session_id: str = Query(...)):
    return {"items": mongo_service.get_saved_cases(session_id)}


@app.delete("/save-case/{encounter_id}")
def del_saved(encounter_id: str, session_id: str = Query(...)):
    mongo_service.unsave_case(session_id, encounter_id)
    return {"ok": True}


@app.get("/solana/access-log/{encounter_id}")
def solana_access_log(encounter_id: str):
    return {"items": mongo_service.get_access_log(encounter_id)}


@app.get("/solana/wallet-status")
def solana_wallet_status():
    """Signing wallet public key + devnet balance (for faucet / debugging missing memo signatures)."""
    return solana_service.wallet_status()


@app.get("/featured-patients")
def featured_patients():
    pts = get_all_patients()
    scored = [(compute_risk(p)["risk_percent"], p) for p in pts]
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [p for _, p in scored[:3]]
    return {
        "featured": [
            {
                "encounter_id": p.get("encounter_id"),
                "hospital_name": p.get("hospital_name"),
                "risk_percent": compute_risk(p)["risk_percent"],
            }
            for p in top
        ],
        "critical_encounter_id": top[0].get("encounter_id") if top else None,
    }


@app.get("/hospital/{hospital_id}/summary")
def hospital_summary(hospital_id: str):
    pts = [p for p in get_all_patients() if str(p.get("hospital_id")) == hospital_id]
    if not pts:
        raise HTTPException(404)
    delays = [float(p["tat_door_to_abx_admin_min"]) for p in pts if p.get("tat_door_to_abx_admin_min") not in (None, "")]
    import statistics

    med = statistics.median(delays) if delays else 0
    return {
        "hospital_id": hospital_id,
        "n": len(pts),
        "median_door_to_abx": med,
    }


@app.get("/credibility-anchors")
def credibility_anchors():
    return [
        {"claim": "SOFA-based mortality estimates", "source": "Ferreira et al., JAMA 2001; Seymour et al., NEJM 2017"},
        {"claim": "Hour-1 sepsis bundle", "source": "Surviving Sepsis Campaign Guidelines 2021"},
        {"claim": "Antibiotic delay mortality impact", "source": "Kumar et al., Crit Care Med 2006 — each hour delay +7% mortality"},
        {"claim": "NEWS score thresholds", "source": "NHS/RCP National Early Warning Score 2 (NEWS2) 2017"},
        {"claim": "Health equity disparities", "source": "Rhee et al., JAMA 2017; Moore et al., Crit Care Med 2023"},
    ]


@app.get("/solana/fund-wallet")
def fund_wallet():
    return solana_service.fund_wallet_lamports(10**9)


@app.get("/static/audio/{key:path}")
def serve_local_audio(key: str):
    data = get_local_audio(key)
    if not data:
        raise HTTPException(404)
    return Response(content=data, media_type="audio/mpeg")


@app.get("/health")
def health():
    return {"status": "ok"}
