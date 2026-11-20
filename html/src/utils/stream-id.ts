// Characters accepted for new IDs: RFC 3986 unreserved characters plus "/",
// which SLS supports in stream keys. SRT limits a stream ID to 512 bytes.
export const STREAM_ID_PATTERN = /^[A-Za-z0-9._~/-]{1,512}$/;

export const isValidStreamId = (id: string): boolean => STREAM_ID_PATTERN.test(id);

// For "?streamid=<id>": percent-encode, but keep "/" readable (it is legal in a
// query). FFmpeg (OBS media source) URL-decodes SRT query values.
export const encodeStreamIdForQuery = (id: string): string =>
  encodeURIComponent(id).replace(/%2F/gi, '/');

export const encodeStreamIdForPath = (id: string): string =>
  id.split('/').map(encodeURIComponent).join('/');

// crypto.getRandomValues() also works on plain-http origins (unlike randomUUID()).
export const randomHex = (bytes = 16): string => {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const generatePublisherId = (): string => `live_${randomHex()}`;

export const generatePlayerId = (): string => `play_${randomHex()}`;

export const generateDefaultStreamIds = () => ({
  publisherId: generatePublisherId(),
  playerId: generatePlayerId(),
});
