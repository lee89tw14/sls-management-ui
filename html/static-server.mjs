// Minimal static file server for the production image.
//
// Serves the Vite build read-only and answers /config.js from memory, so the
// container needs no writable filesystem (works with `--read-only` and any
// `--user`). Hashed /assets/* files are cached long-term; everything else is
// revalidated on each load.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

/** @type {Record<string, string>} */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Map a request path to a regular file below root, or null.
 * Rejects traversal, NUL bytes, malformed escapes and dot-files.
 * @param {string} root absolute directory
 * @param {string} urlPath path part of the request URL
 * @returns {string | null}
 */
export function resolveStaticFile(root, urlPath) {
  let path;
  try {
    path = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (!path.startsWith('/') || path.includes('\0')) return null;
  if (path === '/') path = '/index.html';
  if (path.split('/').some((segment) => segment.startsWith('.'))) return null;
  const full = normalize(join(root, path));
  if (!full.startsWith(root + sep)) return null;
  try {
    return statSync(full).isFile() ? full : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ root: string, configScript: string, log?: (line: string) => void }} options
 */
export function createStaticServer({ root, configScript, log = () => {} }) {
  const config = Buffer.from(configScript);

  return createServer((req, res) => {
    const urlPath = (req.url ?? '/').split('?')[0];
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.on('finish', () => log(`${req.method} ${urlPath} ${res.statusCode}`));

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    if (urlPath === '/config.js') {
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Content-Length': config.length,
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : config);
      return;
    }

    const file = resolveStaticFile(root, urlPath);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': statSync(file).size,
      'Cache-Control': urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file)
      .on('error', () => res.destroy())
      .pipe(res);
  });
}
