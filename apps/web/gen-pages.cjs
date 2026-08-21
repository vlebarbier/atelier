const fs = require('fs');
const path = '/Users/victorlebarbier/Atelier/maquettes/';

function page(titre, dataPage, contenu) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Atelier — ${titre}</title>
<link rel="stylesheet" href="assets/atelier.css">
</head>
<body class="theme-dark" data-page="${dataPage}">
${contenu}
<script src="assets/proto.js"></script>
</body>
</html>
`;
}

// Blog
fs.writeFileSync(path + 'blog.html', page('Blog', 'blog', `
<div class="liste" style="padding:20px 26px;max-width:1180px">
  <div class="liste-head" style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
    <h2 style="font-size:20px;font-weight:700">Blog</h2>
    <span class="badge-count"><span class="n">3</span><span class="attention">1 à valider</span></span>
    <span class="spacer"></span>
    <a class="btn primary" href="detail.html?mode=creer" style="text-decoration:none">+ Nouvel article</a>
  </div>
  <div class="filtres" style="display:flex;gap:8px;align-items:center;margin:12px 0 18px">
    <input class="search-local" placeholder="Rechercher…" style="padding:6px 12px;border-radius:9px;font-size:12.5px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);width:180px">
    <select class="select-icone" style="appearance:none;padding:6px 30px 6px 12px;border-radius:9px;font-size:12.5px;font-weight:600;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)"><option>Tous les statuts</option><option>Brouillons</option><option>À valider</option><option>Publiés</option></select>
    <span class="spacer"></span>
    <select class="select-icone" style="appearance:none;padding:6px 30px 6px 12px;border-radius:9px;font-size:12.5px;font-weight:600;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)"><option>Récent</option><option>Titre</option></select>
  </div>
  <div class="pubs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
    ${[['Pourquoi une conciergerie premium à Bordeaux', 'bordeaux', 'À valider', 'st-a-valider', 'il y a 3 h'],
       ['Le vrai coût d\u2019une gestion locative', 'sauge', 'Brouillon', 'st-brouillon', 'il y a 1 j'],
       ['Rentabilité Airbnb : les chiffres 2026', 'perle', 'Publié', 'st-publie', '10 août']].map(([t, c, s, cls, d]) => `
    <a class="pub" href="detail.html?mode=creer" style="background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;text-decoration:none;color:var(--ink);display:block">
      <div class="cc-${c}" style="height:100px;display:flex;align-items:center;justify-content:center"><span style="font-size:11px;font-weight:700;opacity:.7">Article</span></div>
      <div style="padding:12px 14px">
        <div style="font-size:13.5px;font-weight:700">${t}</div>
        <div class="row" style="margin-top:8px;display:flex;align-items:center;gap:8px">
          <span class="statut ${cls}"><span class="dot"></span>${s}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--ink-3)">${d}</span>
        </div>
      </div>
    </a>`).join('')}
  </div>
</div>
`));

// Activité IA
fs.writeFileSync(path + 'activite.html', page('Activité IA', 'activite', `
<div class="liste" style="padding:20px 26px;max-width:860px">
  <div class="liste-head" style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
    <h2 style="font-size:20px;font-weight:700">Activité IA</h2>
    <span class="badge-count"><span class="n">47 actions</span><span class="attention">aujourd'hui</span></span>
  </div>
  <div style="font-size:12.5px;color:var(--ink-2);margin:8px 0 18px">Journal des actions des agents — production, révision, validation.</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    ${[['Héphaïstos', 'a généré 9 slides', 'Carrousel Bordeluche', 'il y a 2 h', 'st-valide'],
       ['Athéna', 'a validé la conformité charte', 'Carrousel Bordeluche', 'il y a 2 h', 'st-valide'],
       ['Apollon', 'a rédigé la légende Instagram', 'Carrousel Bordeluche', 'il y a 3 h', 'st-valide'],
       ['Minerve', 'a détecté 1 mot interdit', 'Rentabilité', 'il y a 5 h', 'st-a-valider'],
       ['Héphaïstos', 'a généré un post LinkedIn', 'Rentabilité', 'hier', 'st-publie']].map(([a, act, doc, t, cls]) => `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 14px">
      <div style="width:26px;height:26px;border-radius:7px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">${a[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--ink)"><b>${a}</b> ${act}</div>
        <div style="font-size:11.5px;color:var(--ink-3)">${doc}</div>
      </div>
      <span class="statut ${cls}"><span class="dot"></span>${t}</span>
    </div>`).join('')}
  </div>
</div>
`));

// Intégrations
fs.writeFileSync(path + 'integrations.html', page('Intégrations', 'integrations', `
<div class="liste" style="padding:20px 26px;max-width:900px">
  <div class="liste-head" style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
    <h2 style="font-size:20px;font-weight:700">Intégrations</h2>
  </div>
  <div style="font-size:12.5px;color:var(--ink-2);margin:8px 0 18px">Connectez les services qui alimentent l'atelier et publient vos contenus.</div>
  <div class="info-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
    ${[['Postiz', 'Publication multi-réseaux', true, 'Connecté'],
       ['Instagram', 'Graph API — lecture + publication', true, 'Connecté'],
       ['Sanity', 'CMS — articles et pages', false, 'Non connecté'],
       ['GitHub', 'Codebase — assets et charte', false, 'Non connecté'],
       ['Cal.com', 'Rendez-vous', true, 'Connecté'],
       ['PriceLabs', 'Revenue management', false, 'Non connecté']].map(([n, d, ok, s]) => `
    <div class="icard">
      <div class="it" style="display:flex;align-items:center;gap:8px">${n} <span class="itag ${ok ? 'tag-vert' : ''}" style="${ok ? '' : 'color:var(--ink-3);background:var(--surface-2)'}">${s}</span></div>
      <div class="id">${d}</div>
      <div class="actions"><button class="btn ${ok ? '' : 'primary'}" style="flex:1">${ok ? 'Gérer' : 'Connecter'}</button></div>
    </div>`).join('')}
  </div>
</div>
`));

// Paramètres
fs.writeFileSync(path + 'parametres.html', page('Paramètres', 'parametres', `
<div class="liste" style="padding:20px 26px;max-width:720px">
  <div class="liste-head" style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
    <h2 style="font-size:20px;font-weight:700">Paramètres</h2>
  </div>
  <div style="display:flex;flex-direction:column;gap:16px;margin-top:18px">
    <div class="icard">
      <div class="it">Profil</div>
      <div class="id">Nom, avatar et rôle de l'utilisateur.</div>
      <input class="input" placeholder="Nom" value="Victor Le Barbier" style="margin-top:4px">
      <input class="input" placeholder="Email" value="victor@bordeluche.com">
    </div>
    <div class="icard">
      <div class="it">Préférences d'affichage</div>
      <div class="id">Thème, vue par défaut, réseau par défaut.</div>
      <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap">
        <select class="select-icone" style="appearance:none;padding:6px 30px 6px 12px;border-radius:9px;font-size:12.5px;font-weight:600;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)"><option>Thème : sombre</option><option>Thème : clair</option><option>Thème : système</option></select>
        <select class="select-icone" style="appearance:none;padding:6px 30px 6px 12px;border-radius:9px;font-size:12.5px;font-weight:600;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)"><option>Vue : grille</option><option>Vue : liste</option></select>
      </div>
    </div>
    <div class="icard">
      <div class="it">État du système</div>
      <div class="ichecks">
        <div class="icheck"><span class="cb"></span>API connectée</div>
        <div class="icheck"><span class="cb"></span>MCP actif</div>
        <div class="icheck"><span class="cb"></span>Agents branchés</div>
      </div>
    </div>
  </div>
</div>
`));

// Aide
fs.writeFileSync(path + 'aide.html', page('Aide', 'aide', `
<div class="liste" style="padding:20px 26px;max-width:720px">
  <div class="liste-head" style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
    <h2 style="font-size:20px;font-weight:700">Aide</h2>
  </div>
  <div style="display:flex;flex-direction:column;gap:16px;margin-top:18px">
    <div class="icard">
      <div class="it">Démarrage rapide</div>
      <div class="id">Créer un contenu en 3 étapes : <b style="color:var(--ink)">1.</b> Nouvelle publication → <b style="color:var(--ink)">2.</b> décrire le besoin à l'agent → <b style="color:var(--ink)">3.</b> réviser, valider, programmer.</div>
    </div>
    <div class="icard">
      <div class="it">Raccourcis clavier</div>
      <div class="ichecks">
        <div class="icheck" style="background:var(--surface-2);border-color:var(--line)"><span class="cb" style="background:var(--ink-3)"></span>⌘K — rechercher</div>
        <div class="icheck" style="background:var(--surface-2);border-color:var(--line)"><span class="cb" style="background:var(--ink-3)"></span>← / → — naviguer entre les slides</div>
        <div class="icheck" style="background:var(--surface-2);border-color:var(--line)"><span class="cb" style="background:var(--ink-3)"></span>Échap — fermer</div>
      </div>
    </div>
    <div class="icard">
      <div class="it">FAQ</div>
      <div class="id" style="line-height:1.8">
        <b style="color:var(--ink)">Pourquoi l'agent ne répond pas ?</b><br>Vérifiez que le MCP est connecté (Intégrations).<br>
        <b style="color:var(--ink)">Comment changer la charte ?</b><br>Marque → Charte graphique.<br>
        <b style="color:var(--ink)">Où sont mes ressources ?</b><br>Marque → Bibliothèque.
      </div>
    </div>
  </div>
</div>
`));

console.log('5 pages créées : blog, activite, integrations, parametres, aide');
