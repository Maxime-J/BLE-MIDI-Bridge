export function isFirstBitOn(byte) {
  return (byte >> 7) === 1;
};

export function getTimestampHigh(byte) {
  return byte & 0x3f;
};

export function getTimestampLow(byte) {
  return byte & 0x7f;
};

export function getTimestamp(high, low) {
  return parseInt(
    [high.toString(2).padStart(6, 0), low.toString(2).padStart(7, 0)].join(''),
    2
  );
};