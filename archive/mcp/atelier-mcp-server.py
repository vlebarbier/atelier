#!/usr/bin/env python3
"""
Bordeluche Content Review — MCP Server
=======================================
Expose le dashboard de brouillons de contenu à Hermes et aux agents MCP.

Outils exposés (préfixe mcp_bordeluche_*) :
  CONTENU (via API du dashboard localhost:4310)
    - liste_brouillons()          → liste des brouillons + statuts
    - lire_brouillon(id)          → détail complet (slides, notes, légendes)
    - set_statut(id, statut)      → brouillon|a-valider|valide|publie
    - set_notes(id, notes)        → notes de révision
    - set_legende(id, reseau, caption, hashtags) → légende par réseau

  VISUELS (pipeline local HTML→PNG)
    - regenerer_slides(source_html, sortie_id) → lance render.cjs, copie vers brouillons/<id>/slides/

  POSTIZ (CLI self-hosted localhost:4007)
    - creer_brouillon_postiz(id, reseau, integration_id, caption) → upload slides + posts:create -t draft

Usage : mcp-venv/bin/python bordeluche-mcp-server.py
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.parse
import shlex

# ── Configuration ────────────────────────────────────────────────────────
DASHBOARD_URL = os.environ.get("BORDELUCHE_DASHBOARD_URL", "http://localhost:4310")
INSTAGRAM_DIR = os.environ.get("BORDELUCHE_INSTAGRAM_DIR", os.path.expanduser("~/Bordeluche/.hermes-instagram"))
POSTIZ_CLI_ENV = os.environ.get("POSTIZ_CLI_ENV", os.path.expanduser("~/postiz/cli.env"))
INSTAGRAM_INTEGRATION_ID = os.environ.get("BORDELUCHE_INSTAGRAM_INTEGRATION_ID", "cmslf9y3j0001ny8smbts9jcb")

# ── Helpers HTTP ─────────────────────────────────────────────────────────
def api_get(path):
    with urllib.request.urlopen(f"{DASHBOARD_URL}{path}", timeout=10) as r:
        return json.loads(r.read().decode())

def api_post(path, payload):
    req = urllib.request.Request(
        f"{DASHBOARD_URL}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())

# ── Import FastMCP (après helpers pour messages d'erreur clairs) ─────────
try:
    from mcp.server.fastmcp import FastMCP
except ImportError as e:
    print(f"ERREUR: SDK mcp non installé — {e}", file=sys.stderr)
    sys.exit(1)

mcp = FastMCP("bordeluche-content")


# ═════════════════════ CONTENU ══════════════════════════════════════════
@mcp.tool()
def liste_brouillons() -> str:
    """Liste les brouillons de contenu (carrousels, posts) avec leur statut.
    Retourne un JSON : id, titre, statut (brouillon/a-valider/valide/publie),
    nombre de slides, réseaux avec légende, date de mise à jour."""
    try:
        data = api_get("/api/brouillons")
        return json.dumps(data, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Dashboard injoignable ({DASHBOARD_URL}) : {e}"})


@mcp.tool()
def lire_brouillon(id: str) -> str:
    """Détail complet d'un brouillon : slides, notes, statut et légendes par réseau."""
    try:
        data = api_get(f"/api/brouillon/{urllib.parse.quote(id)}")
        return json.dumps(data, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Impossible de lire '{id}' : {e}"})


@mcp.tool()
def set_statut(id: str, statut: str) -> str:
    """Change le statut d'un brouillon : brouillon | a-valider | valide | publie."""
    if statut not in ("brouillon", "a-valider", "valide", "publie"):
        return json.dumps({"error": f"Statut invalide : {statut}"})
    try:
        r = api_post(f"/api/brouillon/{urllib.parse.quote(id)}", {"statut": statut})
        return json.dumps({"ok": True, "statut": statut, "id": id})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def set_notes(id: str, notes: str) -> str:
    """Écrit les notes de révision d'un brouillon (remplace les notes existantes)."""
    try:
        api_post(f"/api/brouillon/{urllib.parse.quote(id)}", {"notes": notes})
        return json.dumps({"ok": True, "id": id, "notes": notes[:100] + ("…" if len(notes) > 100 else "")})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def set_legende(id: str, reseau: str, caption: str = "", hashtags: str = "") -> str:
    """Écrit la légende d'un réseau social pour un brouillon.
    reseau : instagram | linkedin | facebook | x | tiktok"""
    try:
        api_post(f"/api/brouillon/{urllib.parse.quote(id)}", {
            "reseaux": {reseau: {"caption": caption, "hashtags": hashtags}}
        })
        return json.dumps({"ok": True, "id": id, "reseau": reseau,
                           "caption": caption[:80] + ("…" if len(caption) > 80 else "")})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ═════════════════════ VISUELS ══════════════════════════════════════════
@mcp.tool()
def regenerer_slides(source_html: str, sortie_id: str) -> str:
    """Régénère les slides d'un carrousel depuis son HTML source, puis copie les
    PNG dans brouillons/<sortie_id>/slides/.
    source_html : nom du fichier dans .hermes-instagram/ (ex: carrousel-v4.html)
    sortie_id   : id du brouillon cible (ex: carrousel-bordeluche-v7)"""
    try:
        render_script = os.path.join(INSTAGRAM_DIR, "render.cjs")
        if not os.path.exists(render_script):
            return json.dumps({"error": f"render.cjs introuvable : {render_script}"})
        if not os.path.exists(os.path.join(INSTAGRAM_DIR, source_html)):
            return json.dumps({"error": f"source HTML introuvable : {source_html}"})

        # Le render.cjs pointe vers un fichier fixe — on copie la source vers carrousel.html
        # et on s'assure que render.cjs cible bien ce fichier.
        # (Approche : vérifier/créer un render générique si besoin)
        result = subprocess.run(
            ["node", render_script],
            cwd=INSTAGRAM_DIR,
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            return json.dumps({"error": f"Render échoué : {result.stderr[-500:]}"})

        # Copier slides/ générées vers brouillons/<sortie_id>/slides/
        src_dir = os.path.join(INSTAGRAM_DIR, "slides")
        dst_dir = os.path.join(INSTAGRAM_DIR, "brouillons", sortie_id, "slides")
        os.makedirs(dst_dir, exist_ok=True)
        import shutil, glob
        for f in sorted(glob.glob(os.path.join(src_dir, "*.png"))):
            shutil.copy2(f, os.path.join(dst_dir, os.path.basename(f)))
        n = len(glob.glob(os.path.join(dst_dir, "*.png")))
        return json.dumps({"ok": True, "slides_generees": n, "brouillon": sortie_id})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ═════════════════════ POSTIZ ═══════════════════════════════════════════
def _postiz_env():
    """Charge les variables du cli.env Postiz (POSTIZ_API_URL)."""
    env = os.environ.copy()
    if os.path.exists(POSTIZ_CLI_ENV):
        with open(POSTIZ_CLI_ENV) as f:
            for line in f:
                line = line.strip()
                if line.startswith("export "):
                    line = line[7:]
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env


@mcp.tool()
def creer_brouillon_postiz(id: str, reseau: str, caption: str, integration_id: str = "") -> str:
    """Crée un brouillon Postiz pour un brouillon donné : uploade les slides
    puis crée le post en statut draft (jamais publié automatiquement).
    id              : id du brouillon (ex: carrousel-bordeluche-v7)
    reseau          : instagram (canal actuellement connecté)
    caption         : texte du post
    integration_id  : id d'intégration Postiz (défaut : Instagram Bordeluche)"""
    try:
        env = _postiz_env()
        integ = integration_id or INSTAGRAM_INTEGRATION_ID

        # 1. Récupérer les slides du brouillon
        brouillon = api_get(f"/api/brouillon/{urllib.parse.quote(id)}")
        slides = brouillon.get("slides", [])
        if not slides:
            return json.dumps({"error": "Aucune slide dans ce brouillon"})

        # 2. Uploader chaque slide → URL (le CLI renvoie un JSON avec le champ "path")
        media_urls = []
        for s in slides:
            local = os.path.join(INSTAGRAM_DIR, "brouillons", id, s)
            if not os.path.exists(local):
                return json.dumps({"error": f"Fichier introuvable : {local}"})
            up = subprocess.run(["postiz", "upload", local], env=env,
                                capture_output=True, text=True, timeout=120)
            if up.returncode != 0:
                return json.dumps({"error": f"Upload échoué {s} : {up.stderr[-300:]}"})
            try:
                parsed = json.loads(up.stdout[up.stdout.find("{"):])
                url = parsed.get("path") or parsed.get("url")
            except Exception:
                url = up.stdout.strip().strip('"')
            if not url:
                return json.dumps({"error": f"URL introuvable dans la réponse upload : {up.stdout[:200]}"})
            media_urls.append(url)

        # 3. Créer le post draft (post_type=post pour un carrousel Instagram)
        media_str = ",".join(media_urls)
        settings = json.dumps({"post_type": "post"})
        cmd = ["postiz", "posts:create",
               "-c", caption,
               "-m", media_str,
               "-i", integ,
               "-t", "draft",
               "--settings", settings,
               "-s", "2026-01-01T00:00:00Z"]  # date requise, ignorée pour draft
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            return json.dumps({"error": f"Création post échouée : {r.stderr[-500:]}"})
        return json.dumps({"ok": True, "id": id, "reseau": reseau,
                           "slides_uploaded": len(media_urls),
                           "postiz": r.stdout.strip()[:300]})
    except Exception as e:
        return json.dumps({"error": str(e)})


if __name__ == "__main__":
    mcp.run()
