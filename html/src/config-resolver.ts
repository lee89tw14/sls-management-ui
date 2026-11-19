// Runtime configuration.
//
// Raw values come from /config.js (window.__SLS_CONFIG__), which the container
// writes at start-up from environment variables (see runtime-config.mjs).
// resolveConfig() turns them into the three addresses the UI needs:
//
//   apiUrl    where the browser sends /api, /health and /stats requests
//             API_HOST -> APP_URL -> auto
//   statsUrl  base of the statistics links shown to the user (e.g. for NOALBS)
//             STATS_HOST -> API_HOST -> APP_URL -> auto
//   srtHost   host name inside srt:// and srtla:// URLs (must reach UDP ports)
//             SRT_HOST -> host of APP_URL -> host of the page
//
// "auto" derives the API address from the page URL:
//   - page on an IP literal, localhost, or an explicit port (http://192.168.1.10:3000,
//     http://box.tailnet.ts.net:3000): talk to the SLS API directly on SLS_STATS_PORT.
//   - page on a host name without a port (https://srt.example.com): assume a reverse
//     proxy / tunnel that forwards /api, /health and /stats on the same origin.
//
// A host value may be a full URL (https://api.example.com, http://10.0.0.5:8080/sls)
// or a bare host (10.0.0.5, api.example.com:8080). Bare hosts get http:// and, if
// they have no port, SLS_STATS_PORT.

export interface RawConfig {
  appUrl: string;
  apiHost: string;
  statsHost: string;
  srtHost: string;
  srtPlayerPort: string;
  srtSenderPort: string;
  slsStatsPort: string;
  srtlaPort: string;
}

export interface PageLocation {
  protocol: string;
  hostname: string;
  port: string;
  origin: string;
}

export type ConfigSource =
  | 'API_HOST'
  | 'STATS_HOST'
  | 'SRT_HOST'
  | 'APP_URL'
  | 'auto (direct)'
  | 'auto (same origin)'
  | 'page host';

export interface ResolvedConfig {
  apiUrl: string;
  apiSource: ConfigSource;
  statsUrl: string;
  statsSource: ConfigSource;
  srtHost: string;
  srtHostSource: ConfigSource;
  srtPlayerPort: string;
  srtSenderPort: string;
  slsStatsPort: string;
  /** Empty when SRTLA is not configured. */
  srtlaPort: string;
  warnings: string[];
}

export const EMPTY_RAW_CONFIG: RawConfig = {
  appUrl: '',
  apiHost: '',
  statsHost: '',
  srtHost: '',
  srtPlayerPort: '',
  srtSenderPort: '',
  slsStatsPort: '',
  srtlaPort: '',
};

const DEFAULT_PORTS = { srtPlayerPort: '4000', srtSenderPort: '4001', slsStatsPort: '8080' };

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

const isIpLiteral = (hostname: string): boolean =>
  IPV4.test(hostname) || hostname.startsWith('[') || hostname.includes(':');

const isLocalhost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

const validPort = (value: string): boolean => /^\d+$/.test(value) && +value >= 1 && +value <= 65535;

/**
 * Normalise a host setting to a base URL without trailing slash.
 * Returns null for empty or invalid input.
 */
export const toBaseUrl = (value: string, defaultPort: string): string | null => {
  const input = value.trim();
  if (!input) return null;
  const explicitScheme = HAS_SCHEME.test(input);
  let url: URL;
  try {
    url = new URL(explicitScheme ? input : `http://${input}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!explicitScheme && !url.port && defaultPort) url.port = defaultPort;
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
};

/** Host name of a host setting (full URL or bare host), or null. */
export const hostOf = (value: string): string | null => {
  const input = value.trim();
  if (!input) return null;
  try {
    return new URL(HAS_SCHEME.test(input) ? input : `http://${input}`).hostname || null;
  } catch {
    return null;
  }
};

export const resolveConfig = (raw: Partial<RawConfig>, page: PageLocation): ResolvedConfig => {
  const cfg: RawConfig = { ...EMPTY_RAW_CONFIG, ...raw };
  const warnings: string[] = [];

  const port = (key: keyof typeof DEFAULT_PORTS): string => {
    const value = cfg[key].trim();
    if (value === '') return DEFAULT_PORTS[key];
    if (validPort(value)) return value;
    warnings.push(`Ignoring invalid ${key} "${value}", using ${DEFAULT_PORTS[key]}.`);
    return DEFAULT_PORTS[key];
  };
  const slsStatsPort = port('slsStatsPort');
  const srtPlayerPort = port('srtPlayerPort');
  const srtSenderPort = port('srtSenderPort');

  let srtlaPort = cfg.srtlaPort.trim();
  if (srtlaPort !== '' && !validPort(srtlaPort)) {
    warnings.push(`Ignoring invalid srtlaPort "${srtlaPort}"; SRTLA URLs are hidden.`);
    srtlaPort = '';
  }

  const fromSetting = (name: 'APP_URL' | 'API_HOST' | 'STATS_HOST', value: string): string | null => {
    if (!value.trim()) return null;
    const base = toBaseUrl(value, slsStatsPort);
    if (base === null) warnings.push(`Ignoring invalid ${name} "${value}".`);
    return base;
  };
  const appUrl = fromSetting('APP_URL', cfg.appUrl);
  const apiHost = fromSetting('API_HOST', cfg.apiHost);
  const statsHost = fromSetting('STATS_HOST', cfg.statsHost);

  const direct = page.port !== '' || isIpLiteral(page.hostname) || isLocalhost(page.hostname);
  const auto = direct
    ? { url: `http://${page.hostname}:${slsStatsPort}`, source: 'auto (direct)' as const }
    : { url: page.origin, source: 'auto (same origin)' as const };

  const api = apiHost
    ? { url: apiHost, source: 'API_HOST' as const }
    : appUrl
      ? { url: appUrl, source: 'APP_URL' as const }
      : auto;

  const stats = statsHost ? { url: statsHost, source: 'STATS_HOST' as const } : api;

  let srtHost: string;
  let srtHostSource: ConfigSource;
  const explicitSrtHost = hostOf(cfg.srtHost);
  const appHost = appUrl ? hostOf(appUrl) : null;
  if (explicitSrtHost) {
    srtHost = explicitSrtHost;
    srtHostSource = 'SRT_HOST';
  } else {
    if (cfg.srtHost.trim()) warnings.push(`Ignoring invalid SRT_HOST "${cfg.srtHost}".`);
    if (appHost) {
      srtHost = appHost;
      srtHostSource = 'APP_URL';
    } else {
      srtHost = page.hostname;
      srtHostSource = 'page host';
      if (api.source === 'auto (same origin)') {
        warnings.push(
          `SRT_HOST is not set, so SRT URLs use the page host "${page.hostname}". ` +
            'Set SRT_HOST if this host is a proxy or tunnel that does not forward UDP.',
        );
      }
    }
  }

  if (page.protocol === 'https:' && api.url.startsWith('http://')) {
    warnings.push(
      `The page is served over HTTPS but the API URL ${api.url} is plain HTTP; ` +
        'browsers block such requests. Put the API behind the same HTTPS proxy or set API_HOST.',
    );
  }

  return {
    apiUrl: api.url,
    apiSource: api.source,
    statsUrl: stats.url,
    statsSource: stats.source,
    srtHost,
    srtHostSource,
    srtPlayerPort,
    srtSenderPort,
    slsStatsPort,
    srtlaPort,
    warnings,
  };
};
