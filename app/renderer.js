function midiHandler() {
  let midiAccess, midiOutput, selectDOM;

  const outputIds = [];

  const onChange = async () => {
    if (selectDOM.value !== '') {
      if (midiOutput) await midiOutput.close();
      const outputId = selectDOM.value;
      midiOutput = midiAccess.outputs.get(outputId);
      await midiOutput.open();
      bridge.setOutput(midiOutput);
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

  const init = async (portName) => {
    selectDOM = document.getElementById('midi-output');
    selectDOM.addEventListener('change', onChange);

    midiAccess = await navigator.requestMIDIAccess();
    midiAccess.outputs.forEach((output) => {
      portHandler({ port: output });
    });
    midiAccess.onstatechange = portHandler;

    if (portName) {
      const index = selectDOM.options.findIndex((option) => option.textContent === portName);
      setTimeout(() => {
        selectDOM.selectIndex(index);
        selectDOM.dispatchEvent(new Event('change'));
      }, 0);
    }
  };

  const exit = async () => {
    if (midiOutput) {
      await midiOutput.close();
      return midiOutput.name;
    }
  }

  return {
    init,
    exit
  };
}

function bleHandler() {
  const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
  const MIDI_IO_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

  let devicesDialog, availableList, selectedId, connectedList;

  const devices = {};
  const availableIds = [];

  const connect = async (resolveSelection) => {
    let device, deviceDOM;
    const permanentId = selectedId;

    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [MIDI_SERVICE_UUID] }
        ]
      });

      if (resolveSelection) resolveSelection();

      devices[permanentId] = device;

      deviceDOM = document.createElement('md-list-item');
      deviceDOM.innerHTML = `<span>${device.name}</span><md-linear-progress value="0.5"></md-linear-progress><img slot="end" src="assets/close.svg"/>`;
      const progress = deviceDOM.querySelector('md-linear-progress');
      connectedList.appendChild(deviceDOM);

      device.ongattserverdisconnected = () => {
        deviceDOM.remove();
        delete devices[permanentId];
      };

      const server = await device.gatt.connect();
      progress.value = '0.7';

      const service = await server.getPrimaryService(MIDI_SERVICE_UUID);
      progress.value = '0.8';

      const characteristic = await service.getCharacteristic(MIDI_IO_CHARACTERISTIC_UUID);
      characteristic.addEventListener('characteristicvaluechanged', bridge.handleInput);
      progress.value = '0.9';

      await characteristic.startNotifications();
      progress.value = '1';

      deviceDOM.classList.add('connected');
      deviceDOM.querySelector('img').addEventListener('click', () => device.gatt.disconnect());
    } catch {
      if (!device) {
        if (devicesDialog.open) devicesDialog.close();
        if (resolveSelection) resolveSelection();
        return;
      }

      if (device.gatt.connected) {
        device.gatt.disconnect();
      } else {
        device.ongattserverdisconnected();
      }
    }
  };

  const selectDevice = ({ target }) => {
    if (target.nodeName === 'MD-LIST-ITEM') {
      selectedId = target.getAttribute('data-id');
      devicesDialog.close();
      availableIds.length = 0;
      availableList.innerHTML = '';
      electron.selectBleDevice(selectedId);
    }
  };

  const handleDevices = (devicesAvailable) => {
    const excluded = [...availableIds, ...Object.keys(devices)];

    for (const device of devicesAvailable) {
      if (excluded.includes(device.deviceId)) continue;

      const newDevice = document.createElement('md-list-item');
      newDevice.type = 'button';
      newDevice.textContent = device.deviceName;
      newDevice.setAttribute('data-id', device.deviceId);
      availableList.appendChild(newDevice);
      availableIds.push(device.deviceId);
    }
  };

  const init = async (devicesIds) => {
    devicesDialog = document.getElementById('devices-dialog');
    availableList = devicesDialog.querySelector('md-list');
    connectedList = document.getElementById('connected-devices');

    if (devicesIds) {
      let lookupId;
      const connectPromises = [];

      electron.onBleDevices((devicesAvailable) => {
        const lookupFound = devicesAvailable.some(({ deviceId }) => deviceId === lookupId);
        if (lookupFound) {
          selectedId = lookupId;
          electron.selectBleDevice(lookupId);
        }
      });

      // bluetooth.requestDevice requires transient activation, which remains for 5s in Chromium:
      // https://source.chromium.org/chromium/chromium/src/+/refs/tags/136.0.7103.168:third_party/blink/public/common/frame/user_activation_state.h;l=23
      //
      // It should be enough to discover and select all devices.
      // Note that a tricky workaround would be possible with Electron API.

      while (devicesIds.length > 0 && navigator.userActivation.isActive) {
        lookupId = devicesIds.shift();

        const lookupTimeout = setTimeout(electron.cancelBluetooth, 2500)

        await new Promise((res) => {
          connectPromises.push(connect(res));
        });

        clearTimeout(lookupTimeout);
      }

      electron.resetOnBleDevices();
      await Promise.all(connectPromises);
    }

    electron.onBleDevices(handleDevices);

    availableList.addEventListener('click', selectDevice);

    devicesDialog.addEventListener('opened', () => connect());

    devicesDialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      electron.cancelBluetooth();
    });

    document.getElementById('add-device').addEventListener('click', () => {
      devicesDialog.show();
    });
  };

  const exit = () => {
    const disconnected = {
      ids: [],
      names: [],
    };

    for (const id in devices) {
      const device = devices[id];
      device.ongattserverdisconnected = null;
      device.gatt.disconnect();
      disconnected.ids.push(id);
      disconnected.names.push(device.name);
    }

    return disconnected;
  };

  return {
    init,
    exit
  };
}

async function exitHandler() {
  const output = await midi.exit();
  const devices = ble.exit();

  if (devices.ids.length > 0) {
    localStorage.setItem('setup', JSON.stringify({ output, devices }));
  }
}

function restore() {
  return new Promise((res, rej) => {
    const setup = localStorage.getItem('setup');

    if (setup === null) {
      rej();
      return;
    }

    const { output, devices } = JSON.parse(setup);

    let setupHTML = '';
    if (output) setupHTML += `<span><span>Output</span>: ${output}</span>`;
    setupHTML += `<span><span>${(devices.names.length > 1) ? 'Devices' : 'Device'}</span>: ${devices.names.join(', ')}</span>`;

    const restoreDialog = document.createElement('md-dialog');
    const restoreButton = document.createElement('md-text-button');
    const discardButton = document.createElement('md-text-button');

    restoreDialog.setAttribute('quick', '');
    restoreDialog.setAttribute('open', '');
    restoreDialog.innerHTML = `<div slot="content">Restore last used setup?<div id="last-setup">${setupHTML}</div></div><div slot="actions"></div>`;

    restoreButton.textContent = 'Restore';
    discardButton.textContent = 'Discard';

    const exitRestore = () => {
      restoreDialog.remove();
      localStorage.removeItem('setup');
    };

    discardButton.addEventListener('click', () => {
      rej();
      exitRestore();
    }, { once: true });

    restoreButton.addEventListener('click', async () => {
      res();
      restoreDialog.lastChild.innerHTML = '<md-linear-progress indeterminate></md-linear-progress>';
      midi.init(output);
      await ble.init(devices.ids);
      exitRestore();
    }, { once: true });

    // Prevent native dialog focus on first button
    restoreDialog.addEventListener('opened', () => {
      restoreDialog.lastChild.append(discardButton, restoreButton);
    });

    restoreDialog.addEventListener('cancel', (e) => e.preventDefault());

    document.body.appendChild(restoreDialog);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  window.midi = midiHandler();
  window.ble = bleHandler();

  restore().catch(() => {
    midi.init();
    ble.init();
  });
})

addEventListener('beforeunload', (e) => {
  e.returnValue = false;
  exitHandler().then(electron.closeWindow);
}, { once: true });