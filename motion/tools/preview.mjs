// Preview a film in your browser without rendering: node tools/preview.mjs agh-reel-2
// Space = play/pause, arrows = step, click = scrub. Nothing is written to disk.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const film = process.argv[2] || 'agh-reel-2';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2',
  '.png': 'image/png', '.wav': 'audio/wav', '.mp4': 'video/mp4' };
http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(5173, '127.0.0.1', () => console.log(`open http://127.0.0.1:5173/${film}/index.html?format=9x16  (Ctrl+C to stop)`));
