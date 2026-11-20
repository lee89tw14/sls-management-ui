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
  it('keeps an explicit port on bare hosts, including :80', () => {
    expect(toBaseUrl('10.0.0.5:9000', '8080')).toBe('http://10.0.0.5:9000');
    expect(toBaseUrl('example.com:80', '8080')).toBe('http://example.com');
  });
  it('keeps full URLs as given, without trailing slash', () => {
    expect(toBaseUrl('https://api.example.com/', '8080')).toBe('https://api.example.com');
    expect(toBaseUrl('http://10.0.0.5:8080/sls/', '8080')).toBe('http://10.0.0.5:8080/sls');
    expect(toBaseUrl('http://[fd00::5]:8080', '8080')).toBe('http://[fd00::5]:8080');
  });
  it('strips one pair of surrounding quotes', () => {
    expect(toBaseUrl('"http://10.0.0.5:8080"', '8080')).toBe('http://10.0.0.5:8080');
    expect(toBaseUrl("'10.0.0.5'", '8080')).toBe('http://10.0.0.5:8080');
  });
  it('rejects values that are not a host or http(s) URL', () => {
    for (const bad of [
      '',
      'http://',
      'javascript://alert(1)',
      'ftp://example.com',
      '8080',
      'http://8080',
      'http:/host',
      '999.1.1.1',
      'user@host',
      'http://user:pw@host',
      'host?x=1',
      'host#frag',
      'host name',
      '"unbalanced',
      'host:99999',
    ]) {
      expect(toBaseUrl(bad, '8080'), bad).toBeNull();
    }
  });
});

describe('hostOf', () => {
  it('returns host and port of URLs and bare hosts', () => {
    expect(hostOf('http://1.2.3.4:8080')).toEqual({ host: '1.2.3.4', port: '8080' });
    expect(hostOf('srt.example.com')).toEqual({ host: 'srt.example.com', port: '' });
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

  it('never picks plain-HTTP direct access from an https page, even with a port or IP', () => {
    for (const url of ['https://srt.example.com:8443/', 'https://192.168.1.10:8443/']) {
      const c = resolveConfig({}, page(url));
      expect(c.apiSource, url).toBe('auto (same origin)');
      expect(c.apiUrl, url).toBe(new URL(url).origin);
      expect(c.warnings.some((w) => w.includes('plain HTTP')), url).toBe(false);
    }
  });

  it('applies default ports and hides SRTLA when unset', () => {
    const c = resolveConfig({}, page('http://10.0.0.1:3000/'));
    expect([c.srtPlayerPort, c.srtSenderPort, c.slsStatsPort, c.srtlaPort]).toEqual(['4000', '4001', '8080', '']);
  });
});

describe('resolveConfig: explicit settings', () => {
  it('APP_URL alone sets API, stats and SRT host (backwards compatible)', () => {
    const c = resolveConfig({ appUrl: 'http://203.0.113.7:8080' }, page('http://ui.example.com:3000/'));
    expect(c.apiUrl).toBe('http://203.0.113.7:8080');
    expect(c.apiSource).toBe('APP_URL');
    expect(c.statsUrl).toBe('http://203.0.113.7:8080');
    expect(c.srtHost).toBe('203.0.113.7');
    expect(c.srtHostSource).toBe('APP_URL');
    expect(c.warnings).toEqual([]);
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
    const c = resolveConfig({ apiHost: '10.0.0.5', srtHost: '10.0.0.5' }, page('http://10.0.0.5:3000/'));
    expect(c.statsUrl).toBe('http://10.0.0.5:8080');
    expect(c.statsSource).toBe('API_HOST');
  });

  it('warns when API_HOST is set but SRT_HOST falls back to the page host', () => {
    const c = resolveConfig({ apiHost: 'https://ui.example.com' }, page('http://10.0.0.1:3000/'));
    expect(c.srtHostSource).toBe('page host');
    expect(c.warnings.some((w) => w.includes('SRT_HOST is not set'))).toBe(true);
  });

  it('SRT_HOST accepts a URL, keeps the host name and warns about a port', () => {
    const c = resolveConfig({ srtHost: 'srt://ingest.example.com:5000' }, page('http://10.0.0.1:3000/'));
    expect(c.srtHost).toBe('ingest.example.com');
    expect(c.warnings.some((w) => w.includes('port in SRT_HOST'))).toBe(true);
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

  it('falls back with a warning when a host setting is invalid', () => {
    for (const apiHost of ['ftp://x', '8080', 'http:/host']) {
      const c = resolveConfig({ apiHost }, page('http://10.0.0.1:3000/'));
      expect(c.apiSource, apiHost).toBe('auto (direct)');
      expect(c.warnings.some((w) => w.includes('API_HOST')), apiHost).toBe(true);
    }
  });

  it('accepts non-string values from a hand-written config.js', () => {
    const c = resolveConfig(
      { slsStatsPort: 9090, srtlaPort: null, appUrl: undefined } as unknown as Record<string, unknown>,
      page('http://10.0.0.1:3000/'),
    );
    expect(c.slsStatsPort).toBe('9090');
    expect(c.srtlaPort).toBe('');
  });

  it('warns about mixed content', () => {
    const c = resolveConfig({ apiHost: 'http://10.0.0.5:8080' }, page('https://ui.example.com/'));
    expect(c.warnings.some((w) => w.includes('HTTPS'))).toBe(true);
  });
});
