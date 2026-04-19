"""MongoDB Atlas — patients cache, recently viewed, saved cases, access log, chat cache."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError

_client: MongoClient | None = None
_db: Any = None
_MEM: dict[str, Any] = {}


def _use_memory() -> bool:
    return not os.getenv("MONGODB_URI")


def _dbx():
    global _client, _db
    if _use_memory():
        return None
    if _db is not None:
        return _db
    uri = os.environ["MONGODB_URI"]
    _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    _db = _client["sepsis_copilot"]
    for coll, keys in (
        ("patients", [("encounter_id", ASCENDING)]),
        ("recently_viewed", [("user_session_id", ASCENDING), ("viewed_at", ASCENDING)]),
        ("saved_cases", [("user_session_id", ASCENDING)]),
        ("access_log", [("encounter_id", ASCENDING), ("viewed_at", ASCENDING)]),
        ("chat_cache", [("encounter_id", ASCENDING)]),
        ("explain_cache", [("key", ASCENDING)]),
    ):
        try:
            _db[coll].create_index(keys)
        except PyMongoError:
            pass
    return _db


def upsert_patients(patients: list[dict[str, Any]]) -> int:
    if _use_memory():
        _MEM["patients"] = {p["encounter_id"]: p for p in patients}
        return len(patients)
    db = _dbx()
    n = 0
    for p in patients:
        eid = p.get("encounter_id")
        if not eid:
            continue
        db.patients.update_one({"encounter_id": eid}, {"$set": p}, upsert=True)
        n += 1
    return n


def log_access_event(
    session_id: str,
    encounter_id: str,
    hospital_id: str,
    accessor_type: str,
    solana_sig: str | None = None,
    push_recent: bool = True,
) -> None:
    doc = {
        "user_session_id": session_id,
        "encounter_id": encounter_id,
        "hospital_id": hospital_id,
        "accessor_type": accessor_type,
        "viewed_at": datetime.now(timezone.utc).isoformat(),
        "solana_signature": solana_sig,
    }
    if _use_memory():
        al = _MEM.setdefault("access_log", [])
        al.insert(0, dict(doc))
        _MEM["access_log"] = al[:500]
        if push_recent and accessor_type == "clinician":
            lv = _MEM.setdefault("recently_viewed", [])
            lv = [x for x in lv if not (x["user_session_id"] == session_id and x["encounter_id"] == encounter_id)]
            lv.insert(0, {k: v for k, v in doc.items() if k != "accessor_type"})
            _MEM["recently_viewed"] = lv[:200]
        return
    try:
        db = _dbx()
        db.access_log.insert_one(dict(doc))
        if push_recent and accessor_type == "clinician":
            db.recently_viewed.insert_one(
                {
                    "user_session_id": session_id,
                    "encounter_id": encounter_id,
                    "hospital_id": hospital_id,
                    "viewed_at": doc["viewed_at"],
                    "solana_signature": solana_sig,
                }
            )
    except PyMongoError:
        pass


def log_view(session_id: str, encounter_id: str, hospital_id: str, solana_sig: str | None = None) -> None:
    log_access_event(session_id, encounter_id, hospital_id, "clinician", solana_sig, push_recent=True)


def get_recently_viewed(session_id: str, limit: int = 5) -> list[dict[str, Any]]:
    if _use_memory():
        lv = _MEM.get("recently_viewed", [])
        out = [x for x in lv if x["user_session_id"] == session_id][:limit]
        return out
    try:
        db = _dbx()
        cur = db.recently_viewed.find({"user_session_id": session_id}).sort("viewed_at", -1).limit(limit)
        return list(cur)
    except PyMongoError:
        return []


def save_case(session_id: str, encounter_id: str, note: str = "") -> None:
    doc = {
        "user_session_id": session_id,
        "encounter_id": encounter_id,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "note": note,
    }
    if _use_memory():
        sc = _MEM.setdefault("saved_cases", [])
        sc = [x for x in sc if not (x["user_session_id"] == session_id and x["encounter_id"] == encounter_id)]
        sc.insert(0, doc)
        _MEM["saved_cases"] = sc[:200]
        return
    try:
        db = _dbx()
        db.saved_cases.update_one(
            {"user_session_id": session_id, "encounter_id": encounter_id},
            {"$set": doc},
            upsert=True,
        )
    except PyMongoError:
        pass


def get_saved_cases(session_id: str) -> list[dict[str, Any]]:
    if _use_memory():
        return [x for x in _MEM.get("saved_cases", []) if x["user_session_id"] == session_id]
    try:
        db = _dbx()
        return list(db.saved_cases.find({"user_session_id": session_id}).sort("saved_at", -1))
    except PyMongoError:
        return []


def unsave_case(session_id: str, encounter_id: str) -> None:
    if _use_memory():
        _MEM["saved_cases"] = [
            x
            for x in _MEM.get("saved_cases", [])
            if not (x["user_session_id"] == session_id and x["encounter_id"] == encounter_id)
        ]
        return
    try:
        db = _dbx()
        db.saved_cases.delete_one({"user_session_id": session_id, "encounter_id": encounter_id})
    except PyMongoError:
        pass


def get_access_log(encounter_id: str) -> list[dict[str, Any]]:
    if _use_memory():
        return [x for x in _MEM.get("access_log", []) if x.get("encounter_id") == encounter_id]
    try:
        db = _dbx()
        return list(db.access_log.find({"encounter_id": encounter_id}).sort("viewed_at", -1).limit(50))
    except PyMongoError:
        return []


def append_chat_turn(encounter_id: str, mode: str, question: str, answer: str) -> None:
    key = f"{encounter_id}:{mode}"
    if _use_memory():
        cc = _MEM.setdefault("chat_cache", {})
        hist = cc.setdefault(key, [])
        hist.append({"q": question, "a": answer, "ts": datetime.now(timezone.utc).isoformat()})
        cc[key] = hist[-10:]
        return
    try:
        db = _dbx()
        turn = {"question": question, "answer": answer, "ts": datetime.now(timezone.utc).isoformat()}
        db.chat_cache.update_one(
            {"encounter_id": encounter_id, "mode": mode},
            {
                "$push": {"turns": {"$each": [turn], "$slice": -10}},
                "$setOnInsert": {"encounter_id": encounter_id, "mode": mode},
            },
            upsert=True,
        )
    except PyMongoError:
        pass


def get_chat_history(encounter_id: str, mode: str) -> list[dict[str, Any]]:
    if _use_memory():
        cc = _MEM.get("chat_cache", {})
        return cc.get(f"{encounter_id}:{mode}", [])
    try:
        db = _dbx()
        doc = db.chat_cache.find_one({"encounter_id": encounter_id, "mode": mode})
        return doc.get("turns", []) if doc else []
    except PyMongoError:
        return []


def cache_explain(key: str, text: str) -> None:
    if _use_memory():
        _MEM.setdefault("explain_cache", {})[key] = text
        return
    try:
        db = _dbx()
        db.explain_cache.update_one({"key": key}, {"$set": {"text": text}}, upsert=True)
    except PyMongoError:
        pass


def get_cached_explain(key: str) -> str | None:
    if _use_memory():
        return _MEM.get("explain_cache", {}).get(key)
    try:
        db = _dbx()
        doc = db.explain_cache.find_one({"key": key})
        return doc.get("text") if doc else None
    except PyMongoError:
        return None


def new_session_id() -> str:
    return str(uuid.uuid4())
