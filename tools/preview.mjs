import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Bind to this computer only. Local notes, tools, and archives are never served.
const root = resolve(process.env.SITE_ROOT || fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const rootFiles = new Set(['index.html', 'styles.css', 'site.js', 'favicon.png',
  'favicon-32.png', 'ms-resume.pdf', 'google3e7e3594d3bac0bb.html', 'robots.txt', 'sitemap.xml', '404.html']);
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = resolve(root, relative);
    if ((!rootFiles.has(relative) && !relative.startsWith('images/') && !relative.startsWith('fonts/')) ||
        !file.startsWith(root + sep) || relative.includes('\\') || relative.split('/').some(p => p.startsWith('.'))) {
      res.writeHead(404).end('Not found');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}`));
