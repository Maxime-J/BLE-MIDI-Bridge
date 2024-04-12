import { MAX_TIMESTAMP, EXPECTED_STATUS_DATA } from './constants';
import { isFirstBitOn, getTimestampHigh, getTimestampLow, getTimestamp } from './utils';

export default function () {
  let messageHandler = (message, timestamp) => undefined;

  const setMessageHandler = (handler) => {
    messageHandler = handler;
  };

  const parse = (e) => {
    const packet = new Uint8Array(e.target.value.buffer);

    if (
      !isFirstBitOn(packet[1])
      || EXPECTED_STATUS_DATA[packet[2]] === undefined
    ) return;

    let timestampHigh = getTimestampHigh(packet[0]);
    let timestampLow = 0;
    let timestamp;
    let midiStatus;
    let index = 1;
    let time = performance.now();

    while (index < packet.length) {
      const hasTimestamp = isFirstBitOn(packet[index]);
      const hasStatus = isFirstBitOn(packet[index + 1]);

      if (hasTimestamp) {
        const newTimestampLow = getTimestampLow(packet[index++]);
        if (newTimestampLow < timestampLow) timestampHigh++;
        timestampLow = newTimestampLow;

        const newTimestamp = getTimestamp(timestampHigh, timestampLow);
        if (timestamp !== undefined) {
          const delay = (newTimestamp - timestamp) & MAX_TIMESTAMP;
          time += delay;
        }
        timestamp = newTimestamp;
      }

      if (hasStatus) midiStatus = packet[index++];

      const message = [midiStatus];
      const dataSize = EXPECTED_STATUS_DATA[midiStatus];
      for (let i = 0; i < dataSize; i++) {
        message.push(packet[index++]);
      }

      messageHandler(message, time);
    }
  };

  return {
    setMessageHandler,
    parse
  };
}