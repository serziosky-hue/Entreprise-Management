// clients.js — Gestion des clients
'use strict';

window.CLIENTS = {
  _page: 1, _perPage: 20, _search: '',

  async render() {
    const el = document.getElementById('tab-clients');
    if (!el) return;
    try {
      let items = await DB.getAll('clients');
      items.sort((a, b) => (a.name||'').localeCompare(b.name||''));
      if (this._search) {
        const s = this._search.toLowerCase();
        items = items.filter(c => (c.name||'').toLowerCase().includes(s) || (c.phone||'').includes(s) || (c.nif||'').includes(s));
      }
      const total = items.length;
      const start = (this._page - 1) * this._perPage;
      const page = items.slice(start, start + this._perPage);

      el.innerHTML = `
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h2 class="text-lg font-bold text-white">Clients (${total})</h2>
            <button onclick="CLIENTS.showForm()" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              Ajouter
            </button>
          </div>
          <input type="search" value="${escapeHtml(this._search)}" placeholder="Rechercher par nom, téléphone, NIF..." oninput="CLIENTS._search=this.value;CLIENTS._page=1;CLIENTS.render()"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">

          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="border-b border-gray-700 text-left">
                <th class="py-2 pr-4 text-gray-400 font-medium">Nom</th>
                <th class="py-2 pr-4 text-gray-400 font-medium">Téléphone</th>
                <th class="py-2 pr-4 text-gray-400 font-medium">Email</th>
                <th class="py-2 pr-4 text-gray-400 font-medium">NIF</th>
                <th class="py-2 text-gray-400 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                ${page.length ? page.map(c => `
                  <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td class="py-2 pr-4 font-medium text-white cursor-pointer hover:text-indigo-400" onclick="CLIENTS.showCard('${c.id}')">${escapeHtml(c.name)}</td>
                    <td class="py-2 pr-4 text-gray-300">${escapeHtml(c.phone||'-')}</td>
                    <td class="py-2 pr-4 text-gray-300">${escapeHtml(c.email||'-')}</td>
                    <td class="py-2 pr-4 text-gray-300">${escapeHtml(c.nif||'-')}</td>
                    <td class="py-2">
                      <div class="flex gap-1">
                        <button onclick="CLIENTS.showCard('${c.id}')" title="Fiche" class="p-1 text-blue-400 hover:text-blue-300">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg>
                        </button>
                        <button onclick="CLIENTS.showForm('${c.id}')" title="Modifier" class="p-1 text-gray-400 hover:text-white">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
                        </button>
                        <button onclick="CLIENTS.confirmDelete('${c.id}')" title="Supprimer" class="p-1 text-red-400 hover:text-red-300">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="5" class="py-8 text-center text-gray-500">Aucun client</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="sm:hidden space-y-2">
            ${page.map(c => `
              <div class="bg-gray-800 rounded-xl border border-gray-700 p-3 flex items-center justify-between cursor-pointer" onclick="CLIENTS.showCard('${c.id}')">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-white truncate">${escapeHtml(c.name)}</div>
                  <div class="text-xs text-gray-400">${escapeHtml(c.phone||'')} ${c.email?'· '+escapeHtml(c.email):''}</div>
                </div>
                <div class="flex gap-1 ml-2">
                  <button onclick="event.stopPropagation();CLIENTS.showCard('${c.id}')" title="Fiche" class="p-1.5 text-blue-400 hover:text-blue-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg>
                  </button>
                  <button onclick="event.stopPropagation();CLIENTS.showForm('${c.id}')" title="Modifier" class="p-1.5 text-gray-400 hover:text-white">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
                  </button>
                  <button onclick="event.stopPropagation();CLIENTS.confirmDelete('${c.id}')" title="Supprimer" class="p-1.5 text-red-400 hover:text-red-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          ${buildPagination(total, this._page, this._perPage, 'p => { CLIENTS._page=p; CLIENTS.render(); }')}
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<div class="p-4 text-red-400">${escapeHtml(e.message)}</div>`;
    }
  },

  showForm(id = null) {
    const load = id ? DB.get('clients', id) : Promise.resolve(null);
    load.then(c => {
      showModal(`
        <div class="p-6">
          <h3 class="text-lg font-bold text-white mb-4">${id ? 'Modifier client' : 'Nouveau client'}</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-xs text-gray-400">Nom *</label>
              <input id="c-name" value="${escapeHtml(c?.name||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div>
              <label class="text-xs text-gray-400">Téléphone</label>
              <input id="c-phone" value="${escapeHtml(c?.phone||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div>
              <label class="text-xs text-gray-400">Email</label>
              <input id="c-email" type="email" value="${escapeHtml(c?.email||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div>
              <label class="text-xs text-gray-400">NIF</label>
              <input id="c-nif" value="${escapeHtml(c?.nif||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div>
              <label class="text-xs text-gray-400">STAT</label>
              <input id="c-stat" value="${escapeHtml(c?.stat||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div class="col-span-2">
              <label class="text-xs text-gray-400">Adresse</label>
              <input id="c-address" value="${escapeHtml(c?.address||'')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">
            </div>
            <div class="col-span-2">
              <label class="text-xs text-gray-400">Notes</label>
              <textarea id="c-notes" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mt-1">${escapeHtml(c?.notes||'')}</textarea>
            </div>
          </div>
          <div class="flex gap-3 mt-4">
            <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Annuler</button>
            <button onclick="CLIENTS.save('${id||''}')" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Enregistrer</button>
          </div>
        </div>
      `);
    });
  },

  async save(id) {
    const name = document.getElementById('c-name').value.trim();
    if (!name) { showToast('Nom requis', 'error'); return; }
    const now = new Date().toISOString();
    const existing = id ? await DB.get('clients', id) : null;
    const client = {
      id: id || genId('CLI'),
      name,
      phone: document.getElementById('c-phone').value.trim(),
      email: document.getElementById('c-email').value.trim(),
      nif: document.getElementById('c-nif').value.trim(),
      stat: document.getElementById('c-stat').value.trim(),
      address: document.getElementById('c-address').value.trim(),
      notes: document.getElementById('c-notes').value.trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    closeModal();
    await DB.put('clients', client);
    await SM.writeNow('clients', client.id, 'set', client);
    await APP.addLog('SUCCESS', `Client ${id ? 'modifié' : 'ajouté'}: ${name}`);
    showToast(`Client ${id ? 'modifié' : 'ajouté'}`, 'success');
    this.render();
  },

  async showCard(id) {
    const c = await DB.get('clients', id);
    if (!c) return;
    const ventes = (await DB.getAll('ventes')).filter(v => v.clientId === id && v.status !== 'cancelled');
    const credits = (await DB.getAll('credits')).filter(cr => cr.clientId === id);
    const ca = ventes.reduce((s, v) => s + (v.total || 0), 0);
    const creditBalance = credits.filter(cr => cr.status === 'pending').reduce((s, cr) => s + (cr.balance || 0), 0);

    showModal(`
      <div class="p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-bold text-white">${escapeHtml(c.name)}</h3>
            ${c.phone ? `<div class="text-gray-400 text-sm">${escapeHtml(c.phone)}</div>` : ''}
            ${c.email ? `<div class="text-gray-400 text-sm">${escapeHtml(c.email)}</div>` : ''}
          </div>
          <button onclick="closeModal();setTimeout(()=>CLIENTS.showForm('${id}'),50)" class="p-2 text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 18l-3 1 1-3 9.879-9.879z"/></svg>
          </button>
        </div>
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-gray-700/50 rounded-xl p-3 text-center">
            <div class="text-2xl font-bold text-indigo-400">${ventes.length}</div>
            <div class="text-xs text-gray-400">Factures</div>
          </div>
          <div class="bg-gray-700/50 rounded-xl p-3 text-center">
            <div class="text-lg font-bold text-green-400">${formatCurrency(ca)}</div>
            <div class="text-xs text-gray-400">CA total</div>
          </div>
          <div class="bg-gray-700/50 rounded-xl p-3 text-center">
            <div class="text-lg font-bold ${creditBalance > 0 ? 'text-orange-400' : 'text-gray-400'}">${formatCurrency(creditBalance)}</div>
            <div class="text-xs text-gray-400">Crédits</div>
          </div>
        </div>
        ${c.address ? `<div class="text-sm text-gray-400 mb-2">📍 ${escapeHtml(c.address)}</div>` : ''}
        ${c.nif ? `<div class="text-sm text-gray-400 mb-2">NIF: ${escapeHtml(c.nif)}</div>` : ''}
        ${c.notes ? `<div class="text-sm text-gray-400 bg-gray-700/30 rounded p-2 mt-2">${escapeHtml(c.notes)}</div>` : ''}
        <button onclick="closeModal()" class="mt-4 w-full py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Fermer</button>
      </div>
    `, { size: 'max-w-md' });
  },

  async confirmDelete(id) {
    const c = await DB.get('clients', id);
    const credits = (await DB.getAll('credits')).filter(cr => cr.clientId === id && cr.status === 'pending');
    if (credits.length > 0) { showToast('Impossible: client a des crédits en attente', 'error'); return; }
    showConfirm({
      title: 'Supprimer client',
      message: `Supprimer "${c?.name}" ?`,
      icon: 'danger',
      confirmText: 'Supprimer',
      onConfirm: async () => {
        await DB.delete('clients', id);
        await SM.writeNow('clients', id, 'delete');
        await APP.addLog('WARNING', `Client supprimé: ${c?.name}`);
        showToast('Client supprimé', 'success');
        this.render();
      }
    });
  }
};
