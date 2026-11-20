import { describe, expect, it } from 'vitest';
import { readRuntimeConfig, renderConfigScript } from './runtime-config.mjs';

describe('readRuntimeConfig', () => {
  it('prefers canonical names over legacy REACT_APP_* names and trims values', () => {
    const cfg = readRuntimeConfig({
      APP_URL: '  ',
      REACT_APP_BASE_URL: 'http://1.2.3.4:8080 ',
      SRT_HOST: 'ingest.example.com',
      REACT_APP_SRT_HOST: 'ignored.example.com',
      REACT_APP_SRTLA_PORT: '5000',
    });
    expect(cfg.appUrl).toBe('http://1.2.3.4:8080');
    expect(cfg.srtHost).toBe('ingest.example.com');
    expect(cfg.srtlaPort).toBe('5000');
    expect(cfg.apiHost).toBe('');
  });

  it('removes one pair of quotes left by docker --env-file', () => {
    const cfg = readRuntimeConfig({ API_HOST: '"http://10.0.0.5:8080"', SRT_HOST: "'ingest.example.com'" });
    expect(cfg.apiHost).toBe('http://10.0.0.5:8080');
    expect(cfg.srtHost).toBe('ingest.example.com');
  });
});

describe('renderConfigScript', () => {
  it('produces a script that cannot be broken out of by config values', () => {
    const cfg = readRuntimeConfig({ API_HOST: '"</script><script>alert(1)</script>' });
    const script = renderConfigScript(cfg);
    expect(script).not.toContain('</script>');
    const sandbox: { __SLS_CONFIG__?: Record<string, string> } = {};
    new Function('window', script)(sandbox);
    expect(sandbox.__SLS_CONFIG__?.apiHost).toBe('"</script><script>alert(1)</script>');
  });
});
