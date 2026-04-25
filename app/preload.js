const { ipcRenderer } = require('electron');

const electron = {
  // Bluetooth
  cancelBluetooth: () => ipcRenderer.send('cancel-bluetooth'),
  onBleDevices: (handler) => ipcRenderer.on('ble-devices', (event, devices) => handler(devices)),
  resetOnBleDevices: () => ipcRenderer.removeAllListeners('ble-devices'),
  selectBleDevice: (deviceId) => ipcRenderer.send('ble-device-selected', deviceId),
  // Utils
  closeWindow: () => ipcRenderer.send('close-window'),
  onNewVersion: (handler) => ipcRenderer.on('new-version', () => handler()),
  openExternal: (url) => ipcRenderer.send('open-url', url),
};

const midiOut = require('./midi-out.node');

Object.assign(window, {
  electron,
  midiOut
});