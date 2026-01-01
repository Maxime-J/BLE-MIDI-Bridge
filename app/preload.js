const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  cancelBluetooth: () => ipcRenderer.send('cancel-bluetooth'),
  closeWindow: () => ipcRenderer.send('close-window'),
  onBleDevices: (handler) => ipcRenderer.on('ble-devices', (event, devices) => handler(devices)),
  resetOnBleDevices: () => ipcRenderer.removeAllListeners('ble-devices'),
  selectBleDevice: (deviceId) => ipcRenderer.send('ble-device-selected', deviceId),
});