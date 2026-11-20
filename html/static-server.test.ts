import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStaticServer, resolveStaticFile } from './static-server.mjs';

let root: string;
let base: string;
let server: ReturnType<typeof createStaticServer>;

beforeAll(async () => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'sls-ui-')));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<!doctype html>');
  writeFileSync(join(root, 'assets', 'index-abc.js'), 'console.log(1)');
  writeFileSync(join(root, '.env'), 'SECRET=1');
  server = createStaticServer({ root, configScript: 'window.__SLS_CONFIG__ = {};\n' });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  rmSync(root, { recursive: true, force: true });
});

describe('resolveStaticFile', () => {
  it('maps / to index.html and stays inside the root', () => {
    expect(resolveStaticFile(root, '/')).toBe(join(root, 'index.html'));
    expect(resolveStaticFile(root, '/assets/index-abc.js')).toBe(join(root, 'assets', 'index-abc.js'));
    for (const bad of ['/../etc/passwd', '/%2e%2e/etc/passwd', '/assets/../../etc/passwd', '/.env', '/%00', '/%zz', '/assets']) {
      expect(resolveStaticFile(root, bad), bad).toBeNull();
    }
  });
});

describe('static server', () => {
  it('serves config.js from memory without caching', async () => {
    const r = await fetch(`${base}/config.js`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('javascript');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.text()).toBe('window.__SLS_CONFIG__ = {};\n');
  });

  it('caches hashed assets long-term and revalidates index.html', async () => {
    const asset = await fetch(`${base}/assets/index-abc.js`);
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect(asset.headers.get('content-type')).toContain('javascript');
    const index = await fetch(`${base}/`);
    expect(index.headers.get('cache-control')).toBe('no-cache');
    expect(index.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('returns 404 for missing files, directories and dot-files, 405 for other methods', async () => {
    expect((await fetch(`${base}/nope.js`)).status).toBe(404);
    expect((await fetch(`${base}/assets/`)).status).toBe(404);
    expect((await fetch(`${base}/.env`)).status).toBe(404);
    expect((await fetch(`${base}/`, { method: 'POST' })).status).toBe(405);
  });
});
