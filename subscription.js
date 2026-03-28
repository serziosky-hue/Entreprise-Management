// subscription.js — Plans, vérification, réabonnement Mobile Money
'use strict';

window.SUBS = {

  PLANS: {
    LOCAL:   { label:'Local',   price:70000,  unit:'perpétuel', days:null, users:1,  features:['1 utilisateur','Hors ligne uniquement','Backup cloud 1x/24h','Licence à vie'] },
    BASIC:   { label:'Basic',   price:10000,  unit:'30 jours',  days:30,   users:3,  features:['3 utilisateurs','Sync automatique','Support email'] },
    PREMIUM: { label:'Premium', price:30000,  unit:'30 jours',  days:30,   users:10, features:['10 utilisateurs','Sync automatique','Export avancé','Support prioritaire'] },
  },

  // ─── Récupérer la subscription ────────────────────────────────────────────
  _sub() {
    return APP.subscription?.data || APP.subscription || null;
  },

  // ─── Vérification principale (appelée au démarrage) ───────────────────────
  check() {
    const sub = this._sub();
    if (!sub) return true; // pas de sub = accès libre (ancien compte)

    const plan = sub.plan || 'BASIC';

    // ── Plan LOCAL ────────────────────────────────────────────────────────────
    if (plan === 'LOCAL') {
      // Activé (payé) = accès illimité
      if (sub.status === 'active' || sub.paidUntil) return true;
      // Essai 7 jours depuis la création
      const createdAt = sub.createdAt || sub.startedAt;
      if (!createdAt) return true; // pas de date = accès libre (ancien compte)
      const daysSince = (Date.now() - new Date(createdAt).getTime()) / 86400000;
      if (daysSince > 7) {
        this._showExpiredOverlay('local_trial');
        return false;
      }
      const daysLeft = Math.max(0, Math.ceil(7 - daysSince));
      if (daysLeft <= 2) showToast(`⚠️ Plan Local : ${daysLeft} jour(s) d'essai restant(s). Activez votre licence.`, 'warning');
      return true;
    }

    // ── Plans BASIC / PREMIUM : vérification stricte, même en hors ligne ─────
    // La date d'expiration est stockée localement — pas de bypass offline
    if (this.isExpired()) {
      this._showExpiredOverlay();
      return false;
    }

    const days = this.daysRemaining();
    if (days !== null && days <= 3 && days >= 0) {
      showToast(`⚠️ Abonnement expire dans ${days} jour(s)`, 'warning');
    }
    return true;
  },

  isExpired() {
    const sub = this._sub();
    if (!sub || sub.plan === 'LOCAL') return false;
    const exp = sub.paidUntil || sub.expiresAt;
    if (!exp) return false;
    return new Date(exp) < new Date();
  },

  isInTrial() {
    const sub = this._sub();
    if (!sub) return false;
    if (!sub.trialEnd) return false;
    return new Date(sub.trialEnd) > new Date() && sub.status === 'trial';
  },

  daysRemaining() {
    const sub = this._sub();
    if (!sub || sub.plan === 'LOCAL') return null;
    const exp = sub.paidUntil || sub.expiresAt;
    if (!exp) return null;
    return Math.max(0, Math.ceil((new Date(exp) - new Date()) / 86400000));
  },

  daysRemainingTrial() {
    const sub = this._sub();
    if (!sub || !sub.trialEnd) return null;
    return Math.max(0, Math.ceil((new Date(sub.trialEnd) - new Date()) / 86400000));
  },

  // ─── Overlay expiration ───────────────────────────────────────────────────
  _showExpiredOverlay(type) {
    if (document.getElementById('expired-overlay')) return;

    const isLocalTrial = type === 'local_trial';

    const overlay = document.createElement('div');
    overlay.id = 'expired-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9000',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(15,23,42,.98)', 'padding:1rem', 'overflow-y:auto'
    ].join(';');

    // Vue initiale : les 3 boutons
    const renderMain = () => {
      const title = isLocalTrial ? "Période d'essai expirée" : "Abonnement expiré";
      const msg   = isLocalTrial
        ? "Votre essai de 7 jours (Plan Local) est terminé.<br>Activez votre licence pour continuer à utiliser l'application."
        : "Votre abonnement a expiré.<br>Renouvelez via Mobile Money pour reprendre l'accès.";
      overlay.innerHTML = `
        <div style="background:#1e293b;border:1px solid rgba(239,68,68,.3);border-radius:1.25rem;padding:2rem;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 48px rgba(0,0,0,.7);">
          <div style="width:64px;height:64px;background:rgba(239,68,68,.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;border:2px solid rgba(239,68,68,.3);">
            <svg style="width:30px;height:30px;color:#f87171;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <h2 style="color:#f1f5f9;font-size:1.25rem;font-weight:700;margin-bottom:.5rem;">${title}</h2>
          <p style="color:#94a3b8;font-size:.875rem;margin-bottom:1.5rem;">${msg}</p>
          <div style="display:flex;flex-direction:column;gap:.625rem;">
            <button id="exp-btn-renew" style="padding:.75rem;background:#4f46e5;color:white;border:none;border-radius:.75rem;font-weight:700;font-size:.875rem;cursor:pointer;">
              💳 Renouveler l'abonnement
            </button>
            <button id="exp-btn-pending" style="padding:.625rem;background:rgba(99,102,241,.12);color:#a5b4fc;border:1px solid rgba(99,102,241,.25);border-radius:.75rem;font-size:.8125rem;cursor:pointer;">
              📋 Voir mes demandes en attente
            </button>
            <button id="exp-btn-logout" style="padding:.625rem;background:rgba(51,65,85,.5);color:#94a3b8;border:1px solid #334155;border-radius:.75rem;font-size:.8125rem;cursor:pointer;">
              Déconnexion
            </button>
          </div>
        </div>`;

      // Lier les événements APRÈS injection dans le DOM
      document.getElementById('exp-btn-logout').onclick = () => {
        sessionStorage.clear();
        localStorage.removeItem('emp_remember');
        window.location.href = 'login.html';
      };
      document.getElementById('exp-btn-renew').onclick = () => renderRenewal();
      document.getElementById('exp-btn-pending').onclick = () => renderPending();
    };

    // Vue formulaire de renouvellement (inline dans l'overlay)
    const renderRenewal = () => {
      const sub = this._sub();
      const curPlan = sub?.plan || 'BASIC';
      const plans = this.PLANS;

      overlay.innerHTML = `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:1.25rem;padding:1.5rem;max-width:440px;width:100%;box-shadow:0 24px 48px rgba(0,0,0,.7);max-height:90vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;">
            <button id="exp-back" style="background:rgba(51,65,85,.5);border:1px solid #334155;border-radius:.5rem;width:32px;height:32px;cursor:pointer;color:#94a3b8;font-size:1rem;display:flex;align-items:center;justify-content:center;">←</button>
            <h3 style="color:#f1f5f9;font-weight:700;font-size:1rem;">💳 Renouveler l'abonnement</h3>
          </div>

          <!-- Plans -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.375rem;margin-bottom:1rem;">
            ${Object.entries(plans).map(([k,p]) => `
              <label style="cursor:pointer;">
                <input type="radio" name="rnw-plan" value="${k}" ${k===curPlan?'checked':''} style="display:none;">
                <div style="border:2px solid ${k===curPlan?'#6366f1':'#334155'};border-radius:.75rem;padding:.625rem;text-align:center;background:${k===curPlan?'rgba(99,102,241,.12)':'rgba(15,23,42,.5)'};cursor:pointer;transition:all .15s;"
                  onclick="this.style.borderColor='#6366f1';this.style.background='rgba(99,102,241,.12)';this.closest('label').querySelector('input').checked=true;document.querySelectorAll('[name=rnw-plan-card]').forEach(c=>c!==this&&(c.style.borderColor='#334155',c.style.background='rgba(15,23,42,.5)'));SUBS._updateRenewalOverlayAmount();"
                  name="rnw-plan-card">
                  <div style="color:#f1f5f9;font-weight:700;font-size:.8125rem;">${p.label}</div>
                  <div style="color:#818cf8;font-weight:800;font-size:.9375rem;">${p.price>0?p.price.toLocaleString()+' Ar':'Gratuit'}</div>
                  <div style="color:#64748b;font-size:.5625rem;">${p.unit}</div>
                </div>
              </label>`).join('')}
          </div>

          <!-- Numéros -->
          <div style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:.75rem;padding:.75rem;margin-bottom:.875rem;font-size:.8rem;">
            <div style="color:#a5b4fc;font-weight:700;margin-bottom:.375rem;">📱 Envoyez à :</div>
            <div style="color:#cbd5e1;display:flex;justify-content:space-between;"><span>🟢 Mvola</span><strong>034 XX XXX XX</strong></div>
            <div style="color:#cbd5e1;display:flex;justify-content:space-between;margin-top:.25rem;"><span>🟠 Orange Money</span><strong>032 XX XXX XX</strong></div>
            <div style="color:#cbd5e1;display:flex;justify-content:space-between;margin-top:.25rem;"><span>🔴 Airtel Money</span><strong>033 XX XXX XX</strong></div>
            <div id="rnw-ovl-amount" style="margin-top:.5rem;padding:.375rem .625rem;background:rgba(99,102,241,.15);border-radius:.5rem;text-align:center;color:#a5b4fc;font-weight:700;">
              Montant : ${(plans[curPlan]?.price||0).toLocaleString()} Ar
            </div>
          </div>

          <!-- Champs -->
          <div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:.875rem;">
            <select id="rnw-ovl-op" style="padding:.625rem .875rem;border-radius:.625rem;border:1.5px solid #334155;background:#0f172a;color:#f1f5f9;font-size:.875rem;outline:none;width:100%;">
              <option value="">Opérateur Mobile Money...</option>
              <option value="MVOLA">🔴 Mvola (Telma)</option>
              <option value="ORANGE">🟠 Orange Money</option>
              <option value="AIRTEL">🟢 Airtel Money</option>
            </select>
            <input id="rnw-ovl-phone" type="tel" placeholder="Numéro expéditeur (ex: 034 00 000 00)"
              style="padding:.625rem .875rem;border-radius:.625rem;border:1.5px solid #334155;background:#0f172a;color:#f1f5f9;font-size:.875rem;outline:none;width:100%;">
            <input id="rnw-ovl-ref" type="text" placeholder="Référence transaction (ex: TXN-XXXX)"
              style="padding:.625rem .875rem;border-radius:.625rem;border:1.5px solid #334155;background:#0f172a;color:#f1f5f9;font-size:.875rem;outline:none;width:100%;">
          </div>

          <div id="rnw-ovl-err" style="display:none;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:.5rem;padding:.5rem .75rem;font-size:.8rem;margin-bottom:.5rem;"></div>

          <button id="rnw-ovl-submit" style="width:100%;padding:.75rem;background:#4f46e5;color:white;border:none;border-radius:.75rem;font-weight:700;font-size:.875rem;cursor:pointer;">
            Envoyer la demande
          </button>
        </div>`;

      document.getElementById('exp-back').onclick = () => renderMain();
      document.getElementById('rnw-ovl-submit').onclick = () => this._submitFromOverlay();
    };

    // Vue demandes en attente (inline)
    const renderPending = async () => {
      overlay.innerHTML = `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:1.25rem;padding:1.5rem;max-width:440px;width:100%;max-height:85vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;">
            <button id="pend-back" style="background:rgba(51,65,85,.5);border:1px solid #334155;border-radius:.5rem;width:32px;height:32px;cursor:pointer;color:#94a3b8;font-size:1rem;display:flex;align-items:center;justify-content:center;">←</button>
            <h3 style="color:#f1f5f9;font-weight:700;font-size:1rem;">📋 Mes demandes</h3>
          </div>
          <div id="pend-list" style="color:#94a3b8;font-size:.875rem;text-align:center;padding:1rem;">Chargement...</div>
        </div>`;

      document.getElementById('pend-back').onclick = () => renderMain();

      try {
        const entId = APP.config?.id;
        const snap = await firebase.database()
          .ref('payment_requests')
          .orderByChild('enterpriseId').equalTo(entId)
          .once('value');
        const reqs = [];
        snap.forEach(child => reqs.push({ key: child.key, ...child.val() }));
        reqs.sort((a,b) => b.submittedAt > a.submittedAt ? 1 : -1);

        const listEl = document.getElementById('pend-list');
        if (!listEl) return;
        if (reqs.length === 0) {
          listEl.textContent = 'Aucune demande envoyée';
        } else {
          listEl.innerHTML = reqs.map(r => {
            const sc = r.status==='approved'?'#4ade80':r.status==='rejected'?'#f87171':'#fbbf24';
            const sl = r.status==='approved'?'✅ Approuvé':r.status==='rejected'?'❌ Refusé':'⏳ En attente';
            return `<div style="border:1px solid #334155;border-radius:.625rem;padding:.75rem;margin-bottom:.5rem;text-align:left;">
              <div style="display:flex;justify-content:space-between;margin-bottom:.25rem;">
                <span style="color:#f1f5f9;font-weight:700;font-size:.875rem;">${r.plan} — ${(r.amount||0).toLocaleString()} Ar</span>
                <span style="color:${sc};font-size:.75rem;font-weight:700;">${sl}</span>
              </div>
              <div style="color:#94a3b8;font-size:.75rem;">${r.operator||''} · ${r.phone||''} · ${r.reference||''}</div>
              <div style="color:#64748b;font-size:.6875rem;margin-top:.2rem;">
                ${new Date(r.submittedAt).toLocaleDateString('fr-FR')}
              </div>
              ${r.adminNote ? `<div style="color:#a5b4fc;font-size:.75rem;margin-top:.25rem;padding:.25rem .5rem;background:rgba(99,102,241,.1);border-radius:.375rem;">${r.adminNote}</div>` : ''}
            </div>`;
          }).join('');
        }
      } catch(e) {
        const listEl = document.getElementById('pend-list');
        if (listEl) listEl.textContent = 'Erreur : ' + e.message;
      }
    };

    // Afficher l'overlay
    document.body.appendChild(overlay);
    renderMain();
  },

  // Mise à jour montant dans l'overlay
  _updateRenewalOverlayAmount() {
    const plan = document.querySelector('input[name="rnw-plan"]:checked')?.value;
    if (!plan) return;
    const el = document.getElementById('rnw-ovl-amount');
    if (el) el.textContent = `Montant : ${(this.PLANS[plan]?.price||0).toLocaleString()} Ar`;
  },

  // Soumettre depuis l'overlay
  async _submitFromOverlay() {
    const plan     = document.querySelector('input[name="rnw-plan"]:checked')?.value;
    const operator = document.getElementById('rnw-ovl-op')?.value;
    const phone    = document.getElementById('rnw-ovl-phone')?.value?.trim();
    const ref      = document.getElementById('rnw-ovl-ref')?.value?.trim();
    const errEl    = document.getElementById('rnw-ovl-err');
    const btn      = document.getElementById('rnw-ovl-submit');

    const showErr = msg => { if(errEl){errEl.textContent=msg;errEl.style.display='block';} };

    if (!plan)     { showErr('Choisissez un plan.'); return; }
    if (!operator) { showErr('Choisissez votre opérateur.'); return; }
    if (!phone)    { showErr('Saisissez votre numéro.'); return; }
    if (!ref)      { showErr('Saisissez la référence.'); return; }
    if (phone.replace(/\s/g,'').length < 9) { showErr('Numéro invalide.'); return; }

    // Vérifier doublon
    try {
      const entId = APP.config?.id;
      const existing = await firebase.database()
        .ref('payment_requests')
        .orderByChild('enterpriseId').equalTo(entId)
        .once('value');
      let hasPending = false;
      existing.forEach(snap => { if (snap.val().status === 'pending') hasPending = true; });
      if (hasPending) {
        showErr('Vous avez déjà une demande en attente. Attendez le traitement.');
        return;
      }
    } catch(e) { /* continuer */ }

    if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }
    try {
      await firebase.database().ref('payment_requests').push({
        enterpriseId: APP.config?.id,
        enterpriseName: APP.config?.name,
        plan, operator, phone,
        reference: ref,
        amount: this.PLANS[plan]?.price || 0,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        currentPlan: this._sub()?.plan || 'unknown',
      });

      // Confirmation inline
      const overlay2 = document.getElementById('expired-overlay');
      if (overlay2) {
        overlay2.innerHTML = `
          <div style="background:#1e293b;border:1px solid rgba(34,197,94,.3);border-radius:1.25rem;padding:2rem;max-width:400px;width:100%;text-align:center;">
            <div style="font-size:3rem;margin-bottom:.75rem;">✅</div>
            <h3 style="color:#4ade80;font-weight:700;font-size:1.125rem;margin-bottom:.5rem;">Demande envoyée !</h3>
            <p style="color:#94a3b8;font-size:.875rem;margin-bottom:1.5rem;">
              Votre demande de réabonnement a été envoyée.<br>Elle sera traitée sous 24h.<br>
              Vous recevrez une confirmation après vérification.
            </p>
            <div style="display:flex;flex-direction:column;gap:.5rem;">
              <button id="conf-see-pending" style="padding:.625rem 1.5rem;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:.75rem;color:#a5b4fc;cursor:pointer;font-size:.875rem;">📋 Voir mes demandes</button>
              <button id="conf-logout" style="padding:.5rem 1.5rem;background:rgba(51,65,85,.5);border:1px solid #334155;border-radius:.75rem;color:#94a3b8;cursor:pointer;font-size:.8rem;">Déconnexion</button>
            </div>
          </div>`;
        document.getElementById('conf-logout').onclick = () => {
          sessionStorage.clear();
          localStorage.removeItem('emp_remember');
          window.location.href = 'login.html';
        };
        document.getElementById('conf-see-pending').onclick = () => {
          overlay2.remove();
          SUBS._showExpiredOverlay();
          // Simuler clic sur "voir demandes" après rendu
          setTimeout(() => {
            const btn = document.getElementById('exp-btn-pending');
            if (btn) btn.click();
          }, 100);
        };
      }
    } catch(e) {
      showErr('Erreur réseau : ' + e.message);
      if (btn) { btn.disabled=false; btn.textContent='Envoyer la demande'; }
    }
  },

  removeExpiredOverlay() {
    document.getElementById('expired-overlay')?.remove();
  },

  // ─── Modal réabonnement Mobile Money ─────────────────────────────────────
  showRenewalModal() {
    const sub = this._sub();
    const curPlan = sub?.plan || 'BASIC';

    showModal(`
      <div style="padding:1.5rem;">
        <h3 style="color:#f1f5f9;font-size:1.0625rem;font-weight:700;margin-bottom:1.25rem;text-align:center;">💳 Renouveler l'abonnement</h3>

        <!-- Plans -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-bottom:1.25rem;">
          ${Object.entries(this.PLANS).map(([key, plan]) => `
            <label style="cursor:pointer;">
              <input type="radio" name="rnw-plan" value="${key}" ${key === curPlan || (curPlan === 'LOCAL' && key === 'LOCAL') ? 'checked' : ''} style="display:none;" onchange="SUBS._updateRenewalAmount()">
              <div data-plan="${key}" onclick="this.previousElementSibling.checked=true;SUBS._updateRenewalAmount()"
                style="border:2px solid #334155;border-radius:.75rem;padding:.75rem;text-align:center;transition:all .15s;cursor:pointer;background:rgba(15,23,42,.5);"
                onmouseover="this.style.borderColor='#6366f1'" onmouseout="if(!this.previousElementSibling.checked)this.style.borderColor='#334155'">
                <div style="color:#f1f5f9;font-weight:700;font-size:.875rem;">${plan.label}</div>
                <div style="color:#818cf8;font-weight:800;font-size:1rem;">${plan.price > 0 ? plan.price.toLocaleString() + ' Ar' : 'Gratuit'}</div>
                <div style="color:#64748b;font-size:.625rem;">${plan.unit}</div>
              </div>
            </label>
          `).join('')}
        </div>

        <!-- Numéros Mobile Money -->
        <div style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:.75rem;padding:.875rem;margin-bottom:1rem;">
          <div style="color:#a5b4fc;font-size:.75rem;font-weight:700;margin-bottom:.5rem;">📱 Envoyez le paiement à :</div>
          <div style="display:flex;flex-direction:column;gap:.375rem;font-size:.8rem;">
            <div style="display:flex;justify-content:space-between;color:#cbd5e1;">
              <span>🔴 Mvola (Telma)</span><strong>034 XX XXX XX</strong>
            </div>
            <div style="display:flex;justify-content:space-between;color:#cbd5e1;">
              <span>🟠 Orange Money</span><strong>032 XX XXX XX</strong>
            </div>
            <div style="display:flex;justify-content:space-between;color:#cbd5e1;">
              <span>🟢 Airtel Money</span><strong>033 XX XXX XX</strong>
            </div>
          </div>
          <div id="rnw-amount" style="margin-top:.625rem;padding:.5rem;background:rgba(99,102,241,.15);border-radius:.5rem;text-align:center;color:#a5b4fc;font-weight:700;font-size:.9375rem;">
            Montant : ${this.PLANS[curPlan]?.price?.toLocaleString() || '?'} Ar
          </div>
        </div>

        <!-- Formulaire -->
        <div style="display:flex;flex-direction:column;gap:.625rem;margin-bottom:1rem;">
          <div>
            <label style="display:block;font-size:.6875rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem;">Mobile Money utilisé</label>
            <select id="rnw-operator" style="width:100%;padding:.625rem .875rem;border-radius:.625rem;border:1.5px solid #334155;background:#0f172a;color:#f1f5f9;font-size:.875rem;outline:none;">
              <option value="">Choisir...</option>
              <option value="MVOLA">🔴 Mvola (Telma)</option>
              <option value="ORANGE">🟠 Orange Money</option>
              <option value="AIRTEL">🟢 Airtel Money</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:.6875rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem;">Numéro expéditeur</label>
            <input id="rnw-phone" type="tel" placeholder="ex: 034 00 000 00" style="width:100%;padding:.625rem .875rem;border-radius:.625rem;border:1.5px solid #334155;background:#0f172a;color:#f1f5f9;font-size:.875rem;outline:none;">
          </div>
          <div>
            <label style="display:block;font-size:.6875rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem;">Référence de la transaction</label>
            <input id="rnw-ref" type="text" placeholder="ex: TXN-20250328-XXXX" style="width:100%;padding:.625rem .875rem;border-radius:.625rem;border:1.5px solid #334155;background:#0f172a;color:#f1f5f9;font-size:.875rem;outline:none;">
          </div>
        </div>

        <div id="rnw-err" style="display:none;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#fca5a5;border-radius:.625rem;padding:.5rem .75rem;font-size:.8rem;margin-bottom:.75rem;"></div>

        <div style="display:flex;gap:.5rem;">
          <button onclick="closeModal()" style="flex:1;padding:.625rem;background:rgba(51,65,85,.5);border:1px solid #334155;border-radius:.75rem;color:#94a3b8;font-size:.875rem;cursor:pointer;">Annuler</button>
          <button onclick="SUBS.submitRenewal()" style="flex:2;padding:.625rem;background:#4f46e5;border:none;border-radius:.75rem;color:white;font-weight:700;font-size:.875rem;cursor:pointer;">Envoyer la demande</button>
        </div>
      </div>
    `, { size: 'max-w-lg' });

    // Initialiser les styles des boutons de plan sélectionné
    setTimeout(() => SUBS._updateRenewalAmount(), 50);
  },

  _updateRenewalAmount() {
    const plan = document.querySelector('input[name="rnw-plan"]:checked')?.value;
    if (!plan) return;
    const price = this.PLANS[plan]?.price || 0;
    const el = document.getElementById('rnw-amount');
    if (el) el.textContent = `Montant : ${price.toLocaleString()} Ar`;
    // Mettre à jour visuellement les cartes plan
    document.querySelectorAll('[data-plan]').forEach(card => {
      const isSelected = card.dataset.plan === plan;
      card.style.borderColor = isSelected ? '#6366f1' : '#334155';
      card.style.background = isSelected ? 'rgba(99,102,241,.15)' : 'rgba(15,23,42,.5)';
    });
  },

  async submitRenewal() {
    const plan     = document.querySelector('input[name="rnw-plan"]:checked')?.value;
    const operator = document.getElementById('rnw-operator')?.value;
    const phone    = document.getElementById('rnw-phone')?.value?.trim();
    const ref      = document.getElementById('rnw-ref')?.value?.trim();
    const errEl    = document.getElementById('rnw-err');

    const showErr = msg => { errEl.textContent = msg; errEl.style.display = 'block'; };
    if (!plan)     { showErr('Choisissez un plan.'); return; }
    if (!operator) { showErr('Choisissez votre opérateur Mobile Money.'); return; }
    if (!phone)    { showErr('Saisissez votre numéro de téléphone.'); return; }
    if (!ref)      { showErr('Saisissez la référence de la transaction.'); return; }
    if (phone.replace(/\s/g,'').length < 9) { showErr('Numéro de téléphone invalide.'); return; }

    // Vérifier si une demande en attente existe déjà
    const entId = APP.config?.id;
    try {
      const existing = await firebase.database()
        .ref(`payment_requests`)
        .orderByChild('enterpriseId').equalTo(entId)
        .once('value');
      let hasPending = false;
      existing.forEach(snap => {
        const req = snap.val();
        if (req.status === 'pending') hasPending = true;
      });
      if (hasPending) {
        showErr('Vous avez déjà une demande en attente. Attendez qu\'elle soit traitée.');
        return;
      }
    } catch(e) { /* continuer */ }

    const btn = document.querySelector('[onclick="SUBS.submitRenewal()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }

    try {
      await firebase.database().ref('payment_requests').push({
        enterpriseId: entId,
        enterpriseName: APP.config?.name || entId,
        plan,
        amount: this.PLANS[plan]?.price || 0,
        operator,
        phone,
        reference: ref,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        currentPlan: this._sub()?.plan || 'unknown',
        currentExpiry: this._sub()?.paidUntil || this._sub()?.expiresAt || null,
      });
      closeModal();
      showToast('✅ Demande envoyée ! Elle sera traitée sous 24h.', 'success');
      await APP.addLog('INFO', 'Demande de réabonnement envoyée', { plan, operator });
    } catch(e) {
      showErr('Erreur réseau : ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Envoyer la demande'; }
    }
  },

  // ─── Voir ses demandes en attente ─────────────────────────────────────────
  async showPendingRequests() {
    const entId = APP.config?.id;
    let html = '<div style="padding:1.25rem;">';
    html += '<h3 style="color:#f1f5f9;font-size:1rem;font-weight:700;margin-bottom:1rem;">📋 Mes demandes de réabonnement</h3>';

    try {
      const snap = await firebase.database()
        .ref('payment_requests')
        .orderByChild('enterpriseId').equalTo(entId)
        .once('value');

      const requests = [];
      snap.forEach(child => requests.push({ key: child.key, ...child.val() }));
      requests.sort((a,b) => b.submittedAt > a.submittedAt ? 1 : -1);

      if (requests.length === 0) {
        html += '<div style="text-align:center;color:#64748b;padding:2rem;font-size:.875rem;">Aucune demande envoyée</div>';
      } else {
        requests.forEach(req => {
          const statusColor = req.status === 'approved' ? '#4ade80' : req.status === 'rejected' ? '#f87171' : '#fbbf24';
          const statusLabel = req.status === 'approved' ? '✅ Approuvé' : req.status === 'rejected' ? '❌ Refusé' : '⏳ En attente';
          const statusIcon  = req.status === 'approved' ? 'bg-green' : req.status === 'rejected' ? 'bg-red' : 'bg-yellow';
          html += `
            <div style="border:1px solid #334155;border-radius:.75rem;padding:.875rem;margin-bottom:.625rem;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.375rem;">
                <div style="color:#f1f5f9;font-weight:700;">${this.PLANS[req.plan]?.label || req.plan} — ${(req.amount||0).toLocaleString()} Ar</div>
                <span style="color:${statusColor};font-size:.75rem;font-weight:700;">${statusLabel}</span>
              </div>
              <div style="color:#94a3b8;font-size:.75rem;">
                ${req.operator} · ${req.phone} · Réf: ${req.reference}
              </div>
              <div style="color:#64748b;font-size:.6875rem;margin-top:.25rem;">
                Envoyé le ${new Date(req.submittedAt).toLocaleDateString('fr-FR')}
                ${req.processedAt ? ' · Traité le ' + new Date(req.processedAt).toLocaleDateString('fr-FR') : ''}
              </div>
              ${req.adminNote ? `<div style="color:#a5b4fc;font-size:.75rem;margin-top:.375rem;padding:.375rem .625rem;background:rgba(99,102,241,.1);border-radius:.5rem;">Note: ${req.adminNote}</div>` : ''}
            </div>`;
        });
      }
    } catch(e) {
      html += `<div style="color:#f87171;font-size:.875rem;">Erreur de chargement: ${e.message}</div>`;
    }

    html += `<button onclick="closeModal()" style="width:100%;padding:.625rem;background:rgba(51,65,85,.5);border:1px solid #334155;border-radius:.75rem;color:#94a3b8;font-size:.875rem;cursor:pointer;margin-top:.5rem;">Fermer</button></div>`;
    showModal(html, { size: 'max-w-lg' });
  },

  // ─── Carte d'abonnement (pour config.js) ──────────────────────────────────
  renderCard() {
    const sub = this._sub();
    if (!sub) return '<p style="color:#64748b;font-size:.875rem;">Aucune information d\'abonnement</p>';
    const plan = this.PLANS[sub.plan] || {};
    const days = this.daysRemaining();
    const trialDays = this.daysRemainingTrial();
    const expired = this.isExpired();
    const inTrial = this.isInTrial();
    const expDate = sub.paidUntil || sub.expiresAt;

    return `
      <div style="background:${expired ? 'rgba(239,68,68,.05)' : 'rgba(99,102,241,.06)'};border:1.5px solid ${expired ? 'rgba(239,68,68,.3)' : 'rgba(99,102,241,.25)'};border-radius:.875rem;padding:1rem;margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem;">
          <div>
            <div style="color:#f1f5f9;font-weight:700;font-size:1.125rem;">${plan.label || sub.plan}</div>
            ${inTrial ? `<span style="background:rgba(245,158,11,.15);color:#fbbf24;font-size:.625rem;padding:2px 8px;border-radius:99px;font-weight:700;">ESSAI GRATUIT · ${trialDays}j restant(s)</span>` : ''}
          </div>
          <span style="background:${expired ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.12)'};color:${expired ? '#f87171' : '#4ade80'};font-size:.6875rem;padding:3px 10px;border-radius:99px;font-weight:700;">${expired ? '⛔ Expiré' : '✓ Actif'}</span>
        </div>
        ${sub.plan !== 'LOCAL' && expDate ? `
          <div style="font-size:.8125rem;color:${expired ? '#f87171' : days !== null && days <= 7 ? '#fbbf24' : '#94a3b8'};">
            ${expired ? '⏰ Expiré le ' : '📅 Expire le '} ${new Date(expDate).toLocaleDateString('fr-FR')}
            ${!expired && days !== null ? ` — ${days} jour(s) restant(s)` : ''}
          </div>` : ''}
        <ul style="margin-top:.625rem;list-style:none;display:flex;flex-direction:column;gap:.25rem;">
          ${(plan.features||[]).map(f => `<li style="font-size:.75rem;color:#94a3b8;display:flex;align-items:center;gap:.375rem;"><svg style="width:11px;height:11px;color:#4ade80;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>${f}</li>`).join('')}
        </ul>
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem;">
        <button onclick="SUBS.showRenewalModal()" style="padding:.75rem;background:#4f46e5;color:white;border:none;border-radius:.75rem;font-weight:700;font-size:.875rem;cursor:pointer;">
          ${expired ? '🔄 Renouveler maintenant' : '⬆️ Changer / Renouveler'}
        </button>
        <button onclick="SUBS.showPendingRequests()" style="padding:.625rem;background:rgba(99,102,241,.1);color:#a5b4fc;border:1px solid rgba(99,102,241,.25);border-radius:.75rem;font-size:.8125rem;cursor:pointer;">
          📋 Mes demandes de réabonnement
        </button>
      </div>
    `;
  },

  // ─── Limite 24h pour backup cloud LOCAL ───────────────────────────────────
  canBackupCloud() {
    const sub = this._sub();
    if (!sub || sub.plan !== 'LOCAL') return true; // autres plans : pas de limite
    const lastBackup = localStorage.getItem('emp_last_cloud_backup');
    if (!lastBackup) return true;
    const elapsed = Date.now() - parseInt(lastBackup);
    return elapsed >= 24 * 3600 * 1000; // 24h
  },

  recordCloudBackup() {
    localStorage.setItem('emp_last_cloud_backup', Date.now().toString());
  },

  nextBackupIn() {
    const lastBackup = localStorage.getItem('emp_last_cloud_backup');
    if (!lastBackup) return 0;
    const elapsed = Date.now() - parseInt(lastBackup);
    const remaining = (24 * 3600 * 1000) - elapsed;
    return Math.max(0, Math.ceil(remaining / 3600000)); // heures restantes
  }
};