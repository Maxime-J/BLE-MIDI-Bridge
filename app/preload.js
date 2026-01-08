const { ipcRenderer } = require('electron');

const electron = {
  cancelBluetooth: () => ipcRenderer.send('cancel-bluetooth'),
  closeWindow: () => ipcRenderer.send('close-window'),
  onBleDevices: (handler) => ipcRenderer.on('ble-devices', (event, devices) => handler(devices)),
  resetOnBleDevices: () => ipcRenderer.removeAllListeners('ble-devices'),
  selectBleDevice: (deviceId) => ipcRenderer.send('ble-device-selected', deviceId),
};

const midiOut = require('./midi-out.node');

Object.assign(window, {
  electron,
  midiOut
});