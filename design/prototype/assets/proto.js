/* ═══════════════════════════════════════════════════════════════
   ATELIER — Prototype navigable (simulation Figma)
   Shell partagé : sidebar + topbar + thème + navigation entre écrans.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  // ── Écrans du prototype ──
  var PAGES = {
    publications: { label: 'Publications', href: 'publications.html' },
    documents:    { label: 'Documents',    href: 'documents.html' },
    blog:         { label: 'Blog',         href: 'blog.html' },
    calendrier:   { label: 'Calendrier',   href: 'calendrier.html' },
    bibliotheque: { label: 'Bibliothèque', href: 'bibliotheque.html' },
    charte:       { label: 'Charte graphique', href: 'charte.html' },
    activite:     { label: 'Activité IA',  href: 'activite.html' },
    integrations: { label: 'Intégrations', href: 'integrations.html' },
    parametres:   { label: 'Paramètres',   href: 'parametres.html' },
    aide:         { label: 'Aide',         href: 'aide.html' }
  };

  // ── Icônes de la sidebar (style Phosphor, stroke 1.8 — cohérent avec la topbar) ──
  var ICONS = {
    publications: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
    documents: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
    blog: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    calendrier: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    bibliotheque: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
    charte: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.4"/><circle cx="12" cy="7.5" r="1.4"/><circle cx="15.5" cy="10" r="1.4"/><path d="M9 15a3.5 3.5 0 006 0"/></svg>',
    activite: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.8 4.9L19 9.6l-5.2 1.6L12 16l-1.8-4.8L5 9.6l5.2-1.7z"/><path d="M19 15l.9 2.4 2.1.9-2.1.8L19 21.5l-.9-2.4-2.1-.8 2.1-.9z"/></svg>',
    integrations: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3v5M9 8H6a3 3 0 000 6h1M9 8h1a3 3 0 010 6H8M15 3v5M15 8h3a3 3 0 010 6h-1M15 8h-1a3 3 0 000 6h2"/></svg>',
    parametres: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2l.5 2.6h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>',
    aide: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 015.6.4c0 2-2.8 2.6-2.8 4.1"/><path d="M12 17.4h.01"/></svg>'
  };
  var page = document.body.getAttribute('data-page') || 'publications';

  // Le mode vient de l'URL (?mode=creer|reviser|valider|programmer), sinon du data-mode.
  var mode = (new URLSearchParams(location.search)).get('mode') || document.body.getAttribute('data-mode') || null;
  if (mode) document.body.setAttribute('data-mode', mode);

  // ── Thème (persistant dans le prototype) ──
  var theme = localStorage.getItem('proto-theme') || 'dark';
  function applyTheme(t) {
    theme = t;
    document.body.className = 'theme-' + t + ' ' + document.body.className.replace(/theme-\w+/, '').trim();
    localStorage.setItem('proto-theme', t);
    var btn = document.getElementById('proto-theme-btn');
    if (btn) {
      // Icône Phosphor : Sun en dark (on peut passer au clair), Moon en light
      btn.innerHTML = t === 'dark'
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    }
  }

  // ── Construction du shell ──
  function buildShell() {
    if (document.getElementById('proto-shell')) return;
    var shell = document.createElement('div');
    shell.id = 'proto-shell';
    shell.className = 'app-shell';
    shell.innerHTML =
      '<aside class="sidebar" id="proto-sidebar">' +
        '<div class="sidebar-logo"><span class="logo-mark">◈</span><span class="logo-name">Atelier</span></div>' +
        '<div class="ms-label">Travail</div>' +
        PAGES_LINKS('travailler') +
        '<div class="ms-label">Marque</div>' +
        PAGES_LINKS('marque') +
        '<div class="ms-label">Agents</div>' +
        PAGES_LINKS('agents') +
        '<div class="sidebar-footer">' +
          '<div class="ms-item" data-nav="parametres.html"><span class="ms-ico">' + ICONS.parametres + '</span><span class="ms-txt">Paramètres</span></div>' +
          '<div class="ms-item" data-nav="aide.html"><span class="ms-ico">' + ICONS.aide + '</span><span class="ms-txt">Aide</span></div>' +
        '</div>' +
      '</aside>' +
      '<div class="app-main">' +
        '<div class="topbar">' +
          '<button class="icon-btn" id="proto-collapse-btn" title="Replier la barre latérale">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.4 4.9 8.3 12l7.1 7.1-1.7 1.7L5 12l8.7-8.8z"/></svg>' +
          '</button>' +
          '<span class="topbar-spacer"></span>' +
          '<button class="icon-btn" title="Rechercher (⌘K)">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
          '</button>' +
          '<button class="icon-btn" title="Notifications">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>' +
          '</button>' +
          '<button class="icon-btn" id="proto-theme-btn" title="Basculer le thème"></button>' +
        '</div>' +
        '<div id="proto-content">' + document.body.innerHTML + '</div>' +
      '</div>';

    document.body.innerHTML = '';
    document.body.appendChild(shell);
    document.getElementById('proto-content').id = 'proto-content';
    // restaure le contenu
    document.body.insertBefore(shell, null);

    // Sidebar cliquable
    shell.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () { window.location.href = el.getAttribute('data-nav'); });
    });

    // Thème
    var tb = document.getElementById('proto-theme-btn');
    if (tb) tb.addEventListener('click', function () { applyTheme(theme === 'dark' ? 'light' : 'dark'); });

    // Replier la sidebar
    var cb = document.getElementById('proto-collapse-btn');
    if (cb) cb.addEventListener('click', function () {
      var sh = document.getElementById('proto-shell');
      if (sh) sh.classList.toggle('collapsed');
    });

    // Mark active
    shell.querySelectorAll('[data-nav]').forEach(function (el) {
      if (el.getAttribute('data-nav') === (PAGES[page] || {}).href) el.classList.add('active');
    });
  }

  function PAGES_LINKS(grp) {
    var items = '';
    var list = grp === 'travailler'
      ? ['publications', 'documents', 'blog', 'calendrier']
      : grp === 'marque'
        ? ['bibliotheque', 'charte']
        : ['activite', 'integrations'];
    list.forEach(function (p) {
      items += '<div class="ms-item" data-nav="' + PAGES[p].href + '"><span class="ms-ico">' + (ICONS[p] || '') + '</span><span class="ms-txt">' + PAGES[p].label + '</span></div>';
    });
    return items;
  }

  var MODE_LABELS = { creer: 'Créer', reviser: 'Réviser', programmer: 'Programmer' };

  // ── Stepper cliquable (vue détail) — 3 étapes : le rail droit change seul ──
  function buildStepper() {
    if (!mode) return;
    var order = ['creer', 'reviser', 'programmer'];
    var idx = order.indexOf(mode);
    var wrap = document.getElementById('proto-stepper');
    if (!wrap) return;
    var html = '<div class="steps">';
    order.forEach(function (m, i) {
      if (i > 0) html += '<span class="step line"></span>';
      var cls = i < idx ? 'done' : (i === idx ? 'current' : '');
      html += '<a class="step ' + cls + '" href="detail.html?mode=' + m + '" style="text-decoration:none;cursor:pointer">' +
        '<span class="sd"></span><span class="sl">' + MODE_LABELS[m] + '</span></a>';
    });
    html += '</div>';
    wrap.innerHTML = html;
  }

  // ── Exécution ──
  buildShell();
  applyTheme(theme);
  buildStepper();
  initViewToggle();

  // ── Toggle grille/liste (les scripts inline des pages sont tués par le
  // déplacement innerHTML du shell → la logique vit ici, exécutée APRÈS) ──
  function initViewToggle() {
    var buttons = document.querySelectorAll('.view-toggle button');
    if (!buttons.length) return;
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        var pubs = document.querySelector('.pubs');
        if (pubs) pubs.classList.toggle('vue-liste', i === 1);
      });
    });
  }

  // Publie pour les pages
  window.Proto = { page: page, mode: mode, navigate: function (href) { window.location.href = href; } };
})();
