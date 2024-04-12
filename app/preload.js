const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onBleDevices: (callback) => ipcRenderer.on('ble-devices', (event, devices) => callback(devices)),
  selectBleDevice: (deviceId) => ipcRenderer.send('ble-device-selected', deviceId),
  cancelBluetooth: () => ipcRenderer.send('cancel-bluetooth'),
  closeWindow: () => ipcRenderer.send('close-window')
});