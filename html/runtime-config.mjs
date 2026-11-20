/**
 * @typedef {Object} RawRuntimeConfig
 * @property {string} appUrl
 * @property {string} apiHost
 * @property {string} statsHost
 * @property {string} srtHost
 * @property {string} srtPlayerPort
 * @property {string} srtSenderPort
 * @property {string} slsStatsPort
 * @property {string} srtlaPort
 */

/** @type {Record<keyof RawRuntimeConfig, string[]>} */
export const RUNTIME_ENV_KEYS = {
  appUrl: ['APP_URL', 'REACT_APP_BASE_URL'],
  apiHost: ['API_HOST', 'REACT_APP_API_HOST'],
  statsHost: ['STATS_HOST', 'REACT_APP_STATS_HOST'],
  srtHost: ['SRT_HOST', 'REACT_APP_SRT_HOST'],
  srtPlayerPort: ['SRT_PLAYER_PORT', 'REACT_APP_SRT_PLAYER_PORT'],
  srtSenderPort: ['SRT_SENDER_PORT', 'REACT_APP_SRT_SENDER_PORT'],
  slsStatsPort: ['SLS_STATS_PORT', 'REACT_APP_SLS_STATS_PORT'],
  srtlaPort: ['SRTLA_PORT', 'REACT_APP_SRTLA_PORT'],
};

/**
 * `docker run --env-file`
 * passes `API_HOST="http://..."` with the quotes included.
 * @param {string} value
 * @returns {string}
 */
export function cleanEnvValue(value) {
  const v = value.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
    return v.slice(1, -1).trim();
  }
  return v;
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {RawRuntimeConfig}
 */
export function readRuntimeConfig(env) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, names] of Object.entries(RUNTIME_ENV_KEYS)) {
    const hit = names.map((n) => cleanEnvValue(env[n] ?? '')).find((v) => v !== '');
    out[key] = hit ?? '';
  }
  return /** @type {RawRuntimeConfig} */ (out);
}

/**
 * @param {RawRuntimeConfig} cfg
 * @returns {string}
 */
export function renderConfigScript(cfg) {
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return `window.__SLS_CONFIG__ = Object.freeze(${json});\n`;
}
