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

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 385,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    bluetoothSelectCallback = callback;
    if (JSON.stringify(devices) !== JSON.stringify(bluetoothDevices)) {
      bluetoothDevices = devices;
      mainWindow.webContents.send('ble-devices', devices);
    }
  });

  ipcMain.on('ble-device-selected', (event, deviceId) => {
    selectBluetoothDevice(deviceId);
  });

  ipcMain.on('cancel-bluetooth', () => {
    if (typeof bluetoothSelectCallback === 'function') {
      selectBluetoothDevice('');
    }
  });

  ipcMain.on('close-window', () => {
    mainWindow.close();
  });

  //mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});