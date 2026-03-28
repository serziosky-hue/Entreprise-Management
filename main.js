// main.js — Electron main process
'use strict';

const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

// ─── Désactiver le cache GPU sur certaines configs ────────────────────────────
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');

// ─── Fenêtre principale ───────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    icon: path.join(__dirname, 'icone.png'),
    show: false,
    backgroundColor: '#0f172a', // évite le flash blanc au démarrage
    title: 'Enterprise Management Pro',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Autoriser les scripts CDN (Firebase, Tailwind, etc.)
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Charger l'app depuis les fichiers locaux
  mainWindow.loadFile('index.html');

  // Afficher seulement quand la page est prête (évite flash blanc)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Ouvrir les liens href="..." dans le navigateur système, pas dans l'app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Clic sur les liens <a href="http..."> dans l'app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC — Actions depuis le renderer ────────────────────────────────────────

// Ouvrir un lien externe sans afficher l'URL dans l'app
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// Vérifier les mises à jour (electron-updater via GitHub Releases)
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: !!result, version: result?.updateInfo?.version };
  } catch (e) {
    return { available: false, error: e.message };
  }
});

// Télécharger et installer la mise à jour
ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate();
});

// ─── Auto-updater events ──────────────────────────────────────────────────────
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Mise à jour prête',
    message: 'La mise à jour a été téléchargée. L\'application va redémarrer.',
    buttons: ['Redémarrer maintenant', 'Plus tard']
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.logger = null; // Désactiver les logs verbose
