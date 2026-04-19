"""Solana devnet — memo-based access audit (no PHI)."""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

SOLANA_RPC = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
MEMO_PROGRAM_ID_STR = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

# Devnet memo tx needs rent + fee; stay well above dust.
_MIN_BALANCE_LAMPORTS = 100_000


def _keypair():
    try:
        from solders.keypair import Keypair

        sk = os.getenv("SOLANA_PRIVATE_KEY", "").strip()
        if not sk:
            return None
        return Keypair.from_base58_string(sk)
    except Exception:
        return None


def fund_wallet_lamports(lamports: int = 10**9) -> dict[str, Any]:
    kp = _keypair()
    if kp is None:
        return {"ok": False, "error": "no_keypair"}
    try:
        from solana.rpc.api import Client

        c = Client(SOLANA_RPC)
        resp = c.request_airdrop(kp.pubkey(), lamports)
        return {"ok": True, "signature": str(resp.value), "error": None}
    except Exception as e:
        err = str(e) or repr(e)
        return {"ok": False, "error": err}


def _airdrop_failure_hint(exc: BaseException, pubkey: Any) -> str:
    """Human-readable hint when auto-airdrop fails (common: RPC 429 / dry faucet)."""
    pk = str(pubkey)
    manual = (
        f"No devnet SOL in signing wallet yet. Send test SOL to {pk} via "
        f"https://faucet.solana.com (or another devnet faucet), then reload a patient page."
    )
    chain: BaseException | None = exc
    for _ in range(8):
        if chain is None:
            break
        resp = getattr(chain, "response", None)
        code = getattr(resp, "status_code", None)
        if code == 429:
            return manual + " (Public RPC airdrop is rate-limited.)"
        chain = getattr(chain, "__cause__", None)
    if str(exc).strip():
        return f"{manual} ({exc})"
    return f"{manual} (airdrop error: {exc!r})"


def wallet_status() -> dict[str, Any]:
    """Public key + balance for operators (no private key)."""
    kp = _keypair()
    if kp is None:
        return {
            "configured": False,
            "public_key": None,
            "balance_lamports": None,
            "can_write_chain": False,
            "hint": "Set SOLANA_PRIVATE_KEY in backend .env",
        }
    try:
        from solana.rpc.api import Client

        c = Client(SOLANA_RPC)
        bal = c.get_balance(kp.pubkey()).value
    except Exception as e:
        return {
            "configured": True,
            "public_key": str(kp.pubkey()),
            "balance_lamports": None,
            "can_write_chain": False,
            "hint": str(e),
        }
    return {
        "configured": True,
        "public_key": str(kp.pubkey()),
        "balance_lamports": bal,
        "can_write_chain": bal >= _MIN_BALANCE_LAMPORTS,
        "hint": None if bal >= _MIN_BALANCE_LAMPORTS else "Wallet needs devnet SOL before memo signatures can be recorded.",
    }


def _ensure_devnet_sol(client: Any, kp: Any) -> tuple[bool, str | None]:
    """Ensure keypair has enough devnet lamports to pay memo tx fees. Request airdrop if needed."""
    try:
        bal = client.get_balance(kp.pubkey()).value
    except Exception as e:
        return False, f"get_balance failed: {e}"

    if bal >= _MIN_BALANCE_LAMPORTS:
        return True, None

    try:
        client.request_airdrop(kp.pubkey(), 10**9)
    except Exception as e:
        logger.warning("Devnet airdrop failed: %s", e)
        return False, _airdrop_failure_hint(e, kp.pubkey())

    for _ in range(30):
        time.sleep(1.0)
        try:
            if client.get_balance(kp.pubkey()).value >= _MIN_BALANCE_LAMPORTS:
                return True, None
        except Exception:
            pass

    pk = kp.pubkey()
    return False, (
        f"Devnet balance still below {_MIN_BALANCE_LAMPORTS} lamports after airdrop. "
        f"Fund {pk} at https://faucet.solana.com"
    )


def log_access_on_chain(
    encounter_id: str,
    accessor_type: str,
    hospital_id: str,
) -> dict[str, Any]:
    kp = _keypair()
    if kp is None:
        return {"signature": "", "explorer_url": "", "error": "no_keypair", "network": "devnet"}

    memo_obj = {
        "enc": encounter_id[:12],
        "type": accessor_type,
        "ts": int(time.time()),
        "h": hospital_id,
    }
    memo_data = json.dumps(memo_obj, separators=(",", ":"))

    try:
        from solders.instruction import AccountMeta, Instruction
        from solders.message import Message
        from solders.pubkey import Pubkey
        from solders.transaction import Transaction
        from solana.rpc.api import Client

        memo_prog = Pubkey.from_string(MEMO_PROGRAM_ID_STR)
        ix = Instruction(
            program_id=memo_prog,
            accounts=[AccountMeta(pubkey=kp.pubkey(), is_signer=True, is_writable=False)],
            data=bytes(memo_data, "utf-8"),
        )
        client = Client(SOLANA_RPC)
        funded, fund_err = _ensure_devnet_sol(client, kp)
        if not funded:
            logger.warning("Devnet SOL missing for memo tx: %s", fund_err)
            return {
                "signature": "",
                "explorer_url": "",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "network": "devnet",
                "error": fund_err or "no_devnet_sol",
            }

        bh_resp = client.get_latest_blockhash()
        blockhash = bh_resp.value.blockhash
        msg = Message.new_with_blockhash([ix], kp.pubkey(), blockhash)
        tx = Transaction([kp], msg, blockhash)
        send = client.send_transaction(tx)
        sig = str(send.value)
        return {
            "signature": sig,
            "explorer_url": f"https://explorer.solana.com/tx/{sig}?cluster=devnet",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "network": "devnet",
            "error": None,
        }
    except Exception as e:
        err = str(e) or repr(e)
        logger.warning("log_access_on_chain failed: %s", err)
        return {
            "signature": "",
            "explorer_url": "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "network": "devnet",
            "error": err,
        }


def get_access_history(encounter_id: str) -> list[dict[str, Any]]:
    return []
