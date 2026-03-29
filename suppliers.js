// suppliers.js — Fournisseurs & Achats avec mise à jour automatique du stock
'use strict';

window.SUPPLIERS = {
  _view: 'list', // 'list' | 'purchases' | 'form-supplier' | 'form-purchase'
  _editId: null,
  _page: 1,
  _PER_PAGE: 20,
  _filterSupplierId: '',
  _filterStatus: '',

  async render() {
    const el = document.getElementById('tab-suppliers');
    if (!el) return;
    const fournisseurs = await DB.getAll('fournisseurs');
    const achats = await DB.getAll('achats');
    const currency = APP.config?.currency || 'Ar';

    el.innerHTML = `
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-white">Fournisseurs &amp; Achats</h1>
            <p class="text-sm text-gray-400 mt-0.5">${fournisseurs.length} fournisseur(s) · ${achats.length} achat(s)</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button onclick="SUPPLIERS._setView('list')" class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='list'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">🏭 Fournisseurs</button>
            <button onclick="SUPPLIERS._setView('purchases')" class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='purchases'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">📦 Achats</button>
            <button onclick="SUPPLIERS._setView(SUPPLIERS._view==='purchases'?'form-purchase':'form-supplier')" class="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white">+ Nouveau</button>
          </div>
        </div>
        <div id="suppliers-content">${
          this._view === 'list'       ? this._renderList(fournisseurs, achats, currency)
        : this._view === 'purchases'  ? this._renderPurchases(achats, fournisseurs, currency)
        : this._view === 'form-supplier' ? this._renderSupplierFormSync()
        : this._renderPurchaseFormPlaceholder()
        }</div>
      </div>`;

    // Les formulaires async sont chargés après
    if (this._view === 'form-supplier') {
      this._renderSupplierForm().then(html => {
        const c = document.getElementById('suppliers-content');
        if (c) c.innerHTML = html;
      });
    } else if (this._view === 'form-purchase') {
      this._renderPurchaseForm(fournisseurs).then(html => {
        const c = document.getElementById('suppliers-content');
        if (c) c.innerHTML = html;
      });
    }
  },

  _renderSupplierFormSync() { return '<div class="text-center py-10 text-gray-400">Chargement…</div>'; },
  _renderPurchaseFormPlaceholder() { return '<div class="text-center py-10 text-gray-400">Chargement…</div>'; },

  _setView(v) { this._view = v; this._editId = null; this._filterSupplierId = ''; this._filterStatus = ''; this.render(); },

  // ─── LISTE FOURNISSEURS ────────────────────────────────────────────────────
  _renderList(fournisseurs, achats, currency) {
    if (fournisseurs.length === 0) return `
      <div class="text-center py-16 text-gray-400">
        <div class="text-5xl mb-3">🏭</div>
        <div class="text-base font-medium">Aucun fournisseur enregistré</div>
        <button onclick="SUPPLIERS._setView('form-supplier')" class="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Ajouter un fournisseur</button>
      </div>`;

    // Calcul stats par fournisseur
    const stats = {};
    achats.forEach(a => {
      if (!stats[a.fournisseurId]) stats[a.fournisseurId] = { total: 0, count: 0, lastDate: '' };
      stats[a.fournisseurId].total += a.total || 0;
      stats[a.fournisseurId].count += 1;
      if ((a.date || '') > stats[a.fournisseurId].lastDate) stats[a.fournisseurId].lastDate = a.date;
    });

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${fournisseurs.map(f => {
          const s = stats[f.id] || { total: 0, count: 0, lastDate: '' };
          return `
          <div class="bg-gray-800 rounded-2xl p-4 border border-gray-700/50 hover:border-indigo-500/50 transition">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="font-semibold text-white">${escapeHtml(f.name)}</div>
                ${f.contact ? `<div class="text-xs text-gray-400">${escapeHtml(f.contact)}</div>` : ''}
              </div>
              <div class="flex gap-1">
                <button onclick="SUPPLIERS.editSupplier('${f.id}')" class="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs">✏️</button>
                <button onclick="SUPPLIERS.deleteSupplier('${f.id}')" class="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 text-xs">🗑️</button>
              </div>
            </div>
            ${f.phone   ? `<div class="text-xs text-gray-400">📞 ${escapeHtml(f.phone)}</div>` : ''}
            ${f.email   ? `<div class="text-xs text-gray-400">✉️ ${escapeHtml(f.email)}</div>` : ''}
            ${f.address ? `<div class="text-xs text-gray-400 mt-1">📍 ${escapeHtml(f.address)}</div>` : ''}
            <div class="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-3 gap-2 text-center">
              <div><div class="text-xs text-gray-500">Achats</div><div class="text-sm font-bold text-white">${s.count}</div></div>
              <div><div class="text-xs text-gray-500">Total dépensé</div><div class="text-xs font-bold text-indigo-400">${formatCurrency(s.total, currency)}</div></div>
              <div><div class="text-xs text-gray-500">Dernier achat</div><div class="text-xs text-gray-300">${s.lastDate ? formatDate(s.lastDate) : '—'}</div></div>
            </div>
            <button onclick="SUPPLIERS._filterBySupplier('${f.id}')" class="mt-3 w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">Voir les achats →</button>
          </div>`;
        }).join('')}
      </div>`;
  },

  // ─── LISTE ACHATS ──────────────────────────────────────────────────────────
  _renderPurchases(achats, fournisseurs, currency) {
    const fMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.name]));
    let filtered = [...achats].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (this._filterSupplierId) filtered = filtered.filter(a => a.fournisseurId === this._filterSupplierId);
    if (this._filterStatus)    filtered = filtered.filter(a => a.status === this._filterStatus);

    const filterBar = `
      <div class="flex gap-2 mb-4 flex-wrap">
        <select onchange="SUPPLIERS._filterSupplierId=this.value;SUPPLIERS.render()" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs">
          <option value="">Tous les fournisseurs</option>
          ${fournisseurs.map(f => `<option value="${f.id}" ${this._filterSupplierId===f.id?'selected':''}>${escapeHtml(f.name)}</option>`).join('')}
        </select>
        <select onchange="SUPPLIERS._filterStatus=this.value;SUPPLIERS.render()" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs">
          <option value="">Tous les statuts</option>
          <option value="received" ${this._filterStatus==='received'?'selected':''}>Reçu</option>
          <option value="pending"  ${this._filterStatus==='pending'?'selected':''}>En attente</option>
        </select>
        ${(this._filterSupplierId||this._filterStatus) ? `<button onclick="SUPPLIERS._filterSupplierId='';SUPPLIERS._filterStatus='';SUPPLIERS.render()" class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg text-xs">✕ Effacer</button>` : ''}
        <span class="ml-auto text-xs text-gray-400 self-center">${filtered.length} achat(s)</span>
      </div>`;

    if (filtered.length === 0) return filterBar + `
      <div class="text-center py-16 text-gray-400">
        <div class="text-5xl mb-3">📦</div>
        <div class="text-base font-medium">Aucun achat trouvé</div>
        <button onclick="SUPPLIERS._setView('form-purchase')" class="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Enregistrer un achat</button>
      </div>`;

    const STATUS_COLORS  = { received: 'bg-green-900/30 text-green-400', pending: 'bg-yellow-900/30 text-yellow-400' };
    const STATUS_LABELS  = { received: 'Reçu', pending: 'En attente' };
    return filterBar + `
      <div class="bg-gray-800 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-700/50">
              <tr class="text-gray-400 text-xs">
                <th class="text-left px-4 py-3">N°</th>
                <th class="text-left px-4 py-3">Date</th>
                <th class="text-left px-4 py-3">Fournisseur</th>
                <th class="text-right px-4 py-3">Montant</th>
                <th class="text-center px-4 py-3">Statut</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${filtered.map(a => `
                <tr class="hover:bg-gray-700/30 transition">
                  <td class="px-4 py-3 font-mono text-indigo-400 text-xs">${escapeHtml(a.number || a.id)}</td>
                  <td class="px-4 py-3 text-gray-300">${formatDate(a.date)}</td>
                  <td class="px-4 py-3 text-white">${escapeHtml(fMap[a.fournisseurId] || a.fournisseurName || '—')}</td>
                  <td class="px-4 py-3 text-right font-medium text-white">${formatCurrency(a.total, currency)}</td>
                  <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[a.status]||'bg-gray-700 text-gray-400'}">${STATUS_LABELS[a.status]||a.status}</span></td>
                  <td class="px-4 py-3">
                    <div class="flex gap-1 justify-end">
                      <button onclick="SUPPLIERS.viewPurchase('${a.id}')" class="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300" title="Détails">👁️</button>
                      <button onclick="SUPPLIERS.printPurchase('${a.id}')" class="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300" title="Imprimer">🖨️</button>
                      ${a.status === 'pending' ? `<button onclick="SUPPLIERS.receivePurchase('${a.id}')" class="p-1.5 bg-green-900/40 hover:bg-green-900/70 rounded-lg text-xs text-green-400" title="Réceptionner">✅</button>` : ''}
                      ${a.status === 'received' ? `<button onclick="SUPPLIERS.cancelPurchase('${a.id}')" class="p-1.5 bg-orange-900/40 hover:bg-orange-900/70 rounded-lg text-xs text-orange-400" title="Annuler (ajuster stock)">↩️</button>` : ''}
                      <button onclick="SUPPLIERS.deletePurchase('${a.id}')" class="p-1.5 bg-red-900/30 hover:bg-red-900/60 rounded-lg text-xs text-red-400" title="Supprimer définitivement">🗑️</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ─── FORMULAIRE FOURNISSEUR ───────────────────────────────────────────────
  async _renderSupplierForm() {
    const f = this._editId ? await DB.get('fournisseurs', this._editId) : null;
    return `
      <div class="max-w-lg mx-auto bg-gray-800 rounded-2xl p-6">
        <h2 class="text-base font-semibold text-white mb-5">${f ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
        <div class="space-y-3">
          <div><label class="text-xs text-gray-400">Nom *</label><input id="s-name" type="text" value="${escapeHtml(f?.name||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          <div><label class="text-xs text-gray-400">Contact</label><input id="s-contact" type="text" value="${escapeHtml(f?.contact||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-gray-400">Téléphone</label><input id="s-phone" type="text" value="${escapeHtml(f?.phone||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
            <div><label class="text-xs text-gray-400">Email</label><input id="s-email" type="email" value="${escapeHtml(f?.email||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          </div>
          <div><label class="text-xs text-gray-400">Adresse</label><input id="s-address" type="text" value="${escapeHtml(f?.address||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          <div><label class="text-xs text-gray-400">Notes</label><textarea id="s-notes" rows="2" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">${escapeHtml(f?.notes||'')}</textarea></div>
          <div class="flex gap-3 mt-4">
            <button onclick="SUPPLIERS._setView('list')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Annuler</button>
            <button onclick="SUPPLIERS.saveSupplier()" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Enregistrer</button>
          </div>
        </div>
      </div>`;
  },

  // ─── FORMULAIRE ACHAT ─────────────────────────────────────────────────────
  async _renderPurchaseForm(fournisseurs) {
    const products = await DB.getAll('produits');
    const currency = APP.config?.currency || 'Ar';
    this._purchaseProducts = products.map(p => ({ id: p.id, name: p.nom || p.name || '?', price: p.cout || p.vente || 0 }));
    const achatToEdit = this._editId ? await DB.get('achats', this._editId) : null;
    return `
      <div class="max-w-3xl mx-auto bg-gray-800 rounded-2xl p-6">
        <h2 class="text-base font-semibold text-white mb-5">${achatToEdit ? 'Modifier l\'achat' : 'Nouvel achat / Réception'}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-xs text-gray-400">Fournisseur *</label>
            <select id="p-supplier" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">— Sélectionner —</option>
              ${fournisseurs.map(f => `<option value="${f.id}" ${achatToEdit?.fournisseurId===f.id?'selected':''}>${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Date *</label>
            <input id="p-date" type="date" value="${achatToEdit?.date || new Date().toISOString().split('T')[0]}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
          </div>
          <div>
            <label class="text-xs text-gray-400">Mode de paiement</label>
            <select id="p-payment" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              ${APP.getPaymentMethods().filter(m => m.id !== 'credit').map(m => `<option value="${m.id}" ${achatToEdit?.paymentMode===m.id?'selected':''}>${m.icon} ${m.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Statut</label>
            <select id="p-status" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="received" ${!achatToEdit||achatToEdit.status==='received'?'selected':''}>Reçu (met à jour le stock)</option>
              <option value="pending"  ${achatToEdit?.status==='pending'?'selected':''}>En attente</option>
            </select>
          </div>
        </div>
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-gray-400 font-medium">Articles</label>
            <button onclick="SUPPLIERS._addPurchaseLine()" class="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">+ Ajouter une ligne</button>
          </div>
          <div class="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-1 px-1">
            <div class="col-span-5">Produit</div><div class="col-span-2 text-right">Qté</div><div class="col-span-3 text-right">Prix unit.</div><div class="col-span-1 text-right">Total</div><div class="col-span-1"></div>
          </div>
          <div id="purchase-lines" class="space-y-2">
            ${achatToEdit?.items?.length
              ? achatToEdit.items.map((item, i) => this._purchaseLineTpl(this._purchaseProducts, currency, i, item)).join('')
              : this._purchaseLineTpl(this._purchaseProducts, currency, 0)}
          </div>
        </div>
        <div class="flex items-center justify-between mb-4 p-3 bg-gray-700/50 rounded-xl">
          <span class="text-sm font-medium text-white">Total</span>
          <span id="purchase-total" class="text-lg font-bold text-indigo-400">0 ${APP.config?.currency||'Ar'}</span>
        </div>
        <div><label class="text-xs text-gray-400">Notes / Référence BL</label><textarea id="p-notes" rows="2" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="Référence BL, notes...">${escapeHtml(achatToEdit?.notes||'')}</textarea></div>
        <div class="flex gap-3 mt-4">
          <button onclick="SUPPLIERS._setView('purchases')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Annuler</button>
          <button onclick="SUPPLIERS.savePurchase()" class="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Enregistrer l'achat</button>
        </div>
      </div>`;
  },

  _purchaseLineTpl(products, currency, idx, item = null) {
    return `
      <div class="purchase-line grid grid-cols-12 gap-2 items-center" data-idx="${idx}">
        <div class="col-span-5">
          <select class="pl-product w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs" onchange="SUPPLIERS._onProductChange(this)">
            <option value="">— Produit —</option>
            ${(products||[]).map(p => `<option value="${p.id}" data-price="${p.price||0}" ${item?.productId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-span-2"><input type="number" class="pl-qty w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs text-right" value="${item?.qty||1}" min="0.01" step="0.01" placeholder="Qté" oninput="SUPPLIERS._updatePurchaseTotal()"></div>
        <div class="col-span-3"><input type="number" class="pl-price w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs text-right" value="${item?.unitPrice||0}" min="0" step="0.01" placeholder="P.U." oninput="SUPPLIERS._updatePurchaseTotal()"></div>
        <div class="col-span-1 text-xs text-gray-400 text-right pl-line-total">${item ? Math.round(item.total||0).toLocaleString('fr-FR') : '0'}</div>
        <div class="col-span-1 text-center"><button onclick="this.closest('.purchase-line').remove();SUPPLIERS._updatePurchaseTotal()" class="text-red-400 hover:text-red-300 text-base">×</button></div>
      </div>`;
  },

  _addPurchaseLine() {
    const container = document.getElementById('purchase-lines');
    if (!container) return;
    const products = this._purchaseProducts || [];
    const idx = container.children.length;
    const div = document.createElement('div');
    div.innerHTML = this._purchaseLineTpl(products, '', idx);
    container.appendChild(div.firstElementChild);
  },

  _onProductChange(sel) {
    const line = sel.closest('.purchase-line');
    if (!line) return;
    const opt = sel.options[sel.selectedIndex];
    const price = parseFloat(opt.dataset.price || 0);
    const priceInput = line.querySelector('.pl-price');
    if (priceInput && price > 0) priceInput.value = price;
    this._updatePurchaseTotal();
  },

  _updatePurchaseTotal() {
    let total = 0;
    document.querySelectorAll('.purchase-line').forEach(line => {
      const qty   = parseFloat(line.querySelector('.pl-qty')?.value || 0);
      const price = parseFloat(line.querySelector('.pl-price')?.value || 0);
      const lineTotal = qty * price;
      const lt = line.querySelector('.pl-line-total');
      if (lt) lt.textContent = Math.round(lineTotal).toLocaleString('fr-FR');
      total += lineTotal;
    });
    const el = document.getElementById('purchase-total');
    if (el) el.textContent = formatCurrency(total, APP.config?.currency || 'Ar');
  },

  // ─── SAUVEGARDES ──────────────────────────────────────────────────────────
  async saveSupplier() {
    const name = document.getElementById('s-name')?.value.trim();
    if (!name) { showToast('Le nom est requis', 'warning'); return; }
    const supplier = {
      id: this._editId || genId('FRN'),
      name,
      contact: document.getElementById('s-contact')?.value.trim() || '',
      phone:   document.getElementById('s-phone')?.value.trim() || '',
      email:   document.getElementById('s-email')?.value.trim() || '',
      address: document.getElementById('s-address')?.value.trim() || '',
      notes:   document.getElementById('s-notes')?.value.trim() || '',
      createdAt: this._editId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!supplier.createdAt) {
      const existing = await DB.get('fournisseurs', supplier.id);
      supplier.createdAt = existing?.createdAt || new Date().toISOString();
    }
    await DB.put('fournisseurs', supplier);
    if (SM.mode !== 'local') SM.writeNow('fournisseurs', supplier.id, 'set', supplier);
    APP.addLog('INFO', this._editId ? 'Fournisseur modifié' : 'Fournisseur créé', { name });
    showToast(this._editId ? 'Fournisseur mis à jour' : 'Fournisseur enregistré', 'success');
    this._editId = null;
    this._setView('list');
  },

  async savePurchase() {
    const fournisseurId = document.getElementById('p-supplier')?.value;
    const date = document.getElementById('p-date')?.value;
    if (!fournisseurId) { showToast('Sélectionnez un fournisseur', 'warning'); return; }
    if (!date)          { showToast('Sélectionnez une date', 'warning'); return; }

    const lines = document.querySelectorAll('.purchase-line');
    const items = [];
    lines.forEach(line => {
      const sel = line.querySelector('.pl-product');
      const productId = sel?.value;
      if (!productId) return;
      const productName = sel.options[sel.selectedIndex]?.text || '';
      const qty       = parseFloat(line.querySelector('.pl-qty')?.value || 0);
      const unitPrice = parseFloat(line.querySelector('.pl-price')?.value || 0);
      if (qty <= 0) return;
      items.push({ productId, productName, qty, unitPrice, total: qty * unitPrice });
    });
    if (items.length === 0) { showToast('Ajoutez au moins un article', 'warning'); return; }

    const fournisseur = await DB.get('fournisseurs', fournisseurId);
    const total = items.reduce((s, i) => s + i.total, 0);
    const status = document.getElementById('p-status')?.value || 'received';
    const wasAlreadyReceived = this._editId ? (await DB.get('achats', this._editId))?.status === 'received' : false;

    const existingAchats = await DB.getAll('achats');
    const purchase = {
      id:             this._editId || genId('ACH'),
      number:         this._editId ? (await DB.get('achats', this._editId))?.number : genInvoiceNum('ACH', existingAchats),
      fournisseurId,
      fournisseurName: fournisseur?.name || '',
      date,
      items,
      total,
      paymentMode: document.getElementById('p-payment')?.value || 'cash',
      status,
      notes:       document.getElementById('p-notes')?.value.trim() || '',
      createdAt:   this._editId ? (await DB.get('achats', this._editId))?.createdAt : new Date().toISOString(),
      updatedAt:   new Date().toISOString()
    };

    await DB.put('achats', purchase);
    if (SM.mode !== 'local') SM.writeNow('achats', purchase.id, 'set', purchase);

    // Créer une dépense automatiquement pour les achats fournisseurs
    if (purchase.paymentMode === 'cash' || purchase.paymentMode === 'mobile' || purchase.paymentMode === 'card') {
      const cats = APP.config?.categories?.expenses || ['Fournitures','Autre'];
      const depCat = cats.find(c => c.toLowerCase().includes('achat') || c.toLowerCase().includes('fournisseur')) || cats[0] || 'Fournitures';
      const dep = {
        id: genId('DEP'),
        motif: `Achat fournisseur : ${purchase.fournisseurName} (${purchase.number})`,
        amount: purchase.total || 0,
        date: purchase.date,
        category: depCat,
        paymentMode: purchase.paymentMode,
        notes: purchase.notes || `Achat ${items.length} produit(s)`,
        amortized: false,
        sourceType: 'achat_fournisseur',
        purchaseId: purchase.id,
        createdAt: new Date().toISOString()
      };
      await DB.put('depenses', dep);
      if (SM.mode !== 'local') SM.writeNow('depenses', dep.id, 'set', dep);
    }

    // Enregistrer en caisse si caisse ouverte et achat payé (sortie)
    if (typeof CASHIER !== 'undefined' && CASHIER._activeCaisseId && purchase.paymentMode === 'cash') {
      await CASHIER.recordPurchaseMouvement(purchase);
    }

    if (status === 'received' && !wasAlreadyReceived) {
      await this._applyStockIn(items, date, purchase.number);
      const depenseMsg = (purchase.paymentMode === 'cash' || purchase.paymentMode === 'mobile' || purchase.paymentMode === 'card') ? ' + dépense créée' : '';
      showToast(`Achat enregistré — stock mis à jour (${items.length} produit(s))${depenseMsg}`, 'success');
    } else {
      const depenseMsg = (purchase.paymentMode === 'cash' || purchase.paymentMode === 'mobile' || purchase.paymentMode === 'card') ? ' + dépense créée' : '';
      showToast(this._editId ? `Achat mis à jour${depenseMsg}` : `Achat enregistré (en attente)${depenseMsg}`, 'success');
    }

    APP.addLog('INFO', 'Achat enregistré', { number: purchase.number, fournisseur: purchase.fournisseurName, total });
    await APP.refreshBadges();
    this._editId = null;
    this._setView('purchases');
  },

  // ─── RÉCEPTIONNER UN ACHAT EN ATTENTE ────────────────────────────────────
  async receivePurchase(id) {
    const a = await DB.get('achats', id);
    if (!a || a.status === 'received') return;
    const ok = await new Promise(res => {
      showModal(`
        <div class="p-5 text-center">
          <div class="text-3xl mb-3">📦</div>
          <h3 class="text-base font-bold text-white mb-2">Réceptionner cet achat ?</h3>
          <p class="text-sm text-gray-400 mb-4">Le stock sera mis à jour pour <strong>${a.items?.length||0}</strong> produit(s).<br>Cette action est irréversible.</p>
          <div class="flex gap-3 justify-center">
            <button onclick="closeModal()" class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
            <button id="confirm-receive" class="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">Réceptionner</button>
          </div>
        </div>`);
      setTimeout(() => {
        document.getElementById('confirm-receive')?.addEventListener('click', () => { closeModal(); res(true); });
      }, 50);
    });
    if (!ok) return;

    a.status = 'received';
    a.receivedAt = new Date().toISOString();
    await DB.put('achats', a);
    if (SM.mode !== 'local') SM.writeNow('achats', a.id, 'set', a);
    await this._applyStockIn(a.items || [], a.date, a.number);
    APP.addLog('INFO', 'Achat réceptionné', { number: a.number });
    showToast(`Achat ${a.number} réceptionné — stock mis à jour`, 'success');
    this.render();
  },

  async _applyStockIn(items, date, reference) {
    for (const item of items) {
      const prod = await DB.get('produits', item.productId);
      if (!prod) continue;
      prod.stock = (parseFloat(prod.stock || 0)) + item.qty;
      await DB.put('produits', prod);
      if (SM.mode !== 'local') SM.writeNow('produits', prod.id, 'set', prod);
      await DB.put('stockMovements', {
        id: genId('SMV'), productId: prod.id,
        productName: prod.nom || prod.name || '',
        type: 'in', qty: item.qty,
        reason: `Achat ${reference}`, date,
        createdAt: new Date().toISOString()
      });
    }
  },

  // ─── IMPRIMER BON D'ACHAT ─────────────────────────────────────────────────
  async printPurchase(id) {
    const a = await DB.get('achats', id);
    if (!a) return;
    const currency = APP.config?.currency || 'Ar';
    const company  = APP.config?.name || 'Mon Entreprise';
    const STATUS_LABELS = { received: 'Reçu', pending: 'En attente' };
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon d'achat ${escapeHtml(a.number||a.id)}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;max-width:700px;margin:auto}
    h1{font-size:18px;margin:0}h2{font-size:14px;color:#555;margin:0 0 4px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#f3f4f6;text-align:left;padding:6px 10px;font-size:11px;border:1px solid #ddd}
    td{padding:6px 10px;border:1px solid #ddd}
    .total-row td{font-weight:bold;background:#f9fafb}
    .header{display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:2px solid #4f46e5;padding-bottom:12px}
    .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;background:${a.status==='received'?'#d1fae5':'#fef3c7'};color:${a.status==='received'?'#065f46':'#92400e'}}
    @media print{button{display:none}}</style></head>
    <body>
    <div class="header">
      <div><h1>${escapeHtml(company)}</h1><p style="color:#6b7280;margin:4px 0">Bon d'achat / Bon de réception</p></div>
      <div style="text-align:right"><h2>${escapeHtml(a.number||a.id)}</h2><p>Date : ${formatDate(a.date)}</p><span class="badge">${STATUS_LABELS[a.status]||a.status}</span></div>
    </div>
    <div style="margin-bottom:16px">
      <strong>Fournisseur :</strong> ${escapeHtml(a.fournisseurName||'—')}<br>
      <strong>Mode de paiement :</strong> ${escapeHtml(APP.getPaymentLabel?APP.getPaymentLabel(a.paymentMode):a.paymentMode||'—')}
      ${a.notes ? `<br><strong>Notes :</strong> ${escapeHtml(a.notes)}` : ''}
    </div>
    <table>
      <thead><tr><th>Article</th><th style="text-align:right">Qté</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${(a.items||[]).map(i => `<tr><td>${escapeHtml(i.productName)}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${formatCurrency(i.unitPrice,currency)}</td><td style="text-align:right">${formatCurrency(i.total,currency)}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right">${formatCurrency(a.total,currency)}</td></tr></tfoot>
    </table>
    <div style="margin-top:30px;display:flex;justify-content:space-between">
      <div style="text-align:center"><div style="border-top:1px solid #000;width:150px;padding-top:4px">Signature fournisseur</div></div>
      <div style="text-align:center"><div style="border-top:1px solid #000;width:150px;padding-top:4px">Signature responsable</div></div>
    </div>
    <script>window.onload=()=>window.print()<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.onload = () => URL.revokeObjectURL(url);
  },

  // ─── CRUD HELPERS ─────────────────────────────────────────────────────────
  editSupplier(id) { this._editId = id; this._view = 'form-supplier'; this.render(); },

  async deleteSupplier(id) {
    const f = await DB.get('fournisseurs', id);
    const ok = await APP.canDelete(f?.name || 'ce fournisseur');
    if (!ok) return;
    await DB.delete('fournisseurs', id);
    if (SM.mode !== 'local') SM.writeNow('fournisseurs', id, 'delete', null);
    showToast('Fournisseur supprimé', 'success');
    this.render();
  },

  async cancelPurchase(id) {
    const ok = await APP.canDo('suppliersDelete');
    if (!ok) return;
    
    const purchase = await DB.get('achats', id);
    if (!purchase) {
      showToast('Achat introuvable', 'error');
      return;
    }
    
    if (purchase.status !== 'received') {
      showToast('Seuls les achats reçus peuvent être annulés', 'warning');
      return;
    }
    
    showConfirm({
      title: 'Annuler cet achat ?',
      message: `Achat ${purchase.number} — ${purchase.fournisseurName}\nMontant : ${formatCurrency(purchase.total, APP.config?.currency||'Ar')}\n\nCette action va :\n• Retirer les produits du stock\n• Supprimer la dépense associée\n• Supprimer le mouvement de caisse`,
      icon: 'warning',
      confirmText: 'Annuler l\'achat',
      onConfirm: async () => {
        await this.deletePurchase(id);
      }
    });
  },

  async deletePurchase(id) {
    const ok = await APP.canDelete('cet achat');
    if (!ok) return;
    
    const purchase = await DB.get('achats', id);
    if (!purchase) {
      showToast('Achat introuvable', 'error');
      return;
    }
    
    // 1. Supprimer l'achat
    await DB.delete('achats', id);
    if (SM.mode !== 'local') SM.writeNow('achats', id, 'delete', null);
    
    // 2. Si l'achat était reçu, ajuster le stock (retirer les produits)
    if (purchase.status === 'received' && purchase.items) {
      for (const item of purchase.items) {
        const prod = await DB.get('produits', item.productId);
        if (prod) {
          prod.stock = Math.max(0, (parseFloat(prod.stock||0)) - (item.qty||0));
          await DB.put('produits', prod);
          if (SM.mode !== 'local') SM.writeNow('produits', prod.id, 'set', prod);
          
          // Mouvement de stock pour l'annulation
          await DB.put('stockMovements', {
            id: genId('SMV'),
            productId: prod.id,
            productName: prod.nom || prod.name || '',
            type: 'out',
            qty: item.qty || 0,
            reason: `Annulation achat ${purchase.number}`,
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    
    // 3. Supprimer la dépense associée si elle existe
    const depenses = await DB.getAll('depenses');
    const associatedDep = depenses.find(d => 
      d.sourceType === 'achat_fournisseur' && d.purchaseId === id
    );
    if (associatedDep) {
      await DB.delete('depenses', associatedDep.id);
      if (SM.mode !== 'local') SM.writeNow('depenses', associatedDep.id, 'delete', null);
      
      // 4. Supprimer le mouvement de caisse associé si caisse ouverte
      const caisseMouvements = await DB.getAll('caisseMouvements');
      
      // Chercher le mouvement de caisse par référence à l'achat
      let associatedMv = caisseMouvements.find(m => 
        m.reference === id && 
        m.category === 'Achat fournisseur'
      );
      
      // Si pas trouvé, chercher par référence à la dépense
      if (!associatedMv && associatedDep) {
        associatedMv = caisseMouvements.find(m => 
          m.reference === associatedDep.id && 
          m.category === 'Achat fournisseur'
        );
      }
      
      // Si toujours pas trouvé, chercher par libellé
      if (!associatedMv) {
        associatedMv = caisseMouvements.find(m => 
          m.category === 'Achat fournisseur' && 
          m.label && m.label.includes(purchase.number)
        );
      }
      
      if (associatedMv) {
        console.log('[SUPPLIERS] Suppression mouvement caisse:', associatedMv);
        await DB.delete('caisseMouvements', associatedMv.id);
        if (SM.mode !== 'local') SM.writeNow('caisseMouvements', associatedMv.id, 'delete', null);
        
        // Mettre à jour les totaux de la caisse si nécessaire
        const caisse = await DB.get('caisses', associatedMv.caisseId);
        if (caisse && caisse.status === 'open') {
          await CASHIER._updateCaisseTotals(caisse.id);
        }
        
        // Ajouter "Caisse ajustée" au message
        if (!messages.find(m => m.includes('Caisse'))) {
          messages.push('Caisse ajustée');
        }
      } else {
        console.log('[SUPPLIERS] Aucun mouvement caisse trouvé pour l\'achat:', id);
        console.log('[SUPPLIERS] Mouvements caisse disponibles:', 
          caisseMouvements.filter(m => m.category === 'Achat fournisseur'));
      }
    }
    
    // 4. Supprimer le mouvement de caisse associé (même sans dépense)
    const caisseMouvements = await DB.getAll('caisseMouvements');
    
    // Chercher le mouvement de caisse par référence à l'achat
    let associatedMv = caisseMouvements.find(m => 
      m.reference === id && 
      m.category === 'Achat fournisseur'
    );
    
    // Si pas trouvé, chercher par libellé
    if (!associatedMv) {
      associatedMv = caisseMouvements.find(m => 
        m.category === 'Achat fournisseur' && 
        m.label && m.label.includes(purchase.number)
      );
    }
    
    if (associatedMv) {
      console.log('[SUPPLIERS] Suppression mouvement caisse:', associatedMv);
      await DB.delete('caisseMouvements', associatedMv.id);
      if (SM.mode !== 'local') SM.writeNow('caisseMouvements', associatedMv.id, 'delete', null);
      
      // Mettre à jour les totaux de la caisse si nécessaire
      const caisse = await DB.get('caisses', associatedMv.caisseId);
      if (caisse && caisse.status === 'open') {
        await CASHIER._updateCaisseTotals(caisse.id);
      }
      
      // Ajouter "Caisse ajustée" au message
      if (!messages.find(m => m.includes('Caisse'))) {
        messages.push('Caisse ajustée');
      }
    } else {
      console.log('[SUPPLIERS] Aucun mouvement caisse trouvé pour l\'achat:', id);
      console.log('[SUPPLIERS] Mouvements caisse disponibles:', 
        caisseMouvements.filter(m => m.category === 'Achat fournisseur'));
    }
    
    const messages = [];
    messages.push('Achat supprimé');
    if (purchase.status === 'received') {
      messages.push('Stock ajusté');
    }
    if (associatedDep) {
      messages.push('Dépense supprimée');
    }
    
    showToast(messages.join(' — '), 'success');
    APP.addLog('INFO', 'Achat annulé', { 
      number: purchase.number, 
      fournisseur: purchase.fournisseurName,
      stockAdjusted: purchase.status === 'received',
      expenseDeleted: !!associatedDep
    });
    this.render();
  },

  async viewPurchase(id) {
    const a = await DB.get('achats', id);
    if (!a) return;
    const currency = APP.config?.currency || 'Ar';
    const STATUS_LABELS = { received: '✅ Reçu', pending: '⏳ En attente' };
    showModal(`
      <div class="p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-white">Achat ${escapeHtml(a.number || a.id)}</h3>
          <div class="flex gap-2">
            <button onclick="SUPPLIERS.printPurchase('${a.id}')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">🖨️ Imprimer</button>
            <button onclick="closeModal()" class="text-gray-400 hover:text-white text-xl">×</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span class="text-gray-400">Fournisseur : </span><span class="text-white">${escapeHtml(a.fournisseurName||'—')}</span></div>
          <div><span class="text-gray-400">Date : </span><span class="text-white">${formatDate(a.date)}</span></div>
          <div><span class="text-gray-400">Paiement : </span><span class="text-white">${escapeHtml(APP.getPaymentLabel?APP.getPaymentLabel(a.paymentMode):a.paymentMode||'—')}</span></div>
          <div><span class="text-gray-400">Statut : </span><span class="text-white">${STATUS_LABELS[a.status]||a.status}</span></div>
        </div>
        <table class="w-full text-xs mb-4">
          <thead class="bg-gray-700 text-gray-400">
            <tr><th class="text-left px-3 py-2">Article</th><th class="text-right px-3 py-2">Qté</th><th class="text-right px-3 py-2">P.U.</th><th class="text-right px-3 py-2">Total</th></tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            ${(a.items||[]).map(i => `<tr><td class="px-3 py-2 text-white">${escapeHtml(i.productName)}</td><td class="px-3 py-2 text-right text-gray-300">${i.qty}</td><td class="px-3 py-2 text-right text-gray-300">${formatCurrency(i.unitPrice,currency)}</td><td class="px-3 py-2 text-right font-medium text-white">${formatCurrency(i.total,currency)}</td></tr>`).join('')}
          </tbody>
          <tfoot class="bg-gray-700/50">
            <tr><td colspan="3" class="px-3 py-2 text-right font-bold text-white">Total</td><td class="px-3 py-2 text-right font-bold text-indigo-400">${formatCurrency(a.total,currency)}</td></tr>
          </tfoot>
        </table>
        ${a.notes ? `<div class="text-xs text-gray-400">${escapeHtml(a.notes)}</div>` : ''}
      </div>`, { size: 'max-w-2xl' });
  },

  _filterBySupplier(fournisseurId) {
    this._view = 'purchases';
    this._filterSupplierId = fournisseurId;
    this._filterStatus = '';
    this.render();
  },

  // Called from returns.js to receive returned items back to stock
  async receiveReturn(items, date, reference) {
    await this._applyStockIn(items, date, reference);
  }
};
