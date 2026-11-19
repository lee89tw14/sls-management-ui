import { describe, expect, it } from 'vitest';
import { hostOf, resolveConfig, toBaseUrl, type PageLocation } from './config-resolver';

const page = (url: string): PageLocation => {
  const u = new URL(url);
  return { protocol: u.protocol, hostname: u.hostname, port: u.port, origin: u.origin };
};

describe('toBaseUrl', () => {
  it('adds http:// and the default port to bare hosts', () => {
    expect(toBaseUrl('10.0.0.5', '8080')).toBe('http://10.0.0.5:8080');
    expect(toBaseUrl('api.example.com', '8080')).toBe('http://api.example.com:8080');
  });
  it('keeps an explicit port on bare hosts', () => {
    expect(toBaseUrl('10.0.0.5:9000', '8080')).toBe('http://10.0.0.5:9000');
  });
  it('keeps full URLs as given, without trailing slash', () => {
    expect(toBaseUrl('https://api.example.com/', '8080')).toBe('https://api.example.com');
    expect(toBaseUrl('http://10.0.0.5:8080/sls/', '8080')).toBe('http://10.0.0.5:8080/sls');
  });
  it('rejects empty, invalid and non-http values', () => {
    expect(toBaseUrl('', '8080')).toBeNull();
    expect(toBaseUrl('http://', '8080')).toBeNull();
    expect(toBaseUrl('javascript://alert(1)', '8080')).toBeNull();
  });
});

describe('hostOf', () => {
  it('extracts the host name from URLs and bare hosts', () => {
    expect(hostOf('http://1.2.3.4:8080')).toBe('1.2.3.4');
    expect(hostOf('srt.example.com:5000')).toBe('srt.example.com');
    expect(hostOf('')).toBeNull();
  });
});

describe('resolveConfig: auto detection', () => {
  it('talks to the API directly when the page is on an IP', () => {
    const c = resolveConfig({}, page('http://192.168.1.10:3000/'));
    expect(c.apiUrl).toBe('http://192.168.1.10:8080');
    expect(c.apiSource).toBe('auto (direct)');
    expect(c.statsUrl).toBe('http://192.168.1.10:8080');
    expect(c.srtHost).toBe('192.168.1.10');
    expect(c.warnings).toEqual([]);
  });

  it('talks to the API directly when the page has an explicit port (e.g. Tailscale name)', () => {
    const c = resolveConfig({ slsStatsPort: '9090' }, page('http://box.tailnet.ts.net:3000/'));
    expect(c.apiUrl).toBe('http://box.tailnet.ts.net:9090');
    expect(c.apiSource).toBe('auto (direct)');
  });

  it('uses the same origin behind a proxy/tunnel and warns about SRT_HOST', () => {
    const c = resolveConfig({}, page('https://srt.example.com/'));
    expect(c.apiUrl).toBe('https://srt.example.com');
    expect(c.apiSource).toBe('auto (same origin)');
    expect(c.statsUrl).toBe('https://srt.example.com');
    expect(c.srtHost).toBe('srt.example.com');
    expect(c.warnings.some((w) => w.includes('SRT_HOST is not set'))).toBe(true);
  });

  it('applies default ports and hides SRTLA when unset', () => {
    const c = resolveConfig({}, page('http://10.0.0.1:3000/'));
    expect([c.srtPlayerPort, c.srtSenderPort, c.slsStatsPort, c.srtlaPort]).toEqual(['4000', '4001', '8080', '']);
  });
});

describe('resolveConfig: explicit settings', () => {
  it('APP_URL alone sets API, stats and SRT host (backwards compatible)', () => {
    const c = resolveConfig({ appUrl: 'http://203.0.113.7:8080' }, page('https://ui.example.com/'));
    expect(c.apiUrl).toBe('http://203.0.113.7:8080');
    expect(c.apiSource).toBe('APP_URL');
    expect(c.statsUrl).toBe('http://203.0.113.7:8080');
    expect(c.srtHost).toBe('203.0.113.7');
    expect(c.srtHostSource).toBe('APP_URL');
  });

  it('split hosts override APP_URL independently', () => {
    const c = resolveConfig(
      {
        appUrl: 'http://203.0.113.7:8080',
        apiHost: 'https://ui.example.com',
        statsHost: 'stats.example.com',
        srtHost: 'ingest.example.com',
      },
      page('https://ui.example.com/'),
    );
    expect(c.apiUrl).toBe('https://ui.example.com');
    expect(c.statsUrl).toBe('http://stats.example.com:8080');
    expect(c.srtHost).toBe('ingest.example.com');
    expect(c.warnings).toEqual([]);
  });

  it('stats follow API_HOST when STATS_HOST is unset', () => {
    const c = resolveConfig({ apiHost: '10.0.0.5' }, page('http://10.0.0.5:3000/'));
    expect(c.statsUrl).toBe('http://10.0.0.5:8080');
    expect(c.statsSource).toBe('API_HOST');
  });

  it('SRT_HOST accepts a URL and keeps only the host name', () => {
    const c = resolveConfig({ srtHost: 'srt://ingest.example.com:5000' }, page('http://10.0.0.1:3000/'));
    expect(c.srtHost).toBe('ingest.example.com');
  });

  it('enables SRTLA URLs when SRTLA_PORT is set', () => {
    expect(resolveConfig({ srtlaPort: '5000' }, page('http://10.0.0.1:3000/')).srtlaPort).toBe('5000');
  });
});

describe('resolveConfig: invalid input', () => {
  it('ignores invalid ports with a warning', () => {
    const c = resolveConfig({ srtPlayerPort: 'abc', srtlaPort: '70000' }, page('http://10.0.0.1:3000/'));
    expect(c.srtPlayerPort).toBe('4000');
    expect(c.srtlaPort).toBe('');
    expect(c.warnings).toHaveLength(2);
  });

  it('falls back when a host setting is invalid', () => {
    const c = resolveConfig({ apiHost: 'ftp://x' }, page('http://10.0.0.1:3000/'));
    expect(c.apiSource).toBe('auto (direct)');
    expect(c.warnings.some((w) => w.includes('API_HOST'))).toBe(true);
  });

  it('warns about mixed content', () => {
    const c = resolveConfig({ apiHost: 'http://10.0.0.5:8080' }, page('https://ui.example.com/'));
    expect(c.warnings.some((w) => w.includes('HTTPS'))).toBe(true);
  });
});
