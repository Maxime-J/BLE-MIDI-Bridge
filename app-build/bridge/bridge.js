import EXPECTED_STATUS_DATA from './midi-status-data';

const messageBuffer = new Uint8Array(3);

let output = { send: () => undefined };

const setOutput = (midiOutput) => {
  output = midiOutput;
}

const handleInput = (e) => {
  const packet = new Uint8Array(e.target.value.buffer);

  if (
    (packet[1] & 128) === 0
    || EXPECTED_STATUS_DATA[packet[2]] === undefined
  ) return;

  let timestampHigh = packet[0] & 63;
  let timestampLow = packet[1] & 127;
  let timestamp = (timestampHigh << 7) | timestampLow;
  let midiStatus = packet[2];
  let time = 0.0;
  let index = 3;

  do {
    const messageSize = EXPECTED_STATUS_DATA[midiStatus] + 1;

    messageBuffer[0] = midiStatus;
    for (let i = 1; i < messageSize; i++) {
      messageBuffer[i] = packet[index++];
    }

    output.send(messageBuffer.subarray(0, messageSize), time);

    if (index == packet.length) break;

    if ((packet[index] & 128) !== 0) {
      const newTimestampLow = packet[index++] & 127;
      if (newTimestampLow < timestampLow) timestampHigh++;
      timestampLow = newTimestampLow;

      const newTimestamp = (timestampHigh << 7) | timestampLow;
      time = performance.now() + newTimestamp - timestamp;
      timestamp = newTimestamp;

      if ((packet[index] & 128) !== 0) midiStatus = packet[index++];
    }
  } while (true);
}

export default {
  handleInput,
  setOutput,
};