/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readRuntimeConfig, renderConfigScript } from './runtime-config.mjs';

// Serve /config.js in dev and preview the same way run.mjs does in production.
const runtimeConfig = (env: Record<string, string | undefined>): Plugin => {
  const handler: Connect.NextHandleFunction = (_req, res) => {
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(renderConfigScript(readRuntimeConfig(env)));
  };
  return {
    name: 'sls-runtime-config',
    configureServer(server) {
      server.middlewares.use('/config.js', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/config.js', handler);
    },
  };
};

export default defineConfig(({ mode }) => {
  // .env files in html/ (optional) are overridden by the real environment, which
  // is what docker-compose passes into the dev container. Compose passes unset
  // variables as empty strings, so drop those first; loadEnv() would otherwise
  // let them override values from the .env files.
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value.trim() === '') delete process.env[key];
  }
  const env: Record<string, string | undefined> = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  // Vite only answers requests for localhost and IP addresses by default.
  // DEV_ALLOWED_HOSTS (comma-separated, e.g. "box.tailnet.ts.net,.example.com")
  // permits other host names for the dev and preview servers.
  const allowedHosts = (env.DEV_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  return {
    plugins: [react(), runtimeConfig(env)],
    server: { host: true, port: 3000, strictPort: true, allowedHosts },
    preview: { host: true, port: 3000, strictPort: true, allowedHosts },
    build: { outDir: 'build' },
    test: { environment: 'node', include: ['src/**/*.test.ts', '*.test.ts'] },
  };
});
