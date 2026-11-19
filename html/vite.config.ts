/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readRuntimeConfig, renderConfigScript } from './runtime-config.mjs';

// Serve /config.js in dev the same way run.mjs writes it in production.
const runtimeConfigDevServer = (env: Record<string, string | undefined>): Plugin => ({
  name: 'sls-runtime-config',
  configureServer(server) {
    server.middlewares.use('/config.js', (_req, res) => {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(renderConfigScript(readRuntimeConfig(env)));
    });
  },
});

export default defineConfig(({ mode }) => {
  // .env files in html/ (optional) are overridden by the real environment,
  // which is what docker-compose passes into the dev container.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  return {
    plugins: [react(), runtimeConfigDevServer(env)],
    server: { host: true, port: 3000, strictPort: true },
    preview: { port: 3000, strictPort: true },
    build: { outDir: 'build' },
    test: { environment: 'node', include: ['src/**/*.test.ts', '*.test.ts'] },
  };
});
