const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 900, minHeight: 620,
    backgroundColor: '#0b0f19', title: 'Kaelen · Simulador Corporal',
    icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadURL(pathToFileURL(path.join(__dirname, 'web', 'index.html')).toString());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Kaelen', submenu: [
      { role: 'reload', label: 'Recargar' },
      { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Pantalla completa' },
      { role: 'quit', label: 'Salir' }
    ]}
  ]));
  createWindow();
});
app.on('window-all-closed', () => app.quit());
