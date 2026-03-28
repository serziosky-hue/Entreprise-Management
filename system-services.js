// system-services.js — Multiposte, permissions, verrous
'use strict';

window.SYS = {
  genPosteId: () => genId('POSTE'),

  defaultPoste(name = 'Nouveau Poste') {
    return {
      id: this.genPosteId(),
      name,
      password: '',
      permissions: {
        dashboard: true, stock: true, sales: true, clients: true,
        credits: true, expenses: true, reports: true, logs: false,
        settings: false, proformas: true,
        stockAdd: true, stockEdit: true, stockDelete: false, stockAdjust: true,
        salesCreate: true, salesCancel: false, creditsPay: true, creditsDelete: false,
        expensesAdd: true, expensesEdit: false, expensesDelete: false,
        configCompany: false, configSecurity: false, configData: false, configPostes: false
      }
    };
  },

  showPosteOverlay() {
    const postes = APP.config?.postes || [];
    const overlay = document.createElement('div');
    overlay.id = 'poste-overlay';
    overlay.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-gray-900';
    overlay.innerHTML = `
      <div class="bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-white">${escapeHtml(APP.config?.name || 'Enterprise')}</h2>
          <p class="text-gray-400 text-sm mt-1">Sélectionnez votre poste</p>
        </div>
        <div class="space-y-2 mb-4">
          ${postes.map(p => `
            <button onclick="SYS._selectPoste('${p.id}')" data-poste-id="${p.id}"
              class="w-full px-4 py-3 bg-gray-700 hover:bg-indigo-600/30 border border-gray-600 hover:border-indigo-500 rounded-xl text-left text-white font-medium transition-colors">
              ${escapeHtml(p.name)}
            </button>
          `).join('')}
        </div>
        <button onclick="SYS._selectAdminPoste()" class="w-full py-2 text-sm text-gray-400 hover:text-white underline">
          Connexion administrateur
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  _selectPoste(posteId) {
    const poste = (APP.config?.postes || []).find(p => p.id === posteId);
    if (!poste) return;
    if (poste.password) {
      showPasswordPrompt(`Mot de passe — ${poste.name}`, (pwd) => {
        if (FM.hashPassword(pwd) === poste.passwordHash) {
          this._applyPoste(poste);
        } else {
          showPasswordPrompt(`Mot de passe — ${poste.name}`, (p2) => {
            if (FM.hashPassword(p2) === poste.passwordHash) {
              this._applyPoste(poste);
            } else {
              showToast('Mot de passe incorrect', 'error');
              this.showPosteOverlay();
            }
          }, 'Mot de passe incorrect');
        }
      });
    } else {
      this._applyPoste(poste);
    }
  },

  _selectAdminPoste() {
    showPasswordPrompt('Mot de passe administrateur', (pwd) => {
      const hash = FM.hashPassword(pwd);
      if (hash === APP.config?.passwordHash) {
        this._applyPoste({ name: 'Admin', id: 'admin', permissions: APP._allPermissions() });
      } else {
        showToast('Mot de passe incorrect', 'error');
      }
    });
  },

  _applyPoste(poste) {
    APP.currentPoste = poste;
    sessionStorage.setItem('emp_poste', JSON.stringify(poste));
    document.getElementById('poste-overlay')?.remove();
    document.querySelectorAll('#poste-name').forEach(el => { el.textContent = poste.name; });
    APP.addLog('INFO', `Connexion poste: ${poste.name}`);
    APP.switchTab('dashboard');
    APP.refreshBadges();
  },

  renderPosteForm(poste = null, onSave) {
    const p = poste || this.defaultPoste();
    const isNew = !poste;
    const perms = p.permissions || {};

    const tabPerms = [
      { key: 'dashboard', label: 'Tableau de bord' }, { key: 'stock', label: 'Stock' },
      { key: 'sales', label: 'Ventes' }, { key: 'clients', label: 'Clients' },
      { key: 'credits', label: 'Crédits' }, { key: 'expenses', label: 'Dépenses' },
      { key: 'proformas', label: 'Proformas' }, { key: 'reports', label: 'Rapports' },
      { key: 'logs', label: 'Journal' }, { key: 'settings', label: 'Paramètres' }
    ];
    const actionPerms = [
      { key: 'stockAdd', label: 'Ajouter produit' }, { key: 'stockEdit', label: 'Modifier produit' },
      { key: 'stockDelete', label: 'Supprimer produit' }, { key: 'stockAdjust', label: 'Ajuster stock' },
      { key: 'salesCreate', label: 'Créer vente' }, { key: 'salesCancel', label: 'Annuler vente' },
      { key: 'creditsPay', label: 'Enregistrer paiement crédit' }, { key: 'creditsDelete', label: 'Supprimer crédit' },
      { key: 'expensesAdd', label: 'Ajouter dépense' }, { key: 'expensesEdit', label: 'Modifier dépense' },
      { key: 'expensesDelete', label: 'Supprimer dépense' }, { key: 'configCompany', label: 'Config. entreprise' },
      { key: 'configSecurity', label: 'Sécurité' }, { key: 'configData', label: 'Backup/Restauration' },
      { key: 'configPostes', label: 'Gérer les postes' }
    ];

    showModal(`
      <div class="p-6">
        <h3 class="text-lg font-bold text-white mb-4">${isNew ? 'Nouveau poste' : `Modifier — ${escapeHtml(p.name)}`}</h3>
        <div class="space-y-3 mb-4">
          <input id="poste-name-input" type="text" value="${escapeHtml(p.name)}" placeholder="Nom du poste"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
          <div>
            <input id="poste-pwd-input" type="password" value="" placeholder="${p.passwordHash ? '🔒 Mot de passe défini — laisser vide pour ne pas changer' : 'Mot de passe (optionnel)'}"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
            ${p.passwordHash && !isNew ? '<div class="text-xs text-green-400 mt-1">✓ Ce poste est protégé par un mot de passe</div>' : ''}
          </div>
        </div>
        <div class="mb-4">
          <div class="text-sm font-medium text-gray-300 mb-2">Onglets accessibles</div>
          <div class="grid grid-cols-2 gap-2">
            ${tabPerms.map(({ key, label }) => `
              <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" class="perm-check rounded" data-key="${key}" ${perms[key] !== false ? 'checked' : ''}>
                ${escapeHtml(label)}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="mb-4">
          <div class="text-sm font-medium text-gray-300 mb-2">Actions autorisées</div>
          <div class="grid grid-cols-2 gap-2">
            ${actionPerms.map(({ key, label }) => `
              <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" class="perm-check rounded" data-key="${key}" ${perms[key] !== false ? 'checked' : ''}>
                ${escapeHtml(label)}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="flex gap-3">
          <button onclick="closeModal()" class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm">Annuler</button>
          <button id="save-poste-btn" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Enregistrer</button>
        </div>
      </div>
    `, { size: 'max-w-2xl' });

    document.getElementById('save-poste-btn').onclick = () => {
      const name = document.getElementById('poste-name-input').value.trim();
      const pwd = document.getElementById('poste-pwd-input').value;
      if (!name) { showToast('Nom requis', 'error'); return; }
      const newPerms = {};
      document.querySelectorAll('.perm-check').forEach(el => { newPerms[el.dataset.key] = el.checked; });
      // Si pwd vide → conserver le passwordHash existant (pas de changement)
      // Si pwd rempli → nouveau hash
      const saved = {
        ...p, name,
        passwordHash: pwd ? FM.hashPassword(pwd) : (p.passwordHash || ''),
        permissions: newPerms
      };
      // Ne jamais stocker le mot de passe brut
      delete saved.password;
      closeModal();
      if (onSave) onSave(saved);
    };
  },

  async savePoste(poste) {
    // S'assurer que postes est bien un tableau
    const postes = Array.isArray(APP.config?.postes) ? [...APP.config.postes] : [];
    const idx = postes.findIndex(p => p.id === poste.id);
    if (idx >= 0) postes[idx] = poste;
    else postes.push(poste);
    APP.config.postes = postes;
    await DB.saveConfig(APP.config);
    // Sauvegarder via FM.saveConfig (gère correctement les postes)
    await FM.saveConfig(APP.config);
    await APP.addLog('INFO', `Poste ${idx >= 0 ? 'modifié' : 'créé'}: ${poste.name}`);
  },

  async deletePoste(posteId) {
    const postes = (Array.isArray(APP.config?.postes) ? APP.config.postes : []).filter(p => p.id !== posteId);
    APP.config.postes = postes;
    await DB.saveConfig(APP.config);
    await FM.saveConfig(APP.config);
    await APP.addLog('INFO', 'Poste supprimé');
  }
};
