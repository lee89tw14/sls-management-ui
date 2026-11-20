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
  srtlaPort: string | null;
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

const RAW_KEYS = Object.keys(EMPTY_RAW_CONFIG) as (keyof RawConfig)[];

const DEFAULT_PORTS = { srtPlayerPort: '4000', srtSenderPort: '4001', slsStatsPort: '8080' };

const SCHEME = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i;
const AUTHORITY = /^(\[[0-9a-f:.]+\]|[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d{1,5}))?$/i;
const PATH = /^(?:\/[a-z0-9._~!$&'()*+,;=:@%-]*)*$/i;
const DIGITS_AND_DOTS = /^[\d.]+$/;
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

const validPort = (value: string): boolean => /^\d{1,5}$/.test(value) && +value >= 1 && +value <= 65535;

const isIpv4 = (host: string): boolean => {
  const parts = host.split('.');
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && +p <= 255);
};

const isValidHost = (host: string): boolean => {
  if (host.startsWith('[')) {
    try {
      new URL(`http://${host}`);
      return true;
    } catch {
      return false;
    }
  }
  if (DIGITS_AND_DOTS.test(host)) return isIpv4(host);
  return host.split('.').every((label) => DNS_LABEL.test(label));
};

const isIpLiteral = (hostname: string): boolean => isIpv4(hostname) || hostname.startsWith('[');

const isLocalhost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

const canReachSlsDirectly = (page: PageLocation): boolean =>
  page.protocol !== 'https:' && (page.port !== '' || isIpLiteral(page.hostname) || isLocalhost(page.hostname));

interface HostSetting {
  scheme: string | null;
  host: string;
  port: string;
  path: string;
}

export const parseHostSetting = (value: string): HostSetting | null => {
  const input = value.trim();
  if (!input) return null;
  const m = SCHEME.exec(input);
  const scheme = m ? m[1].toLowerCase() : null;
  const rest = m ? m[2] : input;
  const slash = rest.indexOf('/');
  const authority = slash === -1 ? rest : rest.slice(0, slash);
  const path = slash === -1 ? '' : rest.slice(slash);
  const a = AUTHORITY.exec(authority);
  if (!a || !isValidHost(a[1])) return null;
  const port = a[2] ?? '';
  if (port && !validPort(port)) return null;
  if (!PATH.test(path)) return null;
  return { scheme, host: a[1].toLowerCase(), port, path: path.replace(/\/+$/, '') };
};

export const toBaseUrl = (value: string, defaultPort: string): string | null => {
  const s = parseHostSetting(value);
  if (!s) return null;
  if (s.scheme !== null && s.scheme !== 'http' && s.scheme !== 'https') return null;
  const scheme = s.scheme ?? 'http';
  const port = s.port || (s.scheme === null ? defaultPort : '');
  const url = new URL(`${scheme}://${s.host}${port ? `:${port}` : ''}`);
  return `${url.origin}${s.path}`;
};

export const hostOf = (value: string): { host: string; port: string } | null => {
  const s = parseHostSetting(value);
  return s ? { host: s.host, port: s.port } : null;
};

export const resolveConfig = (raw: Partial<Record<keyof RawConfig, unknown>>, page: PageLocation): ResolvedConfig => {
  const cfg: RawConfig = { ...EMPTY_RAW_CONFIG };
  for (const key of RAW_KEYS) cfg[key] = String(raw[key] ?? '').trim();
  const warnings: string[] = [];

  const port = (key: keyof typeof DEFAULT_PORTS): string => {
    const value = cfg[key];
    if (value === '') return DEFAULT_PORTS[key];
    if (validPort(value)) return value;
    warnings.push(`Ignoring invalid ${key} "${value}", using ${DEFAULT_PORTS[key]}.`);
    return DEFAULT_PORTS[key];
  };
  const slsStatsPort = port('slsStatsPort');
  const srtPlayerPort = port('srtPlayerPort');
  const srtSenderPort = port('srtSenderPort');

  let srtlaPort: string | null = cfg.srtlaPort === '' ? null : cfg.srtlaPort;
  if (srtlaPort !== null && !validPort(srtlaPort)) {
    warnings.push(`Ignoring invalid srtlaPort "${srtlaPort}"; SRTLA URLs are hidden.`);
    srtlaPort = null;
  }

  const fromSetting = (name: 'APP_URL' | 'API_HOST' | 'STATS_HOST', value: string): string | null => {
    if (!value) return null;
    const base = toBaseUrl(value, slsStatsPort);
    if (base === null) warnings.push(`Ignoring invalid ${name} "${value}".`);
    return base;
  };
  const appUrl = fromSetting('APP_URL', cfg.appUrl);
  const apiHost = fromSetting('API_HOST', cfg.apiHost);
  const statsHost = fromSetting('STATS_HOST', cfg.statsHost);

  const auto = canReachSlsDirectly(page)
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
  const explicitSrt = cfg.srtHost ? hostOf(cfg.srtHost) : null;
  const appHost = appUrl ? hostOf(appUrl) : null;
  if (cfg.srtHost && !explicitSrt) warnings.push(`Ignoring invalid SRT_HOST "${cfg.srtHost}".`);
  if (explicitSrt) {
    srtHost = explicitSrt.host;
    srtHostSource = 'SRT_HOST';
    if (explicitSrt.port) {
      warnings.push(
        `The port in SRT_HOST "${cfg.srtHost}" is ignored; ` +
          'set SRT_SENDER_PORT, SRT_PLAYER_PORT and SRTLA_PORT instead.',
      );
    }
  } else if (appHost) {
    srtHost = appHost.host;
    srtHostSource = 'APP_URL';
  } else {
    srtHost = page.hostname;
    srtHostSource = 'page host';
    if (api.source !== 'auto (direct)') {
      warnings.push(
        `SRT_HOST is not set, so SRT URLs use the page host "${page.hostname}". ` +
          'Set SRT_HOST if this host is a proxy or tunnel that does not forward UDP to the receiver.',
      );
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
