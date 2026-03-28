// auth-signup.js — Logique page inscription
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('enterprise-id').addEventListener('input', debounceCheckId);
  // Mettre à jour la note selon le plan choisi
  document.querySelectorAll('input[name="plan"]').forEach(r => {
    r.addEventListener('change', updatePlanNote);
  });
});

function updatePlanNote() {
  const plan = document.querySelector('input[name="plan"]:checked')?.value;
  const note = document.getElementById('plan-note');
  if (!note) return;
  if (plan === 'LOCAL') {
    note.textContent = '📴 Plan Local : connexion hors ligne uniquement. Backup cloud 1x/24h.';
    note.style.color = '#f59e0b';
  } else {
    note.textContent = '⚡ 7 jours d\'essai gratuit inclus. Paiement requis après l\'essai via Mobile Money.';
    note.style.color = '#475569';
  }
}

let _checkTimer = null;
function debounceCheckId() {
  clearTimeout(_checkTimer);
  const val = document.getElementById('enterprise-id').value.trim().toLowerCase();
  const hint = document.getElementById('id-hint');
  if (!val || !/^[a-z0-9_]{3,20}$/.test(val)) {
    hint.textContent = val ? 'ID invalide (3-20 caractères: lettres, chiffres, _)' : '3–20 caractères : lettres minuscules, chiffres, _';
    hint.style.color = val ? '#f87171' : '#64748b';
    return;
  }
  hint.textContent = 'Vérification...';
  hint.style.color = '#94a3b8';
  _checkTimer = setTimeout(async () => {
    try {
      if (!firebase.apps.length) _initFB();
      const snap = await firebase.database().ref(`entreprises/${val}`).once('value');
      if (snap.exists()) {
        hint.textContent = '✗ ID déjà utilisé — choisissez un autre';
        hint.style.color = '#f87171';
      } else {
        hint.textContent = '✓ ID disponible';
        hint.style.color = '#4ade80';
      }
    } catch (e) { hint.textContent = ''; }
  }, 600);
}

function _initFB() {
  firebase.initializeApp({
    apiKey: "AIzaSyAcZPCtajiuZxrDMM0CelNPRdXD-tanBxU",
    databaseURL: "https://enterprisemanagementpro-default-rtdb.firebaseio.com",
    projectId: "enterprisemanagementpro",
    appId: "1:932509312427:web:6aacfe4743315c69581eee"
  });
}

function hashPassword(pwd) {
  let h = 0;
  for (let i = 0; i < pwd.length; i++) h = Math.imul(31, h) + pwd.charCodeAt(i) | 0;
  return 'h' + Math.abs(h).toString(16);
}

function showError(msg) {
  const el = document.getElementById('signup-error');
  el.textContent = msg; el.style.display = 'block';
  const btn = document.getElementById('signup-btn');
  btn.disabled = false; btn.textContent = 'Créer mon entreprise';
}

async function doSignup() {
  const id    = document.getElementById('enterprise-id').value.trim().toLowerCase();
  const name  = document.getElementById('enterprise-name').value.trim();
  const pwd   = document.getElementById('password').value;
  const pwd2  = document.getElementById('password2').value;
  const plan  = document.querySelector('input[name="plan"]:checked')?.value || 'BASIC';

  document.getElementById('signup-error').style.display = 'none';

  // Validations
  if (!id || !/^[a-z0-9_]{3,20}$/.test(id)) { showError('ID invalide (3-20 caractères: a-z, 0-9, _)'); return; }
  if (!name || name.length < 2) { showError('Nom d\'entreprise requis (min 2 caractères)'); return; }
  if (!pwd || pwd.length < 4) { showError('Mot de passe minimum 4 caractères'); return; }
  if (pwd !== pwd2) { showError('Les mots de passe ne correspondent pas'); return; }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true;
  btn.innerHTML = '<svg style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:.4rem;animation:spin .65s linear infinite;" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" stroke-width="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>Création...';

  try {
    if (!firebase.apps.length) _initFB();
    const db = firebase.database();

    // Vérifier unicité ID
    const snap = await db.ref(`entreprises/${id}/config`).once('value');
    if (snap.exists()) { showError('Cet ID est déjà utilisé — choisissez-en un autre'); return; }

    const now = new Date();
    // Essai 7j pour TOUS les plans
    const trialEnd = new Date(now.getTime() + 7 * 86400000);

    const subscription = {
      plan,                                         // LOCAL | BASIC | PREMIUM
      trialEnd: trialEnd.toISOString(),             // fin de l'essai
      expiresAt: plan === 'LOCAL'
        ? null                                       // LOCAL = perpétuel
        : trialEnd.toISOString(),                    // après essai = expiré → doit renouveler
      paidUntil: null,                              // rempli lors du paiement
      startedAt: now.toISOString(),
      createdAt: now.toISOString(),
      status: 'trial'                               // trial | active | expired
    };

    const config = {
      id, name,
      passwordHash: hashPassword(pwd),
      currency: 'Ar',
      multiposte: false,
      postes: [],
      categories: {
        products: ['Électronique','Mobilier','Fournitures','Alimentaire','Service','Autre'],
        expenses: ['Loyer','Transport','Salaires','Fournitures','Autre']
      },
      widgets: { solde:true, ca:true, depenses:true, especes:true, mobile:true, carte:true, nbVentes:true, credits:true },
      cashThreshold: 0,
      creditDelayDays: 30,
      createdAt: now.toISOString()
    };

    // Écriture Firebase (atomic)
    await db.ref(`entreprises/${id}`).set({ config, subscription });

    // Initialiser IndexedDB local
    try {
      if (window.DB) {
        await window.DB.init(id);
        await window.DB.saveConfig(config);
        await window.DB.put('config', { key: 'subscription', data: subscription });
      }
    } catch(e) { console.warn('DB init:', e); }

    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('signup-success').style.display = 'block';
    setTimeout(() => { window.location.href = 'login.html'; }, 2500);

  } catch (err) {
    showError('Erreur : ' + err.message);
  }
}
