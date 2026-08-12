#!/usr/bin/env python3
"""
worker-monitor.py — détection des conversations en attente (worker asynchrone Atelier).

Contrat de sortie (monitor_script du cron Hermes `atelier-worker`) :
- la sortie stdout est hachée par le scheduler ; si elle ne change PAS, le run
  LLM est supprimé (coût ~0 token par tick) ;
- elle ne change QUE quand l'état change : nouveau message en attente,
  réponse agent posée, ou franchissement d'un bucket d'âge (retry) ;
- en cas d'erreur API, on émet la même sortie que « rien en attente » pour ne
  PAS déclencher de run LLM parasite (les erreurs vont sur stderr, visibles
  dans les logs du cron).

Sortie type (idempotente, triée par id, stable à l'intérieur d'un bucket) :
    PENDING 2
    brouillon-x | recent | Titre du brouillon | dernier message user (≤120 car.)
    brouillon-y | moyen | Titre | ...
ou :
    PENDING 0
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone

API_URL = __import__("os").environ.get(
    "ATELIER_API_URL", "https://atelier-api-three.vercel.app"
)
EN_ATTENTE = "/api/conversations/en-attente"
TIMEOUT_S = 10


def bucket(iso_at: str) -> str:
    """Bucket d'âge du message en attente (valeurs discrètes : sortie stable)."""
    try:
        at = datetime.fromisoformat(iso_at.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return "recent"
    age_s = (datetime.now(timezone.utc) - at).total_seconds()
    if age_s < 120:
        return "recent"
    if age_s < 300:
        return "moyen"
    if age_s < 900:
        return "long"
    if age_s < 1800:
        return "tres-long"
    return "bloque"


def dernier_message_user(messages):
    for m in reversed(messages or []):
        if m.get("role") == "user":
            return m.get("texte", "")
    return ""


def main() -> int:
    req = urllib.request.Request(API_URL + EN_ATTENTE, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception as e:  # API down / timeout / JSON invalide → pas de run parasite
        print(f"erreur: {e}", file=sys.stderr)
        print("PENDING 0")
        return 0
    if not isinstance(payload, list):
        print(f"erreur: reponse inattendue {type(payload).__name__}", file=sys.stderr)
        print("PENDING 0")
        return 0

    lignes = []
    for d in sorted(payload, key=lambda x: x.get("id", "")):
        if not isinstance(d, dict):
            continue
        derniere = dernier_message_user(d.get("messages"))
        lignes.append(
            " | ".join(
                [
                    str(d.get("id", "?")),
                    bucket(str(d.get("messages", [{}])[-1].get("at", "")) if d.get("messages") else ""),
                    (d.get("titre") or "").replace("\n", " ")[:60],
                    derniere.replace("\n", " ")[:120],
                ]
            )
        )
    print(f"PENDING {len(lignes)}")
    if lignes:
        print("\n".join(lignes))
    return 0


if __name__ == "__main__":
    sys.exit(main())
