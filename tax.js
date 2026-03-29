// tax.js — Configuration TVA et rapport mensuel
'use strict';

window.TAX = {
  _view: 'config', // 'config' | 'report'

  // ─── Taux TVA par défaut ──────────────────────────────────────────────────
  _DEFAULT_RATES: [
    { id: 'tva_0',  name: 'Exonéré (0%)',  rate: 0,  isDefault: true },
    { id: 'tva_10', name: 'TVA 10%',       rate: 10, isDefault: true },
    { id: 'tva_20', name: 'TVA 20%',       rate: 20, isDefault: true },
  ],

  async getRates() {
    const stored = await DB.getAll('taxConfig');
    return stored.length > 0 ? stored : this._DEFAULT_RATES;
  },

  async render() {
    const el = document.getElementById('tab-tax');
    if (!el) return;
    const rates = await this.getRates();
    const currency = APP.config?.currency || 'Ar';

    el.innerHTML = `
      <div class="p-4 md:p-6 max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-white">TVA &amp; Taxes</h1>
            <p class="text-sm text-gray-400 mt-0.5">Configuration des taux et rapports fiscaux</p>
          </div>
          <div class="flex gap-2">
            <button onclick="TAX._setView('config')" class="px-4 py-2 rounded-lg text-sm font-medium transition ${this._view==='config'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">⚙️ Configuration</button>
            <button onclick="TAX._setView('report')" class="px-4 py-2 rounded-lg text-sm font-medium transition ${this._view==='report'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">📊 Rapport</button>
          </div>
        </div>
        <div id="tax-view-container">${this._view === 'config' ? await this._renderConfig(rates) : await this._renderReport(rates, currency)}</div>
      </div>`;
  },

  _setView(v) { this._view = v; this.render(); },

  async _renderConfig(rates) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Taux configurés -->
        <div class="bg-gray-800 rounded-2xl p-5">
          <h2 class="text-base font-semibold text-white mb-4">Taux TVA configurés</h2>
          <div class="space-y-2" id="tax-rates-list">
            ${rates.map(r => `
              <div class="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                <div>
                  <div class="text-sm font-medium text-white">${escapeHtml(r.name)}</div>
                  <div class="text-xs text-gray-400">${r.rate}%</div>
                </div>
                ${r.isDefault ? '<span class="text-xs text-gray-500 bg-gray-600 px-2 py-0.5 rounded-full">Défaut</span>'
                  : `<button onclick="TAX.deleteRate('${r.id}')" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-900/20 hover:bg-red-900/40">Supprimer</button>`}
              </div>`).join('')}
          </div>
        </div>

        <!-- Ajouter un taux -->
        <div class="bg-gray-800 rounded-2xl p-5">
          <h2 class="text-base font-semibold text-white mb-4">Ajouter un taux personnalisé</h2>
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Nom du taux</label>
              <input id="tax-name" type="text" placeholder="ex: TVA réduit 5%" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Taux (%)</label>
              <input id="tax-rate" type="number" min="0" max="100" step="0.01" placeholder="ex: 5" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
            </div>
            <button onclick="TAX.addRate()" class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">+ Ajouter ce taux</button>
          </div>
        </div>

        <!-- Affectation produits -->
        <div class="bg-gray-800 rounded-2xl p-5 md:col-span-2">
          <h2 class="text-base font-semibold text-white mb-4">Affectation TVA aux produits</h2>
          ${await this._renderProductTaxAssign(rates)}
        </div>
      </div>`;
  },

  async _renderProductTaxAssign(rates) {
    const products = await DB.getAll('produits');
    if (products.length === 0) return '<p class="text-sm text-gray-400">Aucun produit disponible.</p>';
    return `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 text-xs border-b border-gray-700">
              <th class="text-left pb-2">Produit</th>
              <th class="text-left pb-2">Catégorie</th>
              <th class="text-left pb-2">Taux TVA</th>
              <th class="pb-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700/50">
            ${products.map(p => `
              <tr>
                <td class="py-2 text-white">${escapeHtml(p.nom || p.name || '—')}</td>
                <td class="py-2 text-gray-400">${escapeHtml(p.category || '—')}</td>
                <td class="py-2">
                  <select id="ptax-${p.id}" class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs">
                    <option value="">— Aucune TVA —</option>
                    ${rates.map(r => `<option value="${r.id}" ${p.taxRateId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
                  </select>
                </td>
                <td class="py-2">
                  <button onclick="TAX.assignProductTax('${p.id}')" class="text-xs px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600/40">Appliquer</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  async _renderReport(rates, currency) {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    return `
      <div class="bg-gray-800 rounded-2xl p-5">
        <div class="flex items-center gap-3 mb-5 flex-wrap">
          <div>
            <label class="text-xs text-gray-400">Période</label>
            <input id="tax-report-month" type="month" value="${month}" class="ml-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
          </div>
          <button onclick="TAX._loadReport()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Calculer</button>
          <button onclick="TAX._printReport()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">🖨️ Imprimer</button>
        </div>
        <div id="tax-report-content">
          <p class="text-sm text-gray-400 text-center py-8">Cliquez sur "Calculer" pour générer le rapport.</p>
        </div>
      </div>`;
  },

  async _loadReport() {
    const month = document.getElementById('tax-report-month')?.value;
    if (!month) return;
    const currency = APP.config?.currency || 'Ar';
    const rates = await this.getRates();
    const rateMap = Object.fromEntries(rates.map(r => [r.id, r]));
    const products = await DB.getAll('produits');
    const prodMap = Object.fromEntries(products.map(p => [p.id, p]));

    const sales = await DB.getAll('ventes');
    const monthSales = sales.filter(s => (s.date || s.createdAt || '').startsWith(month));

    // Calcul TVA collectée par taux
    const collected = {}; // rateId → { name, rate, base, tva }
    for (const sale of monthSales) {
      if (!sale.items) continue;
      for (const item of sale.items) {
        const prod = prodMap[item.productId];
        const rateId = prod?.taxRateId;
        if (!rateId) continue;
        const rate = rateMap[rateId];
        if (!rate || rate.rate === 0) continue;
        if (!collected[rateId]) collected[rateId] = { name: rate.name, rate: rate.rate, base: 0, tva: 0 };
        const base = (item.total || 0) / (1 + rate.rate / 100);
        const tva = (item.total || 0) - base;
        collected[rateId].base += base;
        collected[rateId].tva += tva;
      }
    }

    const achats = await DB.getAll('achats');
    const monthAchats = achats.filter(a => (a.date || '').startsWith(month));
    const deductible = {}; // rateId → { name, rate, base, tva }
    for (const achat of monthAchats) {
      if (!achat.items) continue;
      for (const item of achat.items) {
        const prod = prodMap[item.productId];
        const rateId = prod?.taxRateId;
        if (!rateId) continue;
        const rate = rateMap[rateId];
        if (!rate || rate.rate === 0) continue;
        if (!deductible[rateId]) deductible[rateId] = { name: rate.name, rate: rate.rate, base: 0, tva: 0 };
        const base = (item.total || 0) / (1 + rate.rate / 100);
        const tva = (item.total || 0) - base;
        deductible[rateId].base += base;
        deductible[rateId].tva += tva;
      }
    }

    const totalCollected = Object.values(collected).reduce((s, r) => s + r.tva, 0);
    const totalDeductible = Object.values(deductible).reduce((s, r) => s + r.tva, 0);
    const net = totalCollected - totalDeductible;

    const container = document.getElementById('tax-report-content');
    if (!container) return;
    container.innerHTML = `
      <div class="space-y-5">
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-green-900/20 border border-green-700/40 rounded-xl p-4 text-center">
            <div class="text-xs text-green-400 mb-1">TVA Collectée</div>
            <div class="text-lg font-bold text-green-300">${formatCurrency(totalCollected, currency)}</div>
          </div>
          <div class="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-center">
            <div class="text-xs text-red-400 mb-1">TVA Déductible</div>
            <div class="text-lg font-bold text-red-300">${formatCurrency(totalDeductible, currency)}</div>
          </div>
          <div class="bg-indigo-900/20 border border-indigo-700/40 rounded-xl p-4 text-center">
            <div class="text-xs text-indigo-400 mb-1">TVA Nette à payer</div>
            <div class="text-lg font-bold ${net >= 0 ? 'text-indigo-300' : 'text-yellow-300'}">${formatCurrency(net, currency)}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-700/40 rounded-xl p-4">
            <h3 class="text-sm font-semibold text-white mb-3">TVA Collectée (sur ventes)</h3>
            ${Object.values(collected).length === 0 ? '<p class="text-xs text-gray-400">Aucune TVA collectée ce mois.</p>' :
              `<table class="w-full text-xs"><thead><tr class="text-gray-400 border-b border-gray-600"><th class="text-left pb-1">Taux</th><th class="text-right pb-1">Base HT</th><th class="text-right pb-1">TVA</th></tr></thead><tbody>${Object.values(collected).map(r => `<tr class="border-b border-gray-700/50"><td class="py-1 text-white">${escapeHtml(r.name)}</td><td class="py-1 text-right text-gray-300">${formatCurrency(r.base, currency)}</td><td class="py-1 text-right text-green-400">${formatCurrency(r.tva, currency)}</td></tr>`).join('')}</tbody></table>`}
          </div>
          <div class="bg-gray-700/40 rounded-xl p-4">
            <h3 class="text-sm font-semibold text-white mb-3">TVA Déductible (sur achats)</h3>
            ${Object.values(deductible).length === 0 ? '<p class="text-xs text-gray-400">Aucune TVA déductible ce mois.</p>' :
              `<table class="w-full text-xs"><thead><tr class="text-gray-400 border-b border-gray-600"><th class="text-left pb-1">Taux</th><th class="text-right pb-1">Base HT</th><th class="text-right pb-1">TVA</th></tr></thead><tbody>${Object.values(deductible).map(r => `<tr class="border-b border-gray-700/50"><td class="py-1 text-white">${escapeHtml(r.name)}</td><td class="py-1 text-right text-gray-300">${formatCurrency(r.base, currency)}</td><td class="py-1 text-right text-red-400">${formatCurrency(r.tva, currency)}</td></tr>`).join('')}</tbody></table>`}
          </div>
        </div>
      </div>`;
  },

  async _printReport() {
    const month = document.getElementById('tax-report-month')?.value;
    if (!month) { showToast('Sélectionnez une période', 'warning'); return; }
    const currency = APP.config?.currency || 'Ar';
    const rates = await this.getRates();
    const rateMap = Object.fromEntries(rates.map(r => [r.id, r]));
    const products = await DB.getAll('produits');
    const prodMap = Object.fromEntries(products.map(p => [p.id, p]));
    const sales = await DB.getAll('ventes');
    const achats = await DB.getAll('achats');
    const monthSales = sales.filter(s => (s.date || s.createdAt || '').startsWith(month));
    const monthAchats = achats.filter(a => (a.date || '').startsWith(month));

    const collected = {};
    for (const sale of monthSales) {
      if (!sale.items) continue;
      for (const item of sale.items) {
        const prod = prodMap[item.productId];
        const rateId = prod?.taxRateId;
        if (!rateId) continue;
        const rate = rateMap[rateId];
        if (!rate || rate.rate === 0) continue;
        if (!collected[rateId]) collected[rateId] = { name: rate.name, rate: rate.rate, base: 0, tva: 0 };
        const base = (item.total || 0) / (1 + rate.rate / 100);
        collected[rateId].base += base;
        collected[rateId].tva += (item.total || 0) - base;
      }
    }
    const deductible = {};
    for (const achat of monthAchats) {
      if (!achat.items) continue;
      for (const item of achat.items) {
        const prod = prodMap[item.productId];
        const rateId = prod?.taxRateId;
        if (!rateId) continue;
        const rate = rateMap[rateId];
        if (!rate || rate.rate === 0) continue;
        if (!deductible[rateId]) deductible[rateId] = { name: rate.name, rate: rate.rate, base: 0, tva: 0 };
        const base = (item.total || 0) / (1 + rate.rate / 100);
        deductible[rateId].base += base;
        deductible[rateId].tva += (item.total || 0) - base;
      }
    }
    const totalC = Object.values(collected).reduce((s, r) => s + r.tva, 0);
    const totalD = Object.values(deductible).reduce((s, r) => s + r.tva, 0);
    const net = totalC - totalD;
    const company = APP.config?.name || 'Mon Entreprise';
    const [yr, mo] = month.split('-');
    const monthLabel = new Date(parseInt(yr), parseInt(mo) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport TVA ${monthLabel}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;}h1{font-size:18px;margin:0 0 4px;}h2{font-size:14px;color:#374151;margin:16px 0 6px;}table{width:100%;border-collapse:collapse;margin-bottom:12px;}th,td{padding:6px 8px;border:1px solid #e5e7eb;text-align:left;}th{background:#f3f4f6;}tr:nth-child(even){background:#f9fafb;}.total-row{font-weight:bold;background:#e0f2fe!important;}.net-row{font-weight:bold;font-size:14px;background:#dbeafe!important;}.header{border-bottom:2px solid #6366f1;padding-bottom:10px;margin-bottom:16px;}</style>
    </head><body>
    <div class="header"><h1>Rapport TVA — ${escapeHtml(monthLabel)}</h1><div>${escapeHtml(company)}</div><div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div></div>
    <h2>TVA Collectée (Ventes)</h2>
    <table><thead><tr><th>Taux</th><th>%</th><th>Base HT</th><th>TVA Collectée</th></tr></thead><tbody>
    ${Object.values(collected).map(r => `<tr><td>${escapeHtml(r.name)}</td><td>${r.rate}%</td><td>${formatCurrency(r.base, currency)}</td><td>${formatCurrency(r.tva, currency)}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="3">Total TVA Collectée</td><td>${formatCurrency(totalC, currency)}</td></tr>
    </tbody></table>
    <h2>TVA Déductible (Achats)</h2>
    <table><thead><tr><th>Taux</th><th>%</th><th>Base HT</th><th>TVA Déductible</th></tr></thead><tbody>
    ${Object.values(deductible).map(r => `<tr><td>${escapeHtml(r.name)}</td><td>${r.rate}%</td><td>${formatCurrency(r.base, currency)}</td><td>${formatCurrency(r.tva, currency)}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="3">Total TVA Déductible</td><td>${formatCurrency(totalD, currency)}</td></tr>
    </tbody></table>
    <table><tbody><tr class="net-row"><td>TVA NETTE À PAYER (Collectée – Déductible)</td><td>${formatCurrency(net, currency)}</td></tr></tbody></table>
    <script>window.onload=()=>{window.print();}</script></body></html>`;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },

  async addRate() {
    const name = document.getElementById('tax-name')?.value.trim();
    const rateVal = parseFloat(document.getElementById('tax-rate')?.value);
    if (!name) { showToast('Saisissez un nom', 'warning'); return; }
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) { showToast('Taux invalide (0–100)', 'warning'); return; }
    const rates = await this.getRates();
    if (rates.find(r => r.name.toLowerCase() === name.toLowerCase())) { showToast('Ce taux existe déjà', 'warning'); return; }
    const newRate = { id: genId('TVA'), name, rate: rateVal, isDefault: false, createdAt: new Date().toISOString() };
    await DB.put('taxConfig', newRate);
    // Si c'est la première custom, copier aussi les defaults dans la DB
    if (rates[0]?.isDefault) {
      for (const r of rates) await DB.put('taxConfig', r);
    }
    await DB.put('taxConfig', newRate);
    showToast('Taux ajouté', 'success');
    this.render();
  },

  async deleteRate(id) {
    const ok = await APP.canDelete('ce taux TVA');
    if (!ok) return;
    await DB.delete('taxConfig', id);
    showToast('Taux supprimé', 'success');
    this.render();
  },

  async assignProductTax(productId) {
    const sel = document.getElementById(`ptax-${productId}`);
    if (!sel) return;
    const taxRateId = sel.value || null;
    const prod = await DB.get('produits', productId);
    if (!prod) return;
    prod.taxRateId = taxRateId || undefined;
    await DB.put('produits', prod);
    if (APP.config && SM.mode !== 'local') SM.writeNow('produits', prod.id, 'set', prod);
    showToast('TVA du produit mise à jour', 'success');
  }
};
