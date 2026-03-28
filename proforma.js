// proforma.js — Devis / Proformas
'use strict';

window.PROFORMA = {
  _view: 'list',
  _cart: [],
  _page: 1, _perPage: 20,

  async render() {
    const el = document.getElementById('tab-proformas');
    if (!el) return;
    try {
    el.innerHTML = `
      <div class="p-4">
        <div class="flex gap-2 mb-4">
          <button onclick="PROFORMA._view='list';PROFORMA.render()" class="px-4 py-2 rounded-lg text-sm font-medium ${this._view==='list'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">Liste</button>
          <button onclick="PROFORMA._view='form';PROFORMA._cart=[];PROFORMA.render()" class="px-4 py-2 rounded-lg text-sm font-medium ${this._view==='form'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">Nouveau devis</button>
        </div>
        <div id="proforma-content"></div>
      </div>
    `;
      if (this._view === 'form') await this._renderForm();
      else await this._renderList();
    } catch (e) {
      console.error('Proforma render error:', e);
      el.innerHTML = `<div class="p-4 text-red-400">Erreur: ${escapeHtml(e.message)}</div>`;
    }
  },

  async _renderList() {
    const items = await DB.getAll('proformas');
    items.sort((a, b) => b.date > a.date ? 1 : -1);
    const total = items.length;
    const start = (this._page - 1) * this._perPage;
    const page = items.slice(start, start + this._perPage);

    const statusColors = { draft: 'bg-gray-600/20 text-gray-400', sent: 'bg-blue-600/20 text-blue-400', accepted: 'bg-green-600/20 text-green-400', rejected: 'bg-red-600/20 text-red-400', converted: 'bg-purple-600/20 text-purple-400' };
    const statusLabels = { draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', converted: 'Converti' };

    document.getElementById('proforma-content').innerHTML = `
      <div class="space-y-3">

        <!-- ── Tableau desktop ── -->
        <div class="hidden sm:block overflow-x-auto rounded-xl border border-gray-700">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-800 border-b border-gray-700 text-left">
                <th class="px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Numéro</th>
                <th class="px-3 py-2.5 text-gray-400 font-medium">Client</th>
                <th class="px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Date</th>
                <th class="px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">Validité</th>
                <th class="px-3 py-2.5 text-gray-400 font-medium">Statut</th>
                <th class="px-3 py-2.5 text-gray-400 font-medium text-right">Total</th>
                <th class="px-3 py-2.5 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${page.length ? page.map((p, i) => {
                const sc = statusColors[p.status] || statusColors.draft;
                const sl = statusLabels[p.status] || p.status;
                const isExp = p.validUntil && new Date(p.validUntil) < new Date();
                const rowBg = i % 2 === 0 ? '' : 'bg-gray-800/30';
                return `
                <tr class="border-b border-gray-700/40 hover:bg-indigo-600/5 transition-colors ${rowBg}">
                  <td class="px-3 py-2.5 font-medium text-white whitespace-nowrap">${escapeHtml(p.number)}</td>
                  <td class="px-3 py-2.5 text-gray-300 max-w-[160px] truncate">${escapeHtml(p.clientName||'Client passager')}</td>
                  <td class="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">${formatDate(p.date)}</td>
                  <td class="px-3 py-2.5 text-xs whitespace-nowrap ${isExp?'text-red-400':p.validUntil?'text-gray-400':'text-gray-600'}">${p.validUntil?formatDate(p.validUntil):'—'}</td>
                  <td class="px-3 py-2.5"><span class="text-xs px-2 py-0.5 rounded-full ${sc}">${sl}</span></td>
                  <td class="px-3 py-2.5 text-right font-bold text-indigo-400 whitespace-nowrap">${formatCurrency(p.total)}</td>
                  <td class="px-3 py-2.5">
                    <div class="flex gap-1 items-center flex-nowrap">
                      <button onclick="PROFORMA._pdfProforma('${p.id}')" title="PDF" class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                      </button>
                      ${p.status !== 'converted' ? `
                      <button onclick="PROFORMA.changeStatus('${p.id}')" title="Changer statut" class="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                      </button>
                      <button onclick="PROFORMA.convertToSale('${p.id}')" title="Convertir en vente" class="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
                      </button>` : ''}
                      <button onclick="PROFORMA.deleteProforma('${p.id}')" title="Supprimer" class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="7" class="py-8 text-center text-gray-500">Aucun devis</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- ── Cards mobile ── -->
        <div class="sm:hidden space-y-2">
          ${page.length ? page.map(p => {
            const sc = statusColors[p.status] || statusColors.draft;
            const sl = statusLabels[p.status] || p.status;
            const isExp = p.validUntil && new Date(p.validUntil) < new Date();
            const validInfo = p.validUntil ? `<span class="${isExp?'text-red-400':'text-gray-600'}">· Valide: ${formatDate(p.validUntil)}</span>` : '';
            return `
            <div class="bg-gray-800 rounded-xl border border-gray-700 px-3 py-2.5">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-semibold text-white truncate flex-1">${escapeHtml(p.number)}</span>
                    <span class="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${sc}">${sl}</span>
                    <span class="flex-shrink-0 font-bold text-indigo-400 text-sm ml-1">${formatCurrency(p.total)}</span>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 flex-wrap leading-tight">
                    <span>${escapeHtml(p.clientName||'Client passager')}</span>
                    <span class="text-gray-700">·</span>
                    <span>${formatDate(p.date)}</span>
                    ${validInfo}
                  </div>
                </div>
                <button onclick="PROFORMA._openActionSheet('${p.id}')"
                  class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-700/60 text-gray-300 active:bg-gray-600 transition-colors"
                  style="-webkit-tap-highlight-color:transparent;">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/>
                  </svg>
                </button>
              </div>
            </div>`;
          }).join('') : '<div class="py-8 text-center text-gray-500">Aucun devis</div>'}
        </div>

        ${buildPagination(total, this._page, this._perPage, 'p => { PROFORMA._page=p; PROFORMA._renderList(); }')}
      </div>
    `;
  },

  _closeActionSheet() {
    const existing = document.getElementById('proforma-action-sheet');
    if (existing) {
      const sheet = existing.querySelector('[data-sheet]');
      const backdrop = existing.querySelector('[data-backdrop]');
      if (sheet) sheet.style.transform = 'translateY(100%)';
      if (backdrop) backdrop.style.opacity = '0';
      setTimeout(() => existing.remove(), 280);
    }
  },

  async _openActionSheet(proformaId) {
    const p = await DB.get('proformas', proformaId);
    if (!p) return;
    const statusLabels = { draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', converted: 'Converti' };
    const statusLabel = statusLabels[p.status] || p.status;
    const converted = p.status === 'converted';

    this._closeActionSheet();

    const wrap = document.createElement('div');
    wrap.id = 'proforma-action-sheet';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:1200;';
    wrap.innerHTML = `
      <div data-backdrop style="position:absolute;inset:0;background:rgba(0,0,0,0.55);opacity:0;transition:opacity 0.25s;"></div>
      <div data-sheet style="position:absolute;bottom:0;left:0;right:0;background:#1f2937;border-radius:20px 20px 0 0;padding:0 0 env(safe-area-inset-bottom,12px);transform:translateY(100%);transition:transform 0.28s cubic-bezier(.32,1,.4,1);z-index:1;">
        <!-- Handle -->
        <div style="display:flex;justify-content:center;padding:10px 0 4px;">
          <div style="width:36px;height:4px;border-radius:2px;background:#4b5563;"></div>
        </div>
        <!-- En-tête -->
        <div style="padding:8px 16px 12px;border-bottom:1px solid #374151;">
          <div style="font-weight:600;color:#fff;font-size:15px;">${escapeHtml(p.number)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${escapeHtml(p.clientName||'Client passager')} · ${formatCurrency(p.total)} · ${statusLabel}</div>
        </div>
        <!-- Actions -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 12px;">
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="PROFORMA._closeActionSheet();PROFORMA._pdfProforma('${p.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#374151;border:none;border-radius:12px;color:#e5e7eb;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;color:#818cf8;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            PDF
          </button>
          ${!converted ? `
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="PROFORMA._closeActionSheet();PROFORMA.changeStatus('${p.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#374151;border:none;border-radius:12px;color:#e5e7eb;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;color:#60a5fa;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
            Statut
          </button>
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="PROFORMA._closeActionSheet();PROFORMA.convertToSale('${p.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#14532d40;border:none;border-radius:12px;color:#4ade80;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
            Convertir
          </button>
          ` : ''}
          <button ontouchstart="this.style.opacity='.7'" ontouchend="this.style.opacity='1'"
            onclick="PROFORMA._closeActionSheet();PROFORMA.deleteProforma('${p.id}')"
            style="display:flex;align-items:center;gap:8px;padding:12px;background:#7f1d1d30;border:none;border-radius:12px;color:#f87171;font-size:13px;font-weight:500;cursor:pointer;text-align:left;">
            <svg style="width:18px;height:18px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
            Supprimer
          </button>
        </div>
        <!-- Fermer -->
        <div style="padding:0 12px 8px;">
          <button onclick="PROFORMA._closeActionSheet()"
            style="width:100%;padding:12px;background:#374151;border:none;border-radius:12px;color:#9ca3af;font-size:14px;cursor:pointer;">
            Annuler
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

  async _renderForm() {
    const produits = (await DB.getAll('produits')).filter(p => p.nom);
    const clients = await DB.getAll('clients');
    const defaultValidity = new Date(); defaultValidity.setDate(defaultValidity.getDate() + 30);

    document.getElementById('proforma-content').innerHTML = `
      <div class="flex flex-col lg:grid lg:grid-cols-2 gap-4">
        <!-- Produits -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="font-semibold text-white mb-3">Produits / Services</h3>
          <input id="pro-search" type="search" placeholder="Rechercher..." oninput="PROFORMA._filterProds()" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white mb-3">
          <div class="space-y-1 max-h-64 overflow-y-auto">
            ${produits.map(p => `
              <div class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700 cursor-pointer text-sm pro-item" data-search="${escapeHtml((p.nom+' '+p.category).toLowerCase())}" onclick="PROFORMA.addToCart('${p.id}')">
                <div>
                  <div class="text-white font-medium">${escapeHtml(p.nom)}</div>
                  <div class="text-xs text-gray-400">${formatCurrency(p.vente)}</div>
                </div>
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Devis -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="font-semibold text-white mb-3">Devis</h3>
          <div id="pro-cart" class="space-y-2 mb-3 max-h-40 overflow-y-auto"></div>

          <div class="border-t border-gray-700 pt-3 space-y-2">
            <div class="flex flex-wrap gap-2 items-center">
              <label class="text-xs text-gray-400 w-24 sm:w-28">Client</label>
              <select id="pro-client" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
                <option value="">Client passager</option>
                ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <label class="text-xs text-gray-400 w-24 sm:w-28">Client passager</label>
              <input id="pro-client-name" type="text" placeholder="Nom libre..." class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <label class="text-xs text-gray-400 w-24 sm:w-28">Remise</label>
              <input id="pro-remise" type="number" min="0" value="0" oninput="PROFORMA._updateTotal()" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <label class="text-xs text-gray-400 w-24 sm:w-28">Valide jusqu'au</label>
              <input id="pro-valid" type="date" value="${defaultValidity.toISOString().split('T')[0]}" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
            </div>
            <div>
              <label class="text-xs text-gray-400">Conditions / Remarques</label>
              <textarea id="pro-notes" rows="2" placeholder="Conditions de livraison, délais..." class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1"></textarea>
            </div>

            <div class="bg-gray-700/50 rounded-lg px-3 py-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Sous-total</span><span id="pro-subtotal" class="text-white">0</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Remise</span><span id="pro-remise-display" class="text-red-400">0</span>
              </div>
              <div class="flex justify-between font-bold mt-1">
                <span class="text-white">TOTAL</span><span id="pro-total" class="text-indigo-400 text-lg">0</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-3">
            <button onclick="PROFORMA._cart=[];PROFORMA._renderCart()" class="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Vider</button>
            <button onclick="PROFORMA.saveProforma()" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Enregistrer le devis</button>
          </div>
        </div>
      </div>
    `;
    this._renderCart();
    this._updateTotal();
    this._produits = produits;
  },

  _filterProds() {
    const search = document.getElementById('pro-search')?.value.toLowerCase() || '';
    document.querySelectorAll('.pro-item').forEach(el => {
      el.style.display = !search || el.dataset.search.includes(search) ? '' : 'none';
    });
  },

  async addToCart(productId) {
    const p = this._produits?.find(pr => pr.id === productId);
    if (!p) return;
    const existing = this._cart.find(i => i.productId === productId);
    if (existing) { existing.qty++; existing.total = existing.qty * existing.price; }
    else this._cart.push({ productId, nom: p.nom, unite: p.unite||'', price: p.vente, qty: 1, total: p.vente });
    this._renderCart();
    this._updateTotal();
  },

  _renderCart() {
    const el = document.getElementById('pro-cart');
    if (!el) return;
    if (!this._cart.length) { el.innerHTML = '<div class="text-gray-500 text-sm text-center py-3">Panier vide</div>'; return; }
    el.innerHTML = this._cart.map((item, i) => `
      <div class="flex items-center gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
        <div class="flex-1 text-sm">
          <div class="text-white truncate">${escapeHtml(item.nom)}</div>
          <div class="text-xs text-gray-400">${formatCurrency(item.price)} × ${item.qty}</div>
        </div>
        <input type="number" min="0.1" step="any" value="${item.price}" onchange="PROFORMA._updatePrice(${i},this.value)"
          class="w-20 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white">
        <div class="flex items-center gap-1">
          <button onclick="PROFORMA._changeQty(${i},-1)" class="w-6 h-6 bg-gray-600 rounded text-white text-xs">-</button>
          <span class="text-white text-xs w-5 text-center">${item.qty}</span>
          <button onclick="PROFORMA._changeQty(${i},1)" class="w-6 h-6 bg-gray-600 rounded text-white text-xs">+</button>
        </div>
        <button onclick="PROFORMA._remove(${i})" class="text-red-400 hover:text-red-300">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('');
  },

  _updatePrice(i, val) { this._cart[i].price = parseFloat(val)||0; this._cart[i].total = this._cart[i].price * this._cart[i].qty; this._renderCart(); this._updateTotal(); },
  _changeQty(i, d) { this._cart[i].qty = Math.max(0.1, this._cart[i].qty + d); this._cart[i].total = this._cart[i].price * this._cart[i].qty; this._renderCart(); this._updateTotal(); },
  _remove(i) { this._cart.splice(i, 1); this._renderCart(); this._updateTotal(); },

  _updateTotal() {
    const subtotal = this._cart.reduce((s, i) => s + i.total, 0);
    const remise = parseFloat(document.getElementById('pro-remise')?.value) || 0;
    const total = Math.max(0, subtotal - remise);
    if (document.getElementById('pro-subtotal')) document.getElementById('pro-subtotal').textContent = formatCurrency(subtotal);
    if (document.getElementById('pro-remise-display')) document.getElementById('pro-remise-display').textContent = formatCurrency(remise);
    if (document.getElementById('pro-total')) document.getElementById('pro-total').textContent = formatCurrency(total);
  },

  async saveProforma() {
    if (!this._cart.length) { showToast('Ajoutez au moins un produit', 'error'); return; }
    const clientId = document.getElementById('pro-client')?.value || '';
    let clientName = document.getElementById('pro-client-name')?.value.trim() || 'Client passager';
    if (clientId) {
      const c = await DB.get('clients', clientId);
      clientName = c?.name || clientName;
    }
    const subtotal = this._cart.reduce((s, i) => s + i.total, 0);
    const remise = parseFloat(document.getElementById('pro-remise')?.value) || 0;
    const total = Math.max(0, subtotal - remise);
    const existing = await DB.getAll('proformas');

    const pro = {
      id: genId('PRO'),
      number: genInvoiceNum('PRO', existing),
      date: new Date().toISOString(),
      clientId, clientName,
      items: this._cart.map(i => ({...i})),
      subtotal, remise, total,
      validUntil: document.getElementById('pro-valid')?.value || null,
      notes: document.getElementById('pro-notes')?.value.trim() || '',
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    await DB.put('proformas', pro);
    await SM.writeNow('proformas', pro.id, 'set', pro);
    await APP.addLog('SUCCESS', `Proforma créé: ${pro.number}`, { client: clientName, total });
    showToast(`Devis ${pro.number} enregistré`, 'success');

    showConfirm({
      title: 'Imprimer le devis ?',
      message: `${pro.number} — ${formatCurrency(total)}`,
      icon: 'success',
      confirmText: 'Imprimer',
      cancelText: 'Non merci',
      onConfirm: () => this.generatePDF(pro)
    });

    this._cart = [];
    this._view = 'list';
    this.render();
  },

  changeStatus(id) {
    const statuses = [['draft','Brouillon'],['sent','Envoyé'],['accepted','Accepté'],['rejected','Refusé']];
    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-4">Changer le statut</h3>
        <div class="space-y-2">
          ${statuses.map(([v, l]) => `
            <button onclick="PROFORMA._setStatus('${id}','${v}')" class="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-left text-white text-sm">${l}</button>
          `).join('')}
        </div>
        <button onclick="closeModal()" class="mt-3 w-full py-2 bg-gray-800 text-gray-400 rounded-lg text-sm">Annuler</button>
      </div>
    `, { size: 'max-w-xs' });
  },

  async _setStatus(id, status) {
    const p = await DB.get('proformas', id);
    if (!p) return;
    p.status = status;
    closeModal();
    await DB.put('proformas', p);
    await SM.writeNow('proformas', id, 'set', p);
    showToast('Statut mis à jour', 'success');
    this._renderList();
  },

  async convertToSale(proformaId) {
    const pro = await DB.get('proformas', proformaId);
    if (!pro) return;
    showConfirm({
      title: 'Convertir en vente',
      message: `Convertir ${pro.number} en vente ? Une facture sera créée.`,
      icon: 'info',
      confirmText: 'Convertir',
      onConfirm: async () => {
        // Préparer le cart dans SALES et basculer
        SALES._cart = pro.items.map(i => ({...i}));
        pro.status = 'converted';
        await DB.put('proformas', pro);
        await SM.writeNow('proformas', pro.id, 'set', pro);
        await APP.addLog('INFO', `Proforma converti: ${pro.number}`);
        showToast(`Devis converti — complétez la vente`, 'info');
        APP.switchTab('sales');
      }
    });
  },

  async deleteProforma(id) {
    const p = await DB.get('proformas', id);
    showConfirm({
      title: 'Supprimer devis',
      message: `Supprimer ${p?.number} ?`,
      icon: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await DB.delete('proformas', id);
        await SM.writeNow('proformas', id, 'delete');
        showToast('Devis supprimé', 'success');
        this._renderList();
      }
    });
  },

  generatePDF(pro) {
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

    doc.setTextColor(99, 102, 241);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('PROFORMA', pageW - 14, 16, { align: 'right' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200);
    doc.text(pro.number, pageW - 14, 24, { align: 'right' });
    doc.text(formatDate(pro.date), pageW - 14, 30, { align: 'right' });
    if (pro.validUntil) doc.text('Valable jusqu\'au: ' + formatDate(pro.validUntil), pageW - 14, 36, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('Destinataire :', 14, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(pro.clientName || 'Client passager', 14, 62);

    doc.autoTable({
      startY: 72,
      head: [['Désignation', 'Qté', 'Prix unitaire', 'Total']],
      body: (pro.items || []).map(i => [i.nom, i.qty + (i.unite ? ' ' + i.unite : ''), formatCurrency(i.price), formatCurrency(i.total)]),
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
    doc.text('Sous-total:', rightX - 50, finalY, { align: 'right' }); doc.text(formatCurrency(pro.subtotal), rightX, finalY, { align: 'right' });
    if (pro.remise > 0) {
      doc.setTextColor(200, 50, 50);
      doc.text('Remise:', rightX - 50, finalY + 7, { align: 'right' }); doc.text('-' + formatCurrency(pro.remise), rightX, finalY + 7, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('TOTAL:', rightX - 50, finalY + 15, { align: 'right' }); doc.text(formatCurrency(pro.total), rightX, finalY + 15, { align: 'right' });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('Arrêté à : ' + amountToWords(pro.total) + ' ' + (config.currency || 'Ariary'), 14, finalY + 25);

    if (pro.notes) {
      doc.text('Conditions :', 14, finalY + 35);
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(pro.notes, pageW - 28);
      doc.text(lines, 14, finalY + 42);
    }

    if (config.bankInfo) {
      const bankY = finalY + (pro.notes ? 55 : 35);
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold');
      doc.text('Informations bancaires :', 14, bankY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(config.bankInfo, 14, bankY + 6);
    }

    doc.save(`Proforma_${pro.number}.pdf`);
  },

  async _pdfProforma(proformaId) {
    const pro = await DB.get('proformas', proformaId);
    if (pro) this.generatePDF(pro);
    else showToast('Devis introuvable', 'error');
  }
};
