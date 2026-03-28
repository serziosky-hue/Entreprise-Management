// sw.js — Service Worker : cache offline + mise à jour
'use strict';

const VERSION     = '1.0.0';
const CACHE_NAME  = 'emp-v' + VERSION;

// Fichiers locaux à mettre en cache au premier chargement
const LOCAL_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/icone.png',
  '/version.json',
  '/app.js',
  '/db.js',
  '/sync-manager.js',
  '/firebase-manager.js',
  '/dashboard.js',
  '/stocks.js',
  '/sales.js',
  '/proforma.js',
  '/credits.js',
  '/expenses.js',
  '/clients.js',
  '/reports.js',
  '/logs.js',
  '/config.js',
  '/subscription.js',
  '/auth-login.js',
  '/auth-signup.js',
  '/system-services.js'
];

// ─── Installation : mise en cache des fichiers locaux ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ─── Activation : supprimer les anciens caches ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Interception des requêtes ────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { url } = event.request;

  // 1. Firebase Realtime + Auth : toujours réseau (pas de cache pour les données temps réel)
  if (url.includes('firebaseio.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. version.json : réseau d'abord, cache ensuite (pour les MAJ)
  if (url.includes('version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(res => {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. CDN (Tailwind, Chart.js, jsPDF, Firebase SDK) :
  //    réseau d'abord → met en cache → fallback cache si hors-ligne
  if (url.includes('cdn.tailwindcss.com') ||
      url.includes('cdnjs.cloudflare.com') ||
      url.includes('cdn.jsdelivr.net') ||
      url.includes('gstatic.com') ||
      url.includes('googleapis.com/identitytoolkit') === false && url.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. Fichiers locaux : cache d'abord, réseau si absent
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
