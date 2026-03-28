// preload.js — Bridge sécurisé entre Electron et la page web
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Exposer uniquement les APIs nécessaires (pas nodeIntegration)
contextBridge.exposeInMainWorld('electronAPI', {
  // Détecter qu'on est dans Electron
  isElectron: true,

  // Ouvrir un lien dans le navigateur système sans afficher l'URL dans l'app
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Vérifier les mises à jour via GitHub Releases
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Télécharger et installer la mise à jour
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
});
