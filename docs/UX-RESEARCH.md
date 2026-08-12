# UX RESEARCH — Atelier : repenser le parcours de bout en bout

> 12/08/2026 · Deep research basée sur : entretien structuré (Victor), analyse des
> outils de référence (Canva, Buffer, Later, Linear, Notion, Figma, tools de
> proofing/approval), principes UX (progressive disclosure — NN/g, maker/checker,
> annotation, versioning) et recommandations design (ui-ux-pro-max).
> Objectif : définir CE DONT ON A BESOIN et COMMENT le présenter, de bout en bout.

## ⭐ Le principe directeur (Saint-Exupéry)

> « La perfection est atteinte, non quand il n'y a plus rien à ajouter,
> mais quand il n'y a plus rien à retirer. »

**Toute décision UX se juge à cette aune : est-ce qu'on peut RETIRER quelque chose ?
Pas ajouter.** Le produit actuel souffre d'un excès de boutons, panneaux et features
que personne n'utilise — la priorité est de SOUSTRAIRE, pas d'empiler.

---

## 1. Les 5 décisions structurantes (issues de l'entretien)

| Question | Réponse de Victor | Conséquence design |
|---|---|---|
| **Pour qui ?** | D'abord moi, mais vendable/partageable | Zéro friction pour un expert, MAIS aucune hypothèse de connaissance pour les futurs users → l'interface doit s'expliquer elle-même |
| **Positionnement** | **Atelier est un outil générique** ; Bordeluche n'est que le premier use case/client | **Aucune identité visuelle Bordeluche** dans l'outil : DA neutre SaaS, pas d'accent bordeaux |
| **Le cœur ?** | **Le CHAT est super important** — il pilote la modification du contenu (HTML) ET des textes réseaux | Le chat est l'outil central permanent : c'est lui qui modifie le HTML et les légendes |
| **Densité ?** | Ne sait pas → je recommande | **Progressive disclosure** (NN/g) + **retirer tout ce qui ne sert pas** (Saint-Exupéry) |
| **Style ?** | DA lumineuse/neutre SaaS (gris clair, blanc) | **Changement de DA** : fonds clairs, neutres, professionnels |
| **Priorité ?** | Le parcours complet impeccable (création → révision → validation → programmation → publication) | Le tunnel AVANT le polish des pages secondaires |

---

## 2. Corrections structurantes (retour Victor, 2e passe)

### 2.1 Le chat est LE cœur — permanent et tout-puissant
- Le chat **pilote la modification du contenu lui-même** : le HTML source des slides
  ET les textes d'accompagnement (légendes, hashtags) pour les réseaux sociaux
- Il n'est pas « un onglet parmi d'autres » : c'est **l'outil central**, toujours
  accessible, quel que soit le mode
- L'agent modifie le HTML via le chat → les slides se régénèrent → l'aperçu se met
  à jour. Modifier la légende via le chat → les textes réseaux se mettent à jour

### 2.2 Exposer et exporter le HTML
- Le HTML est la **source de vérité** (déjà le principe) — il doit être **visible et
  exportable** en plus du PNG/PDF
- **Export HTML natif** : un bouton qui télécharge le HTML source (autonome, avec
  styles embarqués) — en plus des exports PNG et PDF existants
- L'onglet Source n'est pas un détail : c'est le document maître

### 2.3 Les notes de révision → retirées de l'UI
- Victor : « une feature qu'un user n'utilise pas vraiment »
- **Retirer le panneau Notes de révision de l'interface** (Saint-Exupéry)
- Leur usage légitime : **interne à l'agent** (contexte pour le versioning / les
  prochaines modifications) — pas exposé comme un champ de formulaire

### 2.4 Le diff avant/après — conservé (confiance)
- Le diff reste (facteur de confiance pour laisser l'agent agir librement) —
  validé par Victor (« je te fais confiance »)

### 2.5 DA neutre — pas d'accent Bordeluche
- Atelier est un outil générique : **aucune référence visuelle à Bordeluche**
- Palette neutre SaaS (voir §5) — l'accent bordeaux est retiré

---

## 3. Ce que font les outils de référence (analyse)

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

## 4. Le diagnostic du problème actuel

### Pourquoi « trop de boutons, pas d'ordre logique » ?
1. **La vue détail est un couteau suisse statique** : le header affiche stepper + type + statut + exporter + supprimer, le panneau droit affiche notes + checklist + onglets + chat + bouton programmer — **tout est visible en même temps, quel que soit le moment du workflow**
2. **Des features que personne n'utilise** : les notes de révision en sont l'exemple — elles occupent l'espace sans servir
3. **Pas de hiérarchie de moment** : quand on est en création (chat agent), pourquoi voir « Programmer » ? Quand on valide, pourquoi voir « Régénérer » ?
4. **La densité est uniforme** : le panneau droit et le header ont le même poids visuel que le contenu — le contenu ne domine pas

### Le principe qui manque
> **« Une étape à la fois. Et retire ce qui ne sert pas. »** À chaque moment du
> workflow, il y a UNE action principale, un CONTENU à regarder, et un minimum de
> distractions. Tout le reste est révélé progressivement — ou supprimé.

---

## 5. La vision : le parcours de bout en bout repensé

### Les 4 modes contextuels de la vue détail

```
┌─────────────────────────────────────────────────────────────┐
│  MODE 1 : CRÉER         MODE 2 : RÉVISER    MODE 3 : VALIDER │
│  (statut: brouillon)    (statut: brouillon) (statut: a-valider)│
│                                                               │
│  Le CHAT domine          La SLIDE domine    Le WORKFLOW domine│
│  (l'agent crée)          (l'agent modifie   (checklist +      │
│                           via le chat)       conformité + diff)│
│                                                               │
│  Le chat : TOUJOURS ACCESSIBLE (bandeau bas ou panneau,       │
│  repliable) — c'est le moyen de piloter l'agent               │
└─────────────────────────────────────────────────────────────┘

  MODE 4 : PROGRAMMER (statut: valide)
  La PLANIFICATION domine : créneau + calendrier intégré
```

### Le chat : permanent, toujours accessible
- Quel que soit le mode, le chat reste accessible (panneau latéral ou bandeau bas
  repliable) — il ne disparaît jamais
- Il peut tout faire : modifier le HTML, régénérer, modifier les légendes/hashtags,
  répondre aux questions, proposer des versions

### Ce qui change concrètement par mode

| | CRÉER | RÉVISER | VALIDER | PROGRAMMER |
|---|---|---|---|---|
| **Zone dominante** | Chat agent (large) | Slide (centrale, grande) | Checklist + conformité + diff | Calendrier + créneau |
| **Header** | Titre + statut discret | Titre + statut discret | Titre + statut **mis en avant** | Titre + statut |
| **Panneau** | Chat + Source (HTML) | Slide + aperçu publié | Checklist + diff + approbation | Créneau + réseaux |
| **Action primaire** | « Demander » | « Enregistrer » | « Approuver » / « Demander des modifs » | « Programmer » |
| **Masqué / retiré** | Notes révision | Notes révision | Notes révision | Notes révision |

### La règle d'or
> **Une action primaire visible par mode. Le chat toujours accessible. Le reste en
> surcouche (popover/menu). Retirer tout ce qui ne sert pas (Saint-Exupéry).**

---

## 6. La nouvelle DA — « claire, éditoriale, professionnelle, neutre »

**Direction validée par Victor** : lumineuse/neutre SaaS (abandon des fonds noirs),
**sans identité Bordeluche** (outil générique).

| Token | Valeur recommandée | Note |
|---|---|---|
| Background | `#F7F7F5` (gris chaud très clair) | Éditorial, pas clinique |
| Surface (cards) | `#FFFFFF` | Contraste doux |
| Text primaire | `#1A1A18` | Presque noir, chaud |
| Text secondaire | `#6B6B66` | Gris chaud |
| Lignes | `rgba(26,26,24,0.08)` | Hairlines, pas de bordures lourdes |
| Accent (1 seul) | Neutre — indigo doux `#4F5BD5` ou bleu ardoise `#3B5BDB` | Zéro multi-accent, rien de Bordeluche |
| Statuts | À valider = ambre · Validé = vert · Publié = vert plein · Brouillon = neutre | Conservé |
| Typo | Plus Jakarta Sans (UI) | Moderne, SaaS, lisible |
| Rayons | 10-12px | Doux |
| Ombres | Douces, diffuses | Profondeur légère |

**Anti-patterns à bannir** : fonds noirs, double-bezel, grain, dégradés, accents multiples,
emojis-icônes, toute référence visuelle à Bordeluche (couleurs, logos).

---

## 7. Le plan d'action (chantiers prioritaires)

### Phase A — Le parcours (la priorité n°1)
1. **A1. Modes contextuels de la vue détail** (le plus gros morceau) : la page se transforme selon le statut — un seul panneau actif, une action primaire, progressive disclosure
2. **A2. Chat = pilote du contenu** : le chat modifie le HTML (régénération) et les textes réseaux ; aperçu publié intégré
3. **A3. Validation = décision explicite** : « Approuver » et « Demander des modifs » (avec note obligatoire si rejet) — le pattern maker/checker
4. **A4. Programmation intégrée** : créneau intelligent + calendrier dans le mode PROGRAMMER (déjà en chantier avec t_eb857163)

### Phase B — La DA et la soustraction
5. **B1. Refonte DA claire neutre** : tokens lumineux, suppression des fonds noirs, aucun accent Bordeluche
6. **B2. Soustraction** (Saint-Exupéry) : **retirer les notes de révision de l'UI** (usage interne agent/versioning seulement), réduire les boutons du header, masquer par mode

### Phase C — Les exports
7. **C1. Export HTML natif** : bouton « Exporter le HTML » (source autonome, styles embarqués) en plus des PNG/PDF existants

### Phase D — Le reste
8. **D1. Calendrier comme vue de planification** (intégrer l'aperçu post, la liste « à programmer »)
9. **D2. Pages secondaires** (Paramètres, Aide, Intégrations) — déjà en chantier
10. **D3. Gamification** (backlog — déjà spécifiée)

---

## 8. Questions ouvertes (à trancher au fil de l'eau)

1. **Le chat en mode RÉVISER : panneau latéral ou bandeau bas ?** (recommandé : panneau latéral repliable, toujours visible — le chat est le cœur)
2. **L'export HTML : bouton dédié dans Exporter, ou menu déroulant Exporter (PNG/PDF/HTML) ?** (recommandé : menu déroulant — un seul bouton)
3. **Le diff avant/après : intégré au mode VALIDER** (recommandé : oui — c'est là qu'on décide)
4. **Faut-il garder la checklist de validation en dur, ou l'agent la génère selon la charte ?** (recommandé : l'agent la génère — cohérent avec la conformité F-33)

---

## 9. Références

- Saint-Exupéry — « Perfection is achieved when there is nothing left to take away »
- NN/g — Progressive Disclosure : https://www.nngroup.com/articles/progressive-disclosure/
- Krock — Design review software (annotation, approval, versioning) : https://krock.io/blog/design-review-software/
- Ybug — Content approval workflow best practices : https://ybug.io/blog/content-approval-workflow
- Reddit r/UXDesign — Maker/Checker flow best practices
- ui-ux-pro-max — design system recommandé (Plus Jakarta Sans, palette claire)
- SPEC-TUNNEL.md, SPEC-ASK-USER.md, SPEC-WORKER-ASYNCHRONE.md (déjà écrites, compatibles)
