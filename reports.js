// reports.js — Rapports financiers
'use strict';

window.REPORTS = {
  _period: '30',
  _chartInstance: null,

  async render() {
    const el = document.getElementById('tab-reports');
    if (!el) return;
    el.innerHTML = `<div class="flex items-center justify-center h-40"><div class="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div></div>`;
    try {
      await this._renderContent();
    } catch (e) {
      el.innerHTML = `<div class="p-4 text-red-400">${escapeHtml(e.message)}</div>`;
    }
  },

  async _renderContent() {
    const el = document.getElementById('tab-reports');
    const [ventes, depenses, credits, produits, clients] = await Promise.all([
      DB.getAll('ventes'), DB.getAll('depenses'), DB.getAll('credits'),
      DB.getAll('produits'), DB.getAll('clients')
    ]);

    const data = this._compute(ventes, depenses, credits, produits, clients, this._period);

    el.innerHTML = `
      <div class="p-4 space-y-4">
        <!-- Période -->
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="text-lg font-bold text-white">Rapports financiers</h2>
          <div class="flex gap-1 flex-wrap">
            ${[['7','7 jours'],['30','30 jours'],['90','3 mois'],['365','1 an'],['all','Tout']].map(([v,l]) =>
              `<button onclick="REPORTS._period='${v}';REPORTS.render()" class="px-3 py-1.5 rounded-lg text-sm ${this._period===v?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">${l}</button>`
            ).join('')}
            <button onclick="REPORTS.exportPDF()" class="px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              PDF
            </button>
          </div>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${[
            { label: "Chiffre d'affaires", value: formatCurrency(data.ca), color: 'text-blue-400' },
            { label: 'Total dépenses', value: formatCurrency(data.totalDep), color: 'text-red-400' },
            { label: 'Bénéfice net', value: formatCurrency(data.benefice), color: data.benefice >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Marge brute', value: data.marge + '%', color: data.marge >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(k => `
            <div class="bg-gray-800 rounded-xl border border-gray-700 p-3 text-center">
              <div class="text-base font-bold ${k.color}">${k.value}</div>
              <div class="text-xs text-gray-400 mt-0.5">${k.label}</div>
            </div>
          `).join('')}
        </div>

        <!-- Graphique CA vs Dépenses -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="text-sm font-semibold text-white mb-3">Évolution sur la période</h3>
          <canvas id="report-chart" class="max-h-56"></canvas>
        </div>

        <!-- Ventilation par mode de paiement -->
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-white mb-3">Ventes par mode de paiement</h3>
            <div class="space-y-2">
              ${Object.entries(data.byMode).map(([mode, v]) => {
                const pct = data.ca > 0 ? Math.round((v / data.ca) * 100) : 0;
                return `
                  <div class="flex items-center gap-2">
                    <div class="text-xs text-gray-400 w-20">${escapeHtml(mode)}</div>
                    <div class="flex-1 bg-gray-700 rounded-full h-2">
                      <div class="bg-indigo-500 rounded-full h-2" style="width:${pct}%"></div>
                    </div>
                    <div class="text-xs text-white w-28 text-right">${formatCurrency(v)} (${pct}%)</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-white mb-3">Dépenses par catégorie</h3>
            <div class="space-y-2">
              ${Object.entries(data.depByCategory).map(([cat, v]) => {
                const pct = data.totalDep > 0 ? Math.round((v / data.totalDep) * 100) : 0;
                return `
                  <div class="flex items-center gap-2">
                    <div class="text-xs text-gray-400 w-20 truncate">${escapeHtml(cat)}</div>
                    <div class="flex-1 bg-gray-700 rounded-full h-2">
                      <div class="bg-red-500 rounded-full h-2" style="width:${pct}%"></div>
                    </div>
                    <div class="text-xs text-white w-28 text-right">${formatCurrency(v)} (${pct}%)</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Top produits et clients -->
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-white mb-3">Top 5 produits</h3>
            <div class="space-y-2">
              ${data.topProducts.slice(0,5).map((p, i) => `
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-500 text-xs w-4">${i+1}</span>
                    <span class="text-gray-300 truncate max-w-32">${escapeHtml(p.nom)}</span>
                  </div>
                  <div class="text-right">
                    <div class="text-white font-medium">${formatCurrency(p.ca)}</div>
                    <div class="text-xs text-gray-400">${p.qty} vendus</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 class="text-sm font-semibold text-white mb-3">Top 5 clients</h3>
            <div class="space-y-2">
              ${data.topClients.slice(0,5).map((c, i) => `
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-500 text-xs w-4">${i+1}</span>
                    <span class="text-gray-300 truncate max-w-32">${escapeHtml(c.name)}</span>
                  </div>
                  <div class="text-right">
                    <div class="text-white font-medium">${formatCurrency(c.ca)}</div>
                    <div class="text-xs text-gray-400">${c.count} facture(s)</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Stock valorisé -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 class="text-sm font-semibold text-white mb-3">Inventaire valorisé</h3>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-lg font-bold text-white">${data.stockCount}</div>
              <div class="text-xs text-gray-400">Références</div>
            </div>
            <div>
              <div class="text-lg font-bold text-yellow-400">${formatCurrency(data.stockValueCout)}</div>
              <div class="text-xs text-gray-400">Valeur d'achat</div>
            </div>
            <div>
              <div class="text-lg font-bold text-green-400">${formatCurrency(data.stockValueVente)}</div>
              <div class="text-xs text-gray-400">Valeur de vente</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Graphique
    this._drawChart(ventes, depenses, this._period);
    this._data = data;
    this._ventes = ventes; this._depenses = depenses;
  },

  _getRange(period) {
    const now = new Date();
    if (period === 'all') return null;
    const days = parseInt(period) || 30;
    const from = new Date(now.getTime() - days * 86400000);
    return from.toISOString().split('T')[0];
  },

  _compute(ventes, depenses, credits, produits, clients, period) {
    const from = this._getRange(period);
    const ventesPeriod = from ? ventes.filter(v => v.date >= from && v.status !== 'cancelled') : ventes.filter(v => v.status !== 'cancelled');
    const depPeriod = from ? depenses.filter(d => d.date >= from) : depenses;

    const ca = ventesPeriod.reduce((s, v) => s + (v.total||0), 0);
    const totalDep = depPeriod.reduce((s, d) => s + (d.amount||0), 0);
    const benefice = ca - totalDep;
    const marge = ca > 0 ? Math.round((benefice / ca) * 100) : 0;

    const byMode = {};
    ventesPeriod.forEach(v => { byMode[v.paymentMode||'cash'] = (byMode[v.paymentMode||'cash']||0) + (v.total||0); });

    const depByCategory = {};
    depPeriod.forEach(d => { depByCategory[d.category||'Autre'] = (depByCategory[d.category||'Autre']||0) + (d.amount||0); });

    const prodStats = {};
    ventesPeriod.forEach(v => {
      (v.items||[]).forEach(i => {
        if (!prodStats[i.productId]) prodStats[i.productId] = { nom: i.nom, ca: 0, qty: 0 };
        prodStats[i.productId].ca += i.total||0;
        prodStats[i.productId].qty += i.qty||0;
      });
    });
    const topProducts = Object.values(prodStats).sort((a,b) => b.ca - a.ca);

    const clientStats = {};
    ventesPeriod.forEach(v => {
      const key = v.clientId || v.clientName || 'Passager';
      if (!clientStats[key]) clientStats[key] = { name: v.clientName||'Passager', ca: 0, count: 0 };
      clientStats[key].ca += v.total||0;
      clientStats[key].count++;
    });
    const topClients = Object.values(clientStats).sort((a,b) => b.ca - a.ca);

    const stockCount = produits.filter(p => p.stock > 0).length;
    const stockValueCout = produits.reduce((s, p) => s + ((p.stock||0) * (p.cout||0)), 0);
    const stockValueVente = produits.reduce((s, p) => s + ((p.stock||0) * (p.vente||0)), 0);

    return { ca, totalDep, benefice, marge, byMode, depByCategory, topProducts, topClients, stockCount, stockValueCout, stockValueVente };
  },

  _drawChart(ventes, depenses, period) {
    const canvas = document.getElementById('report-chart');
    if (!canvas) return;
    if (this._chartInstance) { this._chartInstance.destroy(); this._chartInstance = null; }

    const { labels, ventesData, depensesData } = this._buildChartData(
      ventes.filter(v => v.status !== 'cancelled'), depenses, period
    );

    this._chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Ventes', data: ventesData, borderColor: 'rgba(99,102,241,1)', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.3, fill: true, pointRadius: 3 },
          { label: 'Dépenses', data: depensesData, borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.05)', tension: 0.3, fill: true, pointRadius: 3 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 9 } }, grid: { color: 'rgba(75,85,99,0.3)' } },
          y: { ticks: { color: '#6b7280', font: { size: 9 }, callback: v => formatCurrency(v) }, grid: { color: 'rgba(75,85,99,0.3)' } }
        }
      }
    });
  },

  _buildChartData(ventes, depenses, period) {
    const now = new Date();
    let labels = [], groups = [];

    if (period === '7') {
      labels = Array.from({length: 7}, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 6 + i); return d.toLocaleDateString('fr-FR', {weekday:'short', day:'numeric'}); });
      groups = Array.from({length: 7}, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - 6 + i);
        const ds = d.toISOString().split('T')[0];
        return {
          ventes: safeFilter(ventes, v => v.date?.startsWith(ds)).reduce((s, v) => s + (v.total||0), 0),
          depenses: safeFilter(depenses, d => d.date?.startsWith(ds)).reduce((s, d) => s + (d.amount||0), 0)
        };
      });
    } else if (period === '30') {
      labels = Array.from({length: 30}, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 29 + i); return d.getDate() + '/' + (d.getMonth()+1); });
      groups = Array.from({length: 30}, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - 29 + i);
        const ds = d.toISOString().split('T')[0];
        return {
          ventes: safeFilter(ventes, v => v.date?.startsWith(ds)).reduce((s, v) => s + (v.total||0), 0),
          depenses: safeFilter(depenses, d => d.date?.startsWith(ds)).reduce((s, d) => s + (d.amount||0), 0)
        };
      });
    } else if (period === '90') {
      labels = Array.from({length: 13}, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 91 + i*7); return d.toLocaleDateString('fr-FR', {day:'numeric', month:'short'}); });
      groups = Array.from({length: 13}, (_, i) => {
        const start = new Date(now); start.setDate(start.getDate() - 91 + i*7);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        const ss = start.toISOString().split('T')[0], es = end.toISOString().split('T')[0];
        return {
          ventes: safeFilter(ventes, v => v.date >= ss && v.date < es).reduce((s, v) => s + (v.total||0), 0),
          depenses: safeFilter(depenses, d => d.date >= ss && d.date < es).reduce((s, d) => s + (d.amount||0), 0)
        };
      });
    } else {
      // 365 ou all → par mois
      const days = period === '365' ? 365 : null;
      const fromDate = days ? new Date(now.getTime() - days * 86400000) : null;
      const filteredV = fromDate ? ventes.filter(v => new Date(v.date) >= fromDate) : ventes;
      const filteredD = fromDate ? depenses.filter(d => new Date(d.date) >= fromDate) : depenses;
      const allDates = [...filteredV.map(v => v.date), ...filteredD.map(d => d.date)].filter(Boolean).map(d => d.substr(0,7));
      const months = [...new Set(allDates)].sort();
      if (months.length === 0) { return { labels: [], ventesData: [], depensesData: [] }; }
      labels = months.map(m => { const d = new Date(m + '-01'); return d.toLocaleDateString('fr-FR', {month:'short', year:'2-digit'}); });
      groups = months.map(m => ({
        ventes: safeFilter(filteredV, v => v.date?.startsWith(m)).reduce((s, v) => s + (v.total||0), 0),
        depenses: safeFilter(filteredD, d => d.date?.startsWith(m)).reduce((s, d) => s + (d.amount||0), 0)
      }));
    }

    return { labels, ventesData: groups.map(g => g.ventes), depensesData: groups.map(g => g.depenses) };
  },

  exportPDF() {
    if (!this._data) { showToast('Chargez d\'abord les rapports', 'warning'); return; }
    const config = APP.config || {};
    const d = this._data;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageW, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT FINANCIER — ' + (config.name||''), 14, 15);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Période: ${this._period === 'all' ? 'Tout' : 'Derniers '+this._period+' jours'} · Généré le ${formatDate(new Date().toISOString())}`, 14, 25);

    let y = 50;
    const addKV = (label, value, color) => {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100); doc.text(label + ':', 14, y);
      doc.setTextColor(color || 0, color ? 0 : 0, color ? 0 : 0);
      doc.setFont('helvetica', 'bold'); doc.text(String(value), 100, y);
      doc.setFont('helvetica', 'normal');
      y += 8;
    };

    doc.setTextColor(0, 0, 0);
    addKV("Chiffre d'affaires", formatCurrency(d.ca));
    addKV('Total dépenses', formatCurrency(d.totalDep));
    addKV('Bénéfice net', formatCurrency(d.benefice));
    addKV('Marge brute', d.marge + '%');
    y += 5;

    doc.autoTable({
      startY: y,
      head: [['Top 5 Produits', 'CA', 'Qté']],
      body: d.topProducts.slice(0,5).map(p => [p.nom, formatCurrency(p.ca), p.qty]),
      styles: { fontSize: 9, overflow: 'ellipsize' },
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right' }, 2: { cellWidth: 18, halign: 'center' } }
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Top 5 Clients', 'CA', 'Factures']],
      body: d.topClients.slice(0,5).map(c => [c.name, formatCurrency(c.ca), c.count]),
      styles: { fontSize: 9, overflow: 'ellipsize' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right' }, 2: { cellWidth: 22, halign: 'center' } }
    });

    doc.save(`Rapport_${new Date().toISOString().split('T')[0]}.pdf`);
  }
};
