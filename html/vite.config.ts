/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readRuntimeConfig, renderConfigScript } from './runtime-config.mjs';

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

const dropBlankEnvVarsSoEnvFilesApply = (): void => {
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value.trim() === '') delete process.env[key];
  }
};

export default defineConfig(({ mode }) => {
  dropBlankEnvVarsSoEnvFilesApply();
  const env: Record<string, string | undefined> = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  // Vite only answers requests for localhost and IP addresses by default.
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
