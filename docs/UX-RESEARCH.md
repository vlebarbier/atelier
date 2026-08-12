# UX RESEARCH — Atelier : repenser le parcours de bout en bout

> 12/08/2026 · Deep research basée sur : entretien structuré (Victor), analyse des
> outils de référence (Canva, Buffer, Later, Linear, Notion, Figma, tools de
> proofing/approval), principes UX (progressive disclosure — NN/g, maker/checker,
> annotation, versioning) et recommandations design (ui-ux-pro-max).
> Objectif : définir CE DONT ON A BESOIN et COMMENT le présenter, de bout en bout.

---

## 1. Les 5 décisions structurantes (issues de l'entretien)

| Question | Réponse de Victor | Conséquence design |
|---|---|---|
| **Pour qui ?** | D'abord moi, mais vendable/partageable | Zéro friction pour un expert, MAIS aucune hypothèse de connaissance pour les futurs users → l'interface doit s'expliquer elle-même |
| **Le cœur ?** | Ça change selon le moment : création = agent, révision = visuel, validation = workflow | **Architecture à MODES CONTEXTUELS** : une page qui se transforme selon l'étape, pas une page statique surchargée |
| **Densité ?** | Ne sait pas → je recommande | **Progressive disclosure** (NN/g) : l'essentiel visible, le reste révélé au besoin |
| **Style ?** | DA lumineuse/neutre SaaS (gris clair, blanc) | **Changement de DA** : abandonner les fonds noirs dramatiques pour une interface claire, professionnelle, éditoriale |
| **Priorité ?** | Le parcours complet impeccable (création → révision → validation → programmation → publication) | Le tunnel AVANT le polish des pages secondaires |

---

## 2. Ce que font les outils de référence (analyse)

### Canva (création visuelle)
- **Le canvas EST la page** : pas de panneau qui domine, le contenu est roi
- Les outils contextuels apparaissent **quand on sélectionne un élément** (pas avant)
- Templates = point de départ systématique (jamais de page blanche)

### Buffer / Later (planification)
- Le **calendrier visuel** est la vue principale : on voit le mois, on glisse, on programme
- L'aperçu du post (visuel + légende) est **intégré au calendrier**, pas dans un éditeur séparé
- Actions simples : approuver, reprogrammer, publier — jamais plus de 2-3 boutons par post

### Linear (gestion de projet — la référence « over-engineered minimal »)
- **Une seule action primaire par vue** : tout le reste est secondaire
- Le panneau de détails est **contextuel et repliable** — il n'écrase jamais le contenu
- La barre du haut = recherche + actions globales uniquement (déjà appliqué chez nous ✓)
- Les métadonnées (statut, priorité) sont **discrètes dans le header**, pas criardes

### Notion (progressive disclosure — la masterclass)
- Les outils avancent **par niveaux** : clic → popover → page pleine
- Rien n'est détruit, tout est révélé progressivement
- Les blocs complexes se déplient **à la demande** (jamais tout visible d'un coup)

### Outils de proofing/approval (Filestage, Ziflow, PageProof, Ybug)
- **L'annotation est attachée à l'endroit précis** (coordonnées sur l'image), pas dans un chat séparé
- **Séparer feedback et approbation** : on collecte les retours, puis on demande la décision finale (bouton explicite)
- **Le versioning est central** : comparer les versions côte à côte, les commentaires suivent les versions
- **Approval traçable** : qui a approuvé quoi, quand

---

## 3. Le diagnostic du problème actuel

### Pourquoi « trop de boutons, pas d'ordre logique » ?
1. **La vue détail est un couteau suisse statique** : le header affiche stepper + type + statut + exporter + supprimer, le panneau droit affiche notes + checklist + onglets + chat + bouton programmer — **tout est visible en même temps, quel que soit le moment du workflow**
2. **Pas de hiérarchie de moment** : quand on est en création (chat agent), pourquoi voir « Programmer » ? Quand on valide, pourquoi voir « Régénérer » ?
3. **Les outils ne suivent pas l'état** : chaque étape du tunnel devrait révéler SES outils, masquer les autres
4. **La densité est uniforme** : le panneau droit (notes + checklist + onglets) et le header (5 contrôles) ont le même poids visuel que le contenu — le contenu ne domine pas

### Le principe qui manque
> **« Une étape à la fois. »** À chaque moment du workflow, il y a UNE action principale, un CONTENU à regarder, et un minimum de distractions. Tout le reste est révélé progressivement.

---

## 4. La vision : le parcours de bout en bout repensé

### Les 4 modes contextuels de la vue détail

```
┌─────────────────────────────────────────────────────────────┐
│  MODE 1 : CRÉER         MODE 2 : RÉVISER    MODE 3 : VALIDER │
│  (statut: brouillon)    (statut: brouillon) (statut: a-valider)│
│                                                               │
│  Le CHAT DOMINE         La SLIDE domine    Le WORKFLOW domine │
│  ┌─────────────────┐    ┌──────────────┐   ┌───────────────┐  │
│  │ agent │ source  │    │ slide       │   │ checklist     │  │
│  │ (les 2 onglets  │    │ + aperçu     │   │ + conformité  │  │
│  │ de création)    │    │ + légende    │   │ + diff        │  │
│  └─────────────────┘    └──────────────┘   └───────────────┘  │
│  Les slides : mini     Les slides : grand  Les slides :     │
│  aperçu (l'agent       aperçu central      aperçu + diff    │
│  travaille)                                                    │
└─────────────────────────────────────────────────────────────┘

  MODE 4 : PROGRAMMER (statut: valide)
  La PLANIFICATION domine : créneau + calendrier intégré
  Les slides : mini aperçu
```

### Ce qui change concrètement par mode

| | CRÉER | RÉVISER | VALIDER | PROGRAMMER |
|---|---|---|---|---|
| **Zone dominante** | Chat agent (large) | Slide (centrale, grande) | Checklist + conformité | Calendrier + créneau |
| **Header** | Titre + statut discret | Titre + statut discret | Titre + statut **mis en avant** | Titre + statut |
| **Panneau droit** | Onglets création (agent/source) | Onglets révision (slides/réseaux/aperçu) | Checklist + diff + approbation | Créneau + réseaux |
| **Action primaire** | « Demander » | « Enregistrer » | « Approuver » / « Demander des modifs » | « Programmer » |
| **Masqué** | Tout le reste | Tout le reste | Tout le reste | Tout le reste |

### La règle d'or
> **Une action primaire visible par mode. Les secondaires en surcouche (popover/menu).**
> Le contenu (slide) domine toujours visuellement — jamais écrasé par les contrôles.

---

## 5. La nouvelle DA — « claire, éditoriale, professionnelle »

**Direction validée par Victor** : lumineuse/neutre SaaS (abandon des fonds noirs).

| Token | Valeur recommandée | Note |
|---|---|---|
| Background | `#F7F7F5` (gris chaud très clair) | Éditorial, pas clinique |
| Surface (cards) | `#FFFFFF` | Contraste doux |
| Text primaire | `#1A1A18` | Presque noir, chaud |
| Text secondaire | `#6B6B66` | Gris chaud |
| Lignes | `rgba(26,26,24,0.08)` | Hairlines, pas de bordures lourdes |
| Accent (1 seul) | Bordeaux `#6E3B32` (rappel Bordeluche) | Zéro multi-accent |
| Statuts | À valider = ambre · Validé = vert · Publié = vert plein · Brouillon = neutre | Conservé |
| Typo | Plus Jakarta Sans (UI) + Cormorant Garamond (display, optionnel) | Moderne, SaaS, lisible |
| Rayons | 10-12px | Doux |
| Ombres | Douces, diffuses | Profondeur légère |

**Anti-patterns à bannir** : fonds noirs, double-bezel, grain, dégradés, accents multiples, emojis-icônes.

---

## 6. Le plan d'action (chantiers prioritaires)

### Phase A — Le parcours (la priorité n°1)
1. **A1. Modes contextuels de la vue détail** (le plus gros morceau) : la page se transforme selon le statut — un seul panneau actif, une action primaire, progressive disclosure
2. **A2. Révision centrée slide** : la slide en grand, l'annotation attachée au visuel (pas seulement le chat), aperçu publié intégré
3. **A3. Validation = décision explicite** : « Approuver » et « Demander des modifs » (avec note obligatoire si rejet) — le pattern maker/checker
4. **A4. Programmation intégrée** : créneau intelligent + calendrier dans le mode PROGRAMMER (déjà en chantier avec t_eb857163)

### Phase B — La DA
5. **B1. Refonte DA claire** : tokens lumineux, suppression des fonds noirs, harmonisation (chantier transverse — toutes les pages)

### Phase C — Le reste
6. **C1. Calendrier comme vue de planification** (intégrer l'aperçu post, la liste « à programmer »)
7. **C2. Pages secondaires** (Paramètres, Aide, Intégrations) — déjà en chantier
8. **C3. Gamification** (backlog — déjà spécifiée)

---

## 7. Questions ouvertes (à trancher au fil de l'eau)

1. **Le chat agent reste-t-il visible en mode RÉVISER ?** (recommandé : réduit en bandeau bas, pas dominant — l'agent est un collègue, pas le patron)
2. **Les notes de révision : onglet dédié ou popover ?** (recommandé : popover depuis le header — elles sont rarement la priorité)
3. **La checklist : visible par défaut en mode VALIDER, sinon masquée** (recommandé : oui)
4. **Le diff avant/après : intégré au mode VALIDER** (recommandé : oui — c'est là qu'on décide)

---

## 8. Références

- NN/g — Progressive Disclosure : https://www.nngroup.com/articles/progressive-disclosure/
- Krock — Design review software (annotation, approval, versioning) : https://krock.io/blog/design-review-software/
- Ybug — Content approval workflow best practices : https://ybug.io/blog/content-approval-workflow
- Reddit r/UXDesign — Maker/Checker flow best practices
- ui-ux-pro-max — design system recommandé (Plus Jakarta Sans, palette claire)
- SPEC-TUNNEL.md, SPEC-ASK-USER.md, SPEC-WORKER-ASYNCHRONE.md (déjà écrites, compatibles)
