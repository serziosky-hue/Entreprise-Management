// app.js — Initialisation principale, navigation, fonctions globales
'use strict';

// ─── Utilitaires globaux ───────────────────────────────────────────────────────

window.escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};

window.safeMap = (arr, fn) => Array.isArray(arr) ? arr.map(fn) : [];
window.safeFilter = (arr, fn) => Array.isArray(arr) ? arr.filter(fn) : [];
window.safeFind = (arr, fn) => Array.isArray(arr) ? arr.find(fn) : undefined;

window.genId = (prefix = 'ID') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;

window.genInvoiceNum = (prefix, existingItems) => {
  const year = new Date().getFullYear();
  const nums = safeFilter(existingItems, i => i.number && i.number.startsWith(`${prefix}-${year}`))
    .map(i => parseInt(i.number.split('-')[2] || 0)).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
};

window.formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('fr-FR');
};

window.formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleString('fr-FR');
};

window.formatCurrency = (amount, currency) => {
  const cur = currency || APP?.config?.currency || 'Ar';
  const n = parseFloat(amount) || 0;
  // Format manually to avoid locale-specific non-breaking spaces (\u00a0 / \u202f)
  // that jsPDF renders as '/'
  const parts = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = n < 0 ? '-' : '';
  return sign + parts + ' ' + cur;
};

window.amountToWords = (amount) => {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  function below100(n) {
    if (n < 20) return units[n];
    const t = Math.floor(n / 10), u = n % 10;
    if (t === 7 || t === 9) return tens[t] + (u === 1 && t === 7 ? '-et-' : '-') + units[10 + u];
    return tens[t] + (u === 1 && t !== 8 ? '-et-un' : u > 0 ? '-' + units[u] : (t === 8 ? 's' : ''));
  }
  function below1000(n) {
    if (n < 100) return below100(n);
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? 'cent' : units[h] + '-cent') + (r > 0 ? (h > 1 ? 's-' : '-') + below100(r) : (h > 1 ? 's' : ''));
  }
  const n = Math.round(parseFloat(amount) || 0);
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + amountToWords(-n);
  if (n < 1000) return below1000(n);
  if (n < 1000000) {
    const m = Math.floor(n / 1000), r = n % 1000;
    return (m === 1 ? 'mille' : below1000(m) + '-mille') + (r > 0 ? '-' + below1000(r) : '');
  }
  const m = Math.floor(n / 1000000), r = n % 1000000;
  return below1000(m) + '-million' + (m > 1 ? 's' : '') + (r > 0 ? '-' + amountToWords(r) : '');
};

window.showToast = (message, type = 'info', duration = 3500) => {
  const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-500', info: 'bg-blue-600' };
  const icons = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>',
    error: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
  };
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm';
    document.body.appendChild(el);
    return el;
  })();
  const toast = document.createElement('div');
  toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 transform translate-x-0 opacity-100`;
  toast.innerHTML = `<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${icons[type]}</svg><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; setTimeout(() => toast.remove(), 300); }, duration);
};

window.showModal = (html, opts = {}) => {
  const existing = document.getElementById('global-modal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'global-modal';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
  overlay.innerHTML = `<div class="bg-gray-800 rounded-2xl shadow-2xl w-full ${opts.size || 'max-w-lg'} max-h-[90vh] overflow-y-auto">${html}</div>`;
  if (!opts.persistent) {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }
  document.body.appendChild(overlay);
  document.addEventListener('keydown', _modalEscHandler);
};

window._modalEscHandler = (e) => {
  if (e.key === 'Escape') closeModal();
};

window.closeModal = () => {
  const m = document.getElementById('global-modal');
  if (m) m.remove();
  document.removeEventListener('keydown', _modalEscHandler);
};

window.showConfirm = ({ title, message, icon = 'warning', confirmText = 'Confirmer', cancelText = 'Annuler', onConfirm, onCancel }) => {
  const iconColors = { warning: 'text-yellow-400', danger: 'text-red-400', info: 'text-blue-400', success: 'text-green-400' };
  const iconSvgs = {
    warning: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
    danger: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    success: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
  };
  showModal(`
    <div class="p-6 text-center">
      <div class="flex justify-center mb-4">
        <svg class="w-12 h-12 ${iconColors[icon] || iconColors.warning}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">${iconSvgs[icon] || iconSvgs.warning}</svg>
      </div>
      <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(title)}</h3>
      <p class="text-gray-300 mb-6 text-sm">${escapeHtml(message)}</p>
      <div class="flex gap-3 justify-center">
        <button onclick="closeModal();${onCancel ? 'window._confirmCancel()' : ''}" class="px-5 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium">${escapeHtml(cancelText)}</button>
        <button id="confirm-btn" class="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `, { persistent: false });
  document.getElementById('confirm-btn').onclick = () => { closeModal(); if (onConfirm) onConfirm(); };
  if (onCancel) window._confirmCancel = onCancel;
};

window.showPasswordPrompt = (title, onSuccess, errorMsg = '') => {
  showModal(`
    <div class="p-6">
      <h3 class="text-lg font-bold text-white mb-4">${escapeHtml(title)}</h3>
      ${errorMsg ? `<p class="text-red-400 text-sm mb-3">${escapeHtml(errorMsg)}</p>` : ''}
      <div class="relative mb-4">
        <input id="pwd-prompt-input" type="password" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm pr-10" placeholder="Mot de passe">
        <button type="button" onclick="const i=document.getElementById('pwd-prompt-input');i.type=i.type==='password'?'text':'password'" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        </button>
      </div>
      <div class="flex gap-3">
        <button onclick="closeModal()" class="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm">Annuler</button>
        <button id="pwd-confirm-btn" class="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium">Confirmer</button>
      </div>
    </div>
  `);
  const input = document.getElementById('pwd-prompt-input');
  const btn = document.getElementById('pwd-confirm-btn');
  input.focus();
  const handle = () => { closeModal(); onSuccess(input.value); };
  btn.onclick = handle;
  input.onkeydown = (e) => { if (e.key === 'Enter') handle(); };
};

window.buildPagination = (totalItems, currentPage, perPage, onPageChange) => {
  const totalPages = Math.ceil(totalItems / perPage);
  if (totalPages <= 1) return '';
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return `<div class="flex items-center gap-1 justify-center mt-4 flex-wrap">
    <button onclick="(${onPageChange})(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 text-sm">‹</button>
    ${pages.map(p => p === '...' ? '<span class="text-gray-500 text-sm">…</span>' :
      `<button onclick="(${onPageChange})(${p})" class="px-3 py-1 rounded text-sm ${p === currentPage ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}">${p}</button>`
    ).join('')}
    <button onclick="(${onPageChange})(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 text-sm">›</button>
    <span class="text-gray-500 text-xs ml-2">${totalItems} éléments</span>
  </div>`;
};

window.logout = () => {
  showConfirm({
    title: 'Déconnexion',
    message: 'Voulez-vous vous déconnecter ?',
    icon: 'info',
    confirmText: 'Déconnecter',
    onConfirm: () => {
      APP.addLog('INFO', 'Déconnexion', { poste: APP.currentPoste?.name });
      // Arrêter le heartbeat de présence et supprimer la présence Firebase
      clearInterval(APP._presHeartbeat);
      try {
        const session = JSON.parse(sessionStorage.getItem('emp_session') || 'null');
        if (session?.mode === 'online' && FM.db) {
          const posteId = APP.currentPoste?.id || 'admin';
          FM._ref(`presence/${posteId}`).remove().catch(console.warn);
        }
      } catch(e) { console.warn('[presence remove]', e); }
      sessionStorage.clear();
      if (!APP?.config?.rememberMe) localStorage.removeItem('emp_remember');
      SM.stopRealtimeSync(); // Arrêter les listeners temps réel
      FM.detachAll();
      window.location.href = 'login.html';
    }
  });
};

// ─── Application principale ───────────────────────────────────────────────────

window.APP = {
  config: null,
  subscription: null,
  currentPoste: null,
  _activeTab: 'dashboard',
  _chartInstances: {},

  async init() {
    // Afficher l'écran de chargement immédiatement
    this._showLoader('Démarrage…');

    // Appliquer le thème : système par défaut, sinon préférence sauvegardée
    this._applyTheme(localStorage.getItem('emp_theme') || 'system');

    // Écouter les changements de thème système (si l'user est en mode "system")
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!localStorage.getItem('emp_theme') || localStorage.getItem('emp_theme') === 'system') {
        this._applyTheme('system');
      }
    });

    // Récupérer session
    const session = JSON.parse(sessionStorage.getItem('emp_session') || 'null');
    if (!session) { window.location.href = 'login.html'; return; }

    // Init DB
    this._updateLoader(null, 'Ouverture de la base de données…');
    await DB.init(session.enterpriseId);

    // Init Firebase (toujours, même en local — nécessaire pour les sauvegardes manuelles cloud)
    FM.init(session.enterpriseId);

    // Init SyncManager
    SM.init(session.mode);

    // Charger config
    this._updateLoader(null, 'Chargement de la configuration…');
    this.config = await DB.getConfig();
    if (!this.config) {
      showToast('Configuration introuvable. Reconnectez-vous.', 'error');
      setTimeout(() => window.location.href = 'login.html', 2000);
      return;
    }

    // Normaliser postes (Firebase peut retourner un objet indexé plutôt qu'un tableau)
    if (this.config.postes && !Array.isArray(this.config.postes)) {
      this.config.postes = Object.values(this.config.postes).filter(p => p && p.id);
      await DB.saveConfig(this.config);
    }

    // Afficher le nom de l'entreprise dans le loader
    this._updateLoader(this.config.name || 'Mon Entreprise', 'Vérification de l\'abonnement…');

    this.subscription = await DB.get('config', 'subscription') || {};

    // Si mode online : synchroniser l'abonnement depuis Firebase avant la vérification
    // (permet de récupérer un réabonnement fait par un autre poste)
    if (session.mode === 'online') {
      try {
        const freshSub = await FM.fetchSubscription();
        if (freshSub) {
          await DB.put('config', { key: 'subscription', data: freshSub });
          this.subscription = { data: freshSub };
        }
      } catch(e) { console.warn('[sub sync]', e); }
    }

    // Vérifier abonnement
    if (!SUBS.check()) return;

    // ── Plan LOCAL : mode hors ligne forcé, pas de sync auto ──────────────────
    const subData = APP.subscription?.data || APP.subscription;
    if (subData?.plan === 'LOCAL') {
      // Forcer le mode local dans SM
      SM.mode = 'local';
    }

    // Afficher nom entreprise + poste
    document.querySelectorAll('#company-name, #company-name-m, #company-name-sidebar').forEach(el => el.textContent = this.config.name || 'Mon Entreprise');

    // Multiposte : le poste est défini depuis login.html (sessionStorage 'emp_poste')
    if (this.config.multiposte && this.config.postes?.length > 0) {
      const posteSession = sessionStorage.getItem('emp_poste');
      if (posteSession) {
        try {
          this.currentPoste = JSON.parse(posteSession);
        } catch (e) {
          this.currentPoste = { name: 'Admin', id: 'admin', permissions: this._allPermissions() };
        }
      } else {
        // Pas de poste sélectionné = Admin (connexion directe ou multiposte sans poste)
        this.currentPoste = { name: 'Admin', id: 'admin', permissions: this._allPermissions() };
      }
    } else {
      this.currentPoste = { name: 'Admin', id: 'admin', permissions: this._allPermissions() };
    }

    document.querySelectorAll('#poste-name, #poste-name-desktop, #poste-name-mobile, #topbar-poste').forEach(el => el.textContent = this.currentPoste?.name || 'Admin');

    // ── Présence : enregistrer ce poste comme connecté ───────────────────────
    if (session.mode === 'online') {
      try {
        const posteId = this.currentPoste?.id || 'admin';
        const presRef = FM._ref(`presence/${posteId}`);
        // Suppression automatique si la connexion Firebase se coupe (onglet fermé, crash)
        presRef.onDisconnect().remove();
        presRef.set({ loginAt: session.loginAt || new Date().toISOString(), lastSeen: Date.now() }).catch(console.warn);
        // Heartbeat : mettre à jour lastSeen toutes les 2 minutes
        // Permet de détecter si l'utilisateur est vraiment connecté vs session fantôme
        this._presHeartbeat = setInterval(() => {
          FM._ref(`presence/${posteId}/lastSeen`).set(Date.now()).catch(() => {});
        }, 2 * 60 * 1000);
      } catch(e) { console.warn('[presence write]', e); }
    }

    // Sync au démarrage puis lancer le temps réel
    if (session.mode === 'online') {
      this._updateLoader(this.config.name || 'Mon Entreprise', 'Synchronisation des données cloud…');
      await SM.fullSync().catch(console.warn);
      // Recharger la config depuis IndexedDB (peut avoir été mise à jour par fullSync)
      const freshConfig = await DB.getConfig();
      if (freshConfig) {
        // Normaliser postes si besoin
        if (freshConfig.postes && !Array.isArray(freshConfig.postes)) {
          freshConfig.postes = Object.values(freshConfig.postes).filter(p => p && p.id);
        }
        this.config = freshConfig;
        const finalName = this.config.name || 'Mon Entreprise';
        document.querySelectorAll('#company-name, #company-name-m').forEach(el => { el.textContent = finalName; });
        this._updateLoader(finalName, 'Synchronisation en temps réel…');
      }
      // Démarrer la synchronisation temps réel (multiposte)
      SM.startRealtimeSync().catch(console.warn);
    }

    // Générer les dépenses amorties dues
    setTimeout(() => {
      if (typeof EXPENSES !== 'undefined') EXPENSES.generateDueAmortized().catch(console.warn);
    }, 2500);

    // Afficher le premier onglet
    this._updateLoader(this.config.name || 'Mon Entreprise', 'Ouverture du tableau de bord…');
    await this.switchTab('dashboard');

    // Masquer le loader
    this._hideLoader();

    // Navigation
    this._initNav();

    // Points rouges nouvelles fonctionnalités + vérification MAJ silencieuse
    this._initNewDots();
    this._refreshNewDots(); // afficher depuis cache si déjà récupéré
    this._checkForUpdates(); // async, sans await pour ne pas bloquer

    // Mettre à jour les badges
    await this.refreshBadges();
    setInterval(() => this.refreshBadges(), 60000);
  },

  // ─── Version & Mises à jour ──────────────────────────────────────────────
  _APP_VERSION: '1.0.0',

  // Vérifier silencieusement s'il y a une nouvelle version
  async _checkForUpdates() {
    if (!navigator.onLine) return;
    try {
      const parts = ['https://raw.githubusercontent.com','serziosky-hue','Entreprise-Management','main','version.json'];
      const res = await fetch(parts.join('/') + '?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      localStorage.setItem('_empLatest', JSON.stringify(data));
      this._refreshNewDots();
    } catch(e) { /* Pas de connexion — silencieux */ }
  },

  // Ouvrir le lien de téléchargement sans jamais afficher l'URL
  _downloadUpdate() {
    const url = ['https://github.com','serziosky-hue','Entreprise-Management','releases','latest'].join('/');
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.click();
    }
  },

  // Injecter les points rouges dans tous les nav items
  _initNewDots() {
    const TABS = ['dashboard','stock','sales','proformas','clients','credits','expenses','reports','logs','settings'];
    TABS.forEach(tab => {
      document.querySelectorAll(`[data-tab="${tab}"]`).forEach(el => {
        if (el.querySelector('[data-ndot]')) return;
        el.style.position = 'relative';
        const dot = document.createElement('span');
        dot.setAttribute('data-ndot', tab);
        dot.style.cssText = 'display:none;position:absolute;top:5px;right:5px;width:8px;height:8px;background:#ef4444;border-radius:50%;box-shadow:0 0 0 2px var(--bg2);z-index:5;pointer-events:none;';
        el.appendChild(dot);
      });
    });
  },

  // Mettre à jour la visibilité des points selon version.json
  _refreshNewDots() {
    const raw = localStorage.getItem('_empLatest');
    if (!raw) return;
    const data = JSON.parse(raw);
    const features = data.newFeatures || {};
    const seenAt   = JSON.parse(localStorage.getItem('_empSeenAt') || '{}');
    const DOT_TTL  = 30 * 24 * 60 * 60 * 1000; // 30 jours
    const now      = Date.now();

    // Points "nouvelles fonctionnalités"
    Object.entries(features).forEach(([tab, dateStr]) => {
      const featureTs = new Date(dateStr).getTime();
      const lastSeen  = seenAt[tab] ? new Date(seenAt[tab]).getTime() : 0;
      const expired   = (now - featureTs) > DOT_TTL;
      const show      = !expired && featureTs > lastSeen;
      document.querySelectorAll(`[data-ndot="${tab}"]`).forEach(d => {
        d.style.display = show ? 'block' : 'none';
      });
    });

    // Point "mise à jour dispo" : toujours sur Settings si version différente
    const hasUpdate = data.version && data.version !== this._APP_VERSION;
    if (hasUpdate) {
      document.querySelectorAll('[data-ndot="settings"]').forEach(d => {
        d.style.display = 'block';
      });
    }
  },

  // Marquer un onglet comme "vu" → cacher son point
  _markTabSeen(tab) {
    const seenAt = JSON.parse(localStorage.getItem('_empSeenAt') || '{}');
    seenAt[tab]  = new Date().toISOString();
    localStorage.setItem('_empSeenAt', JSON.stringify(seenAt));
    document.querySelectorAll(`[data-ndot="${tab}"]`).forEach(d => {
      d.style.display = 'none';
    });
    // Garder le dot settings si mise à jour disponible
    if (tab === 'settings') {
      const raw = localStorage.getItem('_empLatest');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.version && data.version !== this._APP_VERSION) {
          document.querySelectorAll('[data-ndot="settings"]').forEach(d => {
            d.style.display = 'block';
          });
        }
      }
    }
  },

  // ─── Thème ────────────────────────────────────────────────────────────────

  // Définir une préférence : 'light' | 'dark' | 'system'
  setTheme(pref) {
    localStorage.setItem('emp_theme', pref);
    this._applyTheme(pref);
  },

  // Bascule rapide depuis le bouton topbar (light ↔ dark, ignore system)
  toggleTheme() {
    const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    this.setTheme(next);
  },

  // ─── Écran de chargement ──────────────────────────────────────────────────────
  _showLoader(status = 'Démarrage…') {
    if (document.getElementById('app-loader')) return;
    const style = document.createElement('style');
    style.id = 'app-loader-style';
    style.textContent = '@keyframes emp-spin{to{transform:rotate(360deg)}} @keyframes emp-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(style);
    const el = document.createElement('div');
    el.id = 'app-loader';
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;transition:opacity 0.35s ease;';
    el.innerHTML = `
      <div style="animation:emp-fadein 0.4s ease both;display:flex;flex-direction:column;align-items:center;gap:18px;">
        <div style="width:76px;height:76px;border-radius:22px;background:rgba(99,102,241,0.12);border:1.5px solid rgba(99,102,241,0.28);display:flex;align-items:center;justify-content:center;box-shadow:0 0 32px rgba(99,102,241,0.15);">
          <svg style="width:42px;height:42px;" fill="none" stroke="#818cf8" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"/>
          </svg>
        </div>
        <div id="app-loader-name" style="font-size:1.25rem;font-weight:700;color:#f1f5f9;letter-spacing:-.01em;text-align:center;max-width:260px;line-height:1.3;">Chargement…</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:22px;height:22px;border:2.5px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:emp-spin 0.75s linear infinite;flex-shrink:0;"></div>
          <div id="app-loader-status" style="font-size:.8125rem;color:#64748b;">${status}</div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  },

  _updateLoader(name, status) {
    if (name) {
      const el = document.getElementById('app-loader-name');
      if (el) el.textContent = name;
    }
    if (status) {
      const el = document.getElementById('app-loader-status');
      if (el) el.textContent = status;
    }
  },

  _hideLoader() {
    const el = document.getElementById('app-loader');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => {
      el.remove();
      document.getElementById('app-loader-style')?.remove();
    }, 380);
  },

  _applyTheme(pref) {
    // Résoudre 'system' → 'light' ou 'dark' selon l'OS
    let actual = pref;
    if (pref === 'system' || !pref) {
      actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const isLight = actual === 'light';
    document.documentElement.classList.toggle('light', isLight);

    // Bouton bascule rapide topbar
    const icon = isLight ? '☀️' : '🌙';
    const tip  = isLight ? 'Passer en mode sombre' : 'Passer en mode clair';
    document.querySelectorAll('#theme-toggle, #theme-toggle-m').forEach(btn => {
      btn.textContent = icon; btn.title = tip;
    });

    // Mettre à jour les 3 boutons dans les paramètres (si présents)
    const savedPref = localStorage.getItem('emp_theme') || 'system';
    document.querySelectorAll('[data-theme-btn]').forEach(btn => {
      const active = btn.dataset.themeBtn === savedPref;
      btn.classList.toggle('ring-2',            active);
      btn.classList.toggle('ring-indigo-500',   active);
      btn.classList.toggle('bg-indigo-600',     active);
      btn.classList.toggle('text-white',        active);
      btn.classList.toggle('bg-gray-700',       !active);
      btn.classList.toggle('text-gray-300',     !active);
    });
  },

  // ─── Vérification PIN de suppression ─────────────────────────────────────
  // Retourne true si la suppression est autorisée (PIN correct ou sécurité inactive)
  async canDelete(itemLabel = 'cet élément') {
    const config = APP.config || {};
    if (!config.secureDelete) return true; // sécurité inactive → OK
    if (!config.deletePinHash) {
      showToast('Définissez un PIN de suppression dans Paramètres → Sécurité', 'warning');
      return false;
    }
    return new Promise(resolve => {
      showModal(`
        <div class="p-5">
          <h3 class="text-base font-semibold text-white mb-1">🛡️ Confirmation de suppression</h3>
          <p class="text-sm text-gray-400 mb-4">Saisissez le PIN de suppression pour supprimer <strong class="text-white">${escapeHtml(itemLabel)}</strong>.</p>
          <input id="del-pin-input" type="password" placeholder="PIN de suppression" maxlength="20"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mb-3" autofocus>
          <div id="del-pin-err" class="hidden text-red-400 text-xs mb-2">PIN incorrect.</div>
          <div class="flex gap-2">
            <button onclick="closeModal();window._delPinResolve&&window._delPinResolve(false)"
              class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Annuler</button>
            <button onclick="window._validateDelPin()"
              class="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Confirmer</button>
          </div>
        </div>
      `, { persistent: true });
      window._delPinResolve = resolve;
      window._validateDelPin = () => {
        const entered = document.getElementById('del-pin-input')?.value || '';
        const { hashPassword } = window;
        // hashPassword est dans firebase-manager comme FM.hashPassword
        let hash;
        if (typeof FM !== 'undefined') hash = FM.hashPassword(entered);
        else { let h=0; for(let i=0;i<entered.length;i++) h=Math.imul(31,h)+entered.charCodeAt(i)|0; hash='h'+Math.abs(h).toString(16); }
        if (hash !== APP.config.deletePinHash) {
          const err = document.getElementById('del-pin-err');
          if (err) err.classList.remove('hidden');
          document.getElementById('del-pin-input').value = '';
          document.getElementById('del-pin-input').focus();
          return;
        }
        closeModal();
        window._delPinResolve = null;
        resolve(true);
      };
      // Enter key
      setTimeout(() => {
        document.getElementById('del-pin-input')?.addEventListener('keydown', e => {
          if (e.key === 'Enter') window._validateDelPin();
        });
      }, 50);
    });
  },

  // ─── Sync manuelle ────────────────────────────────────────────────────────
  async syncNow() {
    if (!navigator.onLine) { showToast('Pas de connexion internet', 'error'); return; }
    // Désactiver les deux boutons sync
    document.querySelectorAll('#sync-now-btn, #topbar-sync-btn').forEach(b => {
      b.disabled = true; b.style.opacity = '.6';
    });
    const btn = document.getElementById('sync-now-btn');
    try {
      await SM.flushPending();
      await SM.fullSync();
      const fresh = await DB.getConfig().catch(() => null);
      if (fresh) {
        if (fresh.postes && !Array.isArray(fresh.postes)) fresh.postes = Object.values(fresh.postes).filter(p=>p&&p.id);
        this.config = fresh;
      }
      SM._updateIndicator();
      await this.switchTab(this._activeTab || 'dashboard');
      showToast('Synchronisation réussie ✓', 'success');
    } catch(e) {
      showToast('Erreur sync: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '⟳ Synchroniser'; }
    }
  },

  _allPermissions() {
    const tabs = ['dashboard','stock','sales','clients','credits','expenses','reports','logs','settings','proformas'];
    const actions = ['stockAdd','stockEdit','stockDelete','stockAdjust','salesCreate','salesCancel','creditsPay','creditsDelete','expensesAdd','expensesEdit','expensesDelete','configCompany','configSecurity','configData','configPostes'];
    const p = {};
    [...tabs, ...actions].forEach(k => p[k] = true);
    return p;
  },

  canDo(permission) {
    if (!this.config?.multiposte) return true;
    if (!this.currentPoste) return false;
    return this.currentPoste.permissions?.[permission] !== false;
  },

  _canAccess(tab) {
    return this.canDo(tab);
  },

  async switchTab(tab) {
    if (!this._canAccess(tab)) { showToast('Accès non autorisé', 'warning'); return; }
    this._activeTab = tab;

    // Mettre à jour nav (sidebar + bottom nav mobile)
    document.querySelectorAll('.nav-item[data-tab], .bnav-item[data-tab]').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    // Masquer tous les contenus (y compris tab-settings avec son CSS flex spécial)
    document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.add('hidden');
      el.style.display = ''; // reset inline display
    });
    const content = document.getElementById('tab-' + tab);
    if (content) {
      content.classList.remove('hidden');
      // tab-settings a besoin de display:flex pour son layout deux colonnes
      if (tab === 'settings') content.style.display = 'flex';
    }

    // NE PAS détacher les listeners temps réel globaux (FM.detachAll supprimé)
    // Les listeners de sync temps réel restent actifs en permanence

    // Rendre le module correspondant
    const modules = {
      dashboard: () => DASHBOARD?.render(),
      stock: () => STOCKS?.render(),
      sales: () => SALES?.render(),
      clients: () => CLIENTS?.render(),
      credits: () => CREDITS?.render(),
      expenses: () => EXPENSES?.render(),
      proformas: () => PROFORMA?.render(),
      reports: () => REPORTS?.render(),
      logs: () => LOGS?.render(),
      settings: () => CONFIG_MOD?.render()
    };

    // Marquer l'onglet comme vu (cache le point rouge)
    this._markTabSeen(tab);

    if (modules[tab]) {
      try { await modules[tab](); } catch (e) { console.error(`Tab ${tab} error:`, e); }
    }

    // Fermer sidebar mobile
    document.getElementById('mobile-sidebar')?.classList.add('hidden');
  },

  _initNav() {
    // Desktop sidebar + drawer mobile (.nav-item) + bottom nav mobile (.bnav-item)
    document.querySelectorAll('.nav-item[data-tab], .bnav-item[data-tab]').forEach(el => {
      el.addEventListener('click', () => {
        this.switchTab(el.dataset.tab);
        closeDrawer(); // fermer le drawer si ouvert
      });
    });
  },

  async addLog(level, message, data = {}) {
    const log = {
      id: genId('LOG'),
      timestamp: new Date().toISOString(),
      level,
      message,
      user: this.currentPoste?.name || 'Admin',
      poste: this.currentPoste?.id || 'admin',
      data
    };
    await DB.addLog(log);
  },

  async refreshBadges() {
    try {
      // Stock bas / rupture (hors services)
      const produits = await DB.getAll('produits');
      const isServiceFn = p => (p.category||'').toLowerCase().includes('service') || (p.category||'').toLowerCase().includes('productivité');
      const stockAlerts = safeFilter(produits, p => !isServiceFn(p) && (p.stock <= 0 || (p.min > 0 && p.stock <= p.min))).length;
      document.querySelectorAll('[id^="badge-stock"]').forEach(el => {
        el.textContent = stockAlerts > 0 ? stockAlerts : '';
        el.classList.toggle('badge-alert', stockAlerts > 0);
        el.style.display = stockAlerts > 0 ? '' : 'none';
      });

      // Crédits en retard
      const credits = await DB.getAll('credits');
      const today = new Date().toISOString().split('T')[0];
      const lateCredits = safeFilter(credits, c => c.status === 'pending' && c.dueDate && c.dueDate < today).length;
      document.querySelectorAll('[id^="badge-credits"]').forEach(el => {
        el.textContent = lateCredits > 0 ? lateCredits : '';
        el.classList.toggle('badge-alert', lateCredits > 0);
        el.style.display = lateCredits > 0 ? '' : 'none';
      });
    } catch (e) { /* silencieux */ }
  }
};

document.addEventListener('DOMContentLoaded', () => APP.init());
