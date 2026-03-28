// logs.js — Journal d'activité
'use strict';

window.LOGS = {
  _page: 1, _perPage: 50,
  _filterLevel: '', _filterSearch: '',

  async render() {
    const el = document.getElementById('tab-logs');
    if (!el) return;
    try {
      let logs = await DB.getAll('logs');
      logs.sort((a, b) => b.timestamp > a.timestamp ? 1 : -1);

      if (this._filterLevel) logs = logs.filter(l => l.level === this._filterLevel);
      if (this._filterSearch) {
        const s = this._filterSearch.toLowerCase();
        logs = logs.filter(l => (l.message||'').toLowerCase().includes(s) || (l.user||'').toLowerCase().includes(s));
      }

      const total = logs.length;
      const start = (this._page - 1) * this._perPage;
      const page = logs.slice(start, start + this._perPage);

      const stats = {
        INFO: logs.filter(l => l.level === 'INFO').length,
        SUCCESS: logs.filter(l => l.level === 'SUCCESS').length,
        WARNING: logs.filter(l => l.level === 'WARNING').length,
        ERROR: logs.filter(l => l.level === 'ERROR').length,
      };

      const levelColors = { INFO: 'text-blue-400 bg-blue-500/10', SUCCESS: 'text-green-400 bg-green-500/10', WARNING: 'text-yellow-400 bg-yellow-500/10', ERROR: 'text-red-400 bg-red-500/10' };
      const dotColors = { INFO: 'bg-blue-500', SUCCESS: 'bg-green-500', WARNING: 'bg-yellow-500', ERROR: 'bg-red-500' };

      el.innerHTML = `
        <div class="p-4 space-y-4">
          <!-- Stats -->
          <div class="grid grid-cols-4 gap-2">
            ${Object.entries(stats).map(([level, count]) => `
              <button onclick="LOGS._filterLevel=LOGS._filterLevel==='${level}'?'':'${level}';LOGS._page=1;LOGS.render()"
                class="bg-gray-800 rounded-xl p-3 text-center border ${this._filterLevel === level ? 'border-indigo-500' : 'border-gray-700'} hover:border-gray-600 transition-colors">
                <div class="text-lg font-bold ${levelColors[level].split(' ')[0]}">${count}</div>
                <div class="text-xs text-gray-400">${level}</div>
              </button>
            `).join('')}
          </div>

          <!-- Filtres -->
          <div class="flex gap-2 flex-wrap">
            <input type="search" value="${escapeHtml(this._filterSearch)}" placeholder="Rechercher..." oninput="LOGS._filterSearch=this.value;LOGS._page=1;LOGS.render()"
              class="flex-1 min-w-48 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
            ${this._filterLevel ? `<button onclick="LOGS._filterLevel='';LOGS.render()" class="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">× Filtre actif</button>` : ''}
            <button onclick="LOGS.exportJSON()" class="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Export JSON</button>
            <button onclick="LOGS.clearLogs()" class="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30">Effacer tout</button>
          </div>

          <!-- Logs -->
          <div class="space-y-1">
            ${page.length ? page.map(l => `
              <div class="bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700 hover:border-gray-600 cursor-pointer" onclick="LOGS.showDetail('${l.id}')">
                <div class="flex items-center gap-3">
                  <span class="w-2 h-2 rounded-full flex-shrink-0 ${dotColors[l.level]||'bg-gray-500'}"></span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs px-1.5 py-0.5 rounded ${levelColors[l.level]||'text-gray-400'} font-medium">${l.level}</span>
                      <span class="text-white text-sm truncate">${escapeHtml(l.message)}</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <div class="text-xs text-gray-500">${formatDateTime(l.timestamp)}</div>
                    <div class="text-xs text-gray-600">${escapeHtml(l.user||'')}</div>
                  </div>
                </div>
              </div>
            `).join('') : '<div class="text-center text-gray-500 py-8">Aucun log</div>'}
          </div>

          ${buildPagination(total, this._page, this._perPage, 'p => { LOGS._page=p; LOGS.render(); }')}
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<div class="p-4 text-red-400">${escapeHtml(e.message)}</div>`;
    }
  },

  async showDetail(logId) {
    const logs = await DB.getAll('logs');
    const l = logs.find(lg => lg.id === logId);
    if (!l) return;
    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-4">Détail du log</h3>
        <div class="space-y-3 text-sm">
          <div class="flex gap-3">
            <span class="text-gray-400 w-24">Niveau</span>
            <span class="font-medium ${l.level==='ERROR'?'text-red-400':l.level==='WARNING'?'text-yellow-400':l.level==='SUCCESS'?'text-green-400':'text-blue-400'}">${l.level}</span>
          </div>
          <div class="flex gap-3">
            <span class="text-gray-400 w-24">Date/Heure</span>
            <span class="text-white">${formatDateTime(l.timestamp)}</span>
          </div>
          <div class="flex gap-3">
            <span class="text-gray-400 w-24">Utilisateur</span>
            <span class="text-white">${escapeHtml(l.user||'-')}</span>
          </div>
          <div class="flex gap-3">
            <span class="text-gray-400 w-24">Message</span>
            <span class="text-white">${escapeHtml(l.message)}</span>
          </div>
          ${l.data && Object.keys(l.data).length > 0 ? `
          <div>
            <span class="text-gray-400">Données</span>
            <pre class="mt-2 bg-gray-900 rounded-lg p-3 text-xs text-green-400 overflow-auto max-h-40">${escapeHtml(JSON.stringify(l.data, null, 2))}</pre>
          </div>
          ` : ''}
        </div>
        <button onclick="closeModal()" class="mt-4 w-full py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Fermer</button>
      </div>
    `, { size: 'max-w-lg' });
  },

  async exportJSON() {
    const logs = await DB.getAll('logs');
    logs.sort((a, b) => b.timestamp > a.timestamp ? 1 : -1);
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast(`${logs.length} logs exportés`, 'success');
  },

  clearLogs() {
    showConfirm({
      title: 'Effacer tous les logs',
      message: 'Cette action supprimera tous les logs locaux. Irréversible.',
      icon: 'danger',
      confirmText: 'Effacer',
      onConfirm: async () => {
        await DB.clear('logs');
        showToast('Logs effacés', 'success');
        this.render();
      }
    });
  }
};
