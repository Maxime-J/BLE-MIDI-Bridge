const { app, BrowserWindow, Menu, ipcMain } = require('electron');
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

const init = () => {
  const win = new BrowserWindow({
    width: 400,
    height: 385,
    resizable: false,
    webPreferences: {
      // Use native addon in the same context for performance
      // Trusted content only
      nodeIntegration: true,
      contextIsolation: false,
      preload: join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');

  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    bluetoothSelectCallback = callback;
    if (JSON.stringify(devices) !== JSON.stringify(bluetoothDevices)) {
      bluetoothDevices = devices;
      win.webContents.send('ble-devices', devices);
    }
  });
}

ipcMain.on('ble-device-selected', (event, deviceId) => {
  selectBluetoothDevice(deviceId);
});

ipcMain.on('cancel-bluetooth', () => {
  if (typeof bluetoothSelectCallback === 'function') {
    selectBluetoothDevice('');
  }
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