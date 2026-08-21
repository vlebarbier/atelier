# SPEC-VIDEO-REMOTION.md — Sortie vidéo : diaporamas animés et vidéos data via Remotion

> Discussion du 21/08/2026 (thread BIP X / stratégie contenu). Document de travail à discuter avec Victor, comme VISION.md.
> Rattachée à l'issue #88 (F-58 — carrousel validé → vidéo animée). Cette spec élargit F-58 : même moteur, plus de cas d'usage.
> Garde-fou inaliénable (rappel) : brouillon → validation → draft Postiz. **Jamais de publication automatique.**

---

## 1. Contexte

Atelier produit aujourd'hui du statique : pipeline HTML → PNG (Playwright), slides, stories 9:16. La vidéo est absente du MVP, mais trois besoins concrets émergent :

1. **F-58 (issue #88, déjà au backlog)** : transformer un carrousel validé en vidéo courte 9:16 (motion + musique). Un contenu approuvé, deux formats, coût marginal ~0.
2. **Diaporama logement (Bordeluche)** : une série de photos d'un logement → vidéo d'annonce avec texte overlay (titre, quartier, prix/nuit, capacité), transitions fondues, effet Ken Burns. Avec 5 logements aujourd'hui et une croissance vers 7-10, chaque nouveau bien = une vidéo en quelques minutes si la composition est un template.
3. **Vidéos data (build in public X)** : chiffres animés, compteurs, comparatifs — le format preuve du fil rouge « chiffres réels ».

Point commun : ce sont toutes des **vidéos générées depuis des données et des templates**, pas du footage humain. C'est exactement le territoire de Remotion.

---

## 2. Pourquoi Remotion (et pas autre chose)

| Option | Verdict | Raison |
|---|---|---|
| **Remotion** | **Choix recommandé** | Vidéo = composants React + données. Même pattern mental que le pipeline HTML → PNG : un document itérable, re-rendu quasi gratuit, charte injectée via les design tokens. Coût marginal ~0, rendu local (FFmpeg embarqué dans Remotion v4). |
| FFmpeg seul | Écarté | Faisable pour coller des images, mais texte stylé + transitions propres = pénible. Casse le pattern « tout est un document itérable ». |
| Image-to-video IA (Runway, etc.) | Écarté pour l'instant | Coût par génération, itération lente et chère, rendu non reproductible, risque de dérive DA. Peut revenir plus tard comme brique optionnelle *à l'intérieur* d'une composition Remotion (un plan animé parmi d'autres). |
| CapCut / Canva (manuel) | Écarté | Sort de la boucle agent, non automatisable, non versionné. |
| UGC synthétique (avatars IA) | Hors scope produit | Cas d'usage pubs éventuel, hors promesse Atelier. |

Alignement philosophie : Remotion garde **« tout est un document itérable »** — HTML pour l'image, Markdown pour le texte, React/Remotion pour la vidéo. Un seul langage mental pour les agents, une DA centralisée dans `@atelier/tokens`.

---

## 3. Cas d'usage prioritaires (ordre)

### UC-1 — Diaporama logement (template « annonce »)

- **Entrées** : N photos (bibliothèque de ressources), textes structurés (titre, quartier, prix, capacité, points forts), ratio cible (9:16 par défaut, 16:9 optionnel), durée cible (~20-30 s).
- **Composition** : 1 scène par photo — Ken Burns (zoom/pan lent), fondu enchaîné, texte overlay stylé (police Plus Jakarta Sans, accent doré #E8C97A, hairlines alpha — les tokens existants).
- **Sortie** : MP4 local → draft Postiz (l'upload média existe déjà dans `creer_brouillon_postiz` ; IG/TikTok exigent l'upload préalable, le chemin est connu).
- **Valeur** : le template écrit une fois sert tous les logements. Nouveau bien = nouvelles photos + nouveaux textes.

### UC-2 — F-58 : carrousel validé → vidéo (issue #88)

- Réutilise les slides PNG déjà validées comme frames de la composition (zoom léger + transitions + texte déjà présent dans les slides).
- Musique : optionnelle, hors MVP vidéo (droits + sélection = complexité ; voir §7).

### UC-3 — Vidéos data BIP

- Compteurs animés, barres de progression, comparatifs — générés depuis des données (chiffres du mois, métriques X).
- Plus tard ; UC-1 et UC-2 construisent l'infrastructure.

---

## 4. Architecture proposée

### 4.1 Package

Étendre `packages/render` (aujourd'hui HTML → PNG via Playwright) avec un module vidéo, ou créer `packages/render-video` si l'empreinte Remotion le justifie. Décision à l'implémentation ; l'important est l'interface unique côté métier :

```ts
interface RenderVideoInput {
  brouillonId: string;
  composition: string;          // 'diaporama-annonce' | 'carrousel-anime' | ...
  scenes: Array<{
    imageUrl: string;           // ressource bibliothèque ou slide validée
    texte?: { titre?: string; sousTitre?: string; badge?: string };
    dureeMs?: number;
  }>;
  ratio: '9:16' | '1:1' | '16:9';
  tokensPath?: string;          // injection charte (défaut : tokens actifs du projet)
}
```

### 4.2 Compositions Remotion versionnées

- Dossier `packages/render-video/compositions/` : une composition = un template (UC-1, UC-2…).
- **Les tokens CSS/JSON existants sont la seule source DA** : pas de couleur en dur dans une composition.
- Golden images étendues : extraire 3 frames témoins par composition (début/milieu/fin) et les soumettre à la régression visuelle Playwright existante.

### 4.3 Rendu

- Remotion v4 (FFmpeg embarqué, pas de dépendance système) — cohérent avec « local d'abord, zéro dépendance cloud ».
- **Rendu long = worker asynchrone** : un MP4 20-30 s prend de l'ordre de la minute. Ne pas bloquer l'API Hono ; s'appuyer sur la piste worker asynchrone déjà explorée (branche `docs/worker-asynchrone`).
- Stockage : même règle que les slides — Blob en prod, disque en local.

### 4.4 Modèle de données

- `brouillons` : nouveau type `video` (à côté de carrousel/post/story/article).
- Table `videos` (ou champ) : composition, scènes (JSON), ratio, statut rendu (en_cours/pret/erreur), chemin MP4, durée, frames témoins.
- Le workflow de validation reste **identique** : la vidéo est un livrable de brouillon, validé avant tout envoi Postiz.

### 4.5 MCP

| Outil | Rôle |
|---|---|
| `generer_video` | Lance un rendu (composition + scènes) sur un brouillon `video` — retourne un jobId |
| `statut_video` | État du rendu (le worker est asynchrone) |
| `lister_compositions` | Templates vidéo disponibles + leurs paramètres |

`creer_brouillon_postiz` (futur `publier_brouillon`, cf. STRATEGIE-PUBLICATION.md §7) accepte un brouillon `video` sans changement de contrat : upload du MP4 puis draft.

---

## 5. Effort estimé (solo-dev, ordres de grandeur)

| Étape | Effort | Notes |
|---|---|---|
| Setup Remotion + composition UC-1 (diaporama) | 2-3j | Le gros est la composition elle-même (scènes, Ken Burns, overlay tokens) |
| Worker asynchrone + statut rendu | 1-2j | Dépend de l'avancement de `docs/worker-asynchrone` |
| MCP (`generer_video`, `statut_video`) + UI détail brouillon vidéo | 1-2j | Lecteur `<video>` + frames témoins |
| UC-2 (carrousel → vidéo, F-58) | 1j | Réutilise UC-1, scènes = slides |
| Raccord Postiz vidéo | ~0,5j | Chemin upload déjà connu |
| **Total** | **6-9j** | Post-MVP, après F-45 et l'abstraction Publisher |

---

## 6. Séquence recommandée

1. **Ne rien builder avant la fin du MVP** — la vidéo n'est pas un goulot : X BIP vit très bien en texte + image (PNG actuels).
2. Ouvrir la vidéo par **UC-1 (diaporama logement)** : besoin Bordeluche réel et récurrent, template réutilisable, valeur immédiate.
3. Enchaîner **UC-2 / F-58** (issue #88) une fois le moteur en place — l'issue reste la carte de suivi, cette spec en devient la référence technique.
4. UC-3 (vidéos data) quand le compte X aura assez de chiffres à raconter.

---

## 7. Risques et limites

| Risque | Impact | Mitigation |
|---|---|---|
| Temps de rendu (minutes) | UX bloquée | Worker asynchrone + statut + frames témoins immédiates |
| Empreinte binaire (FFmpeg/Remotion) | Install locale plus lourde | Remotion v4 embarque FFmpeg ; documenter les prérequis |
| Musique (droits) | Contenu démonétisé / muted | Hors MVP vidéo ; plus tard : bibliothèque de pistes libres de droits en ressources |
| Dérive DA dans les compositions | Vidéos « hors charte » | Tokens comme seule source + régression visuelle sur frames témoins |
| Scope creep (transitions infinies, effets) | Atelier devient un monteur vidéo | Les compositions sont des **templates fermés** : l'agent remplit des paramètres, il ne code pas d'effets à la volée |

---

## 8. Décisions demandées à Victor

1. **Remotion comme moteur vidéo unique** (reco : oui) — et les briques IA (image-to-video) seulement plus tard, à l'intérieur des compositions ?
2. **UC-1 diaporama logement en premier** (reco : oui, besoin Bordeluche récurrent) plutôt que F-58 ?
3. **Compositions = templates fermés** paramétrables (reco : oui, anti scope-creep) ou compositions libres écrites par les agents ?
4. **Timing** : post-MVP confirmé, ou UC-1 monte en priorité si la croissance du portefeuille (7-10 biens) accélère ?

*Notes : effort en jours solo-dev, ordres de grandeur. Cette spec étend l'issue #88 (F-58) — ne pas créer d'issue séparée. Le workflow brouillon → validation → draft reste inaliénable, vidéo comprise.*
