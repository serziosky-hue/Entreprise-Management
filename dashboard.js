// dashboard.js — Tableau de bord
'use strict';

window.DASHBOARD = {
  _chartInstance: null,
  _period: 'today',  // today | 7 | 30 | 12m | all | custom | range
  _dateFrom: '',     // pour custom et range
  _dateTo: '',       // pour range

  // Calculer les bornes de date selon la période sélectionnée
  _getDateRange() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const p = this._period;
    if (p === 'today') {
      return { from: todayStr, to: todayStr };
    } else if (p === '7') {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split('T')[0], to: todayStr };
    } else if (p === '30') {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { from: d.toISOString().split('T')[0], to: todayStr };
    } else if (p === '12m') {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1);
      return { from: d.toISOString().split('T')[0], to: todayStr };
    } else if (p === 'all') {
      return { from: null, to: null };
    } else if (p === 'custom') {
      return { from: this._dateFrom, to: this._dateFrom };
    } else if (p === 'range') {
      return { from: this._dateFrom, to: this._dateTo || this._dateFrom };
    }
    return { from: null, to: null };
  },

  _inRange(dateStr, from, to) {
    if (!dateStr) return false;
    const d = dateStr.split('T')[0];
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  },

  async render() {
    const el = document.getElementById('tab-dashboard');
    if (!el) return;
    el.innerHTML = `<div class="flex items-center justify-center h-40"><div class="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div></div>`;

    try {
      const [ventes, depenses, produits, credits] = await Promise.all([
        DB.getAll('ventes'), DB.getAll('depenses'), DB.getAll('produits'), DB.getAll('credits')
      ]);
      const config = APP.config || {};
      const widgets = config.widgets || {};
      const { from, to } = this._getDateRange();

      // Filtrer ventes et dépenses par période
      const ventesPaid = safeFilter(ventes, v => v.status !== 'cancelled' && this._inRange(v.date, from, to));
      const depFiltered = safeFilter(depenses, d => this._inRange(d.date, from, to));

      const totalCA = ventesPaid.reduce((s, v) => s + (v.total || 0), 0);
      const totalByMode = {};
      APP.getPaymentMethods().filter(m => m.id !== 'credit').forEach(m => {
        totalByMode[m.id] = ventesPaid.filter(v => v.paymentMode === m.id).reduce((s, v) => s + v.total, 0);
      });
      // Alias rétro-compatibles pour les clés de widget existantes
      const totalEspeces = totalByMode['cash']   || 0;
      const totalMobile  = totalByMode['mobile'] || 0;
      const totalCarte   = totalByMode['card']   || 0;
      const totalDep = depFiltered.reduce((s, d) => s + (d.amount || 0), 0);
      const solde = totalCA - totalDep;
      const creditsEnAttente = safeFilter(credits, c => c.status === 'pending').reduce((s, c) => s + (c.balance || 0), 0);
      const today = new Date().toISOString().split('T')[0];
      const lateCredits = safeFilter(credits, c => c.status === 'pending' && c.dueDate && c.dueDate < today);
      const isServiceFn = p => (p.category||'').toLowerCase().includes('service') || (p.category||'').toLowerCase().includes('productivité');
      const stockBas = safeFilter(produits, p => !isServiceFn(p) && p.stock > 0 && p.min > 0 && p.stock <= p.min);
      const rupture = safeFilter(produits, p => !isServiceFn(p) && p.stock <= 0);

      const widgetData = [
        { key: 'solde', label: 'Solde caisse', value: formatCurrency(solde), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: solde < (config.cashThreshold || 0) ? 'text-red-400' : 'text-green-400' },
        { key: 'ca', label: "Chiffre d'affaires", value: formatCurrency(totalCA), icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-blue-400' },
        { key: 'depenses', label: 'Total dépenses', value: formatCurrency(totalDep), icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z', color: 'text-red-400' },
        { key: 'especes', label: `Ventes ${APP.getPaymentLabel('cash').toLowerCase()}`,  value: formatCurrency(totalEspeces), icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75', color: 'text-emerald-400' },
        { key: 'mobile',  label: `Ventes ${APP.getPaymentLabel('mobile').toLowerCase()}`, value: formatCurrency(totalMobile),  icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3', color: 'text-purple-400' },
        { key: 'carte',   label: `Ventes ${APP.getPaymentLabel('card').toLowerCase()}`,   value: formatCurrency(totalCarte),   icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z', color: 'text-cyan-400' },
        // Modes personnalisés (non inclus dans les 3 defaults ci-dessus)
        ...APP.getPaymentMethods().filter(m => !['cash','mobile','card','credit','cheque'].includes(m.id)).map(m => ({
          key: `pm_${m.id}`, label: `Ventes ${m.label.toLowerCase()}`,
          value: formatCurrency(totalByMode[m.id] || 0),
          icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z', color: 'text-indigo-400'
        })),
        { key: 'nbVentes', label: 'Nombre de ventes', value: ventesPaid.length, icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z', color: 'text-yellow-400' },
        { key: 'credits', label: 'Crédits en attente', value: formatCurrency(creditsEnAttente), icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', color: creditsEnAttente > 0 ? 'text-orange-400' : 'text-gray-400' },
      ];

      const activeWidgets = widgetData.filter(w => widgets[w.key] !== false);

      // Logs récents
      const logs = await DB.getAll('logs');
      const recentLogs = [...logs].sort((a, b) => b.timestamp > a.timestamp ? 1 : -1).slice(0, 5);

      // Label de la période pour affichage
      const periodLabels = {
        'today': "Aujourd'hui", '7': '7 derniers jours', '30': '30 derniers jours',
        '12m': '12 derniers mois', 'all': 'Toutes les données',
        'custom': this._dateFrom || 'Date précise', 'range': (this._dateFrom && this._dateTo) ? `${this._dateFrom} → ${this._dateTo}` : 'Intervalle'
      };
      const periodLabel = periodLabels[this._period] || '';

      el.innerHTML = `
        <div class="p-3 sm:p-4 space-y-3">

          <!-- ── Filtres période ── -->
          <div class="bg-gray-800 rounded-xl border border-gray-700 p-3">
            <!-- Boutons : scroll horizontal sur mobile, wrap sur desktop -->
            <div class="overflow-x-auto" style="scrollbar-width:none;-webkit-overflow-scrolling:touch;">
              <div class="flex gap-1.5 sm:flex-wrap" style="min-width:max-content;" >
                ${[['today',"Auj."],['7','7j'],['30','1m'],['12m','1an'],['all','Tout'],['custom','Précis'],['range','Plage']].map(([v,l]) => `
                  <button onclick="DASHBOARD._setPeriod('${v}')"
                    class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                      ${this._period===v ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'}">
                    ${l}
                  </button>`).join('')}
              </div>
            </div>
            <!-- Champs date (inchangés) -->
            <div id="dash-custom-row" class="${this._period==='custom'?'flex':'hidden'} gap-2 items-center flex-wrap mt-2">
              <input type="date" value="${this._dateFrom}" onchange="DASHBOARD._dateFrom=this.value;DASHBOARD.render()"
                class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
            </div>
            <div id="dash-range-row" class="${this._period==='range'?'flex':'hidden'} gap-2 items-center flex-wrap mt-2">
              <input type="date" value="${this._dateFrom}" onchange="DASHBOARD._dateFrom=this.value;DASHBOARD.render()"
                class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
              <span class="text-gray-500 text-sm">→</span>
              <input type="date" value="${this._dateTo}" onchange="DASHBOARD._dateTo=this.value;DASHBOARD.render()"
                class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
            </div>
            <div class="text-xs text-gray-500 mt-2">
              <strong class="text-indigo-300">${periodLabel}</strong>
              ${from ? `<span class="text-gray-600"> · ${from}${to && to!==from?' → '+to:''}</span>` : ''}
            </div>
          </div>

          <!-- ── Widgets : compact 2 col mobile, 3-4 col desktop ── -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            ${activeWidgets.map(w => `
              <div class="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors p-2.5 sm:p-4">
                <div class="flex items-start justify-between gap-1">
                  <span class="text-xs text-gray-400 leading-tight">${escapeHtml(w.label)}</span>
                  <svg class="w-4 h-4 sm:w-5 sm:h-5 ${w.color} opacity-50 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="${w.icon}"/>
                  </svg>
                </div>
                <div class="text-sm sm:text-lg font-bold ${w.color} mt-1 truncate">${escapeHtml(String(w.value))}</div>
              </div>
            `).join('')}
          </div>

          <!-- ── Alertes (compact) ── -->
          ${(rupture.length || stockBas.length || lateCredits.length || (config.cashThreshold && solde < config.cashThreshold)) ? `
          <div class="bg-gray-800 rounded-xl border border-yellow-500/30 p-3">
            <h3 class="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
              Alertes (${[rupture.length, stockBas.length, lateCredits.length, (config.cashThreshold&&solde<config.cashThreshold?1:0)].reduce((a,b)=>a+b,0)})
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
              ${config.cashThreshold && solde < config.cashThreshold ? `<div class="text-xs text-red-400 truncate">💸 Solde bas : ${formatCurrency(solde)}</div>` : ''}
              ${rupture.slice(0,5).map(p => `<div class="text-xs text-red-400 truncate">🔴 Rupture : ${escapeHtml(p.nom)}</div>`).join('')}
              ${stockBas.slice(0,5).map(p => `<div class="text-xs text-yellow-400 truncate">⚠️ Stock bas : ${escapeHtml(p.nom)} (${p.stock})</div>`).join('')}
              ${lateCredits.slice(0,5).map(c => `<div class="text-xs text-orange-400 truncate">⏰ Crédit retard : ${escapeHtml(c.clientName)} ${formatCurrency(c.balance)}</div>`).join('')}
            </div>
          </div>` : ''}

          <!-- ── Graphique ── -->
          <div class="bg-gray-800 rounded-xl border border-gray-700 p-3 sm:p-4">
            <div class="flex items-center justify-between mb-2 sm:mb-4">
              <h3 class="text-sm font-semibold text-white">Ventes vs Dépenses</h3>
              <span class="text-xs text-gray-500">${periodLabel}</span>
            </div>
            <canvas id="dashboard-chart" style="max-height:180px;" class="sm:max-h-64"></canvas>
          </div>

          <!-- ── Logs récents ── -->
          <div class="bg-gray-800 rounded-xl border border-gray-700 p-3 sm:p-4">
            <h3 class="text-sm font-semibold text-white mb-2">Activité récente</h3>
            <div class="space-y-1.5">
              ${recentLogs.length ? recentLogs.map(l => `
                <div class="flex items-center gap-2 text-xs">
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${l.level==='ERROR'?'bg-red-500':l.level==='WARNING'?'bg-yellow-500':l.level==='SUCCESS'?'bg-green-500':'bg-blue-500'}"></span>
                  <span class="text-gray-500 flex-shrink-0 w-12 sm:w-auto">${formatDateTime(l.timestamp).split(' ')[1] || ''}</span>
                  <span class="text-gray-300 truncate">${escapeHtml(l.message)}</span>
                </div>
              `).join('') : '<div class="text-gray-500 text-xs">Aucune activité</div>'}
            </div>
          </div>
        </div>
      `;

      this._ventes = ventes;
      this._depenses = depenses;
      await this._renderChart();
    } catch (e) {
      console.error('Dashboard error:', e);
      el.innerHTML = `<div class="p-4 text-red-400">Erreur: ${escapeHtml(e.message)}</div>`;
    }
  },

  _setPeriod(p) {
    this._period = p;
    // Réinitialiser les dates si on change de mode
    if (p !== 'custom' && p !== 'range') {
      this._dateFrom = ''; this._dateTo = '';
    } else if (p === 'custom' && !this._dateFrom) {
      this._dateFrom = new Date().toISOString().split('T')[0];
    } else if (p === 'range' && !this._dateFrom) {
      const d = new Date(); d.setDate(d.getDate() - 7);
      this._dateFrom = d.toISOString().split('T')[0];
      this._dateTo = new Date().toISOString().split('T')[0];
    }
    this.render();
  },

  async _renderChart() {
    // Mettre à jour les boutons de période
    document.querySelectorAll('#tab-dashboard button[onclick*="_period"]').forEach(b => {
      const match = b.getAttribute('onclick')?.match(/'([^']+)'/);
      if (match) b.className = `px-2 py-1 rounded text-xs ${this._period === match[1] ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`;
    });

    const canvas = document.getElementById('dashboard-chart');
    if (!canvas) return;

    const ventes = this._ventes || await DB.getAll('ventes');
    const depenses = this._depenses || await DB.getAll('depenses');

    const { labels, ventesData, depensesData } = this._buildChartData(ventes, depenses);

    if (this._chartInstance) { this._chartInstance.destroy(); this._chartInstance = null; }

    this._chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Ventes', data: ventesData, backgroundColor: 'rgba(99,102,241,0.7)', borderColor: 'rgba(99,102,241,1)', borderWidth: 1, borderRadius: 4 },
          { label: 'Dépenses', data: depensesData, backgroundColor: 'rgba(239,68,68,0.5)', borderColor: 'rgba(239,68,68,1)', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(75,85,99,0.3)' } },
          y: { ticks: { color: '#6b7280', font: { size: 10 }, callback: v => formatCurrency(v) }, grid: { color: 'rgba(75,85,99,0.3)' } }
        }
      }
    });
  },

  _buildChartData(ventes, depenses) {
    const period = this._period;
    const { from, to } = this._getDateRange();
    // Filtrer par la période sélectionnée
    const vF = safeFilter(ventes, v => v.status !== 'cancelled' && this._inRange(v.date, from, to));
    const dF = safeFilter(depenses, d => this._inRange(d.date, from, to));
    // Pour le graphique, on utilise les données filtrées pour les modes custom/range
    // mais les modes classiques ont leur propre logique de groupement
    const now = new Date();
    let labels = [], groups = [];

    if (period === 'today') {
      labels = Array.from({length: 24}, (_, i) => `${i}h`);
      groups = labels.map((_, h) => ({
        ventes: safeFilter(ventes, v => { const d = new Date(v.date); return d.toDateString() === now.toDateString() && d.getHours() === h && v.status !== 'cancelled'; }).reduce((s, v) => s + (v.total||0), 0),
        depenses: safeFilter(depenses, d => { const dd = new Date(d.date); return dd.toDateString() === now.toDateString() && dd.getHours() === h; }).reduce((s, d) => s + (d.amount||0), 0)
      }));
    } else if (period === '7') {
      labels = Array.from({length: 7}, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 6 + i); return d.toLocaleDateString('fr-FR', {weekday:'short', day:'numeric'}); });
      groups = Array.from({length: 7}, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - 6 + i);
        const ds = d.toISOString().split('T')[0];
        return {
          ventes: safeFilter(ventes, v => v.date?.startsWith(ds) && v.status !== 'cancelled').reduce((s, v) => s + (v.total||0), 0),
          depenses: safeFilter(depenses, d => d.date?.startsWith(ds)).reduce((s, d) => s + (d.amount||0), 0)
        };
      });
    } else if (period === '30') {
      labels = Array.from({length: 30}, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 29 + i); return d.getDate() + '/' + (d.getMonth()+1); });
      groups = Array.from({length: 30}, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - 29 + i);
        const ds = d.toISOString().split('T')[0];
        return {
          ventes: safeFilter(ventes, v => v.date?.startsWith(ds) && v.status !== 'cancelled').reduce((s, v) => s + (v.total||0), 0),
          depenses: safeFilter(depenses, d => d.date?.startsWith(ds)).reduce((s, d) => s + (d.amount||0), 0)
        };
      });
    } else if (period === '12m') {
      labels = Array.from({length: 12}, (_, i) => { const d = new Date(now); d.setMonth(d.getMonth() - 11 + i); return d.toLocaleDateString('fr-FR', {month:'short', year:'2-digit'}); });
      groups = Array.from({length: 12}, (_, i) => {
        const d = new Date(now); d.setMonth(d.getMonth() - 11 + i);
        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return {
          ventes: safeFilter(ventes, v => v.date?.startsWith(ym) && v.status !== 'cancelled').reduce((s, v) => s + (v.total||0), 0),
          depenses: safeFilter(depenses, d => d.date?.startsWith(ym)).reduce((s, d) => s + (d.amount||0), 0)
        };
      });
    } else {
      // all — grouper par mois
      const allDates = [...ventes.map(v => v.date), ...depenses.map(d => d.date)].filter(Boolean).map(d => d.substr(0,7));
      const months = [...new Set(allDates)].sort();
      labels = months.map(m => { const d = new Date(m); return d.toLocaleDateString('fr-FR', {month:'short', year:'2-digit'}); });
      groups = months.map(m => ({
        ventes: safeFilter(ventes, v => v.date?.startsWith(m) && v.status !== 'cancelled').reduce((s, v) => s + (v.total||0), 0),
        depenses: safeFilter(depenses, d => d.date?.startsWith(m)).reduce((s, d) => s + (d.amount||0), 0)
      }));
    }

    return { labels, ventesData: groups.map(g => g.ventes), depensesData: groups.map(g => g.depenses) };
  }
};
