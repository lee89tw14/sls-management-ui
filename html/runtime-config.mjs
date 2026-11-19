// Runtime configuration for the browser bundle.
//
// The production image serves a static build. Deployment-specific values are not
// baked into the bundle; instead run.mjs writes /config.js at container start
// (window.__SLS_CONFIG__) from environment variables, and the Vite dev server
// serves the same file from its own environment. The bundle itself is never
// modified, and values are JSON-encoded instead of spliced into JavaScript.
//
// Canonical variable names are unprefixed. The REACT_APP_* names are still read
// so existing compose files (e.g. srtla-receiver's docker-compose.prod.yml) keep
// working.

/**
 * @typedef {Object} RawRuntimeConfig
 * @property {string} appUrl        Legacy all-in-one base URL (APP_URL).
 * @property {string} apiHost       Base URL the browser uses for /api, /health, /stats.
 * @property {string} statsHost     Base URL shown in the statistics links (e.g. for NOALBS).
 * @property {string} srtHost       Host name used in srt:// and srtla:// URLs.
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
 * Pick the first non-empty value for every runtime key. Unset keys become ''.
 * @param {Record<string, string | undefined>} env
 * @returns {RawRuntimeConfig}
 */
export function readRuntimeConfig(env) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, names] of Object.entries(RUNTIME_ENV_KEYS)) {
    const hit = names.map((n) => (env[n] ?? '').trim()).find((v) => v !== '');
    out[key] = hit ?? '';
  }
  return /** @type {RawRuntimeConfig} */ (out);
}

/**
 * Render the config as a classic script. JSON encoding keeps operator-supplied
 * values from breaking out of the string literal.
 * @param {RawRuntimeConfig} cfg
 * @returns {string}
 */
export function renderConfigScript(cfg) {
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return `window.__SLS_CONFIG__ = Object.freeze(${json});\n`;
}
