// returns.js — Retours & Avoirs : réintégration stock + avoir client
'use strict';

window.RETURNS = {
  _view: 'list',
  _filterType: '',

  REASONS: ['Défaut produit', 'Erreur de commande', 'Produit non conforme', 'Client insatisfait', 'Livraison endommagée', 'Autre'],

  async render() {
    const el = document.getElementById('tab-returns');
    if (!el) return;
    const retours  = await DB.getAll('retours');
    const currency = APP.config?.currency || 'Ar';

    el.innerHTML = `
      <div class="p-4 md:p-6 max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-white">Retours &amp; Avoirs</h1>
            <p class="text-sm text-gray-400 mt-0.5">${retours.length} retour(s) enregistré(s)</p>
          </div>
          <button onclick="RETURNS._setView('form')" class="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white">+ Nouveau retour</button>
        </div>
        <div id="returns-content"></div>
      </div>`;

    const content = document.getElementById('returns-content');
    content.innerHTML = this._view === 'list'
      ? this._renderList(retours, currency)
      : await this._renderForm();
  },

  _setView(v) { this._view = v; this.render(); },

  // ─── LISTE ────────────────────────────────────────────────────────────────
  _renderList(retours, currency) {
    let filtered = [...retours].sort((a,b) => (b.date||'').localeCompare(a.date||''));
    if (this._filterType) filtered = filtered.filter(r => r.type === this._filterType);

    const filterBar = `
      <div class="flex gap-2 mb-4 flex-wrap">
        <select onchange="RETURNS._filterType=this.value;RETURNS.render()" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs">
          <option value="">Tous les types</option>
          <option value="refund"  ${this._filterType==='refund'?'selected':''}>💵 Remboursement</option>
          <option value="credit"  ${this._filterType==='credit'?'selected':''}>📋 Avoir client</option>
        </select>
        ${this._filterType ? `<button onclick="RETURNS._filterType='';RETURNS.render()" class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg text-xs">✕ Effacer</button>` : ''}
        <span class="ml-auto text-xs text-gray-400 self-center">${filtered.length} retour(s)</span>
      </div>`;

    if (filtered.length === 0) return filterBar + `
      <div class="text-center py-16 text-gray-400">
        <div class="text-5xl mb-3">↩️</div>
        <div class="text-base font-medium">Aucun retour enregistré</div>
        <button onclick="RETURNS._setView('form')" class="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Enregistrer un retour</button>
      </div>`;

    const TYPE_LABELS = { refund: '💵 Remboursement', credit: '📋 Avoir client' };
    const TYPE_COLORS = { refund: 'bg-green-900/30 text-green-400', credit: 'bg-blue-900/30 text-blue-400' };

    return filterBar + `
      <div class="bg-gray-800 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-700/50 text-gray-400 text-xs">
              <tr>
                <th class="text-left px-4 py-3">N°</th>
                <th class="text-left px-4 py-3">Date</th>
                <th class="text-left px-4 py-3">Client</th>
                <th class="text-left px-4 py-3">Motif</th>
                <th class="text-right px-4 py-3">Montant</th>
                <th class="text-center px-4 py-3">Type</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${filtered.map(r => `
                <tr class="hover:bg-gray-700/30 transition">
                  <td class="px-4 py-3 font-mono text-indigo-400 text-xs">${escapeHtml(r.number||r.id)}</td>
                  <td class="px-4 py-3 text-gray-300">${formatDate(r.date)}</td>
                  <td class="px-4 py-3 text-white">${escapeHtml(r.clientName||'—')}</td>
                  <td class="px-4 py-3 text-gray-400 text-xs">${escapeHtml(r.reason||r.notes||'—')}</td>
                  <td class="px-4 py-3 text-right font-medium text-white">${formatCurrency(r.total, currency)}</td>
                  <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs ${TYPE_COLORS[r.type]||'bg-gray-700 text-gray-400'}">${TYPE_LABELS[r.type]||r.type}</span></td>
                  <td class="px-4 py-3">
                    <div class="flex gap-1 justify-end">
                      <button onclick="RETURNS.viewReturn('${r.id}')" class="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300" title="Détails">👁️</button>
                      <button onclick="RETURNS.printReturn('${r.id}')" class="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300" title="Imprimer">🖨️</button>
                      <button onclick="RETURNS.deleteReturn('${r.id}')" class="p-1.5 bg-red-900/30 hover:bg-red-900/60 rounded-lg text-xs text-red-400" title="Supprimer">🗑️</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ─── FORMULAIRE ───────────────────────────────────────────────────────────
  async _renderForm() {
    const clients  = await DB.getAll('clients');
    const ventes   = await DB.getAll('ventes');
    const products = await DB.getAll('produits');
    const fournisseurs = await DB.getAll('fournisseurs');
    const currency = APP.config?.currency || 'Ar';

    this._returnProducts = products.map(p => ({ id: p.id, name: p.nom||p.name||'?', price: p.vente||p.price||0 }));
    this._returnVentes   = ventes.map(v => ({ id: v.id, number: v.number, clientId: v.clientId, clientName: v.clientName, items: v.items||[] }));

    return `
      <div class="max-w-3xl mx-auto bg-gray-800 rounded-2xl p-6">
        <h2 class="text-base font-semibold text-white mb-5">Nouveau retour</h2>

        <!-- Référence vente -->
        <div class="bg-gray-700/40 rounded-xl p-4 mb-4">
          <label class="text-xs text-gray-400 font-medium">Vente d'origine (optionnel — saisissez le numéro pour pré-remplir)</label>
          <div class="flex gap-2 mt-2">
            <input id="ret-sale-ref" type="text" placeholder="ex: VNT-2024-0001" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" list="sale-list">
            <datalist id="sale-list">${ventes.map(v=>`<option value="${escapeHtml(v.number||v.id)}">`).join('')}</datalist>
            <button onclick="RETURNS._loadSaleRef()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">Charger</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-xs text-gray-400">Client</label>
            <select id="ret-client" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">— Anonyme —</option>
              ${clients.map(c=>`<option value="${c.id}" data-name="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Date du retour</label>
            <input id="ret-date" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
          </div>
          <div>
            <label class="text-xs text-gray-400">Motif du retour</label>
            <select id="ret-reason" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              ${this.REASONS.map(r=>`<option value="${r}">${r}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Type de retour</label>
            <select id="ret-type" onchange="RETURNS._togglePayment()" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="refund">💵 Remboursement en espèces</option>
              <option value="credit">📋 Avoir client</option>
            </select>
          </div>
          <div id="ret-payment-wrap">
            <label class="text-xs text-gray-400">Mode de remboursement</label>
            <select id="ret-payment" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              ${APP.getPaymentMethods().filter(m=>m.id!=='credit').map(m=>`<option value="${m.id}">${m.icon} ${m.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Retourner au fournisseur ?</label>
            <select id="ret-supplier" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">— Non / Garder en stock —</option>
              ${fournisseurs.map(f=>`<option value="${f.id}" data-name="${escapeHtml(f.name)}">${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Lignes articles -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-gray-400 font-medium">Articles retournés</label>
            <button onclick="RETURNS._addReturnLine()" class="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">+ Ajouter</button>
          </div>
          <div class="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-1 px-1">
            <div class="col-span-5">Produit</div><div class="col-span-2 text-right">Qté</div><div class="col-span-3 text-right">Prix unit.</div><div class="col-span-1 text-right">Total</div><div class="col-span-1"></div>
          </div>
          <div id="return-lines" class="space-y-2">
            ${this._returnLineTpl(this._returnProducts, 0)}
          </div>
        </div>

        <div class="flex items-center justify-between mb-4 p-3 bg-gray-700/50 rounded-xl">
          <span class="text-sm font-medium text-white">Total retour</span>
          <span id="return-total" class="text-lg font-bold text-indigo-400">0 ${currency}</span>
        </div>

        <div>
          <label class="text-xs text-gray-400">Notes complémentaires</label>
          <textarea id="ret-notes" rows="2" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="Détails supplémentaires..."></textarea>
        </div>

        <div class="flex gap-3 mt-4">
          <button onclick="RETURNS._setView('list')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Annuler</button>
          <button onclick="RETURNS.saveReturn()" class="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Enregistrer le retour</button>
        </div>
      </div>`;
  },

  _togglePayment() {
    const type = document.getElementById('ret-type')?.value;
    const wrap = document.getElementById('ret-payment-wrap');
    if (wrap) wrap.style.display = type === 'credit' ? 'none' : '';
  },

  _returnLineTpl(products, idx) {
    return `
      <div class="ret-line grid grid-cols-12 gap-2 items-center">
        <div class="col-span-5">
          <select class="rl-product w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs" onchange="RETURNS._onProductChange(this)">
            <option value="">— Produit —</option>
            ${(products||[]).map(p=>`<option value="${p.id}" data-price="${p.price||0}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="col-span-2"><input type="number" class="rl-qty w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs text-right" value="1" min="0.01" step="0.01" oninput="RETURNS._updateTotal()"></div>
        <div class="col-span-3"><input type="number" class="rl-price w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-xs text-right" value="0" min="0" step="0.01" oninput="RETURNS._updateTotal()"></div>
        <div class="col-span-1 text-xs text-gray-400 text-right rl-line-total">0</div>
        <div class="col-span-1 text-center"><button onclick="this.closest('.ret-line').remove();RETURNS._updateTotal()" class="text-red-400 hover:text-red-300 text-base">×</button></div>
      </div>`;
  },

  _addReturnLine() {
    const container = document.getElementById('return-lines');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = this._returnLineTpl(this._returnProducts||[], container.children.length);
    container.appendChild(div.firstElementChild);
  },

  _onProductChange(sel) {
    const line = sel.closest('.ret-line');
    if (!line) return;
    const price = parseFloat(sel.options[sel.selectedIndex]?.dataset.price||0);
    const priceInput = line.querySelector('.rl-price');
    if (priceInput && price > 0) priceInput.value = price;
    this._updateTotal();
  },

  _updateTotal() {
    let total = 0;
    document.querySelectorAll('.ret-line').forEach(line => {
      const qty   = parseFloat(line.querySelector('.rl-qty')?.value||0);
      const price = parseFloat(line.querySelector('.rl-price')?.value||0);
      const lt = qty * price;
      const el = line.querySelector('.rl-line-total');
      if (el) el.textContent = Math.round(lt).toLocaleString('fr-FR');
      total += lt;
    });
    const el = document.getElementById('return-total');
    if (el) el.textContent = formatCurrency(total, APP.config?.currency||'Ar');
  },

  async _loadSaleRef() {
    const ref = document.getElementById('ret-sale-ref')?.value.trim();
    if (!ref) return;
    const ventes = this._returnVentes || await DB.getAll('ventes');
    const vente  = ventes.find(v => v.number===ref || v.id===ref);
    if (!vente) { showToast('Vente introuvable', 'warning'); return; }

    const clientSel = document.getElementById('ret-client');
    if (clientSel && vente.clientId) {
      const opt = clientSel.querySelector(`option[value="${vente.clientId}"]`);
      if (opt) clientSel.value = vente.clientId;
    }

    const container = document.getElementById('return-lines');
    if (!container || !vente.items?.length) return;
    container.innerHTML = '';
    const products = this._returnProducts || [];
    for (const item of vente.items) {
      const div = document.createElement('div');
      div.innerHTML = this._returnLineTpl(products, 0);
      const el  = div.firstElementChild;
      const sel = el.querySelector('.rl-product');
      if (sel) { const opt = [...sel.options].find(o=>o.value===item.productId); if (opt) sel.value = item.productId; }
      const qty = el.querySelector('.rl-qty');   if (qty)   qty.value   = item.qty||1;
      const prc = el.querySelector('.rl-price'); if (prc)   prc.value   = item.unitPrice||item.price||0;
      container.appendChild(el);
    }
    this._updateTotal();
    showToast('Vente chargée', 'success');
  },

  // ─── SAUVEGARDER RETOUR ───────────────────────────────────────────────────
  async saveReturn() {
    const date   = document.getElementById('ret-date')?.value;
    const type   = document.getElementById('ret-type')?.value || 'refund';
    const reason = document.getElementById('ret-reason')?.value || '';
    if (!date) { showToast('Sélectionnez une date', 'warning'); return; }

    const lines = document.querySelectorAll('.ret-line');
    const items = [];
    lines.forEach(line => {
      const sel       = line.querySelector('.rl-product');
      const productId = sel?.value;
      if (!productId) return;
      const productName = sel.options[sel.selectedIndex]?.text || '';
      const qty       = parseFloat(line.querySelector('.rl-qty')?.value||0);
      const unitPrice = parseFloat(line.querySelector('.rl-price')?.value||0);
      if (qty <= 0) return;
      items.push({ productId, productName, qty, unitPrice, total: qty*unitPrice });
    });
    if (items.length === 0) { showToast('Ajoutez au moins un article', 'warning'); return; }

    const clientSel  = document.getElementById('ret-client');
    const clientId   = clientSel?.value || '';
    const clientName = clientSel?.options[clientSel.selectedIndex]?.dataset.name || 'Anonyme';
    const supplierSel = document.getElementById('ret-supplier');
    const supplierId  = supplierSel?.value || '';
    const supplierName = supplierId ? supplierSel.options[supplierSel.selectedIndex]?.dataset.name || '' : '';
    const total = items.reduce((s,i)=>s+i.total, 0);
    const existingRetours = await DB.getAll('retours');

    const retour = {
      id: genId('RET'),
      number: genInvoiceNum('RET', existingRetours),
      saleRef:     document.getElementById('ret-sale-ref')?.value.trim() || '',
      clientId, clientName, date, items, total, type, reason,
      supplierId, supplierName,
      paymentMode: type==='refund' ? (document.getElementById('ret-payment')?.value||'cash') : null,
      notes:       document.getElementById('ret-notes')?.value.trim() || '',
      createdAt:   new Date().toISOString()
    };

    await DB.put('retours', retour);
    if (SM.mode !== 'local') SM.writeNow('retours', retour.id, 'set', retour);

    // Enregistrer en caisse si caisse ouverte et remboursement en espèces (sortie)
    if (typeof CASHIER !== 'undefined' && CASHIER._activeCaisseId && type === 'refund' && retour.paymentMode === 'cash') {
      await CASHIER.recordRefundMouvement(retour);
    }

    // Réintégrer le stock (si pas retourné fournisseur, stock revient en entrepôt)
    for (const item of items) {
      const prod = await DB.get('produits', item.productId);
      if (!prod) continue;
      prod.stock = (parseFloat(prod.stock||0)) + item.qty;
      await DB.put('produits', prod);
      if (SM.mode !== 'local') SM.writeNow('produits', prod.id, 'set', prod);
      await DB.put('stockMovements', {
        id: genId('SMV'), productId: prod.id, productName: prod.nom||prod.name||'',
        type: 'in', qty: item.qty,
        reason: `Retour ${retour.number}${supplierId?' → fournisseur':''}`,
        date, createdAt: new Date().toISOString()
      });
    }

    // Si retour vers fournisseur : décrémenter à nouveau + créer un achat retour
    if (supplierId) {
      for (const item of items) {
        const prod = await DB.get('produits', item.productId);
        if (!prod) continue;
        prod.stock = Math.max(0, (parseFloat(prod.stock||0)) - item.qty);
        await DB.put('produits', prod);
        if (SM.mode !== 'local') SM.writeNow('produits', prod.id, 'set', prod);
        await DB.put('stockMovements', {
          id: genId('SMV'), productId: prod.id, productName: prod.nom||prod.name||'',
          type: 'out', qty: item.qty,
          reason: `Retour fournisseur ${supplierName} (${retour.number})`,
          date, createdAt: new Date().toISOString()
        });
      }
    }

    APP.addLog('INFO', 'Retour enregistré', { number: retour.number, clientName, total, type, reason });
    showToast(`Retour ${retour.number} enregistré${supplierId?' — stock retourné au fournisseur':'— stock réintégré'}`, 'success');
    await this.printReturn(retour.id);
    this._setView('list');
  },

  // ─── DÉTAILS ──────────────────────────────────────────────────────────────
  async viewReturn(id) {
    const r = await DB.get('retours', id);
    if (!r) return;
    const currency = APP.config?.currency || 'Ar';
    const TYPE_LABELS = { refund: '💵 Remboursement', credit: '📋 Avoir client' };
    showModal(`
      <div class="p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-white">Retour ${escapeHtml(r.number||r.id)}</h3>
          <div class="flex gap-2">
            <button onclick="RETURNS.printReturn('${r.id}')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs">🖨️ Imprimer</button>
            <button onclick="closeModal()" class="text-gray-400 hover:text-white text-xl">×</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span class="text-gray-400">Client : </span><span class="text-white">${escapeHtml(r.clientName||'—')}</span></div>
          <div><span class="text-gray-400">Date : </span><span class="text-white">${formatDate(r.date)}</span></div>
          <div><span class="text-gray-400">Type : </span><span class="text-white">${TYPE_LABELS[r.type]||r.type}</span></div>
          <div><span class="text-gray-400">Motif : </span><span class="text-white">${escapeHtml(r.reason||'—')}</span></div>
          ${r.saleRef ? `<div><span class="text-gray-400">Vente réf : </span><span class="text-indigo-400">${escapeHtml(r.saleRef)}</span></div>` : ''}
          ${r.supplierName ? `<div><span class="text-gray-400">Fournisseur : </span><span class="text-yellow-400">${escapeHtml(r.supplierName)}</span></div>` : ''}
        </div>
        <table class="w-full text-xs mb-4">
          <thead class="bg-gray-700 text-gray-400"><tr><th class="text-left px-3 py-2">Article</th><th class="text-right px-3 py-2">Qté</th><th class="text-right px-3 py-2">P.U.</th><th class="text-right px-3 py-2">Total</th></tr></thead>
          <tbody class="divide-y divide-gray-700">${(r.items||[]).map(i=>`<tr><td class="px-3 py-2 text-white">${escapeHtml(i.productName)}</td><td class="px-3 py-2 text-right text-gray-300">${i.qty}</td><td class="px-3 py-2 text-right text-gray-300">${formatCurrency(i.unitPrice,currency)}</td><td class="px-3 py-2 text-right font-medium text-white">${formatCurrency(i.total,currency)}</td></tr>`).join('')}</tbody>
          <tfoot class="bg-gray-700/50"><tr><td colspan="3" class="px-3 py-2 text-right font-bold text-white">Total</td><td class="px-3 py-2 text-right font-bold text-indigo-400">${formatCurrency(r.total,currency)}</td></tr></tfoot>
        </table>
        ${r.notes ? `<div class="text-xs text-gray-400">Notes : ${escapeHtml(r.notes)}</div>` : ''}
      </div>`, { size: 'max-w-2xl' });
  },

  // ─── IMPRESSION ───────────────────────────────────────────────────────────
  async printReturn(id) {
    const r = await DB.get('retours', id);
    if (!r) return;
    const currency = APP.config?.currency || 'Ar';
    const company  = APP.config?.name || 'Mon Entreprise';
    const TYPE_LABELS = { refund: 'Remboursement', credit: 'Avoir client' };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Avoir ${escapeHtml(r.number||r.id)}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;max-width:620px;margin:auto}
    h1{font-size:18px}table{width:100%;border-collapse:collapse;margin:12px 0}
    th,td{padding:7px 10px;border:1px solid #e5e7eb}th{background:#f3f4f6}
    .total-row{font-weight:bold;background:#eff6ff}
    .header{border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}
    @media print{button{display:none}}</style></head>
    <body>
    <div class="header">
      <div><h1>Avoir / Retour</h1><div style="color:#6b7280">${escapeHtml(company)}</div></div>
      <div style="text-align:right"><strong>${escapeHtml(r.number||r.id)}</strong><br>Date : ${formatDate(r.date)}</div>
    </div>
    <table>
      <tr><th>Client</th><th>Référence vente</th><th>Motif</th><th>Type</th></tr>
      <tr><td>${escapeHtml(r.clientName||'Anonyme')}</td><td>${escapeHtml(r.saleRef||'—')}</td><td>${escapeHtml(r.reason||'—')}</td><td>${TYPE_LABELS[r.type]||r.type}</td></tr>
    </table>
    ${r.supplierName?`<p><strong>Retour fournisseur :</strong> ${escapeHtml(r.supplierName)}</p>`:''}
    <table>
      <thead><tr><th>Article</th><th style="text-align:right">Qté</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${(r.items||[]).map(i=>`<tr><td>${escapeHtml(i.productName)}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${formatCurrency(i.unitPrice,currency)}</td><td style="text-align:right">${formatCurrency(i.total,currency)}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL RETOURNÉ</td><td style="text-align:right">${formatCurrency(r.total,currency)}</td></tr>
      </tbody>
    </table>
    ${r.notes?`<p><em>Notes : ${escapeHtml(r.notes)}</em></p>`:''}
    <p style="margin-top:30px;font-size:11px;color:#6b7280">Les articles retournés ont été réintégrés dans le stock.</p>
    <script>window.onload=()=>window.print()<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.onload = () => URL.revokeObjectURL(url);
  },

  // ─── SUPPRESSION avec annulation du stock ─────────────────────────────────
  async deleteReturn(id) {
    const r = await DB.get('retours', id);
    if (!r) return;
    const ok = await APP.canDelete(`le retour ${r.number||id}`);
    if (!ok) return;

    // Annuler la réintégration de stock
    for (const item of (r.items||[])) {
      const prod = await DB.get('produits', item.productId);
      if (!prod) continue;
      prod.stock = Math.max(0, (parseFloat(prod.stock||0)) - item.qty);
      await DB.put('produits', prod);
      if (SM.mode !== 'local') SM.writeNow('produits', prod.id, 'set', prod);
      await DB.put('stockMovements', {
        id: genId('SMV'), productId: prod.id, productName: prod.nom||prod.name||'',
        type: 'out', qty: item.qty,
        reason: `Annulation retour ${r.number}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
    }

    await DB.delete('retours', id);
    if (SM.mode !== 'local') SM.writeNow('retours', id, 'delete', null);
    APP.addLog('INFO', 'Retour supprimé', { id, number: r.number });
    showToast('Retour supprimé — stock corrigé', 'success');
    this.render();
  }
};
