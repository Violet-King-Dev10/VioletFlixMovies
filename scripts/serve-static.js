#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { handleApiRequest } = require('./api-proxy');
const { packageDownloadBlock, packageDownloadHeaders } = require('./request-guard');

const distDir = path.resolve(__dirname, '..', 'dist');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function safeJoin(root, requestPath) {
  const filePath = path.resolve(root, `.${requestPath}`);
  return filePath.startsWith(`${root}${path.sep}`) || filePath === root ? filePath : null;
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function collectHtmlFiles(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(base, entry.name);
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectHtmlFiles(absolutePath, relativePath);
    }

    return entry.isFile() && entry.name.endsWith('.html') ? [`/${relativePath}`] : [];
  });
}

function routeToParts(route) {
  return route.replace(/\.html$/, '').split('/').filter(Boolean);
}

function findDynamicRoute(urlPath) {
  const requestParts = routeToParts(urlPath);

  return htmlFiles.find((route) => {
    const routeParts = routeToParts(route);

    return (
      routeParts.length === requestParts.length &&
      routeParts.every((part, index) => {
        return (part.startsWith('[') && part.endsWith(']')) || part === requestParts[index];
      })
    );
  });
}

function routeCandidates(urlPath) {
  const normalizedPath = urlPath === '/' ? '/index' : urlPath.replace(/\/$/, '');
  return [
    normalizedPath,
    `${normalizedPath}.html`,
    `${normalizedPath}/index.html`,
    findDynamicRoute(normalizedPath),
    '/+not-found.html',
    '/index.html',
  ].filter(Boolean);
}

function resolveRequest(urlPath) {
  for (const candidate of routeCandidates(urlPath)) {
    const filePath = safeJoin(distDir, candidate);
    if (filePath && fileExists(filePath)) {
      return filePath;
    }
  }

  return null;
}

if (!fileExists(path.join(distDir, 'index.html'))) {
  console.error('Could not find dist/index.html. Run `pnpm run build` before starting the server.');
  process.exit(1);
}

const htmlFiles = collectHtmlFiles(distDir);

const server = http.createServer(async (req, res) => {
  if (await handleApiRequest(req, res)) return;

  if (!req.url || !['GET', 'HEAD'].includes(req.method || '')) {
    send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }

  let requestUrl;
  let pathname;
  try {
    requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    send(res, 400, 'Bad Request');
    return;
  }

  const packageBlock = packageDownloadBlock(req, requestUrl);
  if (packageBlock) {
    send(res, packageBlock.statusCode, packageBlock.body, packageBlock.headers);
    return;
  }

  const filePath = resolveRequest(pathname);
  if (!filePath) {
    send(res, 404, 'Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = packageDownloadHeaders(filePath, {
    'Cache-Control': filePath.includes(`${path.sep}_expo${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
  });

  if (req.method === 'HEAD') {
    send(res, 200, '', headers);
    return;
  }

  fs.createReadStream(filePath)
    .on('error', () => send(res, 500, 'Internal Server Error'))
    .pipe(res.writeHead(200, headers));
});

server.listen(port, host, () => {
  console.log(`Serving Expo web export from ${distDir}`);
  console.log(`Listening on http://${host}:${port}`);
});
