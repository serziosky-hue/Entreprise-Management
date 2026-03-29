// sync-manager.js — Sync online/offline + listeners temps réel Firebase
'use strict';

window.SM = {
  mode: 'online',
  _debounceTimers: {},
  _pendingWrites: {},
  _syncing: false,
  _online: navigator.onLine,
  _realtimeActive: false,
  _refreshTimer: null,
  _lastNotif: 0,

  REALTIME_COLLECTIONS: [
    'produits', 'ventes', 'depenses', 'credits',
    'clients', 'proformas', 'stockMovements', 'amortizedExpenses',
    'fournisseurs', 'commandes', 'employes'
  ],

  // ─── Init ─────────────────────────────────────────────────────────────────
  init(mode) {
    this.mode = mode || 'online';
    window.addEventListener('online', () => this._onOnline());
    window.addEventListener('offline', () => this._onOffline());
    this._updateIndicator();
  },

  _onOnline() {
    this._online = true;
    this._updateIndicator();
    if (this.mode === 'online') {
      this.flushPending();
      if (!this._realtimeActive) this.startRealtimeSync();
    }
  },

  _onOffline() {
    this._online = false;
    this._realtimeActive = false;
    this._updateIndicator();
  },

  // ─── Indicateur UI ────────────────────────────────────────────────────────
  _updateIndicator() {
    let html;
    if (this._syncing) {
      html = '<span class="text-yellow-400 flex items-center gap-1"><svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sync...</span>';
    } else if (this.mode === 'offline' || !this._online) {
      html = '<span class="text-red-400 flex items-center gap-1"><svg class="w-2 h-2 fill-current" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>Hors ligne</span>';
    } else if (this.mode === 'local') {
      html = '<span class="text-blue-400 flex items-center gap-1"><svg class="w-2 h-2 fill-current" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>Local</span>';
    } else if (this._realtimeActive) {
      html = '<span class="text-green-400 flex items-center gap-1"><svg class="w-2 h-2 fill-current" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>Temps réel</span>';
    } else {
      html = '<span class="text-green-400 flex items-center gap-1"><svg class="w-2 h-2 fill-current" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>En ligne</span>';
    }
    document.querySelectorAll('#sync-indicator, #sync-indicator-mobile, #topbar-sync').forEach(el => { el.innerHTML = html; });
    DB.count('pendingSync').then(n => {
      document.querySelectorAll('#pending-badge').forEach(el => {
        if (n > 0) {
          el.textContent = `${n} opération(s) en attente`;
          el.classList.remove('hidden');
        } else {
          el.textContent = '';
          el.classList.add('hidden');
        }
      });
      // Bouton Synchroniser : visible seulement si des opérations sont en attente
      // Sidebar sync btn
      const syncBtn = document.getElementById('sync-now-btn');
      if (syncBtn) {
        syncBtn.style.display = n > 0 ? 'flex' : 'none';
        const sc = syncBtn.querySelector('.sync-count');
        if (sc) sc.textContent = n > 0 ? `(${n})` : '';
      }
      // Topbar sync btn
      const topBtn = document.getElementById('topbar-sync-btn');
      if (topBtn) {
        topBtn.style.display = n > 0 ? 'flex' : 'none';
        const tc = document.getElementById('topbar-pending-count');
        if (tc) tc.textContent = n > 0 ? `(${n})` : '';
      }
    }).catch(() => {});
  },

  // ─── Écriture Firebase immédiate ──────────────────────────────────────────
  scheduleWrite(collection, id, action, data) {
    if (!this._pendingWrites[collection]) this._pendingWrites[collection] = {};
    this._pendingWrites[collection][id] = { action, data };
    if (this._debounceTimers[collection]) clearTimeout(this._debounceTimers[collection]);
    this._debounceTimers[collection] = setTimeout(() => this._flushCollection(collection), 3000);
  },

  async writeNow(collection, id, action, data) {
    if (this.mode === 'local') return;
    if (this.mode === 'offline' || !this._online) {
      await DB.addPending({ id: genId('SYNC'), collection, itemId: id, action, data, timestamp: new Date().toISOString() });
      this._updateIndicator();
      return;
    }
    try {
      this._setSyncing(true);
      if (action === 'delete') await FM.deleteItem(collection, id);
      else if (action === 'set') await FM.setItem(collection, id, data);
      else await FM.updateItem(collection, id, data);
    } catch (e) {
      console.warn('writeNow error:', e);
      await DB.addPending({ id: genId('SYNC'), collection, itemId: id, action, data, timestamp: new Date().toISOString() });
    } finally {
      this._setSyncing(false);
    }
  },

  async _flushCollection(collection) {
    const writes = this._pendingWrites[collection];
    if (!writes || Object.keys(writes).length === 0) return;
    delete this._pendingWrites[collection];
    if (this.mode === 'local') return;
    if (this.mode === 'offline' || !this._online) {
      for (const [id, { action, data }] of Object.entries(writes)) {
        await DB.addPending({ id: genId('SYNC'), collection, itemId: id, action, data, timestamp: new Date().toISOString() });
      }
      this._updateIndicator();
      return;
    }
    try {
      this._setSyncing(true);
      for (const [id, { action, data }] of Object.entries(writes)) {
        if (action === 'delete') await FM.deleteItem(collection, id);
        else await FM.setItem(collection, id, data);
      }
    } catch (e) {
      console.warn('flushCollection error:', e);
    } finally {
      this._setSyncing(false);
    }
  },

  // ─── TEMPS RÉEL — Listeners Firebase ──────────────────────────────────────
  // Principe :
  //   1. On lance un .on('value') sur chaque collection après la fullSync initiale.
  //   2. Firebase déclenche immédiatement avec les données actuelles (on ignore ce premier appel).
  //   3. Les appels suivants sont de vraies mises à jour distantes → on met à jour IndexedDB + UI.
  //
  async startRealtimeSync() {
    if (this.mode !== 'online' || !this._online) return;
    if (this._realtimeActive) return;

    console.log('[RT] Démarrage synchronisation temps réel...');
    this._realtimeActive = true;
    this._updateIndicator();

    for (const col of this.REALTIME_COLLECTIONS) {
      this._attachListener(col);
    }

    // Écouter aussi la config pour détecter les changements de postes
    this._attachConfigListener();
  },

  _attachListener(collection) {
    // Ignorer la rafale initiale de child_added (données déjà chargées par fullSync)
    // Les événements child_added initiaux se déclenchent de façon synchrone → le
    // flag passe à true après le prochain tick, une fois la rafale terminée.
    let initialized = false;
    setTimeout(() => { initialized = true; }, 500);

    FM.listenChildren(collection, {

      // Nouvel item ajouté par un autre poste APRÈS le fullSync initial
      onAdded: async (item) => {
        if (!initialized || !item) return;
        try {
          await DB.put(collection, item);
          this._notifyAndRefresh(collection);
        } catch (e) { console.warn(`[RT] child_added error "${collection}":`, e); }
      },

      // Item modifié par un autre poste (1 seul item transféré, pas toute la collection)
      onChanged: async (item) => {
        if (!item) return;
        try {
          await DB.put(collection, item);
          if (initialized) this._notifyAndRefresh(collection);
        } catch (e) { console.warn(`[RT] child_changed error "${collection}":`, e); }
      },

      // Item supprimé par un autre poste
      onRemoved: async (id) => {
        try {
          await DB.delete(collection, id);
          if (initialized) this._notifyAndRefresh(collection);
        } catch (e) { console.warn(`[RT] child_removed error "${collection}":`, e); }
      }
    });
  },

  // Notification toast + re-render de l'onglet actif + badges
  _notifyAndRefresh(collection) {
    this._scheduleRefresh(collection);
    if (['produits', 'credits', 'commandes'].includes(collection)) APP?.refreshBadges?.();
    const now = Date.now();
    if (now - this._lastNotif > 4000) {
      this._lastNotif = now;
      const labels = { produits:'Stock', ventes:'Ventes', depenses:'Dépenses', credits:'Crédits', clients:'Clients', proformas:'Devis', stockMovements:'Stock', amortizedExpenses:'Dépenses', fournisseurs:'Fournisseurs', commandes:'Commandes', employes:'Employés' };
      if (typeof showToast !== 'undefined') showToast(`↻ ${labels[collection] || collection} synchronisé`, 'info', 2000);
    }
  },

  _attachConfigListener() {
    let firstCall = true;
    // Écouter la config Firebase (postes, multiposte, etc.)
    if (!FM.db) return;
    const ref = FM.db.ref(`entreprises/${FM._enterpriseId}/config`);
    const cb = async (snap) => {
      if (firstCall) { firstCall = false; return; }
      const data = snap.val();
      if (!data) return;
      try {
        // Mettre à jour config locale si changée
        const local = await DB.getConfig();
        if (JSON.stringify(data.postes) !== JSON.stringify(local?.postes)
            || data.multiposte !== local?.multiposte
            || data.name !== local?.name) {
          await DB.saveConfig(data);
          APP.config = data;
          document.querySelectorAll('#company-name').forEach(el => { el.textContent = data.name || ''; });
          console.log('[RT] Config mise à jour depuis Firebase');
          // Si on est sur l'onglet paramètres/postes, rafraîchir
          if (APP?._activeTab === 'settings') CONFIG_MOD?.render();
        }
      } catch (e) { /* silencieux */ }
    };
    ref.on('value', cb);
    // Stocker pour pouvoir détacher
    this._configListenerRef = { ref, cb };
  },

  // Mapping collection → onglet à re-render
  _colToTab: {
    produits: 'stock', stockMovements: 'stock',
    ventes: 'sales', credits: 'credits',
    depenses: 'expenses', amortizedExpenses: 'expenses',
    clients: 'clients', proformas: 'proformas',
    fournisseurs: 'suppliers', achats: 'suppliers',
    commandes: 'orders', retours: 'returns',
    employes: 'hr', presences: 'hr', paies: 'hr'
  },

  _scheduleRefresh(collection) {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => this._doRefresh(collection), 300);
  },

  async _doRefresh(collection) {
    const targetTab = this._colToTab[collection];
    const active = APP?._activeTab;
    if (!targetTab || !active) return;

    // Re-render l'onglet actif si concerné
    if (active === targetTab) {
      const renderers = {
        stock: () => STOCKS?.render(),
        sales: () => SALES?._view === 'history' ? SALES._renderHistory() : Promise.resolve(),
        credits: () => CREDITS?.render(),
        expenses: () => EXPENSES?.render(),
        clients: () => CLIENTS?.render(),
        proformas: () => PROFORMA?._view === 'list' ? PROFORMA._renderList() : Promise.resolve(),
        suppliers: () => SUPPLIERS?.render(),
        orders: () => ORDERS?.render(),
        returns: () => RETURNS?.render(),
        hr: () => HR?.render(),
      };
      try {
        if (renderers[active]) await renderers[active]();
      } catch (e) { /* silencieux */ }
    }

    // Dashboard se rafraîchit toujours si ouvert et données financières changées
    if (active === 'dashboard' && ['produits','ventes','depenses','credits'].includes(collection)) {
      try { await DASHBOARD?.render(); } catch (e) {}
    }
  },

  stopRealtimeSync() {
    FM.detachAll();
    if (this._configListenerRef) {
      this._configListenerRef.ref.off('value', this._configListenerRef.cb);
      this._configListenerRef = null;
    }
    this._realtimeActive = false;
    this._updateIndicator();
  },

  // ─── Sync complète initiale (fullSync) ────────────────────────────────────
  // Stratégie :
  //   • Pour les collections « courantes » (produits, clients, crédits, proformas,
  //     amortizedExpenses) : on récupère tout Firebase et on remplace IDB.
  //   • Pour les collections « historiques » larges (ventes, dépenses, stockMovements) :
  //     on limite aux 90 derniers jours pour ne pas télécharger des années de données.
  //     Les items plus anciens restent disponibles localement depuis le dernier sync complet.
  //   • On stocke _lastFullSync en localStorage pour savoir si le cache est récent.
  async fullSync() {
    if (this.mode !== 'online' || !this._online) return;
    this._setSyncing(true);

    // Collections historiques : on limite à 90 jours pour réduire la bande passante
    const HISTORY_COLS = new Set(['ventes', 'depenses', 'stockMovements', 'achats', 'retours']);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoff = cutoffDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    try {
      for (const col of this.REALTIME_COLLECTIONS) {
        const fbData = await FM.fetchOnce(col);
        if (!fbData) continue;

        let items = Object.values(fbData).filter(v => v && typeof v === 'object');

        if (HISTORY_COLS.has(col)) {
          // Garder seulement les 90 derniers jours + ne mettre à jour IDB que pour
          // les items qui n'existent pas encore localement ou qui ont changé
          const recentItems = items.filter(i => {
            const d = i.date || i.createdAt || '';
            return !d || d >= cutoff;
          });
          // Merge : ne pas écraser les items locaux récents non présents dans Firebase
          // (cas hors-ligne : écriture locale pas encore synchronisée)
          const pending = await DB.getAll('pendingSync');
          const pendingIds = new Set(pending.map(p => p.itemId));
          const toWrite = recentItems.filter(i => !pendingIds.has(i.id));
          if (toWrite.length > 0) await DB.replaceAll(col, toWrite);
        } else {
          await DB.replaceAll(col, items);
        }
      }
      localStorage.setItem('_lastFullSync', new Date().toISOString());
    } catch (e) {
      console.warn('fullSync error:', e);
    } finally {
      this._setSyncing(false);
    }
  },

  // ─── Flush des opérations en attente ─────────────────────────────────────
  async flushPending() {
    if (this.mode === 'local' || !this._online) return;
    const items = await DB.flushPending();
    if (!items.length) return;
    this._setSyncing(true);
    let synced = 0;
    try {
      for (const item of items) {
        try {
          if (item.action === 'delete') await FM.deleteItem(item.collection, item.itemId);
          else await FM.setItem(item.collection, item.itemId, item.data);
          synced++;
        } catch (e) {
          await DB.addPending(item);
        }
      }
      if (synced > 0) showToast(`${synced} opération(s) synchronisée(s)`, 'success');
    } finally {
      this._setSyncing(false);
      this._updateIndicator();
    }
  },

  _setSyncing(val) {
    this._syncing = val;
    this._updateIndicator();
  },

  // ─── Backup / Restore ────────────────────────────────────────────────────
  async manualBackup() {
    if (!this._online) { showToast('Connexion requise', 'error'); return; }
    this._setSyncing(true);
    try {
      for (const col of this.REALTIME_COLLECTIONS) {
        const items = await DB.getAll(col);
        if (items.length > 0) await FM.saveCollection(col, items);
      }
      const config = await DB.getConfig();
      if (config) await FM.saveConfig(config);
      showToast('Sauvegarde cloud réussie', 'success');
    } catch (e) {
      showToast('Erreur backup: ' + e.message, 'error');
    } finally { this._setSyncing(false); }
  },

  async manualRestore() {
    if (!this._online) { showToast('Connexion requise', 'error'); return; }
    this._setSyncing(true);
    try {
      await this.fullSync();
      showToast('Restauration réussie', 'success');
    } catch (e) {
      showToast('Erreur restauration: ' + e.message, 'error');
    } finally { this._setSyncing(false); }
  },

  // Compat legacy
  startListener(collection, callback) {
    if (this.mode !== 'online' || !this._online) return;
    FM.listen(collection, async (data) => {
      if (data) {
        const items = Object.values(data).filter(Boolean);
        await DB.replaceAll(collection, items);
        if (callback) callback(items);
      }
    });
  },
  stopListener(collection) { FM.detach(collection); }
};