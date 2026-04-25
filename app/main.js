const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { join, dirname } = require('node:path');

const userDataPath = (app.isPackaged) ? join(dirname(app.getPath('exe')), 'data') : join(__dirname, '../data');
app.setPath('userData', userDataPath);

Menu.setApplicationMenu(null);

let bluetoothSelectCallback;
let bluetoothDevices;

const selectBluetoothDevice = (id) => {
  bluetoothSelectCallback(id);
  bluetoothSelectCallback = undefined;
};

const initSplash = (parentWin) => {
  const win = new BrowserWindow({
    width: 100,
    height: 100,
    backgroundColor: '#006398',
    resizable: false,
    frame: false,
    show: false,
    parent: parentWin,
  });

  const promise = new Promise((res) => {
    win.on('ready-to-show', () => {
      win.show();
      setTimeout(res, 1000);
    });
  });

  win.setIgnoreMouseEvents(true);

  win.loadFile('app.ico');

  return { win, promise };
};

const init = () => {
  const win = new BrowserWindow({
    width: 400,
    height: 385,
    resizable: false,
    show: false,
    webPreferences: {
      // Use native addon in the same context for performance
      // Trusted content only
      nodeIntegration: true,
      contextIsolation: false,
      preload: join(__dirname, 'preload.js')
    }
  });

  let splash;
  const splashTimeout = setTimeout(() => {
    splash = initSplash(win);
  }, 500);

  win.once('ready-to-show', async () => {
    clearTimeout(splashTimeout);
    if (splash) {
      await splash.promise;
      splash.win.close();
    }
    win.show();
  });

  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  win.webContents.on('did-finish-load', async () => {
    if (!app.isPackaged) return;

    const version = app.getVersion();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch('https://api.github.com/repos/Maxime-J/BLE-MIDI-Bridge/releases/latest', {
        headers: {
          accept: 'application/vnd.github+json',
        },
        signal: controller.signal,
      });

      if (!response.ok) return;

      const { name } = await response.json();

      if (name !== `v${version}`) win.webContents.send('new-version');
    } catch {
      // Ignore
    } finally {
      clearTimeout(timeout);
    }
  });

  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    bluetoothSelectCallback = callback;
    if (JSON.stringify(devices) !== JSON.stringify(bluetoothDevices)) {
      bluetoothDevices = devices;
      win.webContents.send('ble-devices', devices);
    }
  });

  win.loadFile('index.html');
}

ipcMain.on('ble-device-selected', (event, deviceId) => {
  selectBluetoothDevice(deviceId);
});

ipcMain.on('cancel-bluetooth', () => {
  if (typeof bluetoothSelectCallback === 'function') {
    selectBluetoothDevice('');
  }
});

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('close-window', ({ sender }) => {
  const win = BrowserWindow.fromWebContents(sender);
  win.close();
});

app.whenReady().then(() => {
  init();
});

app.on('window-all-closed', () => {
  app.quit();
});