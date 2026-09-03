// Servidor estático mínimo para o build web do Relay — só para deixar os
// amigos acessarem via Radmin VPN durante o teste. Não usar isso em produção.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'build', 'web');
const DOWNLOADS_ROOT = path.join(__dirname, '..', 'desktop', 'dist-portable');
const PORT = 8080;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip',
};

const server = http.createServer((req, res) => {
  const reqPath = decodeURIComponent(req.url.split('?')[0]);

  // /downloads/* serve o app desktop (zip portable do Electron) pra
  // download direto, separado do build web da SPA.
  if (reqPath.startsWith('/downloads/')) {
    const downloadPath = path.join(DOWNLOADS_ROOT, reqPath.slice('/downloads/'.length));
    if (!downloadPath.startsWith(DOWNLOADS_ROOT)) {
      res.writeHead(400).end('Bad request');
      return;
    }
    fs.stat(downloadPath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(downloadPath)}"`,
        'Content-Length': stats.size,
      });
      fs.createReadStream(downloadPath).pipe(res);
    });
    return;
  }

  let filePath = path.join(ROOT, reqPath);

  // Flutter web é uma SPA — qualquer rota desconhecida cai no index.html.
  if (!filePath.startsWith(ROOT)) {
    filePath = path.join(ROOT, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Relay (web) servindo build/web em http://0.0.0.0:${PORT}`);
});
