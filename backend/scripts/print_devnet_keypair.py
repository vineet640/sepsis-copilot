"""Print a new Solana devnet keypair secret (base58) for SOLANA_PRIVATE_KEY."""
import base58
from solders.keypair import Keypair

kp = Keypair()
print("SOLANA_PRIVATE_KEY=" + base58.b58encode(bytes(kp.to_bytes())).decode())
