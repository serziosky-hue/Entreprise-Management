// credits.js — Crédits clients
'use strict';

window.CREDITS = {
  _filter: 'all', // all | pending | paid | overdue

  async render() {
    const el = document.getElementById('tab-credits');
    if (!el) return;
    try {
      const all = await DB.getAll('credits');
      all.sort((a, b) => b.date > a.date ? 1 : -1);
      const today = new Date().toISOString().split('T')[0];

      const filtered = this._filter === 'all' ? all :
        this._filter === 'pending' ? all.filter(c => c.status === 'pending') :
        this._filter === 'paid' ? all.filter(c => c.status === 'paid') :
        all.filter(c => c.status === 'pending' && c.dueDate && c.dueDate < today);

      const stats = {
        total: all.length,
        pending: all.filter(c => c.status === 'pending').length,
        paid: all.filter(c => c.status === 'paid').length,
        overdue: all.filter(c => c.status === 'pending' && c.dueDate && c.dueDate < today).length,
        totalBalance: all.filter(c => c.status === 'pending').reduce((s, c) => s + (c.balance || 0), 0)
      };

      el.innerHTML = `
        <div class="p-4 space-y-3">

          <!-- Stats : compact 4 col mobile / large desktop -->
          <div class="grid grid-cols-4 sm:hidden gap-1.5">
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-base font-bold text-orange-400">${stats.pending}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Attente</div>
            </div>
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-base font-bold text-red-400">${stats.overdue}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Retard</div>
            </div>
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-base font-bold text-green-400">${stats.paid}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Payés</div>
            </div>
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-xs font-bold text-white leading-tight truncate">${formatCurrency(stats.totalBalance)}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Solde dû</div>
            </div>
          </div>
          <div class="hidden sm:grid sm:grid-cols-4 gap-3">
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-xl font-bold text-orange-400">${stats.pending}</div>
              <div class="text-xs text-gray-400">En attente</div>
            </div>
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-xl font-bold text-red-400">${stats.overdue}</div>
              <div class="text-xs text-gray-400">En retard</div>
            </div>
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-xl font-bold text-green-400">${stats.paid}</div>
              <div class="text-xs text-gray-400">Payés</div>
            </div>
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-base font-bold text-white">${formatCurrency(stats.totalBalance)}</div>
              <div class="text-xs text-gray-400">Solde dû</div>
            </div>
          </div>

          <!-- Filtres pills -->
          <div class="flex gap-1.5 sm:gap-2 flex-wrap">
            ${[['all','Tous'],['pending','Attente'],['overdue','Retard'],['paid','Payés']].map(([v, l]) =>
              `<button onclick="CREDITS._filter='${v}';CREDITS.render()" class="px-3 py-1.5 rounded-lg text-sm ${this._filter===v?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">${l}</button>`
            ).join('')}
          </div>

          <!-- Desktop table -->
          <div class="hidden sm:block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-700 bg-gray-900/50">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Client</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Facture</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Échéance</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Balance</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700/50">
                ${filtered.length ? filtered.map((c, idx) => {
                  const isOverdue = c.status === 'pending' && c.dueDate && c.dueDate < today;
                  const daysLeft = c.dueDate ? Math.ceil((new Date(c.dueDate) - new Date()) / 86400000) : null;
                  const statusCls = c.status === 'paid' ? 'bg-green-600/20 text-green-400' : isOverdue ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400';
                  const statusLbl = c.status === 'paid' ? 'Payé' : isOverdue ? 'Retard' : 'Attente';
                  const echeanceInfo = c.dueDate
                    ? (isOverdue ? `${Math.abs(daysLeft)}j retard` : daysLeft !== null && daysLeft <= 7 ? `${daysLeft}j restants` : formatDate(c.dueDate))
                    : '—';
                  const echeanceCls = isOverdue ? 'text-red-400' : daysLeft !== null && daysLeft <= 7 ? 'text-yellow-400' : 'text-gray-400';
                  return `
                  <tr class="${idx%2===0?'':'bg-gray-700/20'} hover:bg-indigo-600/5 transition-colors">
                    <td class="px-4 py-3 font-semibold text-white">${escapeHtml(c.clientName)}</td>
                    <td class="px-4 py-3 text-gray-400">${escapeHtml(c.saleNumber||'—')}</td>
                    <td class="px-4 py-3 text-gray-400 whitespace-nowrap">${formatDate(c.date)}</td>
                    <td class="px-4 py-3 whitespace-nowrap ${echeanceCls}">${echeanceInfo}</td>
                    <td class="px-4 py-3"><span class="text-xs px-1.5 py-0.5 rounded-full ${statusCls}">${statusLbl}</span></td>
                    <td class="px-4 py-3 text-right font-bold ${c.status==='paid'?'text-green-400':'text-white'} whitespace-nowrap">${formatCurrency(c.balance)}</td>
                    <td class="px-4 py-3 text-right text-gray-500 whitespace-nowrap">${formatCurrency(c.amount)}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-center gap-1.5">
                        ${c.status === 'pending' && APP.canDo('creditsPay') ? `<button onclick="CREDITS.showPayment('${c.id}')" title="Paiement" class="p-1.5 rounded-lg hover:bg-green-600/20 text-gray-400 hover:text-green-400 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg></button>` : ''}
                        ${APP.canDo('creditsDelete') ? `<button onclick="CREDITS.confirmDelete('${c.id}')" title="Supprimer" class="p-1.5 rounded-lg hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>` : ''}
                      </div>
                    </td>
                  </tr>`;
                }).join('') : `<tr><td colspan="8" class="text-center text-gray-500 py-8">Aucun crédit dans cette catégorie</td></tr>`}
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="sm:hidden space-y-2">
            ${filtered.length ? filtered.map(c => {
              const isOverdue = c.status === 'pending' && c.dueDate && c.dueDate < today;
              const daysLeft = c.dueDate ? Math.ceil((new Date(c.dueDate) - new Date()) / 86400000) : null;
              const statusCls = c.status === 'paid' ? 'bg-green-600/20 text-green-400' : isOverdue ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400';
              const statusLbl = c.status === 'paid' ? 'Payé' : isOverdue ? 'Retard' : 'Attente';
              const borderCls = isOverdue ? 'border-red-500/50' : c.status === 'paid' ? 'border-green-500/30' : 'border-gray-700';
              const echeanceInfo = c.dueDate
                ? (isOverdue ? `${Math.abs(daysLeft)}j retard` : daysLeft !== null && daysLeft <= 7 ? `${daysLeft}j restants` : `Éch: ${formatDate(c.dueDate)}`)
                : '';
              const echeanceCls = isOverdue ? 'text-red-400' : daysLeft !== null && daysLeft <= 7 ? 'text-yellow-400' : 'text-gray-600';
              return `
                <div class="bg-gray-800 rounded-xl border ${borderCls} px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="font-semibold text-white truncate flex-1">${escapeHtml(c.clientName)}</span>
                        <span class="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${statusCls}">${statusLbl}</span>
                        <span class="flex-shrink-0 font-bold ${c.status==='paid'?'text-green-400':'text-white'} text-sm ml-1">${formatCurrency(c.balance)}</span>
                      </div>
                      <div class="flex items-center gap-1.5 mt-0.5 text-xs flex-wrap leading-tight">
                        <span class="text-gray-500">${escapeHtml(c.saleNumber||'')} · ${formatDate(c.date)}</span>
                        ${echeanceInfo ? `<span class="text-gray-700">·</span><span class="${echeanceCls}">${echeanceInfo}</span>` : ''}
                        <span class="text-gray-700">·</span>
                        <span class="text-gray-600">/ ${formatCurrency(c.amount)}</span>
                      </div>
                    </div>
                    <button onclick="event.stopPropagation();CREDITS._openActionSheet('${c.id}')"
                      class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-700/60 text-gray-300 active:bg-gray-600 transition-colors"
                      style="-webkit-tap-highlight-color:transparent;">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/>
                      </svg>
                    </button>
                  </div>
                </div>
              `;
            }).join('') : '<div class="text-center text-gray-500 py-8">Aucun crédit dans cette catégorie</div>'}
          </div>
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<div class="p-4 text-red-400">${escapeHtml(e.message)}</div>`;
    }
  },

  _closeActionSheet() {
    const existing = document.getElementById('credits-action-sheet');
    if (existing) {
      const sheet = existing.querySelector('[data-sheet]');
      const backdrop = existing.querySelector('[data-backdrop]');
      if (sheet) sheet.style.transform = 'translateY(100%)';
      if (backdrop) backdrop.style.opacity = '0';
      setTimeout(() => existing.remove(), 280);
    }
  },

  async _openActionSheet(creditId) {
    const c = await DB.get('credits', creditId);
    if (!c) return;
    const isPending = c.status === 'pending';
    const canPay    = isPending && APP.canDo('creditsPay');
    const canDel    = APP.canDo('creditsDelete');

    this._closeActionSheet();

    const wrap = document.createElement('div');
    wrap.id = 'credits-action-sheet';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:1200;';
    wrap.innerHTML = `
      <div data-backdrop style="position:absolute;inset:0;background:rgba(0,0,0,0.55);opacity:0;transition:opacity 0.25s;"></div>
      <div data-sheet style="position:absolute;bottom:0;left:0;right:0;background:#1f2937;border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,12px);transform:translateY(100%);transition:transform 0.28s cubic-bezier(.32,1,.4,1);z-index:1;">
        <div style="display:flex;justify-content:center;padding:10px 0 4px;">
          <div style="width:36px;height:4px;border-radius:2px;background:#4b5563;"></div>
        </div>
        <div style="padding:8px 16px 12px;border-bottom:1px solid #374151;">
          <div style="font-weight:600;color:#fff;font-size:15px;">${escapeHtml(c.clientName)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${escapeHtml(c.saleNumber||'')} · Solde: ${formatCurrency(c.balance)} / ${formatCurrency(c.amount)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;">
          ${canPay ? `
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="CREDITS._closeActionSheet();CREDITS.showPayment('${c.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#14532d40;border:none;border-radius:12px;color:#4ade80;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>
            Paiement
          </button>` : ''}
          ${canDel ? `
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="CREDITS._closeActionSheet();CREDITS.confirmDelete('${c.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#7f1d1d30;border:none;border-radius:12px;color:#f87171;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
            Supprimer
          </button>` : ''}
        </div>
        <div style="padding:0 12px 8px;">
          <button onclick="CREDITS._closeActionSheet()"
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

  async showPayment(creditId) {
    const c = await DB.get('credits', creditId);
    if (!c) return;
    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-2">Paiement crédit</h3>
        <p class="text-gray-400 text-sm mb-4">${escapeHtml(c.clientName)} — Balance: <span class="text-white font-bold">${formatCurrency(c.balance)}</span></p>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-400">Montant payé</label>
            <input id="pay-amount" type="number" min="0" max="${c.balance}" step="any" value="${c.balance}"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Mode de paiement</label>
            <select id="pay-mode" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              <option value="cash">Espèces</option>
              <option value="mobile">Mobile Money</option>
              <option value="card">Carte</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Notes</label>
            <input id="pay-notes" type="text" placeholder="Optionnel" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
        </div>
        <div class="flex gap-3 mt-4">
          <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
          <button onclick="CREDITS.processPayment('${creditId}')" class="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">Confirmer</button>
        </div>
      </div>
    `);
  },

  async processPayment(creditId) {
    const c = await DB.get('credits', creditId);
    if (!c) return;
    const amount = parseFloat(document.getElementById('pay-amount').value) || 0;
    const mode = document.getElementById('pay-mode').value;
    const notes = document.getElementById('pay-notes').value.trim();

    if (amount <= 0 || amount > c.balance) { showToast('Montant invalide', 'error'); return; }

    const payment = { date: new Date().toISOString(), amount, mode, notes };
    c.payments = [...(c.payments || []), payment];
    c.balance = Math.max(0, c.balance - amount);
    c.status = c.balance === 0 ? 'paid' : 'pending';
    c.updatedAt = new Date().toISOString();

    closeModal();
    await DB.put('credits', c);
    await SM.writeNow('credits', c.id, 'set', c);
    await APP.addLog('SUCCESS', `Paiement crédit: ${c.clientName} +${formatCurrency(amount)}`, { creditId, amount, mode });
    showToast(`Paiement de ${formatCurrency(amount)} enregistré`, 'success');
    this.render();
    APP.refreshBadges();
  },

  async confirmDelete(creditId) {
    const c = await DB.get('credits', creditId);
    showConfirm({
      title: 'Supprimer crédit',
      message: `Supprimer le crédit de "${c?.clientName}" (${formatCurrency(c?.balance)}) ?`,
      icon: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await DB.delete('credits', creditId);
        await SM.writeNow('credits', creditId, 'delete');
        await APP.addLog('WARNING', `Crédit supprimé: ${c?.clientName}`);
        showToast('Crédit supprimé', 'success');
        this.render();
        APP.refreshBadges();
      }
    });
  }
};
