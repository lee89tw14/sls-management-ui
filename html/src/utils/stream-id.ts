// Stream IDs are user-editable in Advanced Mode and SLS only checks that they are
// strings, so they must be encoded wherever they are placed into a URL.

// Characters accepted for new IDs: RFC 3986 unreserved characters plus "/",
// which SLS supports in stream keys. SRT limits a stream ID to 512 bytes.
export const STREAM_ID_PATTERN = /^[A-Za-z0-9._~/-]{1,512}$/;

export const isValidStreamId = (id: string): boolean => STREAM_ID_PATTERN.test(id);

// For "?streamid=<id>": percent-encode, but keep "/" readable (it is legal in a
// query). FFmpeg (OBS media source) URL-decodes SRT query values.
export const encodeStreamIdForQuery = (id: string): string =>
  encodeURIComponent(id).replace(/%2F/gi, '/');

// For "/stats/<id>" and "/api/stream-ids/<id>": encode each path segment so
// "?", "#", "%" etc. cannot change the URL structure; "/" keeps its meaning.
export const encodeStreamIdForPath = (id: string): string =>
  id.split('/').map(encodeURIComponent).join('/');
