// hr.js — Ressources Humaines : Employés, Présences, Paie
'use strict';

window.HR = {
  _view: 'employees', // 'employees' | 'attendance' | 'payroll' | 'payroll-history' | 'form-employee' | 'holidays'
  _editId: null,
  _attendanceMonth: new Date().toISOString().slice(0, 7),
  _payrollMonth: new Date().toISOString().slice(0, 7),
  _payHistoryEmpId: null,

  async render() {
    const el = document.getElementById('tab-hr');
    if (!el) return;
    const employees = await DB.getAll('employes');
    const active    = employees.filter(e => e.status !== 'inactive');
    const currency  = APP.config?.currency || 'Ar';

    el.innerHTML = `
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-bold text-white">Ressources Humaines</h1>
            <p class="text-sm text-gray-400 mt-0.5">${active.length} employé(s) actif(s)</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button onclick="HR._setView('employees')"    class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='employees'||this._view==='form-employee'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">👥 Employés</button>
            <button onclick="HR._setView('attendance')"   class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='attendance'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">📅 Présences</button>
            <button onclick="HR._setView('payroll')"      class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='payroll'||this._view==='payroll-history'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">💰 Paie</button>
            <button onclick="HR._setView('holidays')"     class="px-3 py-2 rounded-lg text-sm font-medium ${this._view==='holidays'?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300 hover:bg-gray-600'}">🎉 Jours fériés</button>
            ${this._view==='employees' ? '<button onclick="HR._setView(\'form-employee\')" class="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white">+ Employé</button>' : ''}
            ${this._view==='employees' ? '<button onclick="HR.printEmployeeList()" class="px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-300">🖨️ Liste</button>' : ''}
          </div>
        </div>
        <div id="hr-content"></div>
      </div>`;

    const content = document.getElementById('hr-content');
    content.innerHTML = await this._renderView(employees, currency);
  },

  async _renderView(employees, currency) {
    switch (this._view) {
      case 'employees':       return this._renderEmployees(employees, currency);
      case 'form-employee':   return this._renderEmployeeForm();
      case 'attendance':      return await this._renderAttendance(employees);
      case 'payroll':         return await this._renderPayroll(employees, currency);
      case 'payroll-history': return await this._renderPayrollHistory(currency);
      case 'holidays':        return await this._renderHolidays();
      default: return this._renderEmployees(employees, currency);
    }
  },

  _setView(v) { this._view = v; this._editId = null; this.render(); },

  // ─── LISTE EMPLOYÉS ───────────────────────────────────────────────────────
  _renderEmployees(employees, currency) {
    if (employees.length === 0) return `
      <div class="text-center py-16 text-gray-400">
        <div class="text-5xl mb-3">👥</div>
        <div class="text-base font-medium">Aucun employé enregistré</div>
        <button onclick="HR._setView('form-employee')" class="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Ajouter un employé</button>
      </div>`;

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${employees.map(e => `
          <div class="bg-gray-800 rounded-2xl p-4 border border-gray-700/50 ${e.status==='inactive'?'opacity-60':''}">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center text-lg font-bold text-indigo-300">${escapeHtml((e.name||'?')[0].toUpperCase())}</div>
                <div>
                  <div class="font-semibold text-white text-sm">${escapeHtml(e.name)}</div>
                  <div class="text-xs text-gray-400">${escapeHtml(e.role||'—')}</div>
                </div>
              </div>
              <div class="flex gap-1">
                <button onclick="HR.editEmployee('${e.id}')" class="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs">✏️</button>
                <button onclick="HR.deleteEmployee('${e.id}')" class="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 text-xs">🗑️</button>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-2 gap-2">
              <div>
                <div class="text-xs text-gray-400">Salaire de base</div>
                <div class="text-sm font-medium text-white">${formatCurrency(e.baseSalary||0, currency)}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-400">Solde congés</div>
                <div class="text-sm font-medium text-yellow-300">${e.leaveBalance || 0} j</div>
              </div>
            </div>
            ${e.phone ? `<div class="text-xs text-gray-400 mt-1">📞 ${escapeHtml(e.phone)}</div>` : ''}
            ${e.hireDate ? `<div class="text-xs text-gray-400 mt-0.5">📅 Depuis ${formatDate(e.hireDate)}</div>` : ''}
            <div class="flex items-center justify-between mt-2">
              <span class="px-2 py-0.5 rounded-full text-xs ${e.status==='inactive'?'bg-gray-700 text-gray-400':'bg-green-900/30 text-green-400'}">${e.status==='inactive'?'Inactif':'Actif'}</span>
              <button onclick="HR._showPayHistory('${e.id}')" class="text-xs text-indigo-400 hover:text-indigo-300">Historique paies →</button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  // ─── FORMULAIRE EMPLOYÉ ───────────────────────────────────────────────────
  async _renderEmployeeForm() {
    const e = this._editId ? await DB.get('employes', this._editId) : null;
    return `
      <div class="max-w-lg mx-auto bg-gray-800 rounded-2xl p-6">
        <h2 class="text-base font-semibold text-white mb-5">${e ? 'Modifier l\'employé' : 'Nouvel employé'}</h2>
        <div class="space-y-3">
          <div><label class="text-xs text-gray-400">Nom complet *</label><input id="e-name" type="text" value="${escapeHtml(e?.name||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-gray-400">Poste / Rôle</label><input id="e-role" type="text" value="${escapeHtml(e?.role||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
            <div><label class="text-xs text-gray-400">Salaire de base</label><input id="e-salary" type="number" value="${e?.baseSalary||0}" min="0" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-gray-400">Téléphone</label><input id="e-phone" type="text" value="${escapeHtml(e?.phone||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
            <div><label class="text-xs text-gray-400">Date d'embauche</label><input id="e-hiredate" type="date" value="${e?.hireDate||''}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-gray-400">Email</label><input id="e-email" type="email" value="${escapeHtml(e?.email||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
            <div><label class="text-xs text-gray-400">Solde congés (jours)</label><input id="e-leave" type="number" value="${e?.leaveBalance||0}" min="0" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          </div>
          <div><label class="text-xs text-gray-400">Adresse</label><input id="e-address" type="text" value="${escapeHtml(e?.address||'')}" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"></div>
          <div>
            <label class="text-xs text-gray-400">Statut</label>
            <select id="e-status" class="w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="active"   ${(!e||e.status==='active')?'selected':''}>Actif</option>
              <option value="inactive" ${e?.status==='inactive'?'selected':''}>Inactif</option>
            </select>
          </div>
          <div class="flex gap-3 mt-4">
            <button onclick="HR._setView('employees')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Annuler</button>
            <button onclick="HR.saveEmployee()" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Enregistrer</button>
          </div>
        </div>
      </div>`;
  },

  // ─── PRÉSENCES ────────────────────────────────────────────────────────────
  async _renderAttendance(employees) {
    const month   = this._attendanceMonth;
    const active  = employees.filter(e => e.status !== 'inactive');
    const holidays = await this._getHolidaysForMonth(month);
    const allPresences   = await DB.getAll('presences');
    const monthPresences = allPresences.filter(p => p.date?.startsWith(month));
    const presMap = {};
    monthPresences.forEach(p => { presMap[`${p.employeId}_${p.date}`] = p.status; });

    const [yr, mo] = month.split('-');
    const daysInMonth = new Date(parseInt(yr), parseInt(mo), 0).getDate();
    const days = Array.from({length:daysInMonth},(_,i)=>{
      const d = String(i+1).padStart(2,'0');
      return `${yr}-${mo}-${d}`;
    });
    const workDays = days.filter(d => new Date(d).getDay() !== 0);
    
    // Diviser les jours en 2 lignes intelligentes
    const midPoint = Math.ceil(workDays.length / 2);
    const firstRowDays = workDays.slice(0, midPoint);
    const secondRowDays = workDays.slice(midPoint);
    
    const STATUS_OPTS = [
      {v:'',     label:'—'},
      {v:'present', label:'P', cls:'bg-green-700 text-green-200'},
      {v:'absent',  label:'A', cls:'bg-red-700 text-red-200'},
      {v:'leave',   label:'C', cls:'bg-yellow-700 text-yellow-200'},
      {v:'holiday', label:'F', cls:'bg-blue-700 text-blue-200'},
    ];

    if (active.length === 0) return '<div class="text-center py-12 text-gray-400">Aucun employé actif.</div>';

    return `
      <div>
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <input type="month" id="att-month" value="${month}" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" onchange="HR._attendanceMonth=this.value;HR.render()">
          <button onclick="HR.saveAllAttendance('${month}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">💾 Enregistrer</button>
          ${holidays.length>0 ? `<span class="text-xs text-blue-400">${holidays.length} jour(s) férié(s) ce mois</span>` : ''}
          <div class="flex gap-2 text-xs text-gray-400">
            <span class="px-2 py-0.5 rounded bg-green-700 text-green-200">P</span>=Présent
            <span class="px-2 py-0.5 rounded bg-red-700 text-red-200">A</span>=Absent
            <span class="px-2 py-0.5 rounded bg-yellow-700 text-yellow-200">C</span>=Congé
            <span class="px-2 py-0.5 rounded bg-blue-700 text-blue-200">F</span>=Férié
          </div>
        </div>
        
        <!-- Première ligne du calendrier -->
        <div class="bg-gray-800 rounded-2xl overflow-x-auto mb-4">
          <table class="text-xs w-full">
            <thead class="bg-gray-700/50">
              <tr>
                <th class="text-left px-3 py-2 text-gray-400 sticky left-0 bg-gray-700/80 z-10 min-w-[130px]">Employé</th>
                ${firstRowDays.map(d => {
                  const isHol = holidays.includes(d);
                  const day   = new Date(d).getDay();
                  const num   = parseInt(d.split('-')[2]);
                  return `<th class="px-1 py-2 text-center min-w-[28px] ${isHol?'text-blue-400':day===6?'text-orange-400':'text-gray-400'}" title="${isHol?'Jour férié':''}">${num}${isHol?'*':''}</th>`;
                }).join('')}
                <th class="px-3 py-2 text-center text-green-400 min-w-[36px]">P</th>
                <th class="px-3 py-2 text-center text-red-400 min-w-[36px]">A</th>
                <th class="px-3 py-2 text-center text-yellow-400 min-w-[36px]">C</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${active.map(emp => {
                const counts = {present:0, absent:0, leave:0};
                const cells = firstRowDays.map(date => {
                  const isHol = holidays.includes(date);
                  const stored = presMap[`${emp.id}_${date}`];
                  const status = stored || (isHol ? 'holiday' : '');
                  if (status==='present') counts.present++;
                  if (status==='absent')  counts.absent++;
                  if (status==='leave')   counts.leave++;
                  const opt = STATUS_OPTS.find(o=>o.v===status);
                  return `<td class="px-1 py-1 text-center ${isHol?'bg-blue-900/10':''}"><select data-emp="${emp.id}" data-date="${date}" class="att-select w-6 bg-transparent border-none text-center text-xs cursor-pointer rounded ${opt?.cls||''}" onchange="HR._onAttChange(this)">${STATUS_OPTS.map(o=>`<option value="${o.v}" ${o.v===status?'selected':''}>${o.label}</option>`).join('')}</select></td>`;
                }).join('');
                return `<tr class="hover:bg-gray-700/20">
                  <td class="px-3 py-2 text-white font-medium sticky left-0 bg-gray-800 z-10">${escapeHtml(emp.name)}<div class="text-gray-500">${escapeHtml(emp.role||'')}</div></td>
                  ${cells}
                  <td class="px-3 py-2 text-center text-green-400 font-bold">${counts.present}</td>
                  <td class="px-3 py-2 text-center text-red-400 font-bold">${counts.absent}</td>
                  <td class="px-3 py-2 text-center text-yellow-400 font-bold">${counts.leave}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Deuxième ligne du calendrier -->
        <div class="bg-gray-800 rounded-2xl overflow-x-auto">
          <table class="text-xs w-full">
            <thead class="bg-gray-700/50">
              <tr>
                <th class="text-left px-3 py-2 text-gray-400 sticky left-0 bg-gray-700/80 z-10 min-w-[130px]">Employé</th>
                ${secondRowDays.map(d => {
                  const isHol = holidays.includes(d);
                  const day   = new Date(d).getDay();
                  const num   = parseInt(d.split('-')[2]);
                  return `<th class="px-1 py-2 text-center min-w-[28px] ${isHol?'text-blue-400':day===6?'text-orange-400':'text-gray-400'}" title="${isHol?'Jour férié':''}">${num}${isHol?'*':''}</th>`;
                }).join('')}
                <th class="px-3 py-2 text-center text-green-400 min-w-[36px]">P</th>
                <th class="px-3 py-2 text-center text-red-400 min-w-[36px]">A</th>
                <th class="px-3 py-2 text-center text-yellow-400 min-w-[36px]">C</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${active.map(emp => {
                const counts = {present:0, absent:0, leave:0};
                const cells = secondRowDays.map(date => {
                  const isHol = holidays.includes(date);
                  const stored = presMap[`${emp.id}_${date}`];
                  const status = stored || (isHol ? 'holiday' : '');
                  if (status==='present') counts.present++;
                  if (status==='absent')  counts.absent++;
                  if (status==='leave')   counts.leave++;
                  const opt = STATUS_OPTS.find(o=>o.v===status);
                  return `<td class="px-1 py-1 text-center ${isHol?'bg-blue-900/10':''}"><select data-emp="${emp.id}" data-date="${date}" class="att-select w-6 bg-transparent border-none text-center text-xs cursor-pointer rounded ${opt?.cls||''}" onchange="HR._onAttChange(this)">${STATUS_OPTS.map(o=>`<option value="${o.v}" ${o.v===status?'selected':''}>${o.label}</option>`).join('')}</select></td>`;
                }).join('');
                return `<tr class="hover:bg-gray-700/20">
                  <td class="px-3 py-2 text-white font-medium sticky left-0 bg-gray-800 z-10">${escapeHtml(emp.name)}<div class="text-gray-500">${escapeHtml(emp.role||'')}</div></td>
                  ${cells}
                  <td class="px-3 py-2 text-center text-green-400 font-bold">${counts.present}</td>
                  <td class="px-3 py-2 text-center text-red-400 font-bold">${counts.absent}</td>
                  <td class="px-3 py-2 text-center text-yellow-400 font-bold">${counts.leave}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  async _getHolidaysForMonth(month) {
    const all = await DB.getAll('taxConfig'); // réutilise taxConfig comme config générale
    const stored = all.find(c => c.id === 'holidays');
    const list = stored?.holidays || [];
    return list.filter(d => d.startsWith(month));
  },

  _onAttChange(sel) {
    const vals = { present:'bg-green-700 text-green-200', absent:'bg-red-700 text-red-200', leave:'bg-yellow-700 text-yellow-200', holiday:'bg-blue-700 text-blue-200' };
    sel.className = `att-select w-6 bg-transparent border-none text-center text-xs cursor-pointer rounded ${vals[sel.value]||''}`;
  },

  async saveAllAttendance(month) {
    const employees = await DB.getAll('employes');
    const selects = document.querySelectorAll('.att-select');
    for (const sel of selects) {
      const employeId = sel.dataset.emp;
      const date      = sel.dataset.date;
      const status    = sel.value;
      if (!status) continue;
      const id = `PRE_${employeId}_${date}`;
      await DB.put('presences', { id, employeId, date, status, createdAt: new Date().toISOString() });
      // Décrémenter solde congés si congé marqué
      if (status === 'leave') {
        const emp = employees.find(e => e.id === employeId);
        if (emp) {
          const existing = await DB.get('presences', id);
          // Seulement si c'est un nouveau congé (pas déjà marqué 'leave')
          if (existing?.status !== 'leave') {
            emp.leaveBalance = Math.max(0, (emp.leaveBalance||0) - 1);
            await DB.put('employes', emp);
          }
        }
      }
    }
    showToast('Présences enregistrées', 'success');
  },

  // ─── PAIE ─────────────────────────────────────────────────────────────────
  async _renderPayroll(employees, currency) {
    const month   = this._payrollMonth;
    const active  = employees.filter(e => e.status !== 'inactive');
    const allPresences   = await DB.getAll('presences');
    const monthPresences = allPresences.filter(p => p.date?.startsWith(month));
    const allPaies  = await DB.getAll('paies');
    const monthPaies = allPaies.filter(p => p.period === month);
    const paieMap   = Object.fromEntries(monthPaies.map(p => [p.employeId, p]));

    const [yr, mo] = month.split('-');
    const daysInMonth = new Date(parseInt(yr), parseInt(mo), 0).getDate();
    let workingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      if (new Date(parseInt(yr), parseInt(mo)-1, i).getDay() !== 0) workingDays++;
    }

    return `
      <div>
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <input type="month" id="pay-month" value="${month}" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" onchange="HR._payrollMonth=this.value;HR.render()">
          <button onclick="HR.generatePayroll('${month}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">⚙️ Calculer les bulletins</button>
          <button onclick="HR._setView('payroll-history')" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">📋 Historique</button>
        </div>
        ${active.length === 0 ? '<div class="text-center py-12 text-gray-400">Aucun employé actif.</div>' : `
        <div class="bg-gray-800 rounded-2xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-700/50">
              <tr class="text-gray-400 text-xs">
                <th class="text-left px-4 py-3">Employé</th>
                <th class="text-center px-3 py-3">Présences</th>
                <th class="text-right px-3 py-3">Base</th>
                <th class="text-right px-3 py-3">Primes</th>
                <th class="text-right px-3 py-3">Retenues</th>
                <th class="text-right px-3 py-3">Net</th>
                <th class="text-center px-3 py-3">Statut</th>
                <th class="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              ${active.map(emp => {
                const paie = paieMap[emp.id];
                const presentDays = paie?.presentDays ?? monthPresences.filter(p=>p.employeId===emp.id&&p.status==='present').length;
                const baseSalary  = emp.baseSalary||0;
                const grossSalary = workingDays>0 ? (baseSalary/workingDays)*presentDays : baseSalary;
                const bonuses     = paie?.bonuses||0;
                const deductions  = paie?.deductions||0;
                const net         = grossSalary + bonuses - deductions;
                const status      = paie?.status||'draft';
                return `<tr class="hover:bg-gray-700/30">
                  <td class="px-4 py-3"><div class="font-medium text-white">${escapeHtml(emp.name)}</div><div class="text-xs text-gray-400">${escapeHtml(emp.role||'')}</div></td>
                  <td class="px-3 py-3 text-center text-gray-300 text-xs">${presentDays}/${workingDays}</td>
                  <td class="px-3 py-3 text-right text-gray-300 text-xs">${formatCurrency(baseSalary,currency)}</td>
                  <td class="px-3 py-3 text-right text-green-400"><input type="number" min="0" value="${bonuses}" data-emp="${emp.id}" data-field="bonuses" class="paie-input w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-xs text-green-400" onchange="HR._updatePayRow('${emp.id}',${presentDays},${workingDays},${baseSalary})"></td>
                  <td class="px-3 py-3 text-right text-red-400"><input type="number" min="0" value="${deductions}" data-emp="${emp.id}" data-field="deductions" class="paie-input w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-xs text-red-400" onchange="HR._updatePayRow('${emp.id}',${presentDays},${workingDays},${baseSalary})"></td>
                  <td id="pay-net-${emp.id}" class="px-3 py-3 text-right font-bold text-white">${formatCurrency(net,currency)}</td>
                  <td class="px-3 py-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs ${status==='paid'?'bg-green-900/40 text-green-400':'bg-gray-700 text-gray-400'}">${status==='paid'?'Payé':'Brouillon'}</span></td>
                  <td class="px-3 py-3">
                    <div class="flex gap-1 justify-end">
                      <button onclick="HR.savePaie('${emp.id}','${month}',${workingDays},'draft')" class="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs">💾</button>
                      <button onclick="HR.savePaie('${emp.id}','${month}',${workingDays},'paid')"  class="px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs">✓ Payer</button>
                      <button onclick="HR.printPayslip('${emp.id}','${month}')" class="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs">🖨️</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>`;
  },

  // ─── HISTORIQUE DES PAIES ────────────────────────────────────────────────
  async _renderPayrollHistory(currency) {
    const allPaies = await DB.getAll('paies');
    const sorted   = [...allPaies].sort((a,b) => (b.period||'').localeCompare(a.period||''));
    if (sorted.length===0) return `
      <div class="text-center py-12 text-gray-400">
        <button onclick="HR._setView('payroll')" class="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">← Retour</button>
        <div>Aucun bulletin de paie enregistré.</div>
      </div>`;

    // Grouper par période
    const byPeriod = {};
    sorted.forEach(p => { (byPeriod[p.period]||=(byPeriod[p.period]=[])).push(p); });

    const empId = this._payHistoryEmpId;
    const filtered = empId ? sorted.filter(p=>p.employeId===empId) : sorted;
    const employees = await DB.getAll('employes');

    return `
      <div>
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <button onclick="HR._setView('payroll')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">← Retour</button>
          <select onchange="HR._payHistoryEmpId=this.value||null;HR._view='payroll-history';HR.render()" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs">
            <option value="">Tous les employés</option>
            ${employees.map(e=>`<option value="${e.id}" ${empId===e.id?'selected':''}>${escapeHtml(e.name)}</option>`).join('')}
          </select>
          <span class="text-xs text-gray-400">${filtered.length} bulletin(s)</span>
        </div>
        <div class="bg-gray-800 rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-700/50 text-gray-400 text-xs">
                <tr><th class="text-left px-4 py-3">Période</th><th class="text-left px-4 py-3">Employé</th><th class="text-right px-3 py-3">Base</th><th class="text-right px-3 py-3">Primes</th><th class="text-right px-3 py-3">Net</th><th class="text-center px-3 py-3">Statut</th><th class="px-3 py-3"></th></tr>
              </thead>
              <tbody class="divide-y divide-gray-700/50">
                ${filtered.map(p => {
                  const [yr,mo] = (p.period||'').split('-');
                  const label = yr&&mo ? new Date(parseInt(yr),parseInt(mo)-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}) : p.period;
                  return `<tr class="hover:bg-gray-700/30">
                    <td class="px-4 py-3 text-white text-xs">${label}</td>
                    <td class="px-4 py-3 text-gray-300">${escapeHtml(p.employeName||'—')}</td>
                    <td class="px-3 py-3 text-right text-gray-300 text-xs">${formatCurrency(p.baseSalary||0,currency)}</td>
                    <td class="px-3 py-3 text-right text-green-400 text-xs">${formatCurrency(p.bonuses||0,currency)}</td>
                    <td class="px-3 py-3 text-right font-bold text-white">${formatCurrency(p.netSalary||0,currency)}</td>
                    <td class="px-3 py-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs ${p.status==='paid'?'bg-green-900/40 text-green-400':'bg-gray-700 text-gray-400'}">${p.status==='paid'?'Payé':'Brouillon'}</span></td>
                    <td class="px-3 py-3"><button onclick="HR.printPayslip('${p.employeId}','${p.period}')" class="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300">🖨️</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  _showPayHistory(empId) {
    this._payHistoryEmpId = empId;
    this._view = 'payroll-history';
    this.render();
  },

  // ─── JOURS FÉRIÉS ─────────────────────────────────────────────────────────
  async _renderHolidays() {
    const stored = await DB.get('taxConfig', 'holidays');
    const list   = (stored?.holidays || []).sort();
    return `
      <div class="max-w-lg mx-auto">
        <div class="bg-gray-800 rounded-2xl p-5">
          <h2 class="text-base font-semibold text-white mb-4">🎉 Jours fériés configurables</h2>
          <p class="text-xs text-gray-400 mb-4">Ces dates seront automatiquement pré-remplies comme "Férié (F)" dans la grille de présences.</p>
          <div class="flex gap-2 mb-4">
            <input id="hol-date" type="date" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
            <input id="hol-label" type="text" placeholder="Libellé (ex: Noël)" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
            <button onclick="HR.addHoliday()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">Ajouter</button>
          </div>
          <div class="space-y-2">
            ${list.length === 0 ? '<div class="text-center py-6 text-gray-500 text-sm">Aucun jour férié configuré.</div>' :
              list.map(d => `
                <div class="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2">
                  <div>
                    <span class="text-white text-sm">${formatDate(typeof d==='object'?d.date:d)}</span>
                    ${typeof d==='object'&&d.label ? `<span class="text-gray-400 text-xs ml-2">${escapeHtml(d.label)}</span>` : ''}
                  </div>
                  <button onclick="HR.removeHoliday('${typeof d==='object'?d.date:d}')" class="text-red-400 hover:text-red-300 text-sm">×</button>
                </div>`).join('')}
          </div>
        </div>
      </div>`;
  },

  async addHoliday() {
    const date  = document.getElementById('hol-date')?.value;
    const label = document.getElementById('hol-label')?.value.trim() || '';
    if (!date) { showToast('Sélectionnez une date', 'warning'); return; }
    const stored = await DB.get('taxConfig', 'holidays') || { id: 'holidays', holidays: [] };
    const list = stored.holidays || [];
    if (list.some(d => (typeof d==='object'?d.date:d)===date)) { showToast('Date déjà enregistrée', 'warning'); return; }
    list.push(label ? { date, label } : date);
    stored.holidays = list;
    await DB.put('taxConfig', stored);
    showToast('Jour férié ajouté', 'success');
    this.render();
  },

  async removeHoliday(date) {
    const stored = await DB.get('taxConfig', 'holidays');
    if (!stored) return;
    stored.holidays = (stored.holidays||[]).filter(d => (typeof d==='object'?d.date:d) !== date);
    await DB.put('taxConfig', stored);
    this.render();
  },

  // ─── PAIE : helpers ───────────────────────────────────────────────────────
  _updatePayRow(empId, presentDays, workingDays, baseSalary) {
    const bonuses    = parseFloat(document.querySelector(`[data-emp="${empId}"][data-field="bonuses"]`)?.value||0);
    const deductions = parseFloat(document.querySelector(`[data-emp="${empId}"][data-field="deductions"]`)?.value||0);
    const gross = workingDays>0 ? (baseSalary/workingDays)*presentDays : baseSalary;
    const net   = gross + bonuses - deductions;
    const el = document.getElementById(`pay-net-${empId}`);
    if (el) el.textContent = formatCurrency(net, APP.config?.currency||'Ar');
  },

  async generatePayroll(month) {
    const employees = await DB.getAll('employes');
    const active    = employees.filter(e => e.status !== 'inactive');
    const allPres   = await DB.getAll('presences');
    const monthPres = allPres.filter(p => p.date?.startsWith(month));
    const [yr,mo]   = month.split('-');
    const daysInMo  = new Date(parseInt(yr), parseInt(mo), 0).getDate();
    let workingDays = 0;
    for (let i=1;i<=daysInMo;i++) { if (new Date(parseInt(yr),parseInt(mo)-1,i).getDay()!==0) workingDays++; }
    for (const emp of active) {
      const existing = await DB.get('paies', `PAI_${emp.id}_${month}`);
      if (existing?.status==='paid') continue;
      const presentDays = monthPres.filter(p=>p.employeId===emp.id&&p.status==='present').length;
      const grossSalary = workingDays>0 ? ((emp.baseSalary||0)/workingDays)*presentDays : (emp.baseSalary||0);
      await DB.put('paies', {
        id:`PAI_${emp.id}_${month}`,
        employeId: emp.id, employeName: emp.name, period: month,
        baseSalary: emp.baseSalary||0, workingDays, presentDays, grossSalary,
        bonuses: existing?.bonuses||0, deductions: existing?.deductions||0,
        netSalary: grossSalary+(existing?.bonuses||0)-(existing?.deductions||0),
        status: 'draft', createdAt: new Date().toISOString()
      });
    }
    showToast('Bulletins générés', 'success');
    this.render();
  },

  async savePaie(empId, month, workingDays, status) {
    const emp = await DB.get('employes', empId);
    if (!emp) return;
    const allPres     = await DB.getAll('presences');
    const presentDays = allPres.filter(p=>p.employeId===empId&&p.date?.startsWith(month)&&p.status==='present').length;
    const grossSalary = workingDays>0 ? ((emp.baseSalary||0)/workingDays)*presentDays : (emp.baseSalary||0);
    const bonuses     = parseFloat(document.querySelector(`[data-emp="${empId}"][data-field="bonuses"]`)?.value||0);
    const deductions  = parseFloat(document.querySelector(`[data-emp="${empId}"][data-field="deductions"]`)?.value||0);
    const netSalary   = grossSalary + bonuses - deductions;
    await DB.put('paies', {
      id: `PAI_${empId}_${month}`,
      employeId: empId, employeName: emp.name, period: month,
      baseSalary: emp.baseSalary||0, workingDays, presentDays, grossSalary,
      bonuses, deductions, netSalary, status,
      paidAt: status==='paid' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    });
    
    // Enregistrer en caisse si caisse ouverte et salaire payé (sortie)
    if (typeof CASHIER !== 'undefined' && CASHIER._activeCaisseId && status === 'paid') {
      await CASHIER.recordSalaryPayment(netSalary, emp.name, `PAI_${empId}_${month}`);
    }
    
    showToast(status==='paid' ? `${emp.name} — salaire payé ✓` : 'Bulletin sauvegardé', 'success');
    this.render();
  },

  async printPayslip(empId, month) {
    const emp  = await DB.get('employes', empId);
    const paie = await DB.get('paies', `PAI_${empId}_${month}`);
    if (!emp) return;
    const currency  = APP.config?.currency||'Ar';
    const company   = APP.config?.name||'Mon Entreprise';
    const [yr,mo]   = month.split('-');
    const monthLabel = new Date(parseInt(yr),parseInt(mo)-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    const wDays   = paie?.workingDays||'—';
    const pDays   = paie?.presentDays||'—';
    const base    = paie?.baseSalary||emp.baseSalary||0;
    const gross   = paie?.grossSalary||base;
    const bonuses = paie?.bonuses||0;
    const deducts = paie?.deductions||0;
    const net     = paie?.netSalary||gross;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bulletin de Paie — ${escapeHtml(emp.name)}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;max-width:620px;margin:auto}
    h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin:10px 0}
    th,td{padding:7px 10px;border:1px solid #e5e7eb}th{background:#f3f4f6}
    .header{border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}
    .total-row{background:#dbeafe;font-weight:bold;font-size:13px}
    @media print{button{display:none}}</style></head>
    <body>
    <div class="header">
      <div><h1>Bulletin de Paie</h1><div>${escapeHtml(company)}</div></div>
      <div style="text-align:right"><strong>${escapeHtml(monthLabel)}</strong>${paie?.status==='paid'?`<br><span style="color:#16a34a">✓ Payé le ${new Date(paie.paidAt).toLocaleDateString('fr-FR')}</span>`:''}</div>
    </div>
    <table><tr><th>Employé</th><th>Poste</th><th>Date d'embauche</th></tr>
    <tr><td>${escapeHtml(emp.name)}</td><td>${escapeHtml(emp.role||'—')}</td><td>${emp.hireDate?formatDate(emp.hireDate):'—'}</td></tr></table>
    <table><tr><th>Jours ouvrés</th><th>Jours présents</th><th>Salaire de base</th></tr>
    <tr><td>${wDays}</td><td>${pDays}</td><td>${formatCurrency(base,currency)}</td></tr></table>
    <table><tbody>
    <tr><td>Salaire brut (${pDays}/${wDays} jours)</td><td style="text-align:right">${formatCurrency(gross,currency)}</td></tr>
    <tr style="color:#16a34a"><td>+ Primes &amp; indemnités</td><td style="text-align:right">${formatCurrency(bonuses,currency)}</td></tr>
    <tr style="color:#dc2626"><td>− Retenues</td><td style="text-align:right">${formatCurrency(deducts,currency)}</td></tr>
    <tr class="total-row"><td>SALAIRE NET À PAYER</td><td style="text-align:right">${formatCurrency(net,currency)}</td></tr>
    </tbody></table>
    <div style="margin-top:40px;display:flex;justify-content:space-between">
      <div>Signature employeur : _______________</div>
      <div>Signature employé : _______________</div>
    </div>
    <script>window.onload=()=>window.print()<\/script></body></html>`;
    const blob = new Blob([html],{type:'text/html'});
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url,'_blank');
    if (win) win.onload = () => URL.revokeObjectURL(url);
  },

  // ─── IMPRIMER LISTE EMPLOYÉS ──────────────────────────────────────────────
  async printEmployeeList() {
    const employees = await DB.getAll('employes');
    const currency  = APP.config?.currency||'Ar';
    const company   = APP.config?.name||'Mon Entreprise';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Liste Employés</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;max-width:800px;margin:auto}
    h1{font-size:16px}table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{padding:6px 10px;border:1px solid #e5e7eb}th{background:#f3f4f6}
    .header{border-bottom:2px solid #6366f1;padding-bottom:8px;margin-bottom:12px}
    @media print{button{display:none}}</style></head>
    <body>
    <div class="header"><h1>${escapeHtml(company)} — Liste des employés</h1><div>Imprimée le ${new Date().toLocaleDateString('fr-FR')}</div></div>
    <table>
      <thead><tr><th>#</th><th>Nom</th><th>Poste</th><th>Téléphone</th><th>Date d'embauche</th><th>Salaire base</th><th>Statut</th></tr></thead>
      <tbody>
        ${employees.map((e,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.role||'—')}</td><td>${escapeHtml(e.phone||'—')}</td><td>${e.hireDate?formatDate(e.hireDate):'—'}</td><td>${formatCurrency(e.baseSalary||0,currency)}</td><td>${e.status==='active'?'Actif':'Inactif'}</td></tr>`).join('')}
      </tbody>
    </table>
    <p style="margin-top:8px;color:#6b7280;font-size:11px">Total : ${employees.length} employé(s) · ${employees.filter(e=>e.status!=='inactive').length} actif(s)</p>
    <script>window.onload=()=>window.print()<\/script></body></html>`;
    const blob = new Blob([html],{type:'text/html'});
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url,'_blank');
    if (win) win.onload = () => URL.revokeObjectURL(url);
  },

  // ─── CRUD EMPLOYÉ ─────────────────────────────────────────────────────────
  async saveEmployee() {
    const name = document.getElementById('e-name')?.value.trim();
    if (!name) { showToast('Le nom est requis','warning'); return; }
    const emp = {
      id: this._editId || genId('EMP'), name,
      role:         document.getElementById('e-role')?.value.trim()||'',
      baseSalary:   parseFloat(document.getElementById('e-salary')?.value||0),
      phone:        document.getElementById('e-phone')?.value.trim()||'',
      email:        document.getElementById('e-email')?.value.trim()||'',
      address:      document.getElementById('e-address')?.value.trim()||'',
      hireDate:     document.getElementById('e-hiredate')?.value||'',
      leaveBalance: parseFloat(document.getElementById('e-leave')?.value||0),
      status:       document.getElementById('e-status')?.value||'active',
      updatedAt:    new Date().toISOString()
    };
    if (!this._editId) emp.createdAt = new Date().toISOString();
    else { const ex = await DB.get('employes', emp.id); emp.createdAt = ex?.createdAt||emp.updatedAt; }
    await DB.put('employes', emp);
    if (SM.mode !== 'local') SM.writeNow('employes', emp.id, 'set', emp);
    APP.addLog('INFO', this._editId?'Employé modifié':'Employé créé', { name });
    showToast(this._editId?'Employé mis à jour':'Employé ajouté', 'success');
    this._editId = null;
    this._setView('employees');
  },

  editEmployee(id)  { this._editId = id; this._view = 'form-employee'; this.render(); },

  async deleteEmployee(id) {
    const e  = await DB.get('employes', id);
    const ok = await APP.canDelete(e?.name||'cet employé');
    if (!ok) return;
    await DB.delete('employes', id);
    if (SM.mode !== 'local') SM.writeNow('employes', id, 'delete', null);
    showToast('Employé supprimé', 'success');
    this.render();
  }
};
