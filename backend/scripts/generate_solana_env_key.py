#!/usr/bin/env python3
"""Generate a new devnet-only Solana keypair and write SOLANA_PRIVATE_KEY into backend/.env.

Run from repo root:  python backend/scripts/generate_solana_env_key.py
Or from backend/:    python scripts/generate_solana_env_key.py

Does not print the private key. Prints public key only.
"""
from __future__ import annotations

import base58
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def main() -> int:
    try:
        from solders.keypair import Keypair
    except ImportError:
        print("Install backend deps: cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt", file=sys.stderr)
        return 1

    kp = Keypair()
    secret_b58 = base58.b58encode(bytes(kp)).decode("ascii")

    env_path = BACKEND / ".env"
    if env_path.exists():
        lines = env_path.read_text().splitlines()
    else:
        example = BACKEND / ".env.example"
        lines = example.read_text().splitlines() if example.exists() else []

    out: list[str] = []
    seen = False
    for line in lines:
        if line.strip().startswith("SOLANA_PRIVATE_KEY="):
            out.append(f"SOLANA_PRIVATE_KEY={secret_b58}")
            seen = True
        else:
            out.append(line)
    if not seen:
        if out and out[-1].strip() != "":
            out.append("")
        out.append(f"SOLANA_PRIVATE_KEY={secret_b58}")

    env_path.write_text("\n".join(out) + "\n")
    print("Updated", env_path)
    print("Devnet public key:", kp.pubkey())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
