// expenses.js — Dépenses simples et amorties
'use strict';

window.EXPENSES = {
  _view: 'simple', // 'simple' | 'amortized'
  _page: 1, _perPage: 20,
  _filterCat: '', _filterDate: '',

  async render() {
    const el = document.getElementById('tab-expenses');
    if (!el) return;
    try {
    el.innerHTML = `
      <div class="p-4">
        <div class="flex gap-2 mb-4 flex-wrap">
          <button onclick="EXPENSES._view='simple';EXPENSES.render()" class="px-4 py-2 rounded-lg text-sm font-medium ${this._view==='simple'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">Dépenses simples</button>
          <button onclick="EXPENSES._view='amortized';EXPENSES.render()" class="px-4 py-2 rounded-lg text-sm font-medium ${this._view==='amortized'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">Dépenses amorties</button>
        </div>
        <div id="expenses-content"></div>
      </div>
    `;
      if (this._view === 'simple') await this._renderSimple();
      else await this._renderAmortized();
    } catch (e) {
      console.error('Expenses render error:', e);
      el.innerHTML = `<div class="p-4 text-red-400">Erreur: ${escapeHtml(e.message)}</div>`;
    }
  },

  async _renderSimple() {
    const canAdd = APP.canDo('expensesAdd');
    let items = await DB.getAll('depenses');
    items = items.filter(d => !d.amortized);
    items.sort((a, b) => b.date > a.date ? 1 : -1);

    if (this._filterCat) items = items.filter(d => d.category === this._filterCat);
    if (this._filterDate) items = items.filter(d => d.date?.startsWith(this._filterDate));

    const cats = APP.config?.categories?.expenses || ['Loyer','Transport','Salaires','Fournitures','Autre'];
    const total = items.length;
    const start = (this._page - 1) * this._perPage;
    const page = items.slice(start, start + this._perPage);
    const totalAmount = items.reduce((s, d) => s + (d.amount || 0), 0);

    document.getElementById('expenses-content').innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span class="text-lg font-bold text-white">${total} dépenses</span>
            <span class="ml-2 text-red-400 font-semibold">${formatCurrency(totalAmount)}</span>
          </div>
          ${canAdd ? `<button onclick="EXPENSES.showSimpleForm()" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Ajouter
          </button>` : ''}
        </div>

        <div class="flex gap-2 flex-wrap">
          <input type="month" value="${this._filterDate}" onchange="EXPENSES._filterDate=this.value;EXPENSES._page=1;EXPENSES._renderSimple()"
            class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
          <select onchange="EXPENSES._filterCat=this.value;EXPENSES._page=1;EXPENSES._renderSimple()"
            class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">Toutes catégories</option>
            ${cats.map(c => `<option value="${escapeHtml(c)}" ${this._filterCat===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>

        <!-- Desktop table -->
        <div class="hidden sm:block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-700 bg-gray-900/50">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Motif</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Catégorie</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mode</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant</th>
                <th class="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${page.length ? page.map((d, idx) => `
              <tr class="${idx%2===0?'':'bg-gray-700/20'} hover:bg-indigo-600/5 transition-colors">
                <td class="px-4 py-3 text-white">
                  <div class="font-medium">${escapeHtml(d.motif)}</div>
                  ${d.notes ? `<div class="text-xs text-gray-500 mt-0.5">${escapeHtml(d.notes)}</div>` : ''}
                </td>
                <td class="px-4 py-3 text-gray-400 whitespace-nowrap">${formatDate(d.date)}</td>
                <td class="px-4 py-3 text-gray-400">${escapeHtml(d.category||'—')}</td>
                <td class="px-4 py-3 text-gray-400">${escapeHtml(d.paymentMode||'—')}</td>
                <td class="px-4 py-3 text-right font-bold text-red-400 whitespace-nowrap">${formatCurrency(d.amount)}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-1.5">
                    ${APP.canDo('expensesEdit') ? `<button onclick="EXPENSES.showSimpleForm('${d.id}')" title="Modifier" class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 18l-3 1 1-3 9.879-9.879z"/></svg></button>` : ''}
                    ${APP.canDo('expensesDelete') ? `<button onclick="EXPENSES.confirmDeleteSimple('${d.id}')" title="Supprimer" class="p-1.5 rounded-lg hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>` : ''}
                  </div>
                </td>
              </tr>`).join('') : `<tr><td colspan="6" class="text-center text-gray-500 py-8">Aucune dépense</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          ${page.length ? page.map(d => `
            <div class="bg-gray-800 rounded-xl border border-gray-700 px-3 py-2.5">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-semibold text-white truncate flex-1">${escapeHtml(d.motif)}</span>
                    <span class="flex-shrink-0 font-bold text-red-400 text-sm ml-1">${formatCurrency(d.amount)}</span>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 flex-wrap leading-tight">
                    <span>${formatDate(d.date)}</span>
                    <span class="text-gray-700">·</span>
                    <span>${escapeHtml(d.category||'')}</span>
                    <span class="text-gray-700">·</span>
                    <span>${escapeHtml(d.paymentMode||'')}</span>
                    ${d.notes ? `<span class="text-gray-700">·</span><span class="truncate max-w-[120px]">${escapeHtml(d.notes)}</span>` : ''}
                  </div>
                </div>
                <button onclick="event.stopPropagation();EXPENSES._openActionSheet('${d.id}')"
                  class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-700/60 text-gray-300 active:bg-gray-600 transition-colors"
                  style="-webkit-tap-highlight-color:transparent;">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/>
                  </svg>
                </button>
              </div>
            </div>
          `).join('') : '<div class="text-center text-gray-500 py-8">Aucune dépense</div>'}
        </div>

        ${buildPagination(total, this._page, this._perPage, 'p => { EXPENSES._page=p; EXPENSES._renderSimple(); }')}
      </div>
    `;
  },

  showSimpleForm(id = null) {
    const loadDep = id ? DB.get('depenses', id) : Promise.resolve(null);
    loadDep.then(d => {
      const cats = APP.config?.categories?.expenses || ['Loyer','Transport','Salaires','Fournitures','Autre'];
      showModal(`
        <div class="p-6">
          <h3 class="text-lg font-bold text-white mb-4">${id ? 'Modifier dépense' : 'Nouvelle dépense'}</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-400">Motif *</label>
              <input id="dep-motif" value="${escapeHtml(d?.motif||'')}" placeholder="Ex: Loyer bureau..." class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-400">Montant *</label>
                <input id="dep-amount" type="number" min="0" step="any" value="${d?.amount||''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              </div>
              <div>
                <label class="text-xs text-gray-400">Date *</label>
                <input id="dep-date" type="date" value="${d?.date?.split('T')[0] || new Date().toISOString().split('T')[0]}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              </div>
              <div>
                <label class="text-xs text-gray-400">Catégorie</label>
                <select id="dep-cat" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
                  ${cats.map(c => `<option ${(d?.category||'Autre')===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400">Mode paiement</label>
                <select id="dep-mode" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
                  ${['Espèces','Mobile','Carte','Chèque'].map(m => `<option ${(d?.paymentMode||'Espèces')===m?'selected':''}>${m}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="text-xs text-gray-400">Notes</label>
              <input id="dep-notes" value="${escapeHtml(d?.notes||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
          </div>
          <div class="flex gap-3 mt-4">
            <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
            <button onclick="EXPENSES.saveSimple('${id||''}')" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Enregistrer</button>
          </div>
        </div>
      `);
    });
  },

  async saveSimple(id) {
    const motif = document.getElementById('dep-motif').value.trim();
    const amount = parseFloat(document.getElementById('dep-amount').value) || 0;
    if (!motif) { showToast('Motif requis', 'error'); return; }
    if (amount <= 0) { showToast('Montant invalide', 'error'); return; }
    const dep = {
      id: id || genId('DEP'),
      motif, amount,
      date: document.getElementById('dep-date').value,
      category: document.getElementById('dep-cat').value,
      paymentMode: document.getElementById('dep-mode').value,
      notes: document.getElementById('dep-notes').value.trim(),
      amortized: false,
      createdAt: new Date().toISOString()
    };
    closeModal();
    await DB.put('depenses', dep);
    await SM.writeNow('depenses', dep.id, 'set', dep);
    await APP.addLog('SUCCESS', `Dépense ${id?'modifiée':'ajoutée'}: ${motif} (${formatCurrency(amount)})`);
    showToast(`Dépense ${id?'modifiée':'ajoutée'}`, 'success');
    this._renderSimple();
  },

  _closeActionSheet() {
    const existing = document.getElementById('expenses-action-sheet');
    if (existing) {
      const sheet = existing.querySelector('[data-sheet]');
      const backdrop = existing.querySelector('[data-backdrop]');
      if (sheet) sheet.style.transform = 'translateY(100%)';
      if (backdrop) backdrop.style.opacity = '0';
      setTimeout(() => existing.remove(), 280);
    }
  },

  async _openActionSheet(depId) {
    const d = await DB.get('depenses', depId);
    if (!d) return;
    const canEdit = APP.canDo('expensesEdit');
    const canDel  = APP.canDo('expensesDelete');

    this._closeActionSheet();

    const wrap = document.createElement('div');
    wrap.id = 'expenses-action-sheet';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:1200;';
    wrap.innerHTML = `
      <div data-backdrop style="position:absolute;inset:0;background:rgba(0,0,0,0.55);opacity:0;transition:opacity 0.25s;"></div>
      <div data-sheet style="position:absolute;bottom:0;left:0;right:0;background:#1f2937;border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,12px);transform:translateY(100%);transition:transform 0.28s cubic-bezier(.32,1,.4,1);z-index:1;">
        <div style="display:flex;justify-content:center;padding:10px 0 4px;">
          <div style="width:36px;height:4px;border-radius:2px;background:#4b5563;"></div>
        </div>
        <div style="padding:8px 16px 12px;border-bottom:1px solid #374151;">
          <div style="font-weight:600;color:#fff;font-size:15px;">${escapeHtml(d.motif)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${formatDate(d.date)} · ${escapeHtml(d.category||'')} · ${formatCurrency(d.amount)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;">
          ${canEdit ? `
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="EXPENSES._closeActionSheet();EXPENSES.showSimpleForm('${d.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#374151;border:none;border-radius:12px;color:#e5e7eb;font-size:13px;font-weight:500;cursor:pointer;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 18l-3 1 1-3 9.879-9.879z"/></svg>
            Modifier
          </button>` : ''}
          ${canDel ? `
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="EXPENSES._closeActionSheet();EXPENSES.confirmDeleteSimple('${d.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#7f1d1d30;border:none;border-radius:12px;color:#f87171;font-size:13px;font-weight:500;cursor:pointer;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
            Supprimer
          </button>` : ''}
        </div>
        <div style="padding:0 12px 8px;">
          <button onclick="EXPENSES._closeActionSheet()"
            style="width:100%;padding:12px;background:#374151;border:none;border-radius:12px;color:#9ca3af;font-size:14px;cursor:pointer;">
            Fermer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);
    const backdrop = wrap.querySelector('[data-backdrop]');
    const sheet = wrap.querySelector('[data-sheet]');
    backdrop.addEventListener('click', () => this._closeActionSheet());
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      sheet.style.transform = 'translateY(0)';
    });
  },

  async confirmDeleteSimple(id) {
    const d = await DB.get('depenses', id);
    showConfirm({
      title: 'Supprimer dépense',
      message: `Supprimer "${d?.motif}" (${formatCurrency(d?.amount)}) ?`,
      icon: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await DB.delete('depenses', id);
        await SM.writeNow('depenses', id, 'delete');
        await APP.addLog('WARNING', `Dépense supprimée: ${d?.motif}`);
        showToast('Dépense supprimée', 'success');
        this._renderSimple();
      }
    });
  },

  async _renderAmortized() {
    const items = await DB.getAll('amortizedExpenses');
    items.sort((a, b) => (a.name||'').localeCompare(b.name||''));

    document.getElementById('expenses-content').innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-lg font-bold text-white">Dépenses récurrentes</h3>
          <button onclick="EXPENSES.showAmortizedForm()" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Ajouter
          </button>
        </div>

        <!-- Desktop table -->
        <div class="hidden sm:block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-700 bg-gray-900/50">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nom</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Catégorie</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fréquence</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant/pér.</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Progression</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                <th class="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${items.length ? items.map((a, idx) => {
                const paidCount = a.payments?.length || 0;
                const progress = a.totalPeriods > 0 ? Math.min(100, (paidCount / a.totalPeriods) * 100) : 0;
                const statusColors = { actif: 'bg-green-600/20 text-green-400', termine: 'bg-gray-600/20 text-gray-400', suspendu: 'bg-yellow-600/20 text-yellow-400' };
                return `
                <tr class="${idx%2===0?'':'bg-gray-700/20'} hover:bg-indigo-600/5 transition-colors">
                  <td class="px-4 py-3 font-semibold text-white">${escapeHtml(a.name)}</td>
                  <td class="px-4 py-3 text-gray-400">${escapeHtml(a.category||'—')}</td>
                  <td class="px-4 py-3 text-gray-400">${escapeHtml(a.frequency||'—')}</td>
                  <td class="px-4 py-3 text-right font-bold text-red-400 whitespace-nowrap">${formatCurrency(a.amountPerPeriod)}</td>
                  <td class="px-4 py-3 min-w-[140px]">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div class="bg-indigo-500 rounded-full h-1.5" style="width:${progress}%"></div>
                      </div>
                      <span class="text-xs text-gray-400 whitespace-nowrap">${paidCount}/${a.totalPeriods||'∞'}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3"><span class="text-xs px-1.5 py-0.5 rounded-full ${statusColors[a.status]||statusColors.actif}">${a.status||'actif'}</span></td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="EXPENSES.showAmortizedForm('${a.id}')" title="Modifier" class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 18l-3 1 1-3 9.879-9.879z"/></svg></button>
                      <button onclick="EXPENSES.deleteAmortized('${a.id}')" title="Supprimer" class="p-1.5 rounded-lg hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="7" class="text-center text-gray-500 py-8">Aucune dépense récurrente</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          ${items.length ? items.map(a => {
            const paidCount = a.payments?.length || 0;
            const progress = a.totalPeriods > 0 ? Math.min(100, (paidCount / a.totalPeriods) * 100) : 0;
            const statusColors = { actif: 'bg-green-600/20 text-green-400', termine: 'bg-gray-600/20 text-gray-400', suspendu: 'bg-yellow-600/20 text-yellow-400' };
            return `
              <div class="bg-gray-800 rounded-xl border border-gray-700 px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="font-semibold text-white truncate flex-1">${escapeHtml(a.name)}</span>
                      <span class="text-xs px-1.5 py-0.5 rounded-full ${statusColors[a.status]||statusColors.actif}">${a.status||'actif'}</span>
                      <span class="flex-shrink-0 font-bold text-red-400 text-sm ml-1">${formatCurrency(a.amountPerPeriod)}</span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 leading-tight">
                      <span>${escapeHtml(a.frequency||'')} · ${escapeHtml(a.category||'')}</span>
                      <span class="text-gray-700">·</span>
                      <span>${paidCount}/${a.totalPeriods||'∞'}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1.5">
                      <div class="flex-1 bg-gray-700 rounded-full h-1">
                        <div class="bg-indigo-500 rounded-full h-1" style="width:${progress}%"></div>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-col gap-1 ml-1">
                    <button onclick="EXPENSES.showAmortizedForm('${a.id}')" class="p-1.5 rounded-lg bg-gray-700/60 text-gray-400 active:bg-gray-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 18l-3 1 1-3 9.879-9.879z"/></svg>
                    </button>
                    <button onclick="EXPENSES.deleteAmortized('${a.id}')" class="p-1.5 rounded-lg bg-gray-700/60 text-red-400 active:bg-gray-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('') : '<div class="text-center text-gray-500 py-8">Aucune dépense récurrente</div>'}
        </div>
      </div>
    `;
  },

  showAmortizedForm(id = null) {
    const loadAmo = id ? DB.get('amortizedExpenses', id) : Promise.resolve(null);
    loadAmo.then(a => {
      const cats = APP.config?.categories?.expenses || ['Loyer','Transport','Salaires','Fournitures','Autre'];
      showModal(`
        <div class="p-6">
          <h3 class="text-lg font-bold text-white mb-4">${id ? 'Modifier' : 'Nouvelle'} dépense récurrente</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-400">Nom *</label>
              <input id="am-name" value="${escapeHtml(a?.name||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-400">Montant / période *</label>
                <input id="am-amount" type="number" min="0" step="any" value="${a?.amountPerPeriod||''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              </div>
              <div>
                <label class="text-xs text-gray-400">Fréquence</label>
                <select id="am-freq" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
                  ${['quotidien','hebdomadaire','mensuel'].map(f => `<option ${(a?.frequency||'mensuel')===f?'selected':''}>${f}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400">Date de début</label>
                <input id="am-start" type="date" value="${a?.startDate||new Date().toISOString().split('T')[0]}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              </div>
              <div>
                <label class="text-xs text-gray-400">Nb de périodes (0 = illimité)</label>
                <input id="am-total" type="number" min="0" value="${a?.totalPeriods||0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-400">Catégorie</label>
                <select id="am-cat" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
                  ${cats.map(c => `<option ${(a?.category||'Loyer')===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400">Statut</label>
                <select id="am-status" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
                  ${['actif','suspendu','termine'].map(s => `<option ${(a?.status||'actif')===s?'selected':''}>${s}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
          <div class="flex gap-3 mt-4">
            <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
            <button onclick="EXPENSES.saveAmortized('${id||''}')" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Enregistrer</button>
          </div>
        </div>
      `);
    });
  },

  async saveAmortized(id) {
    const name = document.getElementById('am-name').value.trim();
    const amount = parseFloat(document.getElementById('am-amount').value) || 0;
    if (!name || amount <= 0) { showToast('Nom et montant requis', 'error'); return; }

    // Récupérer l'existant pour préserver les payments
    let existingPayments = [];
    if (id) {
      const existing = await DB.get('amortizedExpenses', id);
      existingPayments = existing?.payments || [];
    }

    const item = {
      id: id || genId('AMO'),
      name, amountPerPeriod: amount,
      frequency: document.getElementById('am-freq').value,
      startDate: document.getElementById('am-start').value,
      totalPeriods: parseInt(document.getElementById('am-total').value) || 0,
      category: document.getElementById('am-cat').value,
      status: document.getElementById('am-status').value,
      payments: existingPayments
    };
    closeModal();
    await DB.put('amortizedExpenses', item);
    await SM.writeNow('amortizedExpenses', item.id, 'set', item);
    showToast('Dépense récurrente enregistrée', 'success');
    this._renderAmortized();
  },

  async deleteAmortized(id) {
    const a = await DB.get('amortizedExpenses', id);
    showConfirm({
      title: 'Supprimer dépense récurrente',
      message: `Supprimer "${a?.name}" ?`,
      icon: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await DB.delete('amortizedExpenses', id);
        await SM.writeNow('amortizedExpenses', id, 'delete');
        showToast('Supprimé', 'success');
        this._renderAmortized();
      }
    });
  },

  // Générer les dépenses dues automatiquement au démarrage
  async generateDueAmortized() {
    const all = await DB.getAll('amortizedExpenses');
    const now = new Date();
    let generated = 0;

    for (const a of all) {
      if (a.status !== 'actif') continue;
      const start = new Date(a.startDate);
      const paidCount = (a.payments || []).length;
      let dueDate = new Date(start);

      // Calculer la prochaine date due
      for (let i = 0; i < paidCount; i++) {
        if (a.frequency === 'quotidien') dueDate.setDate(dueDate.getDate() + 1);
        else if (a.frequency === 'hebdomadaire') dueDate.setDate(dueDate.getDate() + 7);
        else dueDate.setMonth(dueDate.getMonth() + 1);
      }

      if (a.totalPeriods > 0 && paidCount >= a.totalPeriods) continue;
      if (dueDate > now) continue;

      // Créer l'entrée de dépense
      const dep = {
        id: genId('DEP'),
        motif: `${a.name} (${a.frequency} — période ${paidCount + 1})`,
        amount: a.amountPerPeriod,
        date: dueDate.toISOString().split('T')[0],
        category: a.category || 'Autre',
        paymentMode: 'Espèces',
        amortized: true,
        amortizedId: a.id
      };
      await DB.put('depenses', dep);
      await SM.writeNow('depenses', dep.id, 'set', dep);

      // Marquer comme payé
      a.payments = [...(a.payments || []), { date: dueDate.toISOString(), amount: a.amountPerPeriod, depenseId: dep.id }];
      if (a.totalPeriods > 0 && a.payments.length >= a.totalPeriods) a.status = 'termine';
      await DB.put('amortizedExpenses', a);
      await SM.writeNow('amortizedExpenses', a.id, 'set', a);
      generated++;
    }

    if (generated > 0) {
      showToast(`${generated} dépense(s) récurrente(s) générée(s)`, 'info');
    }
  }
};
