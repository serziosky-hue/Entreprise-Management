// sales.js — Ventes et facturation
'use strict';

window.SALES = {
  _view: 'form', // 'form' | 'history'
  _cart: [],
  _page: 1, _perPage: 20,
  _filterDate: '', _filterClient: '', _filterMode: '',

  async render() {
    const el = document.getElementById('tab-sales');
    if (!el) return;
    try {
      el.innerHTML = `
        <div class="p-4">
          <div class="flex gap-2 mb-4">
            <button onclick="SALES._view='form';SALES.render()" class="px-4 py-2 rounded-lg text-sm font-medium ${this._view==='form'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">Nouvelle vente</button>
            <button onclick="SALES._view='history';SALES.render()" class="px-4 py-2 rounded-lg text-sm font-medium ${this._view==='history'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">Historique</button>
          </div>
          <div id="sales-content"></div>
        </div>
      `;
      if (this._view === 'form') await this._renderForm();
      else await this._renderHistory();
    } catch (e) {
      console.error('Sales render error:', e);
      el.innerHTML = `<div class="p-4 text-red-400">Erreur ventes: ${escapeHtml(e.message)}</div>`;
    }
  },

  async _renderForm() {
    const canCreate = APP.canDo('salesCreate');
    if (!canCreate) { document.getElementById('sales-content').innerHTML = '<p class="text-gray-400 text-sm">Accès non autorisé</p>'; return; }
    const produits = (await DB.getAll('produits')).filter(p => p.nom);
    const clients = await DB.getAll('clients');

    document.getElementById('sales-content').innerHTML = `
      <div class="flex flex-col lg:grid lg:grid-cols-2 gap-4">
        <!-- Produits -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="font-semibold text-white mb-3">Produits & Services</h3>
          <input id="prod-search" type="search" placeholder="Rechercher un produit ou service..." oninput="SALES._filterProds()" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white mb-3">
          <div id="prod-list" class="space-y-1 max-h-64 overflow-y-auto">
            ${produits.map(p => {
              const isService = STOCKS?.isService ? STOCKS.isService(p) : ((p.category||'').toLowerCase().includes('service') || (p.category||'').toLowerCase().includes('productivité'));
              const stockInfo = isService
                ? `<span class="text-purple-400">∞ service</span>`
                : (p.stock <= 0
                    ? `<span class="text-red-400">Rupture</span>`
                    : (p.min > 0 && p.stock <= p.min
                        ? `<span class="text-yellow-400">Stock bas: ${p.stock}</span>`
                        : `<span class="text-green-400">Stock: ${p.stock} ${escapeHtml(p.unite||'')}</span>`));
              return `
              <div class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700 cursor-pointer text-sm prod-item" data-search="${escapeHtml((p.nom+' '+p.category).toLowerCase())}" onclick="SALES.addToCart('${p.id}')">
                <div>
                  <div class="text-white font-medium flex items-center gap-1.5">
                    ${isService ? '<span class="text-xs bg-purple-400/10 text-purple-400 px-1 rounded">SVC</span>' : ''}
                    ${escapeHtml(p.nom)}
                  </div>
                  <div class="text-xs text-gray-400">${formatCurrency(p.vente)} · ${stockInfo}</div>
                </div>
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Panier -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="font-semibold text-white mb-3">Panier</h3>
          <div id="cart-items" class="space-y-2 mb-3 max-h-48 overflow-y-auto"></div>

          <div class="border-t border-gray-700 pt-3 space-y-2">
            <div class="flex flex-wrap gap-2 items-center">
              <label class="text-xs text-gray-400 w-24 sm:w-28">Remise</label>
              <input id="sale-remise" type="number" min="0" value="0" oninput="SALES._updateTotal()" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <label class="text-xs text-gray-400 w-24 sm:w-28">Mode paiement</label>
              <select id="sale-mode" onchange="SALES._onModeChange()" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
                ${APP.getPaymentMethods().map(m => `<option value="${m.id}">${m.icon} ${m.label}</option>`).join('')}
              </select>
            </div>
            <div id="credit-fields" class="hidden space-y-2">
              <div class="flex gap-2 items-center">
                <label class="text-xs text-gray-400 w-28">Client *</label>
                <div class="flex gap-1 flex-1">
                  <select id="sale-client" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
                    <option value="">Sélectionner client</option>
                    ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)} ${c.phone?'('+escapeHtml(c.phone)+')':''}</option>`).join('')}
                  </select>
                  <button type="button" onclick="SALES._quickAddClient('sale-client')" title="Ajouter un client"
                    class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold leading-none transition-colors flex-shrink-0">+</button>
                </div>
              </div>
              <div class="flex gap-2 items-center">
                <label class="text-xs text-gray-400 w-28">Échéance</label>
                <input id="sale-due" type="date" value="${this._defaultDueDate()}" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
              </div>
            </div>
            <div id="client-field" class="flex gap-2 items-center">
              <label class="text-xs text-gray-400 w-28">Client</label>
              <div class="flex gap-1 flex-1">
                <select id="sale-client-gen" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
                  <option value="">Client passager</option>
                  ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                </select>
                <button type="button" onclick="SALES._quickAddClient('sale-client-gen')" title="Ajouter un client"
                  class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold leading-none transition-colors flex-shrink-0">+</button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <label class="text-xs text-gray-400 w-24 sm:w-28">Date</label>
              <input id="sale-date" type="datetime-local" value="${new Date().toISOString().slice(0,16)}" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
            </div>
            <div class="bg-gray-700/50 rounded-lg px-3 py-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Sous-total</span><span id="subtotal-display" class="text-white">0</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Remise</span><span id="remise-display" class="text-red-400">0</span>
              </div>
              <div class="flex justify-between font-bold mt-1">
                <span class="text-white">TOTAL</span><span id="total-display" class="text-indigo-400 text-lg">0</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-3">
            <button onclick="SALES._clearCart()" class="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Vider</button>
            <button onclick="SALES.validateSale()" class="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Valider la vente</button>
          </div>
        </div>
      </div>
    `;
    this._renderCart();
    this._updateTotal();
    this._produits = produits;
  },

  _filterProds() {
    const search = document.getElementById('prod-search')?.value.toLowerCase() || '';
    document.querySelectorAll('.prod-item').forEach(el => {
      el.style.display = !search || el.dataset.search.includes(search) ? '' : 'none';
    });
  },

  _defaultDueDate() {
    const days = APP.config?.creditDelayDays || 30;
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },

  // ─── Ajout rapide d'un client depuis la vente ────────────────────────────
  _quickAddClient(targetSelectId) {
    CLIENTS._onSaved = (client) => {
      ['sale-client', 'sale-client-gen'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const opt = document.createElement('option');
        opt.value = client.id;
        opt.textContent = selId === 'sale-client'
          ? `${client.name}${client.phone ? ' (' + client.phone + ')' : ''}`
          : client.name;
        sel.appendChild(opt);
        if (selId === targetSelectId) opt.selected = true;
      });
    };
    CLIENTS.showForm();
  },

  async addToCart(productId) {
    const p = await DB.get('produits', productId);
    if (!p) return;
    const existing = this._cart.find(i => i.productId === productId);
    if (existing) { existing.qty++; existing.total = existing.qty * existing.price; }
    else this._cart.push({ productId, nom: p.nom, unite: p.unite || '', price: p.vente, qty: 1, total: p.vente, stock: p.stock, category: p.category });
    this._renderCart();
    this._updateTotal();
  },

  _renderCart() {
    const el = document.getElementById('cart-items');
    if (!el) return;
    if (!this._cart.length) { el.innerHTML = '<div class="text-gray-500 text-sm text-center py-4">Panier vide</div>'; return; }
    el.innerHTML = this._cart.map((item, i) => `
      <div class="flex items-center gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
        <div class="flex-1 text-sm">
          <div class="text-white font-medium truncate">${escapeHtml(item.nom)}</div>
          <div class="text-xs text-gray-400">${formatCurrency(item.price)} × ${item.qty} = ${formatCurrency(item.total)}</div>
        </div>
        <input type="number" min="0.1" step="any" value="${item.price}" onchange="SALES._updateCartPrice(${i},this.value)"
          class="w-20 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white">
        <div class="flex items-center gap-1">
          <button onclick="SALES._changeQty(${i},-1)" class="w-6 h-6 bg-gray-600 rounded text-white text-xs hover:bg-gray-500">-</button>
          <span class="text-white text-xs w-6 text-center">${item.qty}</span>
          <button onclick="SALES._changeQty(${i},1)" class="w-6 h-6 bg-gray-600 rounded text-white text-xs hover:bg-gray-500">+</button>
        </div>
        <button onclick="SALES._removeFromCart(${i})" class="text-red-400 hover:text-red-300 ml-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('');
  },

  _updateCartPrice(i, val) {
    this._cart[i].price = parseFloat(val) || 0;
    this._cart[i].total = this._cart[i].price * this._cart[i].qty;
    this._renderCart();
    this._updateTotal();
  },

  _changeQty(i, delta) {
    const item = this._cart[i];
    item.qty = Math.max(0.1, item.qty + delta);
    item.total = item.price * item.qty;
    this._renderCart();
    this._updateTotal();
  },

  _removeFromCart(i) { this._cart.splice(i, 1); this._renderCart(); this._updateTotal(); },
  _clearCart() { this._cart = []; this._renderCart(); this._updateTotal(); },

  _updateTotal() {
    const subtotal = this._cart.reduce((s, i) => s + i.total, 0);
    const remise = parseFloat(document.getElementById('sale-remise')?.value) || 0;
    const total = Math.max(0, subtotal - remise);
    if (document.getElementById('subtotal-display')) document.getElementById('subtotal-display').textContent = formatCurrency(subtotal);
    if (document.getElementById('remise-display')) document.getElementById('remise-display').textContent = formatCurrency(remise);
    if (document.getElementById('total-display')) document.getElementById('total-display').textContent = formatCurrency(total);
  },

  _onModeChange() {
    const mode = document.getElementById('sale-mode')?.value;
    document.getElementById('credit-fields')?.classList.toggle('hidden', mode !== 'credit');
    document.getElementById('client-field')?.classList.toggle('hidden', mode === 'credit');
  },

  async validateSale() {
    if (!this._cart.length) { showToast('Panier vide', 'error'); return; }
    const mode = document.getElementById('sale-mode')?.value || 'cash';
    const remise = parseFloat(document.getElementById('sale-remise')?.value) || 0;
    const total = Math.max(0, this._cart.reduce((s, i) => s + i.total, 0) - remise);
    const date = document.getElementById('sale-date')?.value || new Date().toISOString();

    let clientId = '', clientName = 'Client passager';
    if (mode === 'credit') {
      clientId = document.getElementById('sale-client')?.value || '';
      if (!clientId) { showToast('Sélectionnez un client pour le crédit', 'error'); return; }
      const client = await DB.get('clients', clientId);
      clientName = client?.name || '';
    } else {
      clientId = document.getElementById('sale-client-gen')?.value || '';
      if (clientId) {
        const c = await DB.get('clients', clientId);
        clientName = c?.name || 'Client passager';
      }
    }

    // Vérifier stocks (ignorer les services)
    for (const item of this._cart) {
      const isService = STOCKS?.isService ? STOCKS.isService(item) : ((item.category||'').toLowerCase().includes('service') || (item.category||'').toLowerCase().includes('productivité'));
      if (!isService) {
        const p = await DB.get('produits', item.productId);
        if (p && p.stock < item.qty) {
          const continuer = await new Promise(resolve => {
            showConfirm({
              title: 'Stock insuffisant',
              message: `Stock insuffisant pour "${item.nom}" (disponible: ${p.stock}). Continuer quand même ?`,
              icon: 'warning',
              confirmText: 'Continuer',
              cancelText: 'Annuler',
              onConfirm: () => resolve(true),
              onCancel: () => resolve(false)
            });
          });
          if (!continuer) return;
        }
      }
    }

    const ventes = await DB.getAll('ventes');
    const sale = {
      id: genId('SALE'),
      number: genInvoiceNum('FAC', ventes),
      date: new Date(date).toISOString(),
      clientId, clientName,
      items: this._cart.map(i => ({ ...i })),
      subtotal: this._cart.reduce((s, i) => s + i.total, 0),
      remise, total,
      paymentMode: mode,
      dueDate: mode === 'credit' ? document.getElementById('sale-due')?.value : null,
      status: 'completed',
      createdAt: new Date().toISOString(),
      poste: APP.currentPoste?.name || 'Admin'
    };

    // Décrémenter stocks (ignorer les services — pas de déduction physique)
    for (const item of this._cart) {
      const isService = STOCKS?.isService ? STOCKS.isService(item) : ((item.category||'').toLowerCase().includes('service') || (item.category||'').toLowerCase().includes('productivité'));
      if (!isService) {
        const p = await DB.get('produits', item.productId);
        if (p) {
          const oldStock = p.stock;
          p.stock = Math.max(0, p.stock - item.qty);
          p.lastModified = new Date().toISOString();
          await DB.put('produits', p);
          await SM.writeNow('produits', p.id, 'set', p);
          const mov = { id: genId('MOV'), productId: p.id, productName: p.nom, type: 'vente', quantity: item.qty, oldStock, newStock: p.stock, raison: `Vente ${sale.number}`, date: sale.date };
          await DB.put('stockMovements', mov);
        }
      }
    }

    // Sauvegarder vente
    await DB.put('ventes', sale);
    await SM.writeNow('ventes', sale.id, 'set', sale);

    // Créer crédit si nécessaire
    if (mode === 'credit') {
      const credit = {
        id: genId('CRED'),
        saleId: sale.id,
        saleNumber: sale.number,
        clientId, clientName,
        amount: total, balance: total,
        date: sale.date,
        dueDate: sale.dueDate,
        status: 'pending',
        payments: [],
        createdAt: new Date().toISOString()
      };
      await DB.put('credits', credit);
      await SM.writeNow('credits', credit.id, 'set', credit);
    }

    await APP.addLog('SUCCESS', `Vente créée: ${sale.number}`, { amount: total, client: clientName, mode });
    showToast(`Vente ${sale.number} enregistrée`, 'success');

    // Enregistrer en caisse si caisse ouverte
    if (typeof CASHIER !== 'undefined' && CASHIER._activeCaisseId) {
      await CASHIER.recordSaleMouvement(sale);
    }

    // Impression optionnelle — choix PDF ou Ticket thermique
    showModal(`
      <div class="p-6">
        <div class="text-center mb-4">
          <div class="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          </div>
          <h3 class="text-lg font-bold text-white">Vente enregistrée</h3>
          <p class="text-gray-400 text-sm mt-1">${escapeHtml(sale.number)} — ${formatCurrency(total)}</p>
        </div>
        <p class="text-sm text-gray-400 text-center mb-4">Imprimer la facture ?</p>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="closeModal();SALES.generatePDF(SALES._lastSale)"
            class="flex flex-col items-center gap-2 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors">
            <svg class="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            <span class="text-sm font-medium">PDF</span>
            <span class="text-xs text-gray-400">Facture complète</span>
          </button>
          <button onclick="closeModal();SALES.printTicket(SALES._lastSale)"
            class="flex flex-col items-center gap-2 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"/></svg>
            <span class="text-sm font-medium">Ticket</span>
            <span class="text-xs text-gray-400">Imprimante thermique</span>
          </button>
        </div>
        <button onclick="closeModal()" class="w-full mt-3 py-2.5 bg-gray-800 text-gray-400 rounded-xl text-sm hover:bg-gray-700 transition-colors">
          Pas maintenant
        </button>
      </div>
    `);
    this._lastSale = sale;

    this._clearCart();
    document.getElementById('sale-remise').value = 0;
    this._updateTotal();
    APP.refreshBadges();
  },

  async _renderHistory() {
    let ventes = await DB.getAll('ventes');
    ventes.sort((a, b) => b.date > a.date ? 1 : -1);

    if (this._filterDate) ventes = ventes.filter(v => v.date?.startsWith(this._filterDate));
    if (this._filterClient) ventes = ventes.filter(v => (v.clientName||'').toLowerCase().includes(this._filterClient.toLowerCase()));
    if (this._filterMode) ventes = ventes.filter(v => v.paymentMode === this._filterMode);

    const total = ventes.length;
    const start = (this._page - 1) * this._perPage;
    const page = ventes.slice(start, start + this._perPage);

    const modeLabels = Object.fromEntries(APP.getPaymentMethods().map(m => [m.id, m.label]));

    document.getElementById('sales-content').innerHTML = `
      <div class="space-y-3">
        <!-- Filtres sur une ligne -->
        <div class="flex gap-1.5 sm:gap-2">
          <input type="month" value="${this._filterDate}" onchange="SALES._filterDate=this.value;SALES._page=1;SALES._renderHistory()"
            class="bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white w-32 sm:w-auto">
          <input type="search" value="${escapeHtml(this._filterClient)}" placeholder="Client..." oninput="SALES._filterClient=this.value;SALES._page=1;SALES._renderHistory()"
            class="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
          <select onchange="SALES._filterMode=this.value;SALES._page=1;SALES._renderHistory()"
            class="bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white w-24 sm:w-36">
            <option value="">Tous</option>
            ${APP.getPaymentMethods().map(m => `<option value="${m.id}" ${this._filterMode===m.id?'selected':''}>${m.label}</option>`).join('')}
          </select>
        </div>

        <!-- Desktop table -->
        <div class="hidden sm:block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-700 bg-gray-900/50">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Numéro</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Client</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Mode</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Articles</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                <th class="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${page.length ? page.map((v, idx) => {
                const cancelled = v.status === 'cancelled';
                const statusCls = cancelled ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400';
                const statusLbl = cancelled ? 'Annulée' : 'Validée';
                const modeLbl   = modeLabels[v.paymentMode] || v.paymentMode || '';
                const itemsLbl  = safeMap(v.items||[], i => `${escapeHtml(i.nom)} ×${i.qty}`).join(', ');
                return `
                <tr class="${idx%2===0?'':'bg-gray-700/20'} hover:bg-indigo-600/5 transition-colors">
                  <td class="px-4 py-3 font-semibold text-white whitespace-nowrap">${escapeHtml(v.number)}</td>
                  <td class="px-4 py-3 text-gray-300">${escapeHtml(v.clientName||'Passager')}</td>
                  <td class="px-4 py-3 text-gray-400 whitespace-nowrap">${formatDateTime(v.date)}</td>
                  <td class="px-4 py-3 text-gray-400">${modeLbl}</td>
                  <td class="px-4 py-3 text-gray-500 max-w-[200px] truncate">${itemsLbl}</td>
                  <td class="px-4 py-3 text-right font-bold text-indigo-400 whitespace-nowrap">${formatCurrency(v.total)}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-1.5">
                      <span class="text-xs px-1.5 py-0.5 rounded-full ${statusCls}">${statusLbl}</span>
                      <button onclick="SALES._pdfSale('${v.id}')" title="PDF" class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-indigo-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                      </button>
                      <button onclick="SALES._ticketSale('${v.id}')" title="Ticket thermique" class="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-green-400 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"/></svg>
                      </button>
                      ${!cancelled && APP.canDo('salesCancel') ? `<button onclick="SALES.cancelSale('${v.id}')" title="Annuler" class="p-1.5 rounded-lg hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="7" class="text-center text-gray-500 py-8">Aucune vente</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          ${page.length ? page.map(v => {
            const cancelled = v.status === 'cancelled';
            const statusCls = cancelled ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400';
            const statusLbl = cancelled ? 'Annulée' : 'Validée';
            const modeLbl   = modeLabels[v.paymentMode] || v.paymentMode || '';
            const itemsLbl  = safeMap(v.items||[], i => `${escapeHtml(i.nom)} ×${i.qty}`).join(', ');
            return `
            <div class="bg-gray-800 rounded-xl border border-gray-700 px-3 py-2.5">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-semibold text-white truncate flex-1">${escapeHtml(v.number)}</span>
                    <span class="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${statusCls}">${statusLbl}</span>
                    <span class="flex-shrink-0 font-bold text-indigo-400 text-sm ml-1">${formatCurrency(v.total)}</span>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 flex-wrap leading-tight">
                    <span>${formatDateTime(v.date)}</span>
                    <span class="text-gray-700">·</span>
                    <span>${escapeHtml(v.clientName||'Passager')}</span>
                    <span class="text-gray-700">·</span>
                    <span>${modeLbl}</span>
                    ${itemsLbl ? `<span class="text-gray-700">·</span><span class="truncate max-w-[140px]">${itemsLbl}</span>` : ''}
                  </div>
                </div>
                <button onclick="event.stopPropagation();SALES._openActionSheet('${v.id}')"
                  class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-700/60 text-gray-300 active:bg-gray-600 transition-colors"
                  style="-webkit-tap-highlight-color:transparent;">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/>
                  </svg>
                </button>
              </div>
            </div>`;
          }).join('') : '<div class="text-center text-gray-500 py-8">Aucune vente</div>'}
        </div>

        ${buildPagination(total, this._page, this._perPage, 'p => { SALES._page=p; SALES._renderHistory(); }')}
      </div>
    `;
  },

  _closeActionSheet() {
    const existing = document.getElementById('sales-action-sheet');
    if (existing) {
      const sheet = existing.querySelector('[data-sheet]');
      const backdrop = existing.querySelector('[data-backdrop]');
      if (sheet) sheet.style.transform = 'translateY(100%)';
      if (backdrop) backdrop.style.opacity = '0';
      setTimeout(() => existing.remove(), 280);
    }
  },

  async _openActionSheet(saleId) {
    const v = await DB.get('ventes', saleId);
    if (!v) return;
    const cancelled = v.status === 'cancelled';
    const canCancel = !cancelled && APP.canDo('salesCancel');

    this._closeActionSheet();

    const wrap = document.createElement('div');
    wrap.id = 'sales-action-sheet';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:1200;';
    wrap.innerHTML = `
      <div data-backdrop style="position:absolute;inset:0;background:rgba(0,0,0,0.55);opacity:0;transition:opacity 0.25s;"></div>
      <div data-sheet style="position:absolute;bottom:0;left:0;right:0;background:#1f2937;border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,12px);transform:translateY(100%);transition:transform 0.28s cubic-bezier(.32,1,.4,1);z-index:1;">
        <div style="display:flex;justify-content:center;padding:10px 0 4px;">
          <div style="width:36px;height:4px;border-radius:2px;background:#4b5563;"></div>
        </div>
        <div style="padding:8px 16px 12px;border-bottom:1px solid #374151;">
          <div style="font-weight:600;color:#fff;font-size:15px;">${escapeHtml(v.number)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${escapeHtml(v.clientName||'Passager')} · ${formatCurrency(v.total)} · ${cancelled?'Annulée':'Validée'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;">
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="SALES._closeActionSheet();SALES._pdfSale('${v.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#374151;border:none;border-radius:12px;color:#e5e7eb;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;color:#818cf8;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            PDF
          </button>
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="SALES._closeActionSheet();SALES._ticketSale('${v.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#14532d40;border:none;border-radius:12px;color:#4ade80;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"/></svg>
            Ticket
          </button>
          ${canCancel ? `
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="SALES._closeActionSheet();SALES.cancelSale('${v.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#7f1d1d30;border:none;border-radius:12px;color:#f87171;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            Annuler vente
          </button>` : ''}
        </div>
        <div style="padding:0 12px 8px;">
          <button onclick="SALES._closeActionSheet()"
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

  async cancelSale(saleId) {
    const sale = await DB.get('ventes', saleId);
    if (!sale || sale.status === 'cancelled') return;
    showConfirm({
      title: 'Annuler la vente',
      message: `Annuler ${sale.number} ? Le stock sera remis à jour.`,
      icon: 'danger',
      confirmText: 'Annuler la vente',
      onConfirm: async () => {
        // Remettre le stock (ignorer les services)
        for (const item of (sale.items || [])) {
          const isService = STOCKS?.isService ? STOCKS.isService(item) : ((item.category||'').toLowerCase().includes('service') || (item.category||'').toLowerCase().includes('productivité'));
          if (!isService) {
            const p = await DB.get('produits', item.productId);
            if (p) { p.stock += item.qty; p.lastModified = new Date().toISOString(); await DB.put('produits', p); await SM.writeNow('produits', p.id, 'set', p); }
          }
        }
        sale.status = 'cancelled';
        await DB.put('ventes', sale);
        await SM.writeNow('ventes', sale.id, 'set', sale);
        await APP.addLog('WARNING', `Vente annulée: ${sale.number}`);
        showToast('Vente annulée', 'success');
        this._renderHistory();
        APP.refreshBadges();
      }
    });
  },

  generatePDF(sale) {
    const config = APP.config || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // En-tête
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageW, 40, 'F');
    // Logo si disponible
    if (config.logo) {
      try { doc.addImage(config.logo, 'JPEG', 8, 6, 28, 28); } catch(e) {}
    }
    const textStartX = config.logo ? 42 : 14;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(config.name || 'Mon Entreprise', textStartX, 15);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    if (config.address) doc.text(config.address, textStartX, 22);
    if (config.phone) doc.text('Tél: ' + config.phone, textStartX, 28);
    if (config.nif) doc.text('NIF: ' + config.nif, textStartX, 34);

    doc.setTextColor(99, 102, 241);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageW - 14, 16, { align: 'right' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200);
    doc.text(sale.number, pageW - 14, 24, { align: 'right' });
    doc.text(formatDate(sale.date), pageW - 14, 30, { align: 'right' });

    // Client
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('Facturé à :', 14, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(sale.clientName || 'Client passager', 14, 62);

    // Tableau articles
    doc.autoTable({
      startY: 72,
      head: [['Désignation', 'Qté', 'Prix unitaire', 'Total']],
      body: (sale.items || []).map(i => [i.nom, i.qty + ' ' + (i.unite || ''), formatCurrency(i.price, currency), formatCurrency(i.total, currency)]),
      styles: { fontSize: 9, cellPadding: 4, overflow: 'ellipsize' },
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 22,  halign: 'center' },
        2: { cellWidth: 35,  halign: 'right' },
        3: { cellWidth: 35,  halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    const rightX = pageW - 14;
    doc.setFontSize(10);
    doc.text('Sous-total:', rightX - 50, finalY, { align: 'right' }); doc.text(formatCurrency(sale.subtotal, currency), rightX, finalY, { align: 'right' });
    if (sale.remise > 0) {
      doc.setTextColor(200, 50, 50);
      doc.text('Remise:', rightX - 50, finalY + 7, { align: 'right' }); doc.text('-' + formatCurrency(sale.remise, currency), rightX, finalY + 7, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('TOTAL:', rightX - 50, finalY + 15, { align: 'right' }); doc.text(formatCurrency(sale.total, currency), rightX, finalY + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('Arrêté à la somme de : ' + amountToWords(toDisplayAmount(sale.total)) + ' ' + (config.currency || 'Ariary'), 14, finalY + 25);
    doc.text('Mode de paiement : ' + APP.getPaymentLabel(sale.paymentMode), 14, finalY + 32);

    if (config.signature) {
      doc.text('Signature :', pageW - 60, finalY + 50);
      doc.text(config.signature, pageW - 60, finalY + 58);
    }

    doc.save(`Facture_${sale.number}.pdf`);
  },

  async _pdfSale(saleId) {
    const sale = await DB.get('ventes', saleId);
    if (sale) this.generatePDF(sale);
    else showToast('Vente introuvable', 'error');
  },

  async _ticketSale(saleId) {
    const sale = await DB.get('ventes', saleId);
    if (sale) this.printTicket(sale);
    else showToast('Vente introuvable', 'error');
  },

  printTicket(sale) {
    const config  = APP.config || {};
    const currency = config.currency || 'Ar';
    const modeLbl  = APP.getPaymentLabel(sale.paymentMode);
    const modeIcon = APP.getPaymentIcon(sale.paymentMode);
    const cancelled = sale.status === 'cancelled';

    const now = new Date();
    const dateStr  = now.toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
    const timeStr  = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });

    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const itemsHTML = (sale.items || []).map(i => `
      <tr>
        <td class="item-name">${esc(i.nom)}${i.unite ? ' <span class="unit">('+esc(i.unite)+')</span>' : ''}</td>
        <td class="item-qty">${i.qty}</td>
        <td class="item-price">${esc(formatCurrency(i.price, currency))}</td>
        <td class="item-total">${esc(formatCurrency(i.total, currency))}</td>
      </tr>`).join('');

    const _html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket ${esc(sale.number)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      width: 80mm;
      background: #fff;
      color: #111;
    }

    /* ── Barre boutons (hors impression) ── */
    .no-print {
      display: flex; gap: 8px; padding: 10px;
      background: #f3f4f6; border-bottom: 1px solid #e5e7eb;
      justify-content: center;
    }
    .no-print button {
      padding: 8px 20px; border: none; border-radius: 8px;
      cursor: pointer; font-size: 13px; font-weight: 600; letter-spacing: .3px;
    }
    .btn-print { background: #16a34a; color: #fff; }
    .btn-close  { background: #6b7280; color: #fff; }
    @media print { .no-print { display: none; } }

    /* ── Ticket ── */
    .ticket { padding: 5mm 4mm 10mm; }

    /* En-tête */
    .header { text-align: center; padding-bottom: 4mm; }
    .header .company {
      font-size: 15px; font-weight: 800; letter-spacing: .5px;
      text-transform: uppercase; color: #000;
    }
    .header .tagline { font-size: 9px; color: #666; margin-top: 1px; }
    .header .contact { font-size: 9.5px; color: #444; margin-top: 3px; line-height: 1.5; }
    .header .nif     { font-size: 9px; color: #888; margin-top: 2px; }

    /* Séparateur avec label */
    .sep {
      display: flex; align-items: center; gap: 3mm;
      margin: 3mm 0; color: #aaa; font-size: 9px; letter-spacing: 1px;
      text-transform: uppercase;
    }
    .sep::before, .sep::after {
      content: ''; flex: 1;
      border-top: 1px dashed #ccc;
    }
    .sep-solid { border-top: 1.5px solid #000; margin: 3mm 0; }
    .sep-double {
      border-top: 3px double #000; margin: 3mm 0;
    }

    /* Badge TICKET */
    .badge-wrap { text-align: center; margin: 2mm 0 3mm; }
    .badge {
      display: inline-block;
      background: #111; color: #fff;
      font-size: 9px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase;
      padding: 2px 8px; border-radius: 20px;
    }
    .badge.cancelled { background: #dc2626; }

    /* Infos vente */
    .meta { margin-bottom: 3mm; }
    .meta-row {
      display: flex; justify-content: space-between;
      font-size: 10px; padding: 1px 0;
    }
    .meta-row .lbl { color: #666; }
    .meta-row .val { font-weight: 600; color: #111; text-align: right; }

    /* Tableau articles */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
    .items-head th {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .5px; color: #888;
      padding: 2px 0; border-bottom: 1px solid #ddd;
    }
    .items-head th:first-child { text-align: left; }
    .items-head th:not(:first-child) { text-align: right; }
    .items-table td {
      padding: 2.5px 0; font-size: 10.5px; vertical-align: top;
    }
    .item-name { color: #111; font-weight: 500; max-width: 38mm; }
    .unit { font-size: 9px; color: #999; }
    .item-qty   { text-align: right; color: #555; padding-left: 2mm; white-space: nowrap; }
    .item-price { text-align: right; color: #555; padding-left: 2mm; white-space: nowrap; }
    .item-total { text-align: right; font-weight: 700; color: #000; padding-left: 2mm; white-space: nowrap; }
    .items-table tr:not(.items-head):hover { background: transparent; }

    /* Totaux */
    .totals { margin-top: 1mm; }
    .total-row {
      display: flex; justify-content: space-between;
      font-size: 10px; padding: 1px 0;
    }
    .total-row .lbl { color: #555; }
    .total-row .val { font-weight: 600; }
    .total-row.remise .val { color: #dc2626; }

    .total-final {
      display: flex; justify-content: space-between; align-items: center;
      padding: 3mm 0 2mm;
    }
    .total-final .lbl { font-size: 13px; font-weight: 800; text-transform: uppercase; }
    .total-final .val { font-size: 15px; font-weight: 900; letter-spacing: -.3px; }

    /* Paiement */
    .payment {
      display: flex; align-items: center; justify-content: space-between;
      background: #f9f9f9; border: 1px dashed #ddd;
      border-radius: 6px; padding: 2.5mm 3mm; margin: 2mm 0 3mm;
    }
    .payment .lbl { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: .5px; }
    .payment .val { font-size: 11px; font-weight: 700; color: #111; }
    .payment .icon { font-size: 15px; }

    /* Crédit échéance */
    .due-row {
      font-size: 9.5px; text-align: center; color: #b45309;
      background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 4px; padding: 2px 4px; margin-bottom: 2mm;
    }

    /* Pied */
    .footer { text-align: center; padding-top: 2mm; }
    .footer .thanks { font-size: 12px; font-weight: 700; margin-bottom: 1mm; }
    .footer .sub    { font-size: 9.5px; color: #666; }
    .footer .num    { font-size: 8.5px; color: #bbb; margin-top: 3mm; letter-spacing: .5px; }

    /* Bord dentelé bas (déco) */
    .tear {
      margin-top: 4mm;
      text-align: center;
      font-size: 10px;
      color: #ccc;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>

<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimer</button>
  <button class="btn-close" onclick="window.close()">Fermer</button>
</div>

<div class="ticket">

  <!-- En-tête entreprise -->
  <div class="header">
    <div class="company">${esc(config.name || 'MON ENTREPRISE')}</div>
    ${config.address ? `<div class="contact">${esc(config.address)}</div>` : ''}
    ${config.phone   ? `<div class="contact">Tél : ${esc(config.phone)}</div>` : ''}
    ${config.email   ? `<div class="contact">${esc(config.email)}</div>` : ''}
    ${config.nif     ? `<div class="nif">NIF : ${esc(config.nif)}</div>` : ''}
  </div>

  <div class="sep-double"></div>

  <!-- Badge -->
  <div class="badge-wrap">
    <span class="badge${cancelled?' cancelled':''}">${cancelled ? 'ANNULÉE' : 'TICKET DE CAISSE'}</span>
  </div>

  <!-- Méta -->
  <div class="sep-solid"></div>
  <div class="meta">
    <div class="meta-row"><span class="lbl">N° Facture</span><span class="val">${esc(sale.number)}</span></div>
    <div class="meta-row"><span class="lbl">Date</span><span class="val">${dateStr}</span></div>
    <div class="meta-row"><span class="lbl">Heure</span><span class="val">${timeStr}</span></div>
    <div class="meta-row"><span class="lbl">Client</span><span class="val">${esc(sale.clientName || 'Passager')}</span></div>
    ${sale.poste ? `<div class="meta-row"><span class="lbl">Caissier</span><span class="val">${esc(sale.poste)}</span></div>` : ''}
  </div>

  <!-- Articles -->
  <div class="sep">Articles</div>
  <table class="items-table">
    <tr class="items-head">
      <th>Désignation</th>
      <th>Qté</th>
      <th>P.U</th>
      <th>Total</th>
    </tr>
    ${itemsHTML}
  </table>

  <!-- Totaux -->
  <div class="sep-solid"></div>
  <div class="totals">
    ${sale.remise > 0 ? `
    <div class="total-row"><span class="lbl">Sous-total</span><span class="val">${esc(formatCurrency(sale.subtotal, currency))}</span></div>
    <div class="total-row remise"><span class="lbl">Remise</span><span class="val">− ${esc(formatCurrency(sale.remise, currency))}</span></div>
    ` : ''}
  </div>
  <div class="sep-double"></div>
  <div class="total-final">
    <span class="lbl">TOTAL</span>
    <span class="val">${esc(formatCurrency(sale.total, currency))}</span>
  </div>
  <div class="sep-double"></div>

  <!-- Mode de paiement -->
  <div class="payment">
    <div>
      <div class="lbl">Mode de paiement</div>
      <div class="val">${esc(modeLbl)}</div>
    </div>
    <div class="icon">${modeIcon}</div>
  </div>

  ${sale.paymentMode === 'credit' && sale.dueDate
    ? `<div class="due-row">⚠ Crédit — Échéance : ${esc(sale.dueDate)}</div>`
    : ''}

  <!-- Pied -->
  <div class="sep"></div>
  <div class="footer">
    <div class="thanks">Merci de votre confiance !</div>
    <div class="sub">${esc(config.thankYou || 'À bientôt chez ' + (config.name || 'nous'))}</div>
    <div class="num">${esc(sale.number)} · ${dateStr}</div>
  </div>

  <div class="tear">- - - - - - - - - - - - - - - - - - - -</div>

</div>

<script>
  window.onload = function() {
    // Laisser 300ms pour que les fonts se chargent avant l'impression
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;
    const _blob = new Blob([_html], { type: 'text/html; charset=utf-8' });
    const _url  = URL.createObjectURL(_blob);
    const win   = window.open(_url, '_blank', 'width=420,height=700,scrollbars=yes');
    if (!win) { showToast('Autorisez les popups pour imprimer', 'error'); }
    setTimeout(() => URL.revokeObjectURL(_url), 30000);
  }
};
