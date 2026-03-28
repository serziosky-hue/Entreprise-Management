// stocks.js — Gestion du stock (v2)
'use strict';

window.STOCKS = {
  _page: 1, _perPage: 20,
  _search: '', _cat: '', _sortKey: 'nom', _sortDir: 1,

  // ─── Détection service / productivité ────────────────────────────────────────
  isService(produit) {
    if (!produit) return false;
    const cat = (produit.category || '').toLowerCase();
    return cat.includes('service') || cat.includes('productivité') || cat.includes('productivite');
  },

  // ─── Rendu principal ──────────────────────────────────────────────────────────
  async render() {
    const el = document.getElementById('tab-stock');
    if (!el) return;
    try {
      let items = await DB.getAll('produits');

      // Filtres
      if (this._search) {
        const s = this._search.toLowerCase();
        items = items.filter(p =>
          (p.nom||'').toLowerCase().includes(s) ||
          (p.fournisseur||'').toLowerCase().includes(s) ||
          (p.category||'').toLowerCase().includes(s)
        );
      }
      if (this._cat) items = items.filter(p => p.category === this._cat);

      // Tri
      items.sort((a, b) => {
        const av = a[this._sortKey] ?? '', bv = b[this._sortKey] ?? '';
        return typeof av === 'number'
          ? (av - bv) * this._sortDir
          : String(av).localeCompare(String(bv)) * this._sortDir;
      });

      const total = items.length;
      const start = (this._page - 1) * this._perPage;
      const paginated = items.slice(start, start + this._perPage);

      const cats = APP.config?.categories?.products || ['Électronique','Mobilier','Fournitures','Alimentaire','Service','Productivité','Autre'];
      const canAdd = APP.canDo('stockAdd');
      const canEdit = APP.canDo('stockEdit');
      const canDel = APP.canDo('stockDelete');
      const canAdj = APP.canDo('stockAdjust');

      // Stats rapides
      const allItems = await DB.getAll('produits');
      const totalProduits = allItems.filter(p => !this.isService(p)).length;
      const totalServices = allItems.filter(p => this.isService(p)).length;
      const enRupture = allItems.filter(p => !this.isService(p) && p.stock <= 0).length;
      const stockBas = allItems.filter(p => !this.isService(p) && p.stock > 0 && p.min > 0 && p.stock <= p.min).length;
      const valeurStock = allItems.filter(p => !this.isService(p)).reduce((s, p) => s + ((p.stock||0) * (p.cout||0)), 0);

      el.innerHTML = `
        <div class="p-4 space-y-3">

          <!-- Stats : compact 4 col mobile / large 4 col desktop -->
          <div class="grid grid-cols-4 sm:hidden gap-1.5">
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-base font-bold text-white">${totalProduits}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Produits</div>
            </div>
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-base font-bold text-purple-400">${totalServices}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Services</div>
            </div>
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-base font-bold ${enRupture > 0 ? 'text-red-400' : 'text-gray-400'}">${enRupture}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Rupture</div>
            </div>
            <div class="bg-gray-800 rounded-lg py-2 px-1 border border-gray-700 text-center">
              <div class="text-xs font-bold text-yellow-400 leading-tight truncate">${formatCurrency(valeurStock)}</div>
              <div class="text-xs text-gray-500 leading-tight mt-0.5">Valeur</div>
            </div>
          </div>
          <div class="hidden sm:grid sm:grid-cols-4 gap-2">
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-lg font-bold text-white">${totalProduits}</div>
              <div class="text-xs text-gray-400">Produits physiques</div>
            </div>
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-lg font-bold text-purple-400">${totalServices}</div>
              <div class="text-xs text-gray-400">Services</div>
            </div>
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-lg font-bold ${enRupture > 0 ? 'text-red-400' : 'text-gray-400'}">${enRupture}</div>
              <div class="text-xs text-gray-400">En rupture</div>
            </div>
            <div class="bg-gray-800 rounded-xl p-3 border border-gray-700 text-center">
              <div class="text-base font-bold text-yellow-400">${formatCurrency(valeurStock)}</div>
              <div class="text-xs text-gray-400">Valeur stock</div>
            </div>
          </div>

          <!-- Actions mobile : titre + Ajouter / secondaires en petits boutons -->
          <div class="sm:hidden space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-base font-semibold text-white">Inventaire (${total})</h2>
              ${canAdd ? `
              <button onclick="STOCKS.showForm()" class="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Ajouter
              </button>` : ''}
            </div>
            <div class="flex gap-1.5 flex-wrap">
              ${canAdj ? `
              <button onclick="STOCKS._quickAdjust()" class="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg text-xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/></svg>
                Ajuster
              </button>` : ''}
              <button onclick="STOCKS.exportPDF()" class="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                PDF
              </button>
              <button onclick="STOCKS.exportCSV()" class="flex items-center gap-1 px-2.5 py-1.5 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                CSV
              </button>
              <label class="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-xs cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                Importer
                <input type="file" accept=".csv" class="hidden" onchange="STOCKS.importCSV(this)">
              </label>
            </div>
          </div>

          <!-- Actions desktop : titre + tous les boutons -->
          <div class="hidden sm:flex items-center justify-between gap-2 flex-wrap">
            <h2 class="text-lg font-bold text-white">Inventaire (${total})</h2>
            <div class="flex gap-2 flex-wrap">
              ${canAdd ? `
              <button onclick="STOCKS.showForm()" class="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Ajouter
              </button>` : ''}
              ${canAdj ? `
              <button onclick="STOCKS._quickAdjust()" class="flex items-center gap-1.5 px-3 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg hover:bg-yellow-600/30 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/></svg>
                Ajuster
              </button>` : ''}
              <button onclick="STOCKS.exportPDF()" class="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                PDF
              </button>
              <button onclick="STOCKS.exportCSV()" class="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/30 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                CSV
              </button>
              <label class="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30 text-sm cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                Importer
                <input type="file" accept=".csv" class="hidden" onchange="STOCKS.importCSV(this)">
              </label>
            </div>
          </div>

          <!-- Recherche + Filtre catégorie + Tri — une seule ligne -->
          <div class="flex gap-1.5 sm:gap-2">
            <input type="search" value="${escapeHtml(this._search)}" placeholder="Rechercher..."
              oninput="STOCKS._search=this.value;STOCKS._page=1;STOCKS.render()"
              class="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400">
            <select onchange="STOCKS._cat=this.value;STOCKS._page=1;STOCKS.render()"
              class="bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white w-28 sm:w-44">
              <option value="">Toutes cat.</option>
              <option value="__services__" ${this._cat==='__services__'?'selected':''}>🔧 Services</option>
              <option value="__produits__" ${this._cat==='__produits__'?'selected':''}>📦 Physiques</option>
              ${cats.map(c => `<option value="${escapeHtml(c)}" ${this._cat===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
            </select>
            <select onchange="const [k,d]=this.value.split('_');STOCKS._sortKey=k;STOCKS._sortDir=parseInt(d);STOCKS._page=1;STOCKS.render()"
              class="bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-sm text-white w-24 sm:w-36">
              <option value="nom_1"        ${this._sortKey==='nom'       &&this._sortDir===1  ?'selected':''}>Nom A-Z</option>
              <option value="nom_-1"       ${this._sortKey==='nom'       &&this._sortDir===-1 ?'selected':''}>Nom Z-A</option>
              <option value="stock_1"      ${this._sortKey==='stock'     &&this._sortDir===1  ?'selected':''}>Stock ↑</option>
              <option value="stock_-1"     ${this._sortKey==='stock'     &&this._sortDir===-1 ?'selected':''}>Stock ↓</option>
              <option value="vente_1"      ${this._sortKey==='vente'     &&this._sortDir===1  ?'selected':''}>Prix ↑</option>
              <option value="vente_-1"     ${this._sortKey==='vente'     &&this._sortDir===-1 ?'selected':''}>Prix ↓</option>
              <option value="createdAt_-1" ${this._sortKey==='createdAt' &&this._sortDir===-1 ?'selected':''}>Récent</option>
              <option value="createdAt_1"  ${this._sortKey==='createdAt' &&this._sortDir===1  ?'selected':''}>Ancien</option>
            </select>
            ${stockBas > 0 ? `
            <button onclick="STOCKS._cat='';STOCKS._search='';STOCKS._filterAlerts=!STOCKS._filterAlerts;STOCKS.render()"
              title="Alertes stock" class="flex-shrink-0 px-2 sm:px-3 py-2 ${this._filterAlerts ? 'bg-yellow-600 text-white' : 'bg-yellow-600/20 text-yellow-400'} rounded-lg text-sm whitespace-nowrap">
              ⚠ ${stockBas + enRupture}
            </button>` : ''}
          </div>

          <!-- Tableau desktop -->
          <div class="hidden sm:block overflow-x-auto rounded-xl border border-gray-700">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-800 border-b border-gray-700 text-left">
                  ${[['nom','Produit'],['category','Catégorie'],['cout','Prix achat'],['vente','Prix vente'],['stock','Stock'],['min','Seuil'],['unite','Unité']].map(([k,l]) =>
                    `<th class="px-3 py-2.5 text-gray-400 font-medium cursor-pointer hover:text-white whitespace-nowrap" onclick="STOCKS._sort('${k}')">${l}${this._sortKey===k?` ${this._sortDir>0?'↑':'↓'}`:''}</th>`
                  ).join('')}
                  <th class="px-3 py-2.5 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${paginated.length
                  ? paginated.map((p, i) => this._rowHtml(p, canEdit, canDel, canAdj, i)).join('')
                  : `<tr><td colspan="8" class="py-8 text-center text-gray-500">Aucun produit trouvé</td></tr>`
                }
              </tbody>
            </table>
          </div>

          <!-- Cards mobile -->
          <div class="sm:hidden space-y-2">
            ${paginated.length
              ? paginated.map(p => this._cardHtml(p, canEdit, canDel, canAdj)).join('')
              : '<div class="py-8 text-center text-gray-500">Aucun produit trouvé</div>'
            }
          </div>

          ${buildPagination(total, this._page, this._perPage, 'p => { STOCKS._page=p; STOCKS.render(); }')}
        </div>
      `;

      // Appliquer le filtre alertes si actif
      if (this._filterAlerts) this._applyAlertsFilter();

    } catch (e) {
      console.error('Stocks error:', e);
      document.getElementById('tab-stock').innerHTML = `<div class="p-4 text-red-400">Erreur: ${escapeHtml(e.message)}</div>`;
    }
  },

  _filterAlerts: false,

  _applyAlertsFilter() {
    // filtre visuel sur les lignes du tableau
  },

  _sort(key) {
    if (this._sortKey === key) this._sortDir *= -1;
    else { this._sortKey = key; this._sortDir = 1; }
    this.render();
  },

  _rowHtml(p, canEdit, canDel, canAdj, idx) {
    const isService = this.isService(p);
    let stockClass, stockLabel;
    if (isService) {
      stockClass = 'text-purple-400';
      stockLabel = '∞ service';
    } else if (p.stock <= 0) {
      stockClass = 'text-red-400';
      stockLabel = p.stock;
    } else if (p.min > 0 && p.stock <= p.min) {
      stockClass = 'text-yellow-400';
      stockLabel = p.stock;
    } else {
      stockClass = 'text-green-400';
      stockLabel = p.stock;
    }

    const rowBg = idx % 2 === 0 ? '' : 'bg-gray-800/30';

    return `
      <tr class="border-b border-gray-700/40 hover:bg-indigo-600/5 transition-colors ${rowBg}">
        <td class="px-3 py-2.5">
          <div class="font-medium text-white flex items-center gap-1.5">
            ${isService ? '<span class="text-purple-400 text-xs bg-purple-400/10 px-1.5 py-0.5 rounded font-medium">SERVICE</span>' : ''}
            ${escapeHtml(p.nom)}
          </div>
          ${p.fournisseur ? `<div class="text-xs text-gray-500">${escapeHtml(p.fournisseur)}</div>` : ''}
        </td>
        <td class="px-3 py-2.5 text-gray-400 text-xs">${escapeHtml(p.category||'—')}</td>
        <td class="px-3 py-2.5 text-gray-300 text-xs">${formatCurrency(p.cout)}</td>
        <td class="px-3 py-2.5 text-white font-semibold">${formatCurrency(p.vente)}</td>
        <td class="px-3 py-2.5">
          <span class="${stockClass} font-bold">${stockLabel}</span>
          ${!isService && p.min > 0 ? `<div class="text-xs text-gray-500">min: ${p.min}</div>` : ''}
        </td>
        <td class="px-3 py-2.5 text-gray-500 text-xs">${!isService && p.min > 0 ? p.min : '—'}</td>
        <td class="px-3 py-2.5 text-gray-500 text-xs">${escapeHtml(p.unite||'—')}</td>
        <td class="px-3 py-2.5">
          <div class="flex gap-1 items-center flex-nowrap">
            ${canAdj && !isService ? `
            <button onclick="STOCKS._adjIn('${p.id}')" title="Ajouter stock" class="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15"/></svg>
            </button>
            <button onclick="STOCKS._adjOut('${p.id}')" title="Retirer stock" class="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 rounded transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0 9l-3 3m0 0l-3-3m3 3V3"/></svg>
            </button>` : ''}
            <button onclick="STOCKS.showHistory('${p.id}')" title="Historique" class="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </button>
            <button onclick="STOCKS.quickSale('${p.id}')" title="Vente rapide" class="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
            </button>
            ${canEdit ? `
            <button onclick="STOCKS.showForm('${p.id}')" title="Modifier" class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-400/10 rounded transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
            </button>
            <button onclick="STOCKS.duplicateProduct('${p.id}')" title="Dupliquer" class="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 rounded transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/></svg>
            </button>` : ''}
            ${canDel ? `
            <button onclick="STOCKS.confirmDelete('${p.id}')" title="Supprimer" class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  _cardHtml(p) {
    const isService = this.isService(p);
    let stockClass, stockLabel;
    if (isService) { stockClass = 'text-purple-400'; stockLabel = '∞'; }
    else if (p.stock <= 0) { stockClass = 'text-red-400'; stockLabel = p.stock; }
    else if (p.min > 0 && p.stock <= p.min) { stockClass = 'text-yellow-400'; stockLabel = p.stock; }
    else { stockClass = 'text-green-400'; stockLabel = p.stock; }

    const alertBadge = !isService && p.stock <= 0
      ? '<span class="text-xs bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-medium">Rupture</span>'
      : (!isService && p.min > 0 && p.stock <= p.min
          ? '<span class="text-xs bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded font-medium">Stock bas</span>'
          : '');

    const meta = [p.category ? escapeHtml(p.category) : '', p.fournisseur ? escapeHtml(p.fournisseur) : ''].filter(Boolean).join(' · ');
    const stockValue = !isService ? formatCurrency((p.stock||0)*(p.cout||0)) : null;

    return `
      <div class="bg-gray-800 rounded-xl border border-gray-700 px-3 py-2.5 active:bg-gray-750 transition-colors">
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0">
            <!-- Ligne 1 : badges + nom + stock qty -->
            <div class="flex items-center gap-1 min-w-0">
              ${isService ? '<span class="flex-shrink-0 text-xs bg-purple-400/10 text-purple-400 px-1 py-0.5 rounded font-medium">SVC</span>' : ''}
              ${alertBadge}
              <span class="font-semibold text-white truncate flex-1 mx-0.5">${escapeHtml(p.nom)}</span>
              <span class="${stockClass} font-bold text-sm flex-shrink-0 ml-1">${stockLabel}${p.unite ? ' <span class="text-xs font-normal text-gray-500">'+escapeHtml(p.unite)+'</span>' : ''}</span>
            </div>
            <!-- Ligne 2 : catégorie · fournisseur · vente · achat · valeur -->
            <div class="flex items-center gap-1.5 mt-0.5 text-xs flex-wrap leading-tight">
              ${meta ? `<span class="text-gray-500">${meta}</span><span class="text-gray-700">·</span>` : ''}
              <span class="text-white font-medium">${formatCurrency(p.vente)}</span>
              ${!isService ? `<span class="text-gray-600">Achat: ${formatCurrency(p.cout)}</span>` : ''}
              ${stockValue ? `<span class="text-gray-600">Val: ${stockValue}</span>` : ''}
            </div>
          </div>
          <!-- Bouton actions contextuel -->
          <button onclick="event.stopPropagation();STOCKS._openActionSheet('${p.id}')"
            class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-700/60 text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors touch-action-none"
            title="Actions" style="-webkit-tap-highlight-color:transparent;">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  // ─── Bottom sheet d'actions (mobile) ─────────────────────────────────────────
  async _openActionSheet(productId) {
    const p = await DB.get('produits', productId);
    if (!p) return;
    const isService = this.isService(p);
    const canEdit = APP.canDo('stockEdit');
    const canDel  = APP.canDo('stockDelete');
    const canAdj  = APP.canDo('stockAdjust');
    const canSell = APP.canDo('salesCreate');

    this._closeActionSheet();

    let stockColor = '#4ade80', stockLabel = `${p.stock} ${p.unite||''}`;
    if (isService)                              { stockColor = '#c084fc'; stockLabel = '∞ service'; }
    else if (p.stock <= 0)                      { stockColor = '#f87171'; stockLabel = `Rupture`; }
    else if (p.min > 0 && p.stock <= p.min)    { stockColor = '#fbbf24'; }

    const actions = [
      canEdit ? { svg: '<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>', label: 'Modifier', color: '#94a3b8', fn: `STOCKS.showForm('${productId}')` } : null,
      canAdj && !isService ? { svg: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15"/>', label: 'Ajouter stock', color: '#4ade80', fn: `STOCKS._adjIn('${productId}')` } : null,
      canAdj && !isService ? { svg: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0 9l-3 3m0 0l-3-3m3 3V3"/>', label: 'Retirer stock', color: '#fb923c', fn: `STOCKS._adjOut('${productId}')` } : null,
      { svg: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>', label: 'Historique', color: '#60a5fa', fn: `STOCKS.showHistory('${productId}')` },
      canSell ? { svg: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>', label: 'Vente rapide', color: '#34d399', fn: `STOCKS.quickSale('${productId}')` } : null,
      canEdit ? { svg: '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>', label: 'Dupliquer', color: '#c084fc', fn: `STOCKS.duplicateProduct('${productId}')` } : null,
      canDel  ? { svg: '<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>', label: 'Supprimer', color: '#f87171', fn: `STOCKS.confirmDelete('${productId}')` } : null,
    ].filter(Boolean);

    const backdrop = document.createElement('div');
    backdrop.id = 'sas-backdrop';
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1200;opacity:0;transition:opacity .2s ease';
    backdrop.onclick = () => this._closeActionSheet();
    document.body.appendChild(backdrop);

    const sheet = document.createElement('div');
    sheet.id = 'sas-sheet';
    sheet.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1e293b;border-top:1px solid #334155;border-radius:1.25rem 1.25rem 0 0;z-index:1201;transform:translateY(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);padding:0 1rem 2rem;max-height:85dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;';

    sheet.innerHTML = `
      <div style="display:flex;justify-content:center;padding:.75rem 0 .25rem;">
        <div style="width:2.5rem;height:.25rem;background:#475569;border-radius:99px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:.25rem 0 1rem;border-bottom:1px solid #1e293b;">
        <div>
          <div style="color:#f1f5f9;font-weight:700;font-size:1rem;">${escapeHtml(p.nom)}</div>
          <div style="color:#64748b;font-size:.75rem;">${escapeHtml(p.category||'')}${isService ? ' · Service' : ''}</div>
        </div>
        <span style="color:${stockColor};font-weight:700;font-size:1rem;padding:.25rem .75rem;background:${stockColor}18;border-radius:.5rem;">${stockLabel}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.625rem;margin-top:.875rem;">
        ${actions.map(a => `
          <button onclick="STOCKS._closeActionSheet();setTimeout(()=>{${a.fn}},40)"
            style="display:flex;align-items:center;gap:.625rem;background:#0f172a;border:1px solid #1e293b;border-radius:.875rem;padding:.875rem;min-height:3.75rem;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .12s;"
            ontouchstart="this.style.background='#1e293b';this.style.borderColor='#334155'"
            ontouchend="this.style.background='#0f172a';this.style.borderColor='#1e293b'">
            <svg style="width:1.375rem;height:1.375rem;flex-shrink:0;color:${a.color};" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">${a.svg}</svg>
            <span style="color:${a.color};font-size:.875rem;font-weight:600;line-height:1.2;">${a.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    document.body.appendChild(sheet);
    requestAnimationFrame(() => { backdrop.style.opacity = '1'; sheet.style.transform = 'translateY(0)'; });
  },

  _closeActionSheet() {
    const b = document.getElementById('sas-backdrop');
    const s = document.getElementById('sas-sheet');
    if (s) { s.style.transform = 'translateY(100%)'; setTimeout(() => s?.remove(), 280); }
    if (b) { b.style.opacity  = '0';                setTimeout(() => b?.remove(), 200); }
  },

  // ─── Formulaire ajout/modification ───────────────────────────────────────────
  async showForm(id = null) {
    const p = id ? await DB.get('produits', id) : null;
    const cats = APP.config?.categories?.products || ['Électronique','Mobilier','Fournitures','Alimentaire','Service','Productivité','Autre'];
    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-4">${id ? 'Modifier produit' : 'Nouveau produit / service'}</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="text-xs text-gray-400">Nom *</label>
            <input id="p-nom" type="text" value="${escapeHtml(p?.nom||'')}" placeholder="Nom du produit ou service"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Catégorie</label>
            <select id="p-cat" onchange="STOCKS._onCatChange()" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              ${cats.map(c => `<option value="${escapeHtml(c)}" ${(p?.category||'Autre')===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-400">Fournisseur</label>
            <input id="p-fournisseur" type="text" value="${escapeHtml(p?.fournisseur||'')}" placeholder="Optionnel"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Prix d'achat / coût</label>
            <input id="p-cout" type="number" min="0" step="any" value="${p?.cout||0}"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Prix de vente *</label>
            <input id="p-vente" type="number" min="0" step="any" value="${p?.vente||0}"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div id="p-stock-group">
            <label class="text-xs text-gray-400">Stock actuel</label>
            <input id="p-stock" type="number" min="0" step="any" value="${p?.stock||0}"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div id="p-min-group">
            <label class="text-xs text-gray-400">Stock minimum (seuil alerte)</label>
            <input id="p-min" type="number" min="0" step="any" value="${p?.min||0}"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
          <div>
            <label class="text-xs text-gray-400">Unité</label>
            <input id="p-unite" type="text" value="${escapeHtml(p?.unite||'')}" placeholder="pcs, kg, m, heure..."
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>
        </div>
        <div id="p-service-notice" class="hidden mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-purple-300">
          ✦ Ce produit est identifié comme <strong>service</strong> — il peut être vendu sans limite de stock et ne consomme pas d'inventaire physique.
        </div>
        <div class="flex gap-3 mt-4">
          <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm">Annuler</button>
          <button onclick="STOCKS.saveProduct('${id||''}')" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Enregistrer</button>
        </div>
      </div>
    `);
    // Mettre à jour l'affichage selon la catégorie actuelle
    this._onCatChange();
  },

  _onCatChange() {
    const cat = document.getElementById('p-cat')?.value || '';
    const isService = cat.toLowerCase().includes('service') || cat.toLowerCase().includes('productivité') || cat.toLowerCase().includes('productivite');
    const notice = document.getElementById('p-service-notice');
    const stockGroup = document.getElementById('p-stock-group');
    const minGroup = document.getElementById('p-min-group');
    if (notice) notice.classList.toggle('hidden', !isService);
    if (stockGroup) stockGroup.style.opacity = isService ? '0.4' : '1';
    if (minGroup) minGroup.style.opacity = isService ? '0.4' : '1';
  },

  async saveProduct(id) {
    const nom = document.getElementById('p-nom').value.trim();
    if (nom.length < 1) { showToast('Nom requis', 'error'); return; }
    const vente = parseFloat(document.getElementById('p-vente').value) || 0;
    if (vente < 0) { showToast('Prix de vente invalide', 'error'); return; }

    const now = new Date().toISOString();
    const existing = id ? await DB.get('produits', id) : null;
    const product = {
      id: id || genId('PROD'),
      nom,
      category: document.getElementById('p-cat').value,
      fournisseur: document.getElementById('p-fournisseur').value.trim(),
      cout: parseFloat(document.getElementById('p-cout').value) || 0,
      vente,
      stock: parseFloat(document.getElementById('p-stock').value) || 0,
      min: parseFloat(document.getElementById('p-min').value) || 0,
      unite: document.getElementById('p-unite').value.trim(),
      createdAt: existing?.createdAt || now,
      lastModified: now
    };

    closeModal();
    await DB.put('produits', product);
    await SM.writeNow('produits', product.id, 'set', product);
    await APP.addLog('SUCCESS', `${id ? 'Produit modifié' : 'Produit ajouté'}: ${product.nom}`, { id: product.id });
    showToast(`Produit ${id ? 'modifié' : 'ajouté'}`, 'success');
    await this.render();
    APP.refreshBadges();
  },

  // ─── Ajustement rapide (sans produit pré-sélectionné) ────────────────────────
  async _quickAdjust() {
    const items = (await DB.getAll('produits')).filter(p => !this.isService(p));
    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-4">Ajustement stock rapide</h3>
        <div class="mb-3">
          <label class="text-xs text-gray-400">Produit *</label>
          <select id="qa-product" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            <option value="">Sélectionner...</option>
            ${items.map(p => `<option value="${p.id}">${escapeHtml(p.nom)} (stock: ${p.stock} ${escapeHtml(p.unite||'')})</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-3">
          <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
          <button onclick="const id=document.getElementById('qa-product').value;if(!id){showToast('Choisir un produit','error');return;}closeModal();STOCKS.showAdjust(id);" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Continuer</button>
        </div>
      </div>
    `, { size: 'max-w-sm' });
  },

  // ─── Modal d'ajustement ───────────────────────────────────────────────────────
  async showAdjust(id) {
    const p = await DB.get('produits', id);
    if (!p) return;
    if (this.isService(p)) { showToast('Les services ne nécessitent pas d\'ajustement de stock', 'info'); return; }

    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-1">Ajustement de stock</h3>
        <p class="text-gray-400 text-sm mb-4">
          <span class="font-medium text-white">${escapeHtml(p.nom)}</span>
          — Stock actuel : <span class="text-white font-bold">${p.stock} ${escapeHtml(p.unite||'')}</span>
        </p>

        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-400">Type d'opération *</label>
            <select id="adj-type" onchange="STOCKS._updateAdjCalc('${p.id}',${p.cout||0},${p.stock})"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
              <option value="entree">📥 Entrée (+) — Achat / réception de marchandise</option>
              <option value="sortie">📤 Sortie (-) — Perte / casse / correction</option>
              <option value="absolu">🔄 Remise à niveau — Résultat d'inventaire</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-400">Quantité *</label>
              <input id="adj-qty" type="number" min="0" step="any" value="0"
                oninput="STOCKS._updateAdjCalc('${p.id}',${p.cout||0},${p.stock})"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div>
              <label class="text-xs text-gray-400">Prix d'achat unitaire</label>
              <input id="adj-price" type="number" min="0" step="any" value="${p.cout||0}"
                oninput="STOCKS._updateAdjCalc('${p.id}',null,${p.stock})"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
          </div>

          <div>
            <label class="text-xs text-gray-400">Raison / Description *</label>
            <input id="adj-raison" type="text" placeholder="Ex: Achat fournisseur Janvier, Inventaire, Retour client..."
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>

          <div>
            <label class="text-xs text-gray-400">Fournisseur (optionnel)</label>
            <input id="adj-fournisseur" type="text" value="${escapeHtml(p.fournisseur||'')}" placeholder="Nom du fournisseur"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
          </div>

          <!-- Récapitulatif -->
          <div id="adj-summary" class="bg-gray-700/50 rounded-xl p-3 space-y-1.5 text-sm"></div>

          <!-- Option dépense pour les entrées -->
          <div id="adj-expense-opt" class="hidden bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="adj-create-dep" checked class="rounded">
              <div>
                <div class="text-white text-sm font-medium">Créer une dépense d'achat</div>
                <div class="text-xs text-gray-400">Enregistrer automatiquement cet achat dans les dépenses</div>
              </div>
            </label>
          </div>
        </div>

        <div class="flex gap-3 mt-4">
          <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
          <button onclick="STOCKS.applyAdjust('${id}')" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Appliquer</button>
        </div>
      </div>
    `);
    this._updateAdjCalc(p.id, p.cout || 0, p.stock);
  },

  _updateAdjCalc(productId, cout, currentStock) {
    const type = document.getElementById('adj-type')?.value;
    const qty = parseFloat(document.getElementById('adj-qty')?.value) || 0;
    const price = parseFloat(document.getElementById('adj-price')?.value) ?? (cout || 0);
    const summary = document.getElementById('adj-summary');
    const expOpt = document.getElementById('adj-expense-opt');
    if (!summary) return;

    let newStock;
    if (type === 'entree') newStock = currentStock + qty;
    else if (type === 'sortie') newStock = Math.max(0, currentStock - qty);
    else newStock = qty;

    const totalCost = qty * price;
    const arrow = type === 'entree' ? '↑' : type === 'sortie' ? '↓' : '=';
    const arrowColor = type === 'entree' ? 'text-green-400' : type === 'sortie' ? 'text-red-400' : 'text-yellow-400';

    summary.innerHTML = `
      <div class="flex justify-between">
        <span class="text-gray-400">Nouveau stock</span>
        <span class="${arrowColor} font-bold">${currentStock} ${arrow} <strong>${newStock}</strong></span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400">Coût total</span>
        <span class="text-white font-semibold">${formatCurrency(totalCost)}</span>
      </div>
    `;

    // Afficher l'option dépense uniquement pour les entrées
    if (expOpt) expOpt.classList.toggle('hidden', type !== 'entree');
  },

  async applyAdjust(productId) {
    const type = document.getElementById('adj-type').value;
    const qty = parseFloat(document.getElementById('adj-qty').value) || 0;
    const price = parseFloat(document.getElementById('adj-price').value) || 0;
    const raison = document.getElementById('adj-raison').value.trim();
    const fournisseur = document.getElementById('adj-fournisseur').value.trim();
    const createDep = type === 'entree' && document.getElementById('adj-create-dep')?.checked;

    if (!raison) { showToast('Raison obligatoire', 'error'); return; }
    if (qty < 0) { showToast('Quantité invalide', 'error'); return; }

    const p = await DB.get('produits', productId);
    if (!p) return;
    const oldStock = p.stock;
    let newStock;
    if (type === 'entree') newStock = oldStock + qty;
    else if (type === 'sortie') newStock = Math.max(0, oldStock - qty);
    else newStock = qty;

    p.stock = newStock;
    if (fournisseur) p.fournisseur = fournisseur;
    if (price > 0 && type === 'entree') p.cout = price; // Mettre à jour le prix d'achat si nouvelle valeur
    p.lastModified = new Date().toISOString();

    const movement = {
      id: genId('MOV'),
      productId, productName: p.nom,
      type, quantity: qty, oldStock, newStock,
      raison, fournisseur,
      price, cost: qty * price,
      date: new Date().toISOString()
    };

    closeModal();

    // Sauvegarder produit
    await DB.put('produits', p);
    await SM.writeNow('produits', productId, 'set', p);

    // Sauvegarder mouvement (max 500)
    const allMovs = await DB.getAll('stockMovements');
    if (allMovs.length >= 500) {
      const oldest = [...allMovs].sort((a, b) => a.date < b.date ? -1 : 1)[0];
      await DB.delete('stockMovements', oldest.id);
    }
    await DB.put('stockMovements', movement);
    await SM.writeNow('stockMovements', movement.id, 'set', movement);

    // ✦ Créer une dépense automatiquement pour les achats de stock
    if (createDep && qty > 0 && price > 0) {
      const totalCost = qty * price;
      const cats = APP.config?.categories?.expenses || ['Fournitures','Autre'];
      const depCat = cats.find(c => c.toLowerCase().includes('achat') || c.toLowerCase().includes('stock') || c.toLowerCase().includes('fournitures')) || cats[0] || 'Fournitures';
      const dep = {
        id: genId('DEP'),
        motif: `Achat stock : ${p.nom}${fournisseur ? ` (${fournisseur})` : ''} — ${qty} ${p.unite||'u'} × ${formatCurrency(price)}`,
        amount: totalCost,
        date: new Date().toISOString().split('T')[0],
        category: depCat,
        paymentMode: 'Espèces',
        notes: raison,
        amortized: false,
        sourceType: 'achat_stock',
        productId,
        createdAt: new Date().toISOString()
      };
      await DB.put('depenses', dep);
      await SM.writeNow('depenses', dep.id, 'set', dep);
      showToast(`Stock mis à jour + dépense de ${formatCurrency(totalCost)} créée`, 'success');
    } else {
      showToast(`Stock mis à jour : ${oldStock} → ${newStock} ${p.unite||''}`, 'success');
    }

    await APP.addLog('INFO', `Stock ajusté: ${p.nom} (${type}) ${oldStock} → ${newStock}`, { cost: qty * price });
    this.render();
    APP.refreshBadges();
  },

  // ─── Historique mouvements ────────────────────────────────────────────────────
  async showHistory(productId) {
    const p = await DB.get('produits', productId);
    const allMovs = await DB.getAll('stockMovements');
    const movs = allMovs.filter(m => m.productId === productId).sort((a, b) => b.date > a.date ? 1 : -1);

    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-1">Historique mouvements</h3>
        <p class="text-gray-400 text-sm mb-4">${escapeHtml(p?.nom||'')} — ${movs.length} mouvement(s)</p>
        <div class="space-y-2 max-h-80 overflow-y-auto">
          ${movs.length ? movs.map(m => {
            const typeIcon = m.type === 'entree' ? '📥' : m.type === 'sortie' ? '📤' : m.type === 'vente' ? '🛒' : '🔄';
            const qtyClass = m.type === 'entree' ? 'text-green-400' : (m.type === 'sortie' || m.type === 'vente') ? 'text-red-400' : 'text-yellow-400';
            const qtySign = m.type === 'entree' ? '+' : m.type === 'absolu' ? '=' : '-';
            return `
              <div class="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2.5 text-sm">
                <div class="flex-1 min-w-0">
                  <div class="text-white font-medium flex items-center gap-1.5">
                    <span>${typeIcon}</span>
                    <span class="truncate">${escapeHtml(m.raison||m.type)}</span>
                  </div>
                  <div class="text-xs text-gray-400 mt-0.5">${formatDateTime(m.date)}${m.fournisseur ? ' · '+escapeHtml(m.fournisseur) : ''}</div>
                  ${m.cost > 0 ? `<div class="text-xs text-gray-500">Coût: ${formatCurrency(m.cost)}</div>` : ''}
                </div>
                <div class="text-right ml-2 flex-shrink-0">
                  <div class="${qtyClass} font-bold text-base">${qtySign}${m.quantity}</div>
                  <div class="text-xs text-gray-400">${m.oldStock} → ${m.newStock}</div>
                </div>
              </div>
            `;
          }).join('') : '<div class="text-gray-500 text-sm text-center py-4">Aucun mouvement enregistré</div>'}
        </div>
        <button onclick="closeModal()" class="mt-4 w-full py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Fermer</button>
      </div>
    `, { size: 'max-w-md' });
  },

  // ─── Suppression ─────────────────────────────────────────────────────────────
  async confirmDelete(id) {
    const p = await DB.get('produits', id);
    showConfirm({
      title: 'Supprimer produit',
      message: `Supprimer "${p?.nom}" ? Cette action est irréversible.`,
      icon: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await DB.delete('produits', id);
        await SM.writeNow('produits', id, 'delete');
        await APP.addLog('WARNING', `Produit supprimé: ${p?.nom}`);
        showToast('Produit supprimé', 'success');
        this.render();
        APP.refreshBadges();
      }
    });
  },

  // ─── Ajustement entrée/sortie rapide ─────────────────────────────────────────
  async _adjIn(productId) {
    await this.showAdjust(productId);
    // 'entree' est déjà sélectionné par défaut — rien à faire
  },

  async _adjOut(productId) {
    await this.showAdjust(productId);
    setTimeout(async () => {
      const sel = document.getElementById('adj-type');
      if (sel) {
        sel.value = 'sortie';
        const prod = await DB.get('produits', productId);
        if (prod) this._updateAdjCalc(productId, prod.cout || 0, prod.stock);
      }
    }, 50);
  },

  // ─── Dupliquer un produit (stock remis à zéro) ────────────────────────────────
  async duplicateProduct(id) {
    const p = await DB.get('produits', id);
    if (!p) return;
    const copy = {
      ...p,
      id: genId('PROD'),
      nom: p.nom + ' (copie)',
      stock: 0,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    await DB.put('produits', copy);
    await SM.writeNow('produits', copy.id, 'set', copy);
    await APP.addLog('INFO', `Produit dupliqué: ${p.nom}`, { newId: copy.id });
    showToast(`"${escapeHtml(copy.nom)}" créé — stock à zéro`, 'success');
    this.render();
    APP.refreshBadges();
  },

  // ─── Vente rapide (bascule vers l'onglet Ventes + produit pré-ajouté au panier)
  async quickSale(productId) {
    SALES._view = 'form';
    await APP.switchTab('sales');
    setTimeout(() => {
      if (typeof SALES !== 'undefined') SALES.addToCart(productId);
    }, 200);
  },

  // ─── Export PDF complet ───────────────────────────────────────────────────────
  async exportPDF() {
    const config = APP.config || {};
    const items = await DB.getAll('produits');
    items.sort((a, b) => (a.nom||'').localeCompare(b.nom||''));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const today = formatDate(new Date().toISOString());

    // ── Page de garde ──────────────────────────────────────────────────────────
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Bande colorée
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 8, pageH, 'F');

    doc.setTextColor(99, 102, 241);
    doc.setFontSize(28); doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT INVENTAIRE', pageW / 2, 55, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'normal');
    doc.text(config.name || 'Mon Entreprise', pageW / 2, 72, { align: 'center' });

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(11);
    doc.text(`Généré le ${today}`, pageW / 2, 83, { align: 'center' });

    // Stats sur page de garde
    const physiques = items.filter(p => !this.isService(p));
    const services = items.filter(p => this.isService(p));
    const enRupture = physiques.filter(p => p.stock <= 0).length;
    const critiques = physiques.filter(p => p.stock > 0 && p.min > 0 && p.stock <= p.min).length;
    const valeurCout = physiques.reduce((s, p) => s + ((p.stock||0) * (p.cout||0)), 0);
    const valeurVente = physiques.reduce((s, p) => s + ((p.stock||0) * (p.vente||0)), 0);

    const statsY = 105;
    const statW = (pageW - 40) / 4;
    const statsData = [
      { label: 'Produits physiques', value: physiques.length, color: [99, 102, 241] },
      { label: 'Services', value: services.length, color: [167, 139, 250] },
      { label: 'En rupture', value: enRupture, color: [239, 68, 68] },
      { label: 'Stock critiques', value: critiques, color: [234, 179, 8] },
    ];

    statsData.forEach((s, i) => {
      const x = 20 + i * statW;
      doc.setFillColor(...s.color, 30);
      doc.roundedRect(x, statsY, statW - 5, 28, 3, 3, 'F');
      doc.setTextColor(...s.color);
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text(String(s.value), x + (statW-5)/2, statsY + 13, { align: 'center' });
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(s.label, x + (statW-5)/2, statsY + 22, { align: 'center' });
    });

    // Valeurs stock
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Valeur stock (achat) : ${formatCurrency(valeurCout)}`, pageW / 2, statsY + 40, { align: 'center' });
    doc.text(`Valeur stock (vente) : ${formatCurrency(valeurVente)}`, pageW / 2, statsY + 50, { align: 'center' });
    doc.text(`Marge potentielle : ${formatCurrency(valeurVente - valeurCout)}`, pageW / 2, statsY + 60, { align: 'center' });

    // ── Page inventaire produits physiques ─────────────────────────────────────
    if (physiques.length > 0) {
      doc.addPage('landscape');
      doc.setTextColor(0, 0, 0);

      // En-tête page
      doc.setFillColor(31, 41, 55);
      doc.rect(0, 0, pageW, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('PRODUITS PHYSIQUES — INVENTAIRE COMPLET', 14, 12);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(today, pageW - 14, 12, { align: 'right' });

      doc.autoTable({
        startY: 22,
        head: [['#', 'Produit', 'Catégorie', 'Fournisseur', 'Stock', 'Min', 'Unité', 'P. Achat', 'P. Vente', 'Valeur stock', 'Statut']],
        body: physiques.map((p, i) => {
          let statut = '✓ OK';
          if (p.stock <= 0) statut = '✗ Rupture';
          else if (p.min > 0 && p.stock <= p.min) statut = '⚠ Critique';
          return [
            i + 1,
            p.nom,
            p.category || '—',
            p.fournisseur || '—',
            p.stock,
            p.min || 0,
            p.unite || '—',
            formatCurrency(p.cout),
            formatCurrency(p.vente),
            formatCurrency((p.stock||0) * (p.cout||0)),
            statut
          ];
        }),
        styles: { fontSize: 8, cellPadding: 3, overflow: 'ellipsize' },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0:  { cellWidth: 10,  halign: 'center' },
          1:  { cellWidth: 38 },
          2:  { cellWidth: 28 },
          3:  { cellWidth: 28 },
          4:  { cellWidth: 14,  halign: 'center', fontStyle: 'bold' },
          5:  { cellWidth: 12,  halign: 'center' },
          6:  { cellWidth: 14,  halign: 'center' },
          7:  { cellWidth: 30,  halign: 'right' },
          8:  { cellWidth: 30,  halign: 'right' },
          9:  { cellWidth: 34,  halign: 'right', fontStyle: 'bold' },
          10: { cellWidth: 22,  halign: 'center' }
        },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 10) {
            const val = data.cell.raw;
            if (val === '✗ Rupture') data.cell.styles.textColor = [220, 50, 50];
            else if (val === '⚠ Critique') data.cell.styles.textColor = [180, 130, 0];
            else data.cell.styles.textColor = [22, 163, 74];
          }
        }
      });

      // Totaux en bas
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(`Total produits : ${physiques.length}`, 14, finalY);
      doc.text(`Valeur totale stock (achat) : ${formatCurrency(valeurCout)}`, pageW - 14, finalY, { align: 'right' });
    }

    // ── Page services ──────────────────────────────────────────────────────────
    if (services.length > 0) {
      doc.addPage('landscape');
      doc.setFillColor(31, 41, 55);
      doc.rect(0, 0, pageW, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('SERVICES & PRODUITS DE PRODUCTIVITÉ', 14, 12);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(today, pageW - 14, 12, { align: 'right' });

      doc.autoTable({
        startY: 22,
        head: [['#', 'Service', 'Catégorie', 'Prix de vente', 'Note']],
        body: services.map((p, i) => [i + 1, p.nom, p.category || '—', formatCurrency(p.vente), 'Illimité — sans déduction stock']),
        styles: { fontSize: 9, cellPadding: 3, overflow: 'ellipsize' },
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          0: { cellWidth: 10,  halign: 'center' },
          2: { cellWidth: 35 },
          3: { cellWidth: 34,  halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 60,  textColor: [109, 40, 217], fontSize: 8 }
        }
      });
    }

    // Numéros de pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} / ${pageCount}`, pageW - 14, pageH - 6, { align: 'right' });
      doc.text(config.name || '', 14, pageH - 6);
    }

    doc.save(`Inventaire_${config.id || 'stock'}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF exporté avec succès', 'success');
    await APP.addLog('INFO', 'Export PDF inventaire');
  },

  // ─── Export CSV amélioré ──────────────────────────────────────────────────────
  async exportCSV() {
    const items = await DB.getAll('produits');
    items.sort((a, b) => (a.nom||'').localeCompare(b.nom||''));

    const header = 'ID,Nom,Categorie,Type,Fournisseur,PrixAchat,PrixVente,Stock,StockMin,Unite,ValeurStock\n';
    const rows = items.map(p => {
      const isService = this.isService(p);
      const valeur = isService ? 0 : (p.stock||0) * (p.cout||0);
      return [
        p.id, p.nom, p.category, isService ? 'Service' : 'Produit',
        p.fournisseur||'', p.cout||0, p.vente||0,
        isService ? '∞' : (p.stock||0), p.min||0, p.unite||'', valeur
      ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',');
    }).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stock_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast(`${items.length} produit(s) exporté(s)`, 'success');
  },

  // ─── Import CSV amélioré ──────────────────────────────────────────────────────
  async importCSV(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) { showToast('Fichier CSV vide ou invalide', 'error'); return; }

      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

      // Mapping flexible des colonnes
      const mapCol = (aliases) => {
        for (const alias of aliases) {
          const idx = rawHeaders.findIndex(h => h.includes(alias));
          if (idx >= 0) return idx;
        }
        return -1;
      };

      const colNom = mapCol(['nom', 'name', 'produit', 'article', 'designation']);
      const colCat = mapCol(['categorie', 'category', 'cat', 'type']);
      const colFourn = mapCol(['fournisseur', 'supplier', 'vendor', 'fourn']);
      const colCout = mapCol(['cout', 'coutachat', 'prix achat', 'prixachat', 'cost', 'achat', 'pa']);
      const colVente = mapCol(['vente', 'prixvente', 'prix vente', 'price', 'pv', 'tarif']);
      const colStock = mapCol(['stock', 'quantite', 'quantity', 'qte', 'qty']);
      const colMin = mapCol(['min', 'stockmin', 'minimum', 'seuil', 'alert']);
      const colUnite = mapCol(['unite', 'unit', 'unité', 'uom']);

      if (colNom < 0) { showToast('Colonne "Nom" introuvable dans le CSV', 'error'); return; }

      const existing = await DB.getAll('produits');
      const byName = {};
      existing.forEach(p => { if (p.nom) byName[p.nom.toLowerCase()] = p; });

      let added = 0, updated = 0, errors = 0;
      const report = [];

      for (const line of lines.slice(1)) {
        // Parser les valeurs CSV (gère les guillemets)
        const vals = [];
        let cur = '', inQ = false;
        for (const ch of line + ',') {
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
          else cur += ch;
        }

        const get = (idx) => idx >= 0 ? (vals[idx] || '').replace(/^["']|["']$/g, '').trim() : '';

        const nom = get(colNom);
        if (!nom) { errors++; continue; }

        const stockStr = get(colStock);
        const stock = stockStr === '∞' ? 0 : (parseFloat(stockStr) || 0);
        const cat = get(colCat) || 'Autre';

        const produit = {
          id: byName[nom.toLowerCase()]?.id || genId('PROD'),
          nom,
          category: cat,
          fournisseur: get(colFourn),
          cout: parseFloat(get(colCout)) || 0,
          vente: parseFloat(get(colVente)) || 0,
          stock,
          min: parseFloat(get(colMin)) || 0,
          unite: get(colUnite),
          createdAt: byName[nom.toLowerCase()]?.createdAt || new Date().toISOString(),
          lastModified: new Date().toISOString()
        };

        if (byName[nom.toLowerCase()]) {
          updated++;
          report.push({ action: 'mis à jour', nom });
        } else {
          added++;
          report.push({ action: 'ajouté', nom });
        }

        await DB.put('produits', produit);
        await SM.writeNow('produits', produit.id, 'set', produit);
      }

      // Rapport
      const msg = `Import terminé : ${added} ajouté(s), ${updated} mis à jour, ${errors} erreur(s)`;
      showToast(msg, added + updated > 0 ? 'success' : 'warning');
      await APP.addLog('INFO', msg);
      this.render();
      APP.refreshBadges();

    } catch (e) {
      showToast('Erreur lecture CSV: ' + e.message, 'error');
    }
  }
};
