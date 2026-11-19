#!/usr/bin/env node
// Container entrypoint: write /config.js from the environment, then serve the
// static build. Runs on every start; the bundle itself is never modified.
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { readRuntimeConfig, renderConfigScript } from './runtime-config.mjs';

const APP_DIR = '/app';
const LISTEN_PORT = '3000';

const cfg = readRuntimeConfig(process.env);
writeFileSync(`${APP_DIR}/config.js`, renderConfigScript(cfg));

console.log('SRT Live Server Management UI - runtime configuration');
for (const [key, value] of Object.entries(cfg)) {
  console.log(`  ${key.padEnd(14)} ${value === '' ? '(unset)' : value}`);
}

// -c-1: no caching, so a changed config.js is picked up on reload.
// -d false: no directory listings.
const server = spawn(
  'http-server',
  [APP_DIR, '-p', LISTEN_PORT, '-c-1', '-d', 'false', '--no-dotfiles'],
  { stdio: 'inherit' },
);

/** @type {NodeJS.Signals[]} */
const forwardedSignals = ['SIGTERM', 'SIGINT'];
for (const signal of forwardedSignals) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
