#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { readRuntimeConfig, renderConfigScript } from './runtime-config.mjs';
import { createStaticServer } from './static-server.mjs';

const ROOT = realpathSync(process.env.SLS_UI_ROOT || '/app');
const LISTEN_PORT = 3000;

const cfg = readRuntimeConfig(process.env);
console.log('SRT Live Server Management UI - runtime configuration');
for (const [key, value] of Object.entries(cfg)) {
  console.log(`  ${key.padEnd(14)} ${value === '' ? '(unset)' : value}`);
}

const server = createStaticServer({
  root: ROOT,
  configScript: renderConfigScript(cfg),
  log: (line) => console.log(`[${new Date().toISOString()}] ${line}`),
});

server.listen(LISTEN_PORT, () => console.log(`Serving ${ROOT} on port ${LISTEN_PORT}`));

/** @type {NodeJS.Signals[]} */
const shutdownSignals = ['SIGTERM', 'SIGINT'];
for (const signal of shutdownSignals) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
