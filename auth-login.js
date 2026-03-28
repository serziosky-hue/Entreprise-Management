// auth-login.js — Logique page login
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Pré-remplir depuis remember
  const remember = JSON.parse(localStorage.getItem('emp_remember') || 'null');
  if (remember) {
    document.getElementById('enterprise-id').value = remember.id || '';
    document.getElementById('remember-me').checked = true;
    if (remember.mode) {
      document.querySelectorAll('input[name="mode"]').forEach(r => { r.checked = r.value === remember.mode; });
    }
  }

  document.getElementById('login-form').addEventListener('submit', doLogin);
});

async function doLogin(e) {
  e.preventDefault();
  const id = document.getElementById('enterprise-id').value.trim().toLowerCase();
  const pwd = document.getElementById('password').value;
  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'online';
  const remember = document.getElementById('remember-me').checked;

  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  errEl.textContent = '';
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Connexion...';

  if (!id || !pwd) {
    showError('Identifiant et mot de passe requis');
    return;
  }

  try {
    if (mode === 'online') {
      await loginOnline(id, pwd, mode, remember);
    } else {
      await loginOffline(id, pwd, mode, remember);
    }
  } catch (err) {
    showError('Erreur de connexion: ' + err.message);
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }

  async function loginOnline(id, pwd, mode, remember) {
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: "AIzaSyAcZPCtajiuZxrDMM0CelNPRdXD-tanBxU",
        databaseURL: "https://enterprisemanagementpro-default-rtdb.firebaseio.com",
        projectId: "enterprisemanagementpro",
        appId: "1:932509312427:web:6aacfe4743315c69581eee"
      });
    }
    const db = firebase.database();

    // Vérifier existence
    const snap = await db.ref(`entreprises/${id}/config`).once('value');
    if (!snap.exists()) { showError('Entreprise introuvable'); return; }

    const config = snap.val();

    // Vérifier mot de passe
    const hash = hashPassword(pwd);
    if (config.passwordHash !== hash) { showError('Mot de passe incorrect'); return; }

    // Charger subscription
    const subSnap = await db.ref(`entreprises/${id}/subscription`).once('value');
    const subscription = subSnap.val();

    // Initialiser IndexedDB et sauvegarder
    await DB.init(id);
    await DB.saveConfig(config);
    if (subscription) await DB.put('config', { key: 'subscription', data: subscription });

    finalizeLogin(id, mode, config, subscription, remember);
  }

  async function loginOffline(id, pwd, mode, remember) {
    await DB.init(id);
    const config = await DB.getConfig();
    if (!config) { showError('Aucune donnée locale. Connectez-vous en ligne d\'abord.'); return; }

    const hash = hashPassword(pwd);
    if (config.passwordHash !== hash) { showError('Mot de passe incorrect'); return; }

    const subRec = await DB.get('config', 'subscription');
    const subscription = subRec?.data || null;

    finalizeLogin(id, mode, config, subscription, remember);
  }

  function finalizeLogin(id, mode, config, subscription, remember) {
    const session = { enterpriseId: id, mode, loginAt: new Date().toISOString() };
    sessionStorage.setItem('emp_session', JSON.stringify(session));

    if (remember) {
      localStorage.setItem('emp_remember', JSON.stringify({ id, mode }));
    } else {
      localStorage.removeItem('emp_remember');
    }

    window.location.href = 'index.html';
  }

  function hashPassword(pwd) {
    let h = 0;
    for (let i = 0; i < pwd.length; i++) h = Math.imul(31, h) + pwd.charCodeAt(i) | 0;
    return 'h' + Math.abs(h).toString(16);
  }
}
