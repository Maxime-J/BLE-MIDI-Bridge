function midiHandler(){
  let midiAccess, midiOutput, outputIds = [], selectDOM;

  const clear = async () => {
    if (midiOutput) {
      await midiOutput.close();
    }
  };

  const onChange = async () => {
    if (selectDOM.value !== '') {
      await clear();
      const outputId = selectDOM.value;
      midiOutput = midiAccess.outputs.get(outputId);
      await midiOutput.open();
      exported.output = midiOutput;
    }
  };

  const portHandler = ({ port }) => {
    if (port.type !== 'output') return;
    const index = outputIds.indexOf(port.id);
    if (index === -1) {
      const newOption = document.createElement('md-select-option');
      newOption.value = port.id;
      newOption.setAttribute('data-id', port.id);
      newOption.innerHTML = `<div>${port.name}</div>`;
      selectDOM.appendChild(newOption);
      outputIds.push(port.id);
    } else {
      if (port.state === 'disconnected') {
        const oldOption = selectDOM.querySelector(`md-select-option[data-id="${port.id}"]`);
        oldOption.remove();
        outputIds.splice(index, 1);
      }
    }
  };

  const init = async () => {
    selectDOM = document.getElementById('midi-output');
    selectDOM.addEventListener('change', onChange);

    midiAccess = await navigator.requestMIDIAccess();
    midiAccess.outputs.forEach(output => {
      portHandler({ port: output });
    });
    midiAccess.onstatechange = portHandler;
  };

  const exported = {
    init,
    output: { send: () => undefined },
    clear
  };

  return exported;
}

function bleHandler(){
  const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
  const MIDI_IO_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';
  const { parse, setMessageHandler } = Parser();

  const devices = {};
  let availableIds = [];

  let devicesDialog, availableList, selectedId, connectedList;

  const errorHandler = () => {
    if (devicesDialog.open) {
      devicesDialog.close();
    } else {
      if (devices[selectedId].gatt.connected) {
        devices[selectedId].gatt.disconnect();
      } else {
        connectedList.querySelector('md-list-item:not(.connected)').remove();
        delete devices[selectedId];
      }
    }
  };

  const connect = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [MIDI_SERVICE_UUID] }
        ]
      });
      const permanentId = selectedId;
      devices[permanentId] = device;
      const deviceDOM = document.createElement('md-list-item');
      deviceDOM.innerHTML = `<span>${device.name}</span><md-linear-progress value="0.5"></md-linear-progress><img slot="end" src="assets/close.svg"/>`;
      const progress = deviceDOM.querySelector('md-linear-progress');
      connectedList.appendChild(deviceDOM);

      const removeDevice = () => {
        deviceDOM.remove();
        delete devices[permanentId];
      };

      const server = await device.gatt.connect();
      device.ongattserverdisconnected = removeDevice;
      progress.value = '0.7';

      const service = await server.getPrimaryService(MIDI_SERVICE_UUID);
      progress.value = '0.8';

      const characteristic = await service.getCharacteristic(MIDI_IO_CHARACTERISTIC_UUID);
      characteristic.addEventListener('characteristicvaluechanged', parse);
      progress.value = '0.9';

      await characteristic.startNotifications();
      progress.value = '1';
      deviceDOM.classList.add('connected');
      deviceDOM.querySelector('img').addEventListener('click', () => {device.gatt.disconnect();});
    } catch {
      errorHandler();
    }
  };

  const disconnectAll = async () => {
    for (const id in devices) {
      const device = devices[id];
      device.ongattserverdisconnected = null;
      await device.gatt.disconnect();
    }
  };

  const selectDevice = ({ target }) => {
    if (target.nodeName === 'MD-LIST-ITEM') {
      selectedId = target.getAttribute('data-id');
      devicesDialog.close();
      availableIds = [];
      availableList.innerHTML = '';
      electron.selectBleDevice(selectedId);
    }
  };

  const handleDevices = (devicesAvailable) => {
    const excluded = [...availableIds, ...Object.keys(devices)];
    for (const device of devicesAvailable) {
      if (!excluded.includes(device.deviceId)) {
        availableIds.push(device.deviceId);
        const newDevice = document.createElement('md-list-item');
        newDevice.type = 'button';
        newDevice.innerText = device.deviceName;
        newDevice.setAttribute('data-id', device.deviceId);
        availableList.appendChild(newDevice);
      }
    }
  };

  const handleMessage = (message, timestamp) => midi.output.send(message, timestamp);

  const init = () => {
    devicesDialog = document.getElementById('devices-dialog');
    availableList = devicesDialog.querySelector('md-list');
    connectedList = document.getElementById('connected-devices');

    electron.onBleDevices(handleDevices);
    availableList.addEventListener('click', selectDevice);

    devicesDialog.addEventListener('opened', connect);
    devicesDialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      electron.cancelBluetooth();
    });

    document.getElementById('add-device').addEventListener('click', () => {
      devicesDialog.show();
    });

    setMessageHandler(handleMessage);
  };

  return {
    init,
    disconnectAll
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  window.midi = midiHandler();
  window.ble = bleHandler();
  midi.init();
  ble.init();
})

window.addEventListener('beforeunload', (e) => {
  e.returnValue = false;
  Promise.all([midi.clear(), ble.disconnectAll()]).then(electron.closeWindow);
}, {once: true});