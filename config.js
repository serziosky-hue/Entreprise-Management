// config.js — Paramètres de l'entreprise
'use strict';

window.CONFIG_MOD = {
  _section: 'company',

  async render() {
    const el = document.getElementById('tab-settings');
    if (!el) return;
    const sections = [
      { key: 'company', label: 'Entreprise', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21', perm: 'configCompany' },
      { key: 'security', label: 'Sécurité', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', perm: 'configSecurity' },
      { key: 'categories', label: 'Catégories', icon: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z', perm: 'configCompany' },
      { key: 'widgets', label: 'Tableau de bord', icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125-1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h7.5', perm: 'configCompany' },
      { key: 'postes', label: 'Postes', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', perm: 'configPostes' },
      { key: 'paymentMethods', label: 'Paiements', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z', perm: 'configCompany' },
      { key: 'data', label: 'Données', icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125', perm: 'configData' },
      { key: 'subscription', label: 'Abonnement', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z', perm: null },
    ].filter(s => !s.perm || APP.canDo(s.perm));

    el.innerHTML = `
      <div style="display:flex;height:100%;min-height:0;">
        <!-- Sidebar settings (desktop) -->
        <div style="width:180px;flex-shrink:0;border-right:1px solid var(--border,#374151);padding:.5rem;overflow-y:auto;display:none;" class="sm-show-flex" id="settings-sidebar">
          ${sections.map(s => `
            <button onclick="CONFIG_MOD._section='${s.key}';CONFIG_MOD._renderSection()" data-section="${s.key}"
              style="width:100%;display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:.8125rem;text-align:left;border:none;cursor:pointer;transition:all .15s;margin-bottom:2px;
                background:${this._section===s.key?'#4f46e5':'transparent'};
                color:${this._section===s.key?'#fff':'var(--muted,#9ca3af)'};">
              <svg style="width:15px;height:15px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${s.icon}"/></svg>
              ${s.label}
            </button>
          `).join('')}
        </div>
        <!-- Layout mobile : select + contenu empilés -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;">
          <!-- Select section mobile -->
          <div style="padding:.5rem .75rem;border-bottom:1px solid var(--border,#374151);flex-shrink:0;" id="settings-select-row">
            <select onchange="CONFIG_MOD._section=this.value;CONFIG_MOD._renderSection()"
              style="width:100%;padding:7px 10px;border-radius:8px;font-size:.875rem;border:1px solid var(--border,#374151);background:var(--bg2,#1f2937);color:var(--text,#f9fafb);outline:none;">
              ${sections.map(s => `<option value="${s.key}" ${this._section===s.key?'selected':''}>${s.label}</option>`).join('')}
            </select>
          </div>
          <!-- Contenu -->
          <div style="flex:1;overflow-y:auto;" id="settings-content"></div>
        </div>
      </div>
    `;
    await this._renderSection();
  },

  async _renderSection() {
    document.querySelectorAll('[data-section]').forEach(el => {
      el.className = `w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${el.dataset.section===this._section?'bg-indigo-600 text-white':'text-gray-300 hover:bg-gray-700'}`;
    });
    const c = document.getElementById('settings-content');
    if (!c) return;
    c.innerHTML = '<div class="p-4 text-gray-400 text-sm flex items-center gap-2"><svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Chargement...</div>';

    // Pour l'onglet postes : toujours recharger depuis Firebase pour avoir les données à jour
    if (this._section === 'postes' && SM.mode === 'online') {
      try {
        const freshConfig = await FM.fetchConfig();
        if (freshConfig) {
          // Normaliser postes (Firebase stocke les tableaux comme objets indexés)
          if (freshConfig.postes && !Array.isArray(freshConfig.postes)) {
            freshConfig.postes = Object.values(freshConfig.postes).filter(p => p && p.id);
          }
          freshConfig.postes = freshConfig.postes || [];
          APP.config = { ...APP.config, ...freshConfig, logo: APP.config?.logo };
          await DB.saveConfig(APP.config);
        }
      } catch (e) {
        console.warn('Config reload error:', e);
      }
    }

    const config = APP.config || {};
    const sections = {
      company: () => this._renderCompany(config),
      security: () => this._renderSecurity(config),
      categories: () => this._renderCategories(config),
      widgets: () => this._renderWidgets(config),
      paymentMethods: () => this._renderPaymentMethods(config),
      postes: () => this._renderPostes(config),
      data: () => this._renderData(),
      subscription: () => this._renderSubscription(),
    };
    if (sections[this._section]) c.innerHTML = await sections[this._section]();
  },

  _renderCompany(config) {
    return `
      <div class="p-4 space-y-4">
        <h3 class="text-base font-semibold text-white">Informations entreprise</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="text-xs text-gray-400">Nom de l'entreprise *</label>
            <input id="cfg-name" value="${escapeHtml(config.name||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Téléphone</label>
            <input id="cfg-phone" value="${escapeHtml(config.phone||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Email</label>
            <input id="cfg-email" type="email" value="${escapeHtml(config.email||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">NIF</label>
            <input id="cfg-nif" value="${escapeHtml(config.nif||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">STAT</label>
            <input id="cfg-stat" value="${escapeHtml(config.stat||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div class="col-span-2">
            <label class="text-xs text-gray-400">Adresse</label>
            <input id="cfg-address" value="${escapeHtml(config.address||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Devise</label>
            <select id="cfg-currency" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              <option value="Ar"  ${(config.currency||'Ar')==='Ar' ?'selected':''}>Ar  — Ariary malgache</option>
              <option value="Fmg" ${(config.currency||'Ar')==='Fmg'?'selected':''}>Fmg — Franc malgache (1 Ar = 5 Fmg)</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">Convention : les montants sont toujours saisis en Ar. L'affichage en Fmg applique ×5 automatiquement.</p>
          </div>
          <div>
            <label class="text-xs text-gray-400">Seuil alerte caisse</label>
            <input id="cfg-cash" type="number" min="0" value="${config.cashThreshold||0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Délai crédit par défaut (jours)</label>
            <input id="cfg-credit-delay" type="number" min="1" value="${config.creditDelayDays||30}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div class="col-span-2">
            <label class="text-xs text-gray-400">Infos bancaires (pour PDF)</label>
            <textarea id="cfg-bank" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">${escapeHtml(config.bankInfo||'')}</textarea>
          </div>
          <div class="col-span-2">
            <label class="text-xs text-gray-400">Signature (pour PDF)</label>
            <input id="cfg-signature" value="${escapeHtml(config.signature||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div class="col-span-2">
            <label class="text-xs text-gray-400">Logo (stocké en local uniquement)</label>
            <div class="flex gap-3 items-center mt-1">
              ${config.logo ? `<img src="${config.logo}" class="h-12 w-12 object-contain rounded bg-white">` : '<div class="h-12 w-12 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">Aucun</div>'}
              <label class="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-600">
                Choisir image
                <input type="file" accept="image/*" class="hidden" onchange="CONFIG_MOD._loadLogo(this)">
              </label>
              ${config.logo ? `<button onclick="CONFIG_MOD._removeLogo()" class="text-xs text-red-400 hover:text-red-300">Supprimer</button>` : ''}
            </div>
          </div>
        </div>
        <button onclick="CONFIG_MOD.saveCompany()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Enregistrer</button>
      </div>
    `;
  },

  _loadLogo(input) {
    const file = input.files[0]; if (!file) return;
    if (file.size > 500000) { showToast('Image trop grande (max 500ko)', 'error'); return; }
    const r = new FileReader();
    r.onload = (e) => { APP.config.logo = e.target.result; this._renderSection(); };
    r.readAsDataURL(file);
  },

  _removeLogo() { delete APP.config.logo; this._renderSection(); },

  async saveCompany() {
    const name = document.getElementById('cfg-name').value.trim();
    if (!name) { showToast('Nom requis', 'error'); return; }
    Object.assign(APP.config, {
      name,
      phone: document.getElementById('cfg-phone').value.trim(),
      email: document.getElementById('cfg-email').value.trim(),
      nif: document.getElementById('cfg-nif').value.trim(),
      stat: document.getElementById('cfg-stat').value.trim(),
      address: document.getElementById('cfg-address').value.trim(),
      currency: document.getElementById('cfg-currency').value,
      cashThreshold: parseFloat(document.getElementById('cfg-cash').value) || 0,
      creditDelayDays: parseInt(document.getElementById('cfg-credit-delay').value) || 30,
      bankInfo: document.getElementById('cfg-bank').value.trim(),
      signature: document.getElementById('cfg-signature').value.trim(),
    });
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config); // Le logo est strippé par FM
    await APP.addLog('INFO', 'Configuration entreprise mise à jour');
    showToast('Configuration enregistrée', 'success');
    document.querySelectorAll('#company-name, #company-name-m').forEach(el => { el.textContent = APP.config.name; });
  },

  // ─── Modes de paiement ───────────────────────────────────────────────────
  _PM_DEFAULTS: [
    { id: 'cash',   label: 'Espèces',        icon: '💵', isDefault: true },
    { id: 'mobile', label: 'Mobile Money',   icon: '📱', isDefault: true },
    { id: 'card',   label: 'Carte bancaire', icon: '💳', isDefault: true },
    { id: 'cheque', label: 'Chèque',         icon: '📄', isDefault: true },
    { id: 'credit', label: 'Crédit',         icon: '📋', isDefault: true },
  ],

  _renderPaymentMethods(config) {
    const methods = config.paymentMethods || this._PM_DEFAULTS;
    const rows = methods.map(m => `
      <div class="flex items-center gap-3 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2.5">
        <span class="text-lg w-7 text-center leading-none">${escapeHtml(m.icon || '💰')}</span>
        <span class="flex-1 text-sm text-white">${escapeHtml(m.label)}</span>
        ${m.isDefault
          ? '<span class="text-xs text-gray-500 px-2 py-0.5 bg-gray-700 rounded-full">Par défaut</span>'
          : `<button onclick="CONFIG_MOD.deletePaymentMethod('${m.id}')"
               class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors" title="Supprimer">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
               </svg>
             </button>`
        }
      </div>`).join('');

    return `
      <div class="p-4 space-y-4">
        <div>
          <h3 class="text-base font-semibold text-white">Modes de paiement</h3>
          <p class="text-xs text-gray-400 mt-1">Configurez les modes disponibles dans les ventes, crédits et dépenses. Les modes par défaut ne peuvent pas être supprimés.</p>
        </div>

        <div class="space-y-2">${rows}</div>

        <div class="bg-gray-700/30 border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
          <h4 class="text-sm font-medium text-white">Ajouter un mode</h4>
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class="text-xs text-gray-400">Nom *</label>
              <input id="pm-label" type="text" placeholder="ex: Virement bancaire"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1"
                maxlength="30" onkeydown="if(event.key==='Enter')CONFIG_MOD.addPaymentMethod()">
            </div>
            <div>
              <label class="text-xs text-gray-400">Icône (emoji)</label>
              <input id="pm-icon" type="text" placeholder="🏦"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1"
                maxlength="2">
            </div>
          </div>
          <button onclick="CONFIG_MOD.addPaymentMethod()"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
            + Ajouter
          </button>
        </div>
      </div>`;
  },

  async addPaymentMethod() {
    const label = (document.getElementById('pm-label')?.value || '').trim();
    const icon  = (document.getElementById('pm-icon')?.value  || '').trim() || '💰';
    if (!label) { showToast('Le nom du mode est requis', 'error'); return; }

    const methods = APP.config.paymentMethods ? [...APP.config.paymentMethods] : [...this._PM_DEFAULTS];

    // Générer un ID depuis le label (sans accents, espaces → _)
    const id = label.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    if (methods.find(m => m.id === id || m.label.toLowerCase() === label.toLowerCase())) {
      showToast('Ce mode de paiement existe déjà', 'error');
      return;
    }

    methods.push({ id, label, icon, isDefault: false });
    APP.config.paymentMethods = methods;
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    await APP.addLog('INFO', `Mode de paiement ajouté : ${label}`);
    showToast(`"${label}" ajouté`, 'success');
    this._renderSection();
  },

  async deletePaymentMethod(id) {
    const methods = APP.config.paymentMethods || this._PM_DEFAULTS;
    const method  = methods.find(m => m.id === id);
    if (!method || method.isDefault) return;

    APP.config.paymentMethods = methods.filter(m => m.id !== id);
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    await APP.addLog('INFO', `Mode de paiement supprimé : ${method.label}`);
    showToast(`"${method.label}" supprimé`, 'success');
    this._renderSection();
  },

  _renderUpdatesBlock() {
    const raw       = localStorage.getItem('_empLatest');
    const latest    = raw ? JSON.parse(raw) : null;
    const current   = APP._APP_VERSION || '1.0.0';
    const hasUpdate = latest && latest.version !== current;
    const changelog = latest?.changelog || [];

    return `
      <div class="bg-gray-700/30 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 class="text-sm font-semibold text-white flex items-center gap-2">
              🔄 Mises à jour
              ${hasUpdate
                ? `<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">Nouvelle version !</span>`
                : `<span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">À jour</span>`}
            </h4>
            <p class="text-xs text-gray-400 mt-0.5">
              Version installée : <span class="text-white font-mono font-semibold">${escapeHtml(current)}</span>
              ${latest ? ` · Disponible : <span class="${hasUpdate?'text-red-400':'text-green-400'} font-mono font-semibold">${escapeHtml(latest.version)}</span>` : ''}
            </p>
          </div>
          <button onclick="APP._checkForUpdates().then(()=>CONFIG_MOD._renderSection())"
            class="text-xs px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
            Vérifier
          </button>
        </div>

        ${changelog.length ? `
        <div class="border-t border-gray-600/40 pt-3">
          <p class="text-xs font-semibold text-gray-300 mb-2">Nouveautés — version ${escapeHtml(latest?.version || current)} :</p>
          <ul class="space-y-1.5">
            ${changelog.map(c => `
              <li class="text-xs text-gray-400 flex items-start gap-2">
                <span class="flex-shrink-0 mt-0.5 text-indigo-400">▸</span>
                <span>${escapeHtml(c)}</span>
              </li>`).join('')}
          </ul>
        </div>` : ''}

        ${hasUpdate ? `
        <button onclick="APP._downloadUpdate()"
          class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
          Télécharger la version ${escapeHtml(latest.version)}
        </button>` : ''}
      </div>
    `;
  },

  _renderSecurity(config) {
    const secDel = config.secureDelete || false;
    const theme = localStorage.getItem('emp_theme') || 'system';
    return `
      <div class="p-4 space-y-5">
        <h3 class="text-base font-semibold text-white">Sécurité</h3>

        <!-- Changer mot de passe admin -->
        <div class="bg-gray-700/30 rounded-xl p-4 space-y-3">
          <h4 class="text-sm font-semibold text-white">🔑 Mot de passe administrateur</h4>
          <div>
            <label class="text-xs text-gray-400">Mot de passe actuel</label>
            <input id="sec-current" type="password" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Nouveau mot de passe</label>
            <input id="sec-new" type="password" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Confirmer</label>
            <input id="sec-confirm" type="password" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <button onclick="CONFIG_MOD.changePassword()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Changer le mot de passe</button>
        </div>

        <!-- Sécurité suppression -->
        <div class="bg-gray-700/30 rounded-xl p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <h4 class="text-sm font-semibold text-white flex items-center gap-1.5">
                🛡️ Sécurité des suppressions
                <span class="text-xs px-2 py-0.5 rounded-full ${secDel ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-400'}">${secDel ? 'Activée' : 'Désactivée'}</span>
              </h4>
              <p class="text-xs text-gray-400 mt-1">
                Quand activée, toute suppression (produit, vente, client, etc.) demande un code PIN unique.
                Empêche les suppressions accidentelles ou non autorisées.
              </p>
            </div>
            <button onclick="CONFIG_MOD.toggleSecureDelete(${!secDel})"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${secDel ? 'bg-green-600' : 'bg-gray-600'}">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${secDel ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>
          </div>
          ${secDel ? `
          <div class="border-t border-gray-600 pt-3">
            <h5 class="text-xs font-semibold text-gray-300 mb-2">Code PIN de suppression</h5>
            <div class="flex gap-2">
              <input id="sec-del-current" type="password" placeholder="PIN actuel (vide si nouveau)"
                class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
              <input id="sec-del-new" type="password" placeholder="Nouveau PIN (min 4)"
                class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
              <button onclick="CONFIG_MOD.changeDeletePin()" class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Changer</button>
            </div>
            ${config.deletePinHash ? '<p class="text-xs text-green-400 mt-1">✓ PIN défini</p>' : '<p class="text-xs text-yellow-400 mt-1">⚠️ Aucun PIN défini — définissez-en un pour activer la protection</p>'}
          </div>` : ''}
        </div>

        <!-- Multiposte -->
        <div class="bg-gray-700/30 rounded-xl p-4">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" ${config.multiposte ? 'checked' : ''} onchange="CONFIG_MOD.toggleMultiposte(this.checked)" class="rounded">
            <div>
              <div class="text-white text-sm font-medium">👥 Mode multiposte</div>
              <div class="text-xs text-gray-400">Activer la gestion de plusieurs postes avec des accès différents</div>
            </div>
          </label>
        </div>

        <!-- Mises à jour -->
        ${this._renderUpdatesBlock()}

        <!-- Thème -->
        <div class="bg-gray-700/30 rounded-xl p-4">
          <div class="mb-3">
            <h4 class="text-sm font-semibold text-white">🎨 Thème de l'interface</h4>
            <p class="text-xs text-gray-400 mt-0.5">Le mode Système suit automatiquement le thème de votre appareil (clair le jour, sombre la nuit).</p>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button data-theme-btn="system" onclick="APP.setTheme('system')"
              class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-gray-600 text-sm font-medium transition-all
                     ${theme === 'system' || !theme ? 'bg-indigo-600 text-white ring-2 ring-indigo-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}">
              <span class="text-lg">💻</span>
              <span>Système</span>
              <span class="text-xs opacity-70">Auto</span>
            </button>
            <button data-theme-btn="light" onclick="APP.setTheme('light')"
              class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-gray-600 text-sm font-medium transition-all
                     ${theme === 'light' ? 'bg-indigo-600 text-white ring-2 ring-indigo-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}">
              <span class="text-lg">☀️</span>
              <span>Clair</span>
              <span class="text-xs opacity-70">Journée</span>
            </button>
            <button data-theme-btn="dark" onclick="APP.setTheme('dark')"
              class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-gray-600 text-sm font-medium transition-all
                     ${theme === 'dark' ? 'bg-indigo-600 text-white ring-2 ring-indigo-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}">
              <span class="text-lg">🌙</span>
              <span>Sombre</span>
              <span class="text-xs opacity-70">Nuit</span>
            </button>
          </div>
        </div>

      </div>
    `;
  },

  async toggleSecureDelete(val) {
    APP.config.secureDelete = val;
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    showToast(`Sécurité suppression ${val ? 'activée' : 'désactivée'}`, val ? 'success' : 'info');
    this._renderSection();
  },

  async changeDeletePin() {
    const curInput = document.getElementById('sec-del-current').value;
    const newPin   = document.getElementById('sec-del-new').value;
    if (newPin.length < 4) { showToast('PIN minimum 4 caractères', 'error'); return; }
    // Vérifier PIN actuel si déjà défini
    if (APP.config.deletePinHash && FM.hashPassword(curInput) !== APP.config.deletePinHash) {
      showToast('PIN actuel incorrect', 'error'); return;
    }
    APP.config.deletePinHash = FM.hashPassword(newPin);
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    showToast('✅ PIN de suppression mis à jour', 'success');
    this._renderSection();
  },

  async changePassword() {
    const cur = document.getElementById('sec-current').value;
    const nw = document.getElementById('sec-new').value;
    const cf = document.getElementById('sec-confirm').value;
    if (FM.hashPassword(cur) !== APP.config.passwordHash) { showToast('Mot de passe actuel incorrect', 'error'); return; }
    if (nw.length < 4) { showToast('Nouveau mot de passe trop court', 'error'); return; }
    if (nw !== cf) { showToast('Les mots de passe ne correspondent pas', 'error'); return; }
    APP.config.passwordHash = FM.hashPassword(nw);
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    await APP.addLog('INFO', 'Mot de passe changé');
    showToast('Mot de passe changé', 'success');
  },

  async _doBackup() {
    // Vérifier la limite 24h pour plan LOCAL
    const sub = APP.subscription?.data || APP.subscription;
    if (sub?.plan === 'LOCAL' && typeof SUBS !== 'undefined' && !SUBS.canBackupCloud()) {
      const h = SUBS.nextBackupIn();
      showToast(`⏳ Prochaine sauvegarde disponible dans ${h}h (limite 24h — plan Local)`, 'warning');
      return;
    }
    showToast('Sauvegarde en cours...', 'info');
    try {
      await FM.manualBackupCloud();
      showToast('✅ Sauvegarde cloud réussie', 'success');
      await APP.addLog('SUCCESS', 'Sauvegarde cloud effectuée');
    } catch(e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  },

  async _doRestore() {
    showConfirm({
      title: 'Restaurer depuis le cloud',
      message: 'Cela va remplacer toutes les données locales par celles du cloud. Continuer ?',
      icon: 'danger',
      confirmText: 'Restaurer',
      onConfirm: async () => {
        if (!navigator.onLine) { showToast('Connexion internet requise pour la restauration', 'error'); return; }
        showToast('Restauration en cours...', 'info');
        try {
          // Restaurer la config depuis le cloud
          const cloudConfig = await FM.fetchConfig();
          if (cloudConfig) {
            if (cloudConfig.postes && !Array.isArray(cloudConfig.postes))
              cloudConfig.postes = Object.values(cloudConfig.postes).filter(p => p && p.id);
            await DB.saveConfig(cloudConfig);
            APP.config = cloudConfig;
          }
          // Restaurer toutes les collections depuis le cloud
          const cols = ['produits','ventes','depenses','credits','clients','proformas','stockMovements','amortizedExpenses'];
          for (const col of cols) {
            const fbData = await FM.fetchOnce(col);
            const items = fbData ? Object.values(fbData).filter(v => v && typeof v === 'object') : [];
            await DB.replaceAll(col, items);
          }
          showToast('✅ Restauration réussie — rechargement...', 'success');
          await APP.addLog('SUCCESS', 'Restauration depuis cloud effectuée');
          setTimeout(() => location.reload(), 1500);
        } catch(e) {
          showToast('Erreur restauration : ' + e.message, 'error');
        }
      }
    });
  },

  async toggleMultiposte(val) {
    APP.config.multiposte = val;
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    showToast(`Mode multiposte ${val ? 'activé ✓' : 'désactivé'}`, val ? 'success' : 'info');
    // Re-render pour mettre à jour l'UI (checkbox, badge état)
    this._renderSection();
  },

  _renderCategories(config) {
    const cats = config.categories || { products: [], expenses: [] };
    const renderList = (type, items) => `
      <div>
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-medium text-gray-300">${type === 'products' ? 'Produits' : 'Dépenses'}</h4>
        </div>
        <div class="space-y-1 mb-2">
          ${items.map((c, i) => `
            <div class="flex items-center gap-2">
              <span class="flex-1 text-sm text-gray-300 bg-gray-700 px-3 py-1.5 rounded">${escapeHtml(c)}</span>
              <button onclick="CONFIG_MOD.deleteCategory('${type}',${i})" class="text-red-400 hover:text-red-300 text-xs">✕</button>
            </div>
          `).join('')}
        </div>
        <div class="flex gap-2">
          <input id="new-cat-${type}" type="text" placeholder="Nouvelle catégorie..." class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
          <button onclick="CONFIG_MOD.addCategory('${type}')" class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">+</button>
        </div>
      </div>
    `;
    return `
      <div class="p-4 space-y-6">
        <h3 class="text-base font-semibold text-white">Catégories</h3>
        ${renderList('products', cats.products || [])}
        ${renderList('expenses', cats.expenses || [])}
      </div>
    `;
  },

  async addCategory(type) {
    const val = document.getElementById(`new-cat-${type}`)?.value.trim();
    if (!val) return;
    if (!APP.config.categories) APP.config.categories = { products: [], expenses: [] };
    APP.config.categories[type] = [...(APP.config.categories[type]||[]), val];
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    this._section = 'categories';
    this._renderSection();
  },

  async deleteCategory(type, index) {
    APP.config.categories[type].splice(index, 1);
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    this._renderSection();
  },

  _renderWidgets(config) {
    const widgets = config.widgets || {};
    const defs = [
      { key: 'solde', label: 'Solde caisse' }, { key: 'ca', label: "Chiffre d'affaires" },
      { key: 'depenses', label: 'Total dépenses' }, { key: 'especes', label: 'Ventes espèces' },
      { key: 'mobile', label: 'Ventes mobile' }, { key: 'carte', label: 'Ventes carte' },
      { key: 'nbVentes', label: 'Nombre de ventes' }, { key: 'credits', label: 'Crédits en attente' },
    ];
    return `
      <div class="p-4 space-y-4">
        <h3 class="text-base font-semibold text-white">Widgets du tableau de bord</h3>
        <div class="space-y-2">
          ${defs.map(w => `
            <label class="flex items-center gap-3 cursor-pointer py-1.5">
              <input type="checkbox" ${widgets[w.key] !== false ? 'checked' : ''} onchange="CONFIG_MOD.toggleWidget('${w.key}',this.checked)" class="rounded">
              <span class="text-sm text-gray-300">${w.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  },

  async toggleWidget(key, val) {
    if (!APP.config.widgets) APP.config.widgets = {};
    APP.config.widgets[key] = val;
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
  },

  _renderPostes(config) {
    const postes = config.postes || [];
    CONFIG_MOD._postesCache = {};
    postes.forEach(p => { CONFIG_MOD._postesCache[p.id] = p; });
    return `
      <div class="p-4 space-y-4">
        <h3 class="text-base font-semibold text-white">Gestion des postes</h3>

        <!-- Toggle multiposte directement ici -->
        <div class="bg-gray-700/40 rounded-xl p-4 border ${config.multiposte ? 'border-indigo-500/40' : 'border-gray-600'}">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <div class="text-white font-medium text-sm">Mode multiposte</div>
                <span class="px-2 py-0.5 rounded-full text-xs ${config.multiposte ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-400'}">
                  ${config.multiposte ? 'Activé' : 'Désactivé'}
                </span>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                ${config.multiposte
                  ? 'Chaque poste a ses propres accès. Un écran de sélection s\'affiche à la connexion.'
                  : 'Tous les utilisateurs ont accès complet. Activez pour créer des postes avec permissions limitées.'}
              </div>
            </div>
            <!-- Toggle switch -->
            <button onclick="CONFIG_MOD._toggleMultiposteFromPostes(${!config.multiposte})"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 flex-shrink-0 ${config.multiposte ? 'bg-indigo-600' : 'bg-gray-600'}">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.multiposte ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>
          </div>
        </div>

        <!-- Liste des postes (visible même si désactivé, avec avertissement) -->
        ${!config.multiposte ? `
        <div class="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <svg class="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          <span class="text-xs text-yellow-400">Activez le mode multiposte ci-dessus pour que la sélection de poste soit demandée à la connexion.</span>
        </div>` : ''}

        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">${postes.length} poste(s) configuré(s)</span>
          <button onclick="CONFIG_MOD._addPoste()" class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Ajouter un poste
          </button>
        </div>

        <div class="space-y-2">
          ${postes.length ? postes.map(p => {
            const permCount = Object.values(p.permissions||{}).filter(Boolean).length;
            const totalPerms = Object.keys(p.permissions||{}).length;
            return `
            <div class="bg-gray-700/50 rounded-xl p-3 flex items-center justify-between border border-gray-700 hover:border-gray-600 transition-colors">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  <span class="font-medium text-white">${escapeHtml(p.name)}</span>
                  ${p.passwordHash ? '<span class="text-xs text-gray-500" title="Protégé par mot de passe">🔒</span>' : ''}
                </div>
                <div class="text-xs text-gray-400 mt-0.5 ml-6">${permCount} / ${totalPerms} permissions</div>
              </div>
              <div class="flex gap-1 ml-2">
                <button onclick="CONFIG_MOD._editPoste('${p.id}')" title="Modifier" class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 18l-3 1 1-3 9.879-9.879z"/></svg>
                </button>
                <button onclick="CONFIG_MOD._deletePoste('${p.id}')" title="Supprimer" class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>`;
          }).join('') : `
            <div class="text-center py-6 text-gray-500 text-sm">
              <svg class="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197"/></svg>
              Aucun poste créé.<br>Créez des postes pour attribuer des accès différents à vos employés.
            </div>`}
        </div>
      </div>
    `;
  },

  async _toggleMultiposteFromPostes(val) {
    APP.config.multiposte = val;
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    showToast(`Mode multiposte ${val ? 'activé ✓' : 'désactivé'}`, val ? 'success' : 'info');
    // Re-render la section postes pour refléter le changement
    this._renderSection();
  },

  _addPoste() {
    SYS.renderPosteForm(null, async (p) => { await SYS.savePoste(p); CONFIG_MOD._renderSection(); });
  },

  _editPoste(posteId) {
    const poste = (CONFIG_MOD._postesCache || {})[posteId] || (APP.config?.postes || []).find(p => p.id === posteId);
    if (!poste) { showToast('Poste introuvable', 'error'); return; }
    SYS.renderPosteForm(poste, async (saved) => { await SYS.savePoste(saved); CONFIG_MOD._renderSection(); });
  },

  async _deletePoste(posteId) {
    showConfirm({
      title: 'Supprimer le poste',
      message: 'Supprimer ce poste ?',
      icon: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await SYS.deletePoste(posteId);
        this._renderSection();
      }
    });
  },

  _renderData() {
    const sub = APP.subscription?.data || APP.subscription;
    const isLocal = sub?.plan === 'LOCAL';
    const canBackup = !isLocal || (typeof SUBS !== 'undefined' && SUBS.canBackupCloud());
    const nextH = (isLocal && typeof SUBS !== 'undefined') ? SUBS.nextBackupIn() : 0;

    return `
      <div class="p-4 space-y-4">
        <h3 class="text-base font-semibold text-white">Sauvegarde et restauration</h3>

        ${isLocal ? `
        <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2">
          <svg class="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          <div>
            <div class="text-yellow-400 text-xs font-semibold">Plan Local — Sauvegarde cloud limitée</div>
            <div class="text-gray-400 text-xs mt-0.5">
              Une sauvegarde cloud toutes les 24h.<br>
              ${!canBackup ? `⏳ Prochaine sauvegarde dans <strong class="text-yellow-400">${nextH}h</strong>` : '✅ Sauvegarde disponible maintenant'}
            </div>
          </div>
        </div>` : ''}

        <div class="bg-gray-700/30 rounded-xl p-4 space-y-3">
          <div>
            <h4 class="text-sm font-medium text-white flex items-center gap-1.5">
              ☁️ Sauvegarde et restauration cloud
            </h4>
            <p class="text-xs text-gray-400 mt-0.5">
              ${isLocal
                ? 'Sauvegardez vos données sur le cloud pour les récupérer sur un autre appareil ou après une perte.'
                : 'Synchronise toutes vos données locales vers le cloud.'}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="CONFIG_MOD._doBackup()" ${!canBackup ? 'disabled' : ''}
              class="px-4 py-2 ${canBackup ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'} text-white rounded-lg text-sm flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              ${isLocal ? (canBackup ? 'Sauvegarder dans le cloud' : `Disponible dans ${nextH}h`) : 'Sauvegarder'}
            </button>
            <button onclick="CONFIG_MOD._doRestore()"
              class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5V21"/></svg>
              Restaurer depuis cloud
            </button>
          </div>
          <p class="text-xs text-gray-500">💡 Utile si vous changez d'appareil ou si votre appareil est perdu/endommagé.</p>
        </div>

        <div class="bg-gray-700/30 rounded-xl p-4 space-y-2">
          <h4 class="text-sm font-medium text-white">Export local (JSON)</h4>
          <p class="text-xs text-gray-400">Télécharger toutes les données sous forme de fichier JSON</p>
          <div class="flex gap-2">
            <button onclick="CONFIG_MOD.exportAll()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Exporter tout</button>
            <label class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 cursor-pointer">
              Importer JSON
              <input type="file" accept=".json" class="hidden" onchange="CONFIG_MOD.importAll(this)">
            </label>
          </div>
        </div>

        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
          <h4 class="text-sm font-medium text-red-400">Zone dangereuse</h4>
          <button onclick="CONFIG_MOD.resetAll()" class="px-4 py-2 bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-600/50">Réinitialiser toutes les données</button>
        </div>
      </div>
    `;
  },

  async exportAll() {
    const data = {};
    const collections = ['produits','ventes','depenses','credits','clients','proformas','stockMovements','amortizedExpenses','logs'];
    for (const col of collections) data[col] = await DB.getAll(col);
    data.config = APP.config;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `backup_${APP.config?.id||'erp'}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Export réussi', 'success');
  },

  async importAll(input) {
    const file = input.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      showConfirm({
        title: 'Importer les données',
        message: 'Cela remplacera toutes les données existantes. Continuer ?',
        icon: 'danger',
        confirmText: 'Importer',
        onConfirm: async () => {
          const collections = ['produits','ventes','depenses','credits','clients','proformas','stockMovements','amortizedExpenses'];
          for (const col of collections) {
            if (data[col]) await DB.replaceAll(col, data[col]);
          }
          showToast('Import réussi. Rechargez la page.', 'success');
        }
      });
    } catch (e) {
      showToast('Fichier JSON invalide', 'error');
    }
    input.value = '';
  },

  resetAll() {
    showPasswordPrompt('Confirmez avec votre mot de passe', async (pwd) => {
      if (FM.hashPassword(pwd) !== APP.config?.passwordHash) { showToast('Mot de passe incorrect', 'error'); return; }
      showConfirm({
        title: 'RÉINITIALISATION',
        message: 'Toutes les données seront supprimées définitivement. Cette action est IRRÉVERSIBLE.',
        icon: 'danger',
        confirmText: 'RÉINITIALISER',
        onConfirm: async () => {
          const cols = ['produits','ventes','depenses','credits','clients','proformas','stockMovements','amortizedExpenses','logs'];
          for (const col of cols) await DB.clear(col);
          showToast('Données réinitialisées', 'success');
          APP.switchTab('dashboard');
        }
      });
    });
  },

  _renderSubscription() {
    return `<div class="p-4">${SUBS.renderCard()}</div>`;
  }
};
