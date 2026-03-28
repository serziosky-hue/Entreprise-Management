// firebase-manager.js — Firebase Realtime Database manager
'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyAcZPCtajiuZxrDMM0CelNPRdXD-tanBxU",
  authDomain: "enterprisemanagementpro.firebaseapp.com",
  databaseURL: "https://enterprisemanagementpro-default-rtdb.firebaseio.com",
  projectId: "enterprisemanagementpro",
  storageBucket: "enterprisemanagementpro.appspot.com",
  messagingSenderId: "932509312427",
  appId: "1:932509312427:web:6aacfe4743315c69581eee"
};

window.FM = {
  db: null,
  _enterpriseId: null,
  _listeners: {},

  init(enterpriseId) {
    this._enterpriseId = enterpriseId;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    this.db = firebase.database();
  },

  _ref(path) {
    return this.db.ref(`entreprises/${this._enterpriseId}/${path}`);
  },

  _stripEmpty(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(i => this._stripEmpty(i)).filter(i => i !== null && i !== undefined);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
      const cleaned = this._stripEmpty(v);
      if (cleaned !== null && cleaned !== undefined) out[k] = cleaned;
    }
    return Object.keys(out).length === 0 ? null : out;
  },

  async fetchOnce(path) {
    const snap = await this._ref(path).once('value');
    return snap.val();
  },

  async fetchConfig() {
    return await this.fetchOnce('config');
  },

  async fetchSubscription() {
    return await this.fetchOnce('subscription');
  },

  async saveCollection(collection, items) {
    // items : array ou objet
    const data = {};
    if (Array.isArray(items)) {
      for (const item of items) data[item.id] = this._stripEmpty(item);
    } else {
      for (const [k, v] of Object.entries(items)) data[k] = this._stripEmpty(v);
    }
    await this._ref(collection).set(data);
  },

  async updateItem(collection, id, item) {
    const cleaned = this._stripEmpty(item);
    if (!cleaned) return;
    await this._ref(`${collection}/${id}`).update(cleaned);
  },

  async setItem(collection, id, item) {
    const cleaned = this._stripEmpty(item);
    await this._ref(`${collection}/${id}`).set(cleaned);
  },

  async deleteItem(collection, id) {
    await this._ref(`${collection}/${id}`).remove();
  },

  async saveConfig(configData) {
    // Ne jamais envoyer le logo sur Firebase (trop lourd)
    const safe = { ...configData };
    delete safe.logo;

    // Sauvegarder les postes séparément pour éviter que _stripEmpty corrompe les permissions
    // car les valeurs 'false' dans permissions sont significatives
    const postes = safe.postes;
    delete safe.postes;

    const cleaned = this._stripEmpty(safe) || {};

    // Remettre les postes proprement (sans passer par _stripEmpty)
    if (Array.isArray(postes) && postes.length > 0) {
      cleaned.postes = postes.map(p => {
        const poste = { ...p };
        // S'assurer que password ne soit pas envoyé en clair sur Firebase
        // (on garde passwordHash, pas password)
        // Ne pas stocker le mot de passe brut en clair sur Firebase
        // Seul passwordHash est utilisé pour la vérification
        delete poste.password;
        return poste;
      });
    }

    await this._ref('config').set(cleaned);
  },

  async saveSubscription(subData) {
    const cleaned = this._stripEmpty(subData);
    await this._ref('subscription').set(cleaned);
  },

  listen(path, callback) {
    if (this._listeners[path]) this.detach(path);
    const ref = this._ref(path);
    const cb = snap => callback(snap.val());
    ref.on('value', cb);
    this._listeners[path] = { ref, cb, isValue: true };
  },

  // Listeners delta : n'envoie que l'item modifié (pas toute la collection)
  listenChildren(path, { onAdded, onChanged, onRemoved }) {
    if (this._listeners[path]) this.detach(path);
    const ref = this._ref(path);
    const cbAdded   = onAdded   ? snap => onAdded(snap.val(), snap.key)   : null;
    const cbChanged = onChanged ? snap => onChanged(snap.val(), snap.key) : null;
    const cbRemoved = onRemoved ? snap => onRemoved(snap.key)             : null;
    if (cbAdded)   ref.on('child_added',   cbAdded);
    if (cbChanged) ref.on('child_changed', cbChanged);
    if (cbRemoved) ref.on('child_removed', cbRemoved);
    this._listeners[path] = { ref, cbAdded, cbChanged, cbRemoved, isValue: false };
  },

  detach(path) {
    const l = this._listeners[path];
    if (!l) return;
    if (l.isValue) {
      l.ref.off('value', l.cb);
    } else {
      if (l.cbAdded)   l.ref.off('child_added',   l.cbAdded);
      if (l.cbChanged) l.ref.off('child_changed',  l.cbChanged);
      if (l.cbRemoved) l.ref.off('child_removed',  l.cbRemoved);
    }
    delete this._listeners[path];
  },

  detachAll() {
    for (const path of Object.keys(this._listeners)) this.detach(path);
  },

  async enterpriseExists(id) {
    const snap = await this.db.ref(`entreprises/${id}/config`).once('value');
    return snap.exists();
  },

  async createEnterprise(id, config, subscription) {
    const safeConfig = { ...config };
    delete safeConfig.logo;
    await this.db.ref(`entreprises/${id}`).set({
      config: this._stripEmpty(safeConfig),
      subscription: this._stripEmpty(subscription)
    });
  },

  async verifyPassword(id, password) {
    const snap = await this.db.ref(`entreprises/${id}/config/passwordHash`).once('value');
    return snap.val() === this._hashPassword(password);
  },

  _hashPassword(pwd) {
    // Simple hash déterministe (pas crypto, juste obfuscation)
    let h = 0;
    for (let i = 0; i < pwd.length; i++) {
      h = Math.imul(31, h) + pwd.charCodeAt(i) | 0;
    }
    return 'h' + Math.abs(h).toString(16);
  },

  hashPassword(pwd) { return this._hashPassword(pwd); },

  async acquireLock(resource, posteId) {
    const lockRef = this._ref(`locks/${resource}`);
    const snap = await lockRef.once('value');
    const lock = snap.val();
    const now = Date.now();
    if (lock && lock.posteId !== posteId && (now - lock.timestamp) < 30000) {
      return { acquired: false, lockedBy: lock.posteName };
    }
    await lockRef.set({ posteId, posteName: APP?.currentPoste?.name || 'Admin', timestamp: now });
    return { acquired: true };
  },

  async releaseLock(resource) {
    await this._ref(`locks/${resource}`).remove();
  },

  async addPaymentRequest(data) {
    await this.db.ref('payment_requests').push({
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  async pushLogs(logs) {
    const last200 = [...logs].sort((a, b) => a.timestamp < b.timestamp ? -1 : 1).slice(-200);
    const data = {};
    for (const l of last200) data[l.id] = this._stripEmpty(l);
    await this._ref('logs').set(data);
  },

  async saveCollection(col, items) {
    if (!items || items.length === 0) return;
    const obj = {};
    items.forEach(item => { if (item.id) obj[item.id] = this._stripEmpty(item); });
    await this._ref(col).set(obj);
  },

  // ─── Backup cloud avec limite 24h pour plan LOCAL ─────────────────────────
  async manualBackupCloud() {
    const sub = APP.subscription?.data || APP.subscription;
    const isLocal = sub?.plan === 'LOCAL';

    if (isLocal && typeof SUBS !== 'undefined' && !SUBS.canBackupCloud()) {
      const h = SUBS.nextBackupIn();
      throw new Error(`Plan Local : prochaine sauvegarde disponible dans ${h}h (limite 24h pour préserver le quota Firebase).`);
    }

    const config = await DB.getConfig();
    if (config) await this.saveConfig(config);

    const cols = ['produits','ventes','depenses','credits','clients','proformas','stockMovements','amortizedExpenses'];
    for (const col of cols) {
      const items = await DB.getAll(col);
      if (items.length > 0) await this.saveCollection(col, items);
    }

    if (isLocal && typeof SUBS !== 'undefined') SUBS.recordCloudBackup();
    return true;
  }
};
