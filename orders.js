// orders.js — Commandes clients : acompte, statuts, conversion en vente
'use strict';

window.ORDERS = {
  _view: 'list', // 'list' | 'form' | 'detail'
  _editId: null,
  _detailId: null,
  _filterStatus: 'all',

  // Statuts avec libellés et couleurs
  STATUSES: {
    new:         { label: 'Nouvelle',      color: 'bg-blue-900/30 text-blue-400',    icon: '🆕' },
    confirmed:   { label: 'Confirmée',     color: 'bg-indigo-900/30 text-indigo-400', icon: '✅' },
    in_progress: { label: 'En cours',      color: 'bg-yellow-900/30 text-yellow-400', icon: '⚙️' },
    ready:       { label: 'Prête',         color: 'bg-cyan-900/30 text-cyan-400',     icon: '📦' },
    delivered:   { label: 'Livrée',        color: 'bg-green-900/30 text-green-400',   icon: '🚀' },
    cancelled:   { label: 'Annulée',       color: 'bg-red-900/30 text-red-400',       icon: '❌' },
  },

  async render() {
    const el = document.getElementById('tab-orders');
    if (!el) return;
    const commandes = await DB.getAll('commandes');
    const currency = APP.config?.currency || 'Ar';

    const counts = {};
    commandes.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    const pending = commandes.filter(c => ['new','confirmed','in_progress'].includes(c.status)).length;

    el.innerHTML = `
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-white">Commandes clients</h1>
            <p class="text-sm text-gray-400 mt-0.5">${commandes.length} commande(s) · ${pending} en cours</p>
          </div>
          <div class="flex gap-2">
            <button onclick="ORDERS._setView('list')" class="px-3 py-2 rounded-lg text-sm font-medium ${this._view!=='form'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">📋 Liste</button>
            <button onclick="ORDERS._setView('form')" class="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white">+ Nouvelle commande</button>
          </div>
        </div>

        <!-- Filtres statut -->
        <div class="flex gap-2 flex-wrap mb-4" id="orders-filter-bar">
          ${['all','new','confirmed','in_progress','ready','delivered','cancelled'].map(s => {
            const st = this.STATUSES[s];
            const isAll = s === 'all';
            const cnt = isAll ? commandes.length : (counts[s] || 0);
            return `<button onclick="ORDERS._filterStatus='${s}';ORDERS.render()" class="px-3 py-1.5 rounded-lg text-xs font-medium transition ${this._filterStatus===s?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">${isAll?'Toutes':st.icon+' '+st.label} <span class="ml-1 opacity-70">${cnt}</span></button>`;
          }).join('')}
        </div>

        <div id="orders-content">${this._view === 'form' ? await this._renderForm() : await this._renderList(commandes, currency)}</div>
      </div>`;
    // Mettre à jour les totaux du formulaire après injection DOM
    if (this._view === 'form') setTimeout(() => this._updateOrderTotal(), 50);
  },

  _setView(v) { this._view = v; this._editId = null; this.render(); },

  async _renderList(commandes, currency) {
    let filtered = commandes;
    if (this._filterStatus !== 'all') filtered = commandes.filter(c => c.status === this._filterStatus);
    const sorted = [...filtered].sort((a, b) => {
      // Priorité : nouvelles → confirmées → en cours → prêtes d'abord
      const priority = { new: 0, confirmed: 1, in_progress: 2, ready: 3, delivered: 4, cancelled: 5 };
      const pa = priority[a.status] ?? 9;
      const pb = priority[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.date?.localeCompare(a.date || '') || 0;
    });

    if (sorted.length === 0) return `
      <div class="text-center py-16 text-gray-400">
        <div class="text-5xl mb-3">📋</div>
        <div class="text-base font-medium">Aucune commande${this._filterStatus !== 'all' ? ' dans ce statut' : ''}</div>
        <button onclick="ORDERS._setView('form')" class="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Créer une commande</button>
      </div>`;

    return `
      <div class="space-y-3">
        ${sorted.map(cmd => {
          const st = this.STATUSES[cmd.status] || { label: cmd.status, color: 'bg-gray-700 text-gray-400', icon: '?' };
          const balance = (cmd.total || 0) - (cmd.deposit || 0);
          const isOverdue = cmd.deliveryDate && cmd.deliveryDate < new Date().toISOString().split('T')[0] && !['delivered','cancelled'].includes(cmd.status);
          return `
            <div class="bg-gray-800 rounded-2xl p-4 border ${isOverdue ? 'border-red-500/50' : 'border-gray-700/50'} hover:border-indigo-500/50 transition">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-indigo-400 text-xs">${escapeHtml(cmd.number || cmd.id)}</span>
                    <span class="px-2 py-0.5 rounded-full text-xs ${st.color}">${st.icon} ${st.label}</span>
                    ${isOverdue ? '<span class="px-2 py-0.5 rounded-full text-xs bg-red-900/40 text-red-400">⚠️ En retard</span>' : ''}
                  </div>
                  <div class="mt-1 font-semibold text-white">${escapeHtml(cmd.clientName || '—')}</div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    Commande : ${formatDate(cmd.date)}
                    ${cmd.deliveryDate ? ` · Livraison : ${formatDate(cmd.deliveryDate)}` : ''}
                    · ${(cmd.items||[]).length} article(s)
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-base font-bold text-white">${formatCurrency(cmd.total||0, currency)}</div>
                  ${cmd.deposit > 0 ? `<div class="text-xs text-green-400">Acompte : ${formatCurrency(cmd.deposit, currency)}</div>` : ''}
                  ${balance > 0 ? `<div class="text-xs text-yellow-400">Reste : ${formatCurrency(balance, currency)}</div>` : ''}
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50 flex-wrap">
                <!-- Changer statut -->
                <select onchange="ORDERS.changeStatus('${cmd.id}', this.value)" class="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs">
                  ${Object.entries(this.STATUSES).map(([k, v]) => `<option value="${k}" ${cmd.status===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
                </select>
                <button onclick="ORDERS.editOrder('${cmd.id}')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">✏️ Modifier</button>
                <button onclick="ORDERS.printOrder('${cmd.id}')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">🖨️ Imprimer</button>
                ${!['delivered','cancelled'].includes(cmd.status) ? `<button onclick="ORDERS.convertToSale('${cmd.id}')" class="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium">💰 Convertir en vente</button>` : ''}
                ${cmd.convertedToSaleId ? `<span class="text-xs text-gray-400">→ Vente ${escapeHtml(cmd.convertedToSaleId.slice(-8))}</span>` : ''}
                <button onclick="ORDERS.deleteOrder('${cmd.id}')" class="ml-auto px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-lg text-xs">🗑️</button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  async _renderForm() {
    const cmd = this._editId ? await DB.get('commandes', this._editId) : null;
    const clients = await DB.getAll('clients');
    const products = await DB.getAll('produits');
    const currency = APP.config?.currency || 'Ar';
    // Stocker AVANT le rendu HTML (les <script> via innerHTML ne s'exécutent pas)
    // Schéma réel : p.nom (pas p.name), p.vente = prix vente
    this._orderProducts = products.map(p => ({ id: p.id, name: p.nom || p.name || '?', price: p.vente || p.price || 0 }));
    return `
      <div class="max-w-3xl mx-auto bg-gray-800 rounded-2xl p-6">
        <h2 class="text-base font-semibold text-white mb-5">${cmd ? 'Modifier la commande' : 'Nouvelle commande'}</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-xs text-gray-400">Client *</label>
            <select id="cmd-client" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">— Sélectionner —</option>
              ${clients.map(c => `<option value="${c.id}" data-name="${escapeHtml(c.name)}" ${cmd?.clientId===c.id?'selected':''}>${escapeHtml(c.name)}${c.phone?' ('+c.phone+')':''}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Date de commande *</label>
            <input id="cmd-date" type="date" value="${cmd?.date || new Date().toISOString().split('T')[0]}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
          </div>
          <div>
            <label class="text-xs text-gray-400">Date de livraison prévue</label>
            <input id="cmd-delivery" type="date" value="${cmd?.deliveryDate||''}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
          </div>
          <div>
            <label class="text-xs text-gray-400">Statut</label>
            <select id="cmd-status" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              ${Object.entries(this.STATUSES).map(([k,v]) => `<option value="${k}" ${(cmd?.status||'new')===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Lignes articles -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-gray-400 font-medium">Articles commandés</label>
            <button onclick="ORDERS._addLine()" class="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">+ Ajouter</button>
          </div>
          <div class="grid grid-cols-12 gap-1 text-xs text-gray-500 mb-1 px-1">
            <div class="col-span-5">Produit</div><div class="col-span-2 text-right">Qté</div><div class="col-span-3 text-right">Prix unit.</div><div class="col-span-1 text-right">Total</div><div class="col-span-1"></div>
          </div>
          <div id="order-lines" class="space-y-2">
            ${cmd?.items?.length ? cmd.items.map((item, i) => this._orderLineTpl(this._orderProducts, i, item)).join('') : this._orderLineTpl(this._orderProducts, 0)}
          </div>
        </div>

        <div class="flex items-center justify-between mb-4 p-3 bg-gray-700/50 rounded-xl">
          <span class="text-sm font-medium text-white">Total commande</span>
          <span id="order-total" class="text-lg font-bold text-indigo-400">${formatCurrency(cmd?.total||0, currency)}</span>
        </div>

        <div class="mb-4">
          <label class="text-xs text-gray-400">Acompte versé</label>
          <input id="cmd-deposit" type="number" min="0" step="0.01" value="${cmd?.deposit||0}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm text-right" oninput="ORDERS._updateDepositDisplay()">
          <div id="cmd-balance-display" class="text-xs text-gray-400 mt-1"></div>
        </div>

        <div><label class="text-xs text-gray-400">Notes / Instructions</label><textarea id="cmd-notes" rows="2" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="Instructions de livraison, remarques...">${escapeHtml(cmd?.notes||'')}</textarea></div>

        <div class="flex gap-3 mt-4">
          <button onclick="ORDERS._setView('list')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Annuler</button>
          <button onclick="ORDERS.saveOrder()" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">${cmd ? 'Mettre à jour' : 'Créer la commande'}</button>
        </div>
      </div>`;
  },

  _orderLineTpl(products, idx, prefill) {
    return `
      <div class="order-line grid grid-cols-12 gap-2 items-center">
        <div class="col-span-5">
          <select class="ol-product w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs" onchange="ORDERS._onProductChange(this)">
            <option value="">— Produit —</option>
            ${(products||[]).map(p => `<option value="${p.id}" data-price="${p.price||0}" ${prefill?.productId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-span-2"><input type="number" class="ol-qty w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs text-right" value="${prefill?.qty||1}" min="0.01" step="0.01" oninput="ORDERS._updateOrderTotal()"></div>
        <div class="col-span-3"><input type="number" class="ol-price w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs text-right" value="${prefill?.unitPrice||prefill?.price||0}" min="0" step="0.01" oninput="ORDERS._updateOrderTotal()"></div>
        <div class="col-span-1 text-xs text-gray-400 text-right ol-line-total">${prefill ? Math.round((prefill.qty||0)*(prefill.unitPrice||0)) : 0}</div>
        <div class="col-span-1 text-center"><button onclick="this.closest('.order-line').remove();ORDERS._updateOrderTotal()" class="text-red-400 hover:text-red-300 text-base">×</button></div>
      </div>`;
  },

  _addLine() {
    const container = document.getElementById('order-lines');
    if (!container) return;
    const products = window.ORDERS._orderProducts || [];
    const div = document.createElement('div');
    div.innerHTML = this._orderLineTpl(products, container.children.length);
    container.appendChild(div.firstElementChild);
  },

  _onProductChange(sel) {
    const line = sel.closest('.order-line');
    if (!line) return;
    const price = parseFloat(sel.options[sel.selectedIndex]?.dataset.price || 0);
    const priceInput = line.querySelector('.ol-price');
    if (priceInput && price > 0) priceInput.value = price;
    this._updateOrderTotal();
  },

  _updateOrderTotal() {
    let total = 0;
    document.querySelectorAll('.order-line').forEach(line => {
      const qty = parseFloat(line.querySelector('.ol-qty')?.value || 0);
      const price = parseFloat(line.querySelector('.ol-price')?.value || 0);
      const lineTotal = qty * price;
      const lt = line.querySelector('.ol-line-total');
      if (lt) lt.textContent = Math.round(lineTotal).toLocaleString('fr-FR');
      total += lineTotal;
    });
    const el = document.getElementById('order-total');
    const currency = APP.config?.currency || 'Ar';
    if (el) el.textContent = formatCurrency(total, currency);
    this._updateDepositDisplay(total);
  },

  _updateDepositDisplay(total) {
    const t = total ?? (() => {
      let s = 0;
      document.querySelectorAll('.order-line').forEach(line => {
        s += (parseFloat(line.querySelector('.ol-qty')?.value||0)) * (parseFloat(line.querySelector('.ol-price')?.value||0));
      });
      return s;
    })();
    const deposit = parseFloat(document.getElementById('cmd-deposit')?.value || 0);
    const balance = t - deposit;
    const currency = APP.config?.currency || 'Ar';
    const el = document.getElementById('cmd-balance-display');
    if (el && balance >= 0) el.textContent = `Reste à payer : ${formatCurrency(balance, currency)}`;
  },

  async saveOrder() {
    const clientSel = document.getElementById('cmd-client');
    const clientId = clientSel?.value;
    if (!clientId) { showToast('Sélectionnez un client', 'warning'); return; }
    const date = document.getElementById('cmd-date')?.value;
    if (!date) { showToast('Sélectionnez une date', 'warning'); return; }

    const lines = document.querySelectorAll('.order-line');
    const items = [];
    lines.forEach(line => {
      const sel = line.querySelector('.ol-product');
      const productId = sel?.value;
      if (!productId) return;
      const productName = sel.options[sel.selectedIndex]?.text || '';
      const qty = parseFloat(line.querySelector('.ol-qty')?.value || 0);
      const unitPrice = parseFloat(line.querySelector('.ol-price')?.value || 0);
      if (qty <= 0) return;
      items.push({ productId, productName, qty, unitPrice, total: qty * unitPrice });
    });

    if (items.length === 0) { showToast('Ajoutez au moins un article', 'warning'); return; }

    const clientName = clientSel.options[clientSel.selectedIndex]?.dataset.name || '';
    const total = items.reduce((s, i) => s + i.total, 0);
    const deposit = parseFloat(document.getElementById('cmd-deposit')?.value || 0);
    const existingCmds = await DB.getAll('commandes');

    const cmd = {
      id: this._editId || genId('CMD'),
      number: this._editId ? (await DB.get('commandes', this._editId))?.number || genInvoiceNum('CMD', existingCmds) : genInvoiceNum('CMD', existingCmds),
      clientId, clientName, date,
      deliveryDate: document.getElementById('cmd-delivery')?.value || null,
      items, total, deposit,
      status: document.getElementById('cmd-status')?.value || 'new',
      notes: document.getElementById('cmd-notes')?.value.trim() || '',
      convertedToSaleId: this._editId ? (await DB.get('commandes', this._editId))?.convertedToSaleId || null : null,
      updatedAt: new Date().toISOString(),
      createdAt: this._editId ? (await DB.get('commandes', this._editId))?.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    await DB.put('commandes', cmd);
    if (SM.mode !== 'local') SM.writeNow('commandes', cmd.id, 'set', cmd);
    APP.addLog('INFO', this._editId ? 'Commande modifiée' : 'Commande créée', { number: cmd.number, clientName, total });
    await APP.refreshBadges();
    showToast(this._editId ? 'Commande mise à jour' : `Commande ${cmd.number} créée`, 'success');
    this._editId = null;
    this._setView('list');
  },

  async changeStatus(id, status) {
    const cmd = await DB.get('commandes', id);
    if (!cmd) return;
    cmd.status = status;
    cmd.updatedAt = new Date().toISOString();
    await DB.put('commandes', cmd);
    if (SM.mode !== 'local') SM.writeNow('commandes', id, 'set', cmd);
    await APP.refreshBadges();
    showToast(`Statut → ${this.STATUSES[status]?.label || status}`, 'success');
    this.render();
  },

  async editOrder(id) {
    this._editId = id;
    this._view = 'form';
    this.render();
  },

  async deleteOrder(id) {
    const cmd = await DB.get('commandes', id);
    const ok = await APP.canDelete(cmd?.number || 'cette commande');
    if (!ok) return;
    await DB.delete('commandes', id);
    if (SM.mode !== 'local') SM.writeNow('commandes', id, 'delete', null);
    await APP.refreshBadges();
    showToast('Commande supprimée', 'success');
    this.render();
  },

  async convertToSale(id) {
    const cmd = await DB.get('commandes', id);
    if (!cmd) return;
    const currency = APP.config?.currency || 'Ar';
    const balance = (cmd.total || 0) - (cmd.deposit || 0);

    showConfirm({
      title: 'Convertir en vente ?',
      message: `Commande ${cmd.number} · ${cmd.clientName}\nMontant : ${formatCurrency(cmd.total, currency)}\nAcompte versé : ${formatCurrency(cmd.deposit||0, currency)}\nReste à payer : ${formatCurrency(balance, currency)}`,
      icon: 'info',
      confirmText: 'Convertir en vente',
      onConfirm: async () => {
        // Construire la vente à partir de la commande
        const sales = await DB.getAll('ventes');
        const sale = {
          id: genId('VNT'),
          number: genInvoiceNum('VNT', sales),
          clientId: cmd.clientId,
          clientName: cmd.clientName,
          date: new Date().toISOString().split('T')[0],
          items: cmd.items.map(i => ({ ...i, price: i.unitPrice || i.price || 0 })),
          total: cmd.total,
          discount: 0,
          paymentMode: 'cash',
          notes: `Convertie depuis commande ${cmd.number}`,
          fromOrderId: cmd.id,
          createdAt: new Date().toISOString()
        };

        await DB.put('ventes', sale);
        if (SM.mode !== 'local') SM.writeNow('ventes', sale.id, 'set', sale);

        // Décrémenter le stock
        for (const item of cmd.items) {
          const prod = await DB.get('produits', item.productId);
          if (!prod) continue;
          prod.stock = Math.max(0, (parseFloat(prod.stock||0)) - item.qty);
          await DB.put('produits', prod);
          if (SM.mode !== 'local') SM.writeNow('produits', prod.id, 'set', prod);
          await DB.put('stockMovements', {
            id: genId('SMV'),
            productId: prod.id, productName: prod.nom || prod.name || '',
            type: 'out', qty: item.qty,
            reason: `Vente ${sale.number} (cmd ${cmd.number})`,
            date: sale.date, createdAt: new Date().toISOString()
          });
        }

        // Mettre à jour la commande
        cmd.status = 'delivered';
        cmd.convertedToSaleId = sale.id;
        cmd.updatedAt = new Date().toISOString();
        await DB.put('commandes', cmd);
        if (SM.mode !== 'local') SM.writeNow('commandes', cmd.id, 'set', cmd);

        // Enregistrer en caisse si caisse ouverte
        if (typeof CASHIER !== 'undefined' && CASHIER._activeCaisseId) {
          await CASHIER.recordSaleMouvement(sale);
        }

        await APP.refreshBadges();
        APP.addLog('INFO', 'Commande convertie en vente', { order: cmd.number, sale: sale.number });
        showToast(`Commande convertie → Vente ${sale.number}`, 'success');
        this.render();
      }
    });
  },

  async printOrder(id) {
    const cmd = await DB.get('commandes', id);
    if (!cmd) return;
    const currency = APP.config?.currency || 'Ar';
    const company = APP.config?.name || 'Mon Entreprise';
    const st = this.STATUSES[cmd.status] || { label: cmd.status, icon: '?' };
    const balance = (cmd.total || 0) - (cmd.deposit || 0);

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Commande ${escapeHtml(cmd.number||cmd.id)}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;max-width:650px;margin:0 auto;}h1{font-size:18px;margin:0;}table{width:100%;border-collapse:collapse;margin:12px 0;}th,td{padding:7px 10px;border:1px solid #e5e7eb;text-align:left;}th{background:#f3f4f6;}.total-row{font-weight:bold;background:#e0f2fe!important;}.header{border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;}.status{display:inline-block;padding:2px 10px;border-radius:99px;background:#e0e7ff;color:#4338ca;font-weight:600;font-size:11px;}</style>
    </head><body>
    <div class="header">
      <div><h1>Bon de commande</h1><div>${escapeHtml(company)}</div><div>Date : ${formatDate(cmd.date)}</div></div>
      <div style="text-align:right"><div><strong>${escapeHtml(cmd.number||cmd.id)}</strong></div><div class="status">${st.icon} ${st.label}</div>${cmd.deliveryDate?`<div>Livraison prévue : ${formatDate(cmd.deliveryDate)}</div>`:''}</div>
    </div>
    <table style="margin-bottom:8px"><tr><th>Client</th><th>Contact</th></tr><tr><td>${escapeHtml(cmd.clientName||'—')}</td><td>—</td></tr></table>
    <table><thead><tr><th>Article</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead><tbody>
    ${(cmd.items||[]).map(i => `<tr><td>${escapeHtml(i.productName)}</td><td>${i.qty}</td><td>${formatCurrency(i.unitPrice||i.price||0, currency)}</td><td>${formatCurrency(i.total, currency)}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="3">TOTAL</td><td>${formatCurrency(cmd.total||0, currency)}</td></tr>
    ${cmd.deposit > 0 ? `<tr><td colspan="3">Acompte versé</td><td style="color:#16a34a">− ${formatCurrency(cmd.deposit, currency)}</td></tr><tr class="total-row"><td colspan="3">RESTE À PAYER</td><td>${formatCurrency(balance, currency)}</td></tr>` : ''}
    </tbody></table>
    ${cmd.notes ? `<p><em>Notes : ${escapeHtml(cmd.notes)}</em></p>` : ''}
    <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:11px;"><div>Signature client : _______________</div><div>Cachet &amp; signature : _______________</div></div>
    <script>window.onload=()=>{window.print();}</script></body></html>`;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'width=800,height=600,scrollbars=yes');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
};
