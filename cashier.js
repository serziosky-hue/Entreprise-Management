// cashier.js — Gestion de caisse : fond, mouvements, clôture journalière
'use strict';

window.CASHIER = {
  _view: 'today',
  _activeCaisseId: null,
  _historyDetailId: null,

  // Types de mouvements prédéfinis
  CATEGORIES: {
    in:  ['Vente', 'Avance client', 'Remboursement', 'Apport', 'Autre entrée'],
    out: ['Achat fournisseur', 'Salaire', 'Loyer', 'Fournitures', 'Remise en banque', 'Remboursement client', 'Autre sortie']
  },

  async render() {
    const el = document.getElementById('tab-cashier');
    if (!el) return;
    const today = new Date().toISOString().split('T')[0];
    const currency = APP.config?.currency || 'Ar';
    const posteId = APP.currentPoste?.id || 'admin';

    const allCaisses = await DB.getAll('caisses');
    const todayCaisse = allCaisses.find(c => c.date === today && c.posteId === posteId && c.status === 'open');
    this._activeCaisseId = todayCaisse?.id || null;

    el.innerHTML = `
      <div class="p-4 md:p-6 max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-white">Caisse</h1>
            <p class="text-sm text-gray-400 mt-0.5">${APP.currentPoste?.name || 'Admin'} · ${formatDate(today)}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="CASHIER._setView('today')" class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='today'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">📋 Aujourd'hui</button>
            <button onclick="CASHIER._setView('history')" class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='history'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">📆 Historique</button>
          </div>
        </div>
        <div id="cashier-content"></div>
      </div>`;

    const content = document.getElementById('cashier-content');
    if (this._view === 'today') {
      content.innerHTML = await this._renderToday(todayCaisse, currency, today, posteId);
    } else if (this._view === 'history' && this._historyDetailId) {
      content.innerHTML = await this._renderHistoryDetail(this._historyDetailId, currency);
    } else {
      content.innerHTML = await this._renderHistory(allCaisses, currency);
    }
  },

  _setView(v) { this._view = v; this._historyDetailId = null; this.render(); },

  // ─── VUE AUJOURD'HUI ──────────────────────────────────────────────────────
  async _renderToday(caisse, currency, today, posteId) {
    if (!caisse) return `
      <div class="max-w-md mx-auto bg-gray-800 rounded-2xl p-8 text-center">
        <div class="text-5xl mb-4">💰</div>
        <h2 class="text-lg font-semibold text-white mb-2">Ouvrir la caisse</h2>
        <p class="text-sm text-gray-400 mb-6">Aucune caisse ouverte pour aujourd'hui. Définissez le fond initial pour commencer.</p>
        <div class="mb-4 text-left">
          <label class="text-xs text-gray-400">Fond de caisse initial</label>
          <input id="open-balance" type="number" min="0" value="0" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm text-right">
        </div>
        <button onclick="CASHIER.openCaisse()" class="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold">Ouvrir la caisse</button>
      </div>`;

    const mouvements = await DB.getByIndex('caisseMouvements', 'caisseId', caisse.id);
    const totalIn  = mouvements.filter(m => m.type==='in').reduce((s,m) => s+(m.amount||0), 0);
    const totalOut = mouvements.filter(m => m.type==='out').reduce((s,m) => s+(m.amount||0), 0);
    const balance  = (caisse.openBalance||0) + totalIn - totalOut;
    const sorted   = [...mouvements].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

    return `
      <div class="space-y-4">
        <!-- KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-gray-800 rounded-xl p-4 text-center">
            <div class="text-xs text-gray-400 mb-1">Fond initial</div>
            <div class="text-base font-bold text-white">${formatCurrency(caisse.openBalance||0, currency)}</div>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center">
            <div class="text-xs text-green-400 mb-1">Entrées</div>
            <div class="text-base font-bold text-green-400">${formatCurrency(totalIn, currency)}</div>
          </div>
          <div class="bg-gray-800 rounded-xl p-4 text-center">
            <div class="text-xs text-red-400 mb-1">Sorties</div>
            <div class="text-base font-bold text-red-400">${formatCurrency(totalOut, currency)}</div>
          </div>
          <div class="bg-indigo-900/30 border border-indigo-700/40 rounded-xl p-4 text-center">
            <div class="text-xs text-indigo-400 mb-1">Solde actuel</div>
            <div class="text-lg font-bold text-indigo-300">${formatCurrency(balance, currency)}</div>
          </div>
        </div>

        <!-- Saisie mouvement -->
        <div class="bg-gray-800 rounded-2xl p-4">
          <h3 class="text-sm font-semibold text-white mb-3">Enregistrer un mouvement</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="text-xs text-gray-400">Type</label>
              <select id="mv-type" onchange="CASHIER._updateCategories()" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                <option value="in">➕ Entrée</option>
                <option value="out">➖ Sortie</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-400">Catégorie</label>
              <select id="mv-category" onchange="CASHIER._fillLabelFromCategory()" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                ${this.CATEGORIES.in.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div class="md:col-span-2">
              <label class="text-xs text-gray-400">Libellé / Détail</label>
              <input id="mv-label" type="text" placeholder="ex: Vente comptoir, remise en banque..." class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
            </div>
            <div>
              <label class="text-xs text-gray-400">Montant</label>
              <input id="mv-amount" type="number" min="0" step="0.01" placeholder="0" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm text-right">
            </div>
          </div>
          <button onclick="CASHIER.addMouvement('${caisse.id}')" class="mt-3 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Ajouter</button>
        </div>

        <!-- Mouvements du jour -->
        <div class="bg-gray-800 rounded-2xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
            <h3 class="text-sm font-semibold text-white">Mouvements du jour (${mouvements.length})</h3>
            <div class="flex gap-2">
              <button onclick="CASHIER.printReport('${caisse.id}')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">🖨️ Imprimer</button>
              <button onclick="CASHIER.closeCaisse('${caisse.id}', ${balance})" class="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-medium">🔒 Clôturer</button>
            </div>
          </div>
          ${sorted.length === 0
            ? '<div class="text-center py-8 text-sm text-gray-400">Aucun mouvement enregistré.</div>'
            : `<div class="divide-y divide-gray-700/50">
              ${sorted.map(m => `
                <div class="flex items-center justify-between px-4 py-3 hover:bg-gray-700/20">
                  <div class="flex items-center gap-3">
                    <span class="text-lg">${m.type==='in'?'➕':'➖'}</span>
                    <div>
                      <div class="text-sm text-white">${escapeHtml(m.label||'—')}</div>
                      <div class="text-xs text-gray-500">${m.category ? escapeHtml(m.category)+' · ' : ''}${m.createdAt ? new Date(m.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—'}</div>
                      ${m.reference ? `<div class="text-xs text-indigo-400">${escapeHtml(m.reference)}</div>` : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="font-bold ${m.type==='in'?'text-green-400':'text-red-400'}">${m.type==='in'?'+':'-'}${formatCurrency(m.amount||0, currency)}</span>
                    <button onclick="CASHIER.deleteMouvement('${m.id}','${caisse.id}')" class="text-gray-500 hover:text-red-400 text-lg leading-none">×</button>
                  </div>
                </div>`).join('')}
            </div>`}
        </div>
      </div>`;
  },

  _updateCategories() {
    const type = document.getElementById('mv-type')?.value || 'in';
    const sel = document.getElementById('mv-category');
    if (!sel) return;
    sel.innerHTML = this.CATEGORIES[type].map(c => `<option value="${c}">${c}</option>`).join('');
    this._fillLabelFromCategory();
  },

  _fillLabelFromCategory() {
    const cat = document.getElementById('mv-category')?.value || '';
    const lbl = document.getElementById('mv-label');
    if (lbl && !lbl.value) lbl.value = cat;
  },

  // ─── HISTORIQUE ───────────────────────────────────────────────────────────
  async _renderHistory(allCaisses, currency) {
    const sorted = [...allCaisses].sort((a,b) => (b.date||'').localeCompare(a.date||''));
    if (sorted.length === 0) return '<div class="text-center py-16 text-gray-400"><div class="text-4xl mb-3">📆</div><div>Aucun historique de caisse.</div></div>';

    return `
      <div class="bg-gray-800 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-700/50 text-gray-400 text-xs">
              <tr>
                <th class="text-left px-4 py-3">Date</th>
                <th class="text-left px-4 py-3">Poste</th>
                <th class="text-right px-4 py-3">Fond initial</th>
                <th class="text-right px-4 py-3">Entrées</th>
                <th class="text-right px-4 py-3">Sorties</th>
                <th class="text-right px-4 py-3">Solde clôture</th>
                <th class="text-right px-4 py-3">Écart</th>
                <th class="text-center px-4 py-3">Statut</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${sorted.map(c => {
                const calculated = (c.openBalance||0) + (c.totalIn||0) - (c.totalOut||0);
                const closeBalance = c.closeBalance ?? calculated;
                const ecart = c.actualBalance != null ? c.actualBalance - closeBalance : null;
                return `
                <tr class="hover:bg-gray-700/30">
                  <td class="px-4 py-3 text-white">${formatDate(c.date)}</td>
                  <td class="px-4 py-3 text-gray-300">${escapeHtml(c.posteName||c.posteId)}</td>
                  <td class="px-4 py-3 text-right text-gray-300">${formatCurrency(c.openBalance||0, currency)}</td>
                  <td class="px-4 py-3 text-right text-green-400">${formatCurrency(c.totalIn||0, currency)}</td>
                  <td class="px-4 py-3 text-right text-red-400">${formatCurrency(c.totalOut||0, currency)}</td>
                  <td class="px-4 py-3 text-right font-bold text-white">${formatCurrency(closeBalance, currency)}</td>
                  <td class="px-4 py-3 text-right text-xs ${ecart===null?'text-gray-500':ecart===0?'text-green-400':ecart>0?'text-blue-400':'text-red-400'}">${ecart===null?'—':formatCurrency(ecart, currency)}</td>
                  <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs ${c.status==='closed'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}">${c.status==='closed'?'Clôturé':'Ouvert'}</span></td>
                  <td class="px-4 py-3">
                    <div class="flex gap-1 justify-end">
                      <button onclick="CASHIER._showHistoryDetail('${c.id}')" class="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300" title="Mouvements">👁️</button>
                      <button onclick="CASHIER.printReport('${c.id}')" class="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300" title="Imprimer">🖨️</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  async _showHistoryDetail(caisseId) {
    this._historyDetailId = caisseId;
    const content = document.getElementById('cashier-content');
    if (content) content.innerHTML = await this._renderHistoryDetail(caisseId, APP.config?.currency||'Ar');
  },

  async _renderHistoryDetail(caisseId, currency) {
    const caisse = await DB.get('caisses', caisseId);
    if (!caisse) return '';
    const mouvements = await DB.getByIndex('caisseMouvements', 'caisseId', caisseId);
    const sorted = [...mouvements].sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''));
    const totalIn  = sorted.filter(m=>m.type==='in').reduce((s,m)=>s+(m.amount||0),0);
    const totalOut = sorted.filter(m=>m.type==='out').reduce((s,m)=>s+(m.amount||0),0);
    const balance  = (caisse.openBalance||0)+totalIn-totalOut;

    return `
      <div class="space-y-4">
        <div class="flex items-center gap-3 mb-2">
          <button onclick="CASHIER._historyDetailId=null;CASHIER.render()" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">← Retour</button>
          <h2 class="text-base font-semibold text-white">Caisse du ${formatDate(caisse.date)} — ${escapeHtml(caisse.posteName||caisse.posteId)}</h2>
          <button onclick="CASHIER.printReport('${caisseId}')" class="ml-auto px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">🖨️ Imprimer</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-gray-800 rounded-xl p-3 text-center"><div class="text-xs text-gray-400">Fond initial</div><div class="font-bold text-white">${formatCurrency(caisse.openBalance||0, currency)}</div></div>
          <div class="bg-gray-800 rounded-xl p-3 text-center"><div class="text-xs text-green-400">Entrées</div><div class="font-bold text-green-400">${formatCurrency(totalIn, currency)}</div></div>
          <div class="bg-gray-800 rounded-xl p-3 text-center"><div class="text-xs text-red-400">Sorties</div><div class="font-bold text-red-400">${formatCurrency(totalOut, currency)}</div></div>
          <div class="bg-indigo-900/30 border border-indigo-700/40 rounded-xl p-3 text-center"><div class="text-xs text-indigo-400">Solde clôture</div><div class="font-bold text-indigo-300">${formatCurrency(caisse.closeBalance??balance, currency)}</div></div>
        </div>
        <div class="bg-gray-800 rounded-2xl overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-700/50 text-sm font-semibold text-white">Mouvements (${sorted.length})</div>
          ${sorted.length===0 ? '<div class="text-center py-8 text-gray-400">Aucun mouvement.</div>' : `
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="text-xs text-gray-400 bg-gray-700/30"><tr>
                <th class="text-left px-4 py-2">Heure</th>
                <th class="text-left px-4 py-2">Catégorie</th>
                <th class="text-left px-4 py-2">Libellé</th>
                <th class="text-left px-4 py-2">Réf.</th>
                <th class="text-right px-4 py-2">Montant</th>
              </tr></thead>
              <tbody class="divide-y divide-gray-700/50">
                ${sorted.map(m => `
                  <tr class="hover:bg-gray-700/20">
                    <td class="px-4 py-2 text-gray-400 text-xs">${m.createdAt ? new Date(m.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                    <td class="px-4 py-2 text-gray-300 text-xs">${escapeHtml(m.category||'—')}</td>
                    <td class="px-4 py-2 text-white">${escapeHtml(m.label||'—')}</td>
                    <td class="px-4 py-2 text-indigo-400 text-xs">${escapeHtml(m.reference||'')}</td>
                    <td class="px-4 py-2 text-right font-medium ${m.type==='in'?'text-green-400':'text-red-400'}">${m.type==='in'?'+':'-'}${formatCurrency(m.amount||0, currency)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;
  },

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  async openCaisse() {
    const openBalance = parseFloat(document.getElementById('open-balance')?.value || 0);
    const today   = new Date().toISOString().split('T')[0];
    const posteId = APP.currentPoste?.id || 'admin';
    const posteName = APP.currentPoste?.name || 'Admin';
    const caisse = {
      id: genId('CSH'), date: today, posteId, posteName,
      openBalance, totalIn: 0, totalOut: 0,
      closeBalance: null, status: 'open',
      createdAt: new Date().toISOString()
    };
    await DB.put('caisses', caisse);
    this._activeCaisseId = caisse.id;
    APP.addLog('INFO', 'Caisse ouverte', { date: today, openBalance });
    showToast(`Caisse ouverte — Fond : ${formatCurrency(openBalance, APP.config?.currency||'Ar')}`, 'success');
    this.render();
  },

  async addMouvement(caisseId) {
    const type     = document.getElementById('mv-type')?.value || 'in';
    const category = document.getElementById('mv-category')?.value || '';
    const amount   = parseFloat(document.getElementById('mv-amount')?.value || 0);
    const label    = document.getElementById('mv-label')?.value.trim();
    if (amount <= 0) { showToast('Montant invalide', 'warning'); return; }
    if (!label)      { showToast('Saisissez un libellé', 'warning'); return; }
    const mv = {
      id: genId('CMV'), caisseId, type, category, amount, label,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
    showToast('Mouvement enregistré', 'success');
    document.getElementById('mv-amount').value = '';
    document.getElementById('mv-label').value  = '';
    this.render();
  },

  async _updateCaisseTotals(caisseId) {
    const caisse = await DB.get('caisses', caisseId);
    if (!caisse) return;
    const mouvements = await DB.getByIndex('caisseMouvements', 'caisseId', caisseId);
    caisse.totalIn  = mouvements.filter(m=>m.type==='in').reduce((s,m)=>s+(m.amount||0),0);
    caisse.totalOut = mouvements.filter(m=>m.type==='out').reduce((s,m)=>s+(m.amount||0),0);
    await DB.put('caisses', caisse);
  },

  async deleteMouvement(id, caisseId) {
    await DB.delete('caisseMouvements', id);
    await this._updateCaisseTotals(caisseId);
    this.render();
  },

  async closeCaisse(caisseId, expectedBalance) {
    const currency = APP.config?.currency || 'Ar';
    showModal(`
      <div class="p-5">
        <h3 class="text-base font-bold text-white mb-1">🔒 Clôturer la caisse</h3>
        <p class="text-sm text-gray-400 mb-4">Vérifiez le solde physique en caisse avant de clôturer.</p>
        <div class="bg-gray-700/50 rounded-xl p-3 mb-4">
          <div class="flex justify-between text-sm"><span class="text-gray-400">Solde théorique</span><span class="font-bold text-white">${formatCurrency(expectedBalance, currency)}</span></div>
        </div>
        <div class="mb-4">
          <label class="text-xs text-gray-400">Solde réel compté en caisse</label>
          <input id="close-actual" type="number" min="0" step="0.01" value="${expectedBalance}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm text-right">
          <div id="close-ecart" class="text-xs text-gray-500 mt-1 text-right"></div>
        </div>
        <div class="mb-4">
          <label class="text-xs text-gray-400">Note de clôture (optionnel)</label>
          <input id="close-note" type="text" placeholder="Observation..." class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
        </div>
        <div class="flex gap-3">
          <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
          <button onclick="CASHIER._confirmClose('${caisseId}', ${expectedBalance})" class="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold">Clôturer</button>
        </div>
      </div>`);
    // calcul écart dynamique
    setTimeout(() => {
      document.getElementById('close-actual')?.addEventListener('input', function() {
        const actual = parseFloat(this.value||0);
        const ecart  = actual - expectedBalance;
        const el = document.getElementById('close-ecart');
        if (el) el.innerHTML = `Écart : <span class="${ecart===0?'text-green-400':ecart>0?'text-blue-400':'text-red-400'} font-bold">${ecart>=0?'+':''}${formatCurrency(ecart, currency)}</span>`;
      });
    }, 50);
  },

  async _confirmClose(caisseId, expectedBalance) {
    const actualBalance = parseFloat(document.getElementById('close-actual')?.value ?? expectedBalance);
    const note = document.getElementById('close-note')?.value.trim() || '';
    closeModal();
    const caisse = await DB.get('caisses', caisseId);
    if (!caisse) return;
    await this._updateCaisseTotals(caisseId);
    const updated = await DB.get('caisses', caisseId);
    updated.status       = 'closed';
    updated.closeBalance = expectedBalance;
    updated.actualBalance = actualBalance;
    updated.ecart        = actualBalance - expectedBalance;
    updated.closeNote    = note;
    updated.closedAt     = new Date().toISOString();
    await DB.put('caisses', updated);
    this._activeCaisseId = null;
    APP.addLog('INFO', 'Caisse clôturée', { date: updated.date, closeBalance: expectedBalance, actualBalance, ecart: updated.ecart });
    showToast(`Caisse clôturée — Écart : ${formatCurrency(updated.ecart, APP.config?.currency||'Ar')}`, 'success');
    await this.printReport(caisseId);
    this.render();
  },

  async printReport(caisseId) {
    const caisse = await DB.get('caisses', caisseId);
    if (!caisse) return;
    const currency = APP.config?.currency || 'Ar';
    const company  = APP.config?.name || 'Mon Entreprise';
    const mouvements = await DB.getByIndex('caisseMouvements', 'caisseId', caisseId);
    const sorted = [...mouvements].sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''));
    const totalIn  = sorted.filter(m=>m.type==='in').reduce((s,m)=>s+(m.amount||0),0);
    const totalOut = sorted.filter(m=>m.type==='out').reduce((s,m)=>s+(m.amount||0),0);
    const closeBalance = caisse.closeBalance ?? ((caisse.openBalance||0)+totalIn-totalOut);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport de Caisse — ${formatDate(caisse.date)}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;max-width:720px;margin:auto}
    h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin:12px 0}
    th,td{padding:6px 8px;border:1px solid #e5e7eb}th{background:#f3f4f6}
    .in{color:#16a34a}.out{color:#dc2626}.bold{font-weight:bold}
    .header{border-bottom:2px solid #6366f1;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between}
    @media print{button{display:none}}</style></head>
    <body>
    <div class="header">
      <div><h1>${escapeHtml(company)}</h1><div style="color:#6b7280">Rapport de Caisse — Poste : ${escapeHtml(caisse.posteName||caisse.posteId)}</div></div>
      <div style="text-align:right">Date : ${formatDate(caisse.date)}<br>Imprimé : ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>
    <table>
      <tr><th>Fond initial</th><th>Total entrées</th><th>Total sorties</th><th>Solde théorique</th>${caisse.actualBalance!=null?'<th>Solde réel</th><th>Écart</th>':''}</tr>
      <tr>
        <td>${formatCurrency(caisse.openBalance||0,currency)}</td>
        <td class="in">${formatCurrency(totalIn,currency)}</td>
        <td class="out">${formatCurrency(totalOut,currency)}</td>
        <td class="bold">${formatCurrency(closeBalance,currency)}</td>
        ${caisse.actualBalance!=null?`<td>${formatCurrency(caisse.actualBalance,currency)}</td><td class="${caisse.ecart>=0?'in':'out'}">${caisse.ecart>=0?'+':''}${formatCurrency(caisse.ecart,currency)}</td>`:''}
      </tr>
    </table>
    ${caisse.closeNote?`<p><strong>Note :</strong> ${escapeHtml(caisse.closeNote)}</p>`:''}
    <h2 style="font-size:14px;margin:16px 0 8px">Détail des mouvements</h2>
    <table>
      <thead><tr><th>Heure</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th>Réf.</th><th style="text-align:right">Montant</th></tr></thead>
      <tbody>
        ${sorted.map(m=>`<tr><td>${m.createdAt?new Date(m.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—'}</td><td class="${m.type==='in'?'in':'out'}">${m.type==='in'?'Entrée':'Sortie'}</td><td>${escapeHtml(m.category||'—')}</td><td>${escapeHtml(m.label||'—')}</td><td>${escapeHtml(m.reference||'')}</td><td class="${m.type==='in'?'in':'out'}" style="text-align:right">${m.type==='in'?'+':'-'}${formatCurrency(m.amount||0,currency)}</td></tr>`).join('')}
        <tr class="bold"><td colspan="5">SOLDE FINAL</td><td style="text-align:right">${formatCurrency(closeBalance,currency)}</td></tr>
      </tbody>
    </table>
    <script>window.onload=()=>window.print()<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.onload = () => URL.revokeObjectURL(url);
  },

  // Appelé depuis sales/orders pour enregistrer une vente en caisse active
  async recordSaleMouvement(sale) {
    const caisseId = this._activeCaisseId;
    if (!caisseId) return;
    const mv = {
      id: genId('CMV'), caisseId, type: 'in',
      category: 'Vente', amount: sale.total || 0,
      label: `Vente ${sale.number || sale.id}`,
      reference: sale.id,
      date: sale.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
  },

  // Appelé depuis expenses.js pour enregistrer une dépense en caisse active
  async recordExpenseMouvement(expense) {
    const caisseId = this._activeCaisseId;
    if (!caisseId) return;
    
    // Mapper la catégorie de dépense vers une catégorie de caisse
    let caisseCategory = 'Autre sortie';
    const categoryMap = {
      'Loyer': 'Loyer',
      'Transport': 'Fournitures',
      'Salaires': 'Salaire', 
      'Fournitures': 'Fournitures',
      'Autre': 'Autre sortie'
    };
    caisseCategory = categoryMap[expense.category] || 'Autre sortie';
    
    const mv = {
      id: genId('CMV'), caisseId, type: 'out',
      category: caisseCategory, amount: expense.amount || 0,
      label: expense.motif || expense.notes || `Dépense ${expense.id}`,
      reference: expense.id,
      date: expense.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
  },

  // Appelé depuis credits.js pour enregistrer un paiement de crédit en caisse active
  async recordCreditPaymentMouvement(credit, amount, mode) {
    const caisseId = this._activeCaisseId;
    if (!caisseId) return;
    
    const mv = {
      id: genId('CMV'), caisseId, type: 'in',
      category: 'Avance client', amount: amount,
      label: `Paiement crédit ${credit.clientName} (${credit.saleNumber || credit.id})`,
      reference: credit.id,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
  },

  // Appelé depuis suppliers.js pour enregistrer un achat fournisseur en caisse active
  async recordPurchaseMouvement(purchase) {
    const caisseId = this._activeCaisseId;
    if (!caisseId) return;
    
    const mv = {
      id: genId('CMV'), caisseId, type: 'out',
      category: 'Achat fournisseur', amount: purchase.total || 0,
      label: `Achat ${purchase.number} - ${purchase.fournisseurName}`,
      reference: purchase.id,
      date: purchase.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
  },

  // Appelé depuis returns.js pour enregistrer un remboursement client en caisse active
  async recordRefundMouvement(refund) {
    const caisseId = this._activeCaisseId;
    if (!caisseId) return;
    
    const mv = {
      id: genId('CMV'), caisseId, type: 'out',
      category: 'Remboursement client', amount: refund.total || 0,
      label: `Remboursement ${refund.number} - ${refund.clientName}`,
      reference: refund.id,
      date: refund.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
  },

  // Appelé depuis stocks.js pour enregistrer un achat de stock en caisse active
  async recordStockPurchaseMouvement(expense, product, qty, price) {
    const caisseId = this._activeCaisseId;
    if (!caisseId) return;
    
    const mv = {
      id: genId('CMV'), caisseId, type: 'out',
      category: 'Achat fournisseur', amount: expense.amount || 0,
      label: `Achat stock : ${product.nom} — ${qty} ${product.unite||'u'} × ${formatCurrency(price)}`,
      reference: expense.id,
      date: expense.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
  },

  // Fonction utilitaire pour les autres modules - enregistre un mouvement générique
  async recordMouvement(type, category, amount, label, reference = null, date = null) {
    const caisseId = this._activeCaisseId;
    if (!caisseId) return false;
    
    const mv = {
      id: genId('CMV'), caisseId, type, category, amount, label,
      reference: reference,
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await DB.put('caisseMouvements', mv);
    await this._updateCaisseTotals(caisseId);
    return true;
  },

  // Vérifie si une caisse est active (pour les autres modules)
  isActiveCaisse() {
    return !!this._activeCaisseId;
  },

  // Retourne l'ID de la caisse active (pour les autres modules)
  getActiveCaisseId() {
    return this._activeCaisseId;
  },

  // Méthodes utilitaires pour les types de mouvements spécifiques
  async recordCustomerAdvance(amount, clientName, reference = null) {
    return await this.recordMouvement('in', 'Avance client', amount, 
      `Avance client : ${clientName}`, reference);
  },

  async recordRefundReceived(amount, description, reference = null) {
    return await this.recordMouvement('in', 'Remboursement', amount, 
      `Remboursement reçu : ${description}`, reference);
  },

  async recordContribution(amount, description, reference = null) {
    return await this.recordMouvement('in', 'Apport', amount, 
      `Apport : ${description}`, reference);
  },

  async recordBankDeposit(amount, reference = null) {
    return await this.recordMouvement('out', 'Remise en banque', amount, 
      `Remise en banque`, reference);
  },

  async recordSalaryPayment(amount, employeeName, reference = null) {
    return await this.recordMouvement('out', 'Salaire', amount, 
      `Salaire : ${employeeName}`, reference);
  },

  async recordRentPayment(amount, description, reference = null) {
    return await this.recordMouvement('out', 'Loyer', amount, 
      `Loyer : ${description}`, reference);
  },

  async recordOtherIncome(amount, description, reference = null) {
    return await this.recordMouvement('in', 'Autre entrée', amount, 
      description, reference);
  },

  async recordOtherExpense(amount, description, reference = null) {
    return await this.recordMouvement('out', 'Autre sortie', amount, 
      description, reference);
  }
};
