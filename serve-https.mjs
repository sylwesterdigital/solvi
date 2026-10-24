/** Development-only HTTPS static server for WebXR over a local network. */
import https from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureCertificates } from './create-certs.mjs';
import { localIPv4 } from './lan.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8443);
const host = process.env.SOLVI_HOST || '0.0.0.0';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT must be from 1 to 65535.');
const types = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.png':'image/png', '.glb':'model/gltf-binary','.wasm':'application/wasm','.webp':'image/webp', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff2':'font/woff2'
};
const {certPath,keyPath,method,generated} = await ensureCertificates();
const options={cert:await readFile(certPath),key:await readFile(keyPath)};
const server = https.createServer(options, async (req,res) => {
  // Only allow GET / HEAD to served, non-hidden, allowed static files.
  if(req.method!=='GET' && req.method!=='HEAD') {
    res.writeHead(405,{'Allow':'GET, HEAD'}); res.end('Method Not Allowed'); return;
  }
  try {
    const url=new URL(req.url,'https://localhost');
    const pathname=decodeURIComponent(url.pathname);
    const segments=pathname.split('/');
    if (segments.some(segment=>segment.startsWith('.') && segment)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if (!(target.startsWith(root+path.sep))) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const contentType=types[path.extname(target).toLowerCase()];
    if(!contentType){res.writeHead(403);res.end('Forbidden');return;}
    const info=await stat(target);
    if(!info.isFile()){res.writeHead(404);res.end('Not Found');return;}
    const file=await readFile(target);
    res.writeHead(200,{
      'Content-Type':contentType,
      'Content-Length':file.length,
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Cross-Origin-Resource-Policy':'same-origin'
    });
    res.end(req.method==='HEAD'?undefined:file);
  } catch {
    res.writeHead(404);res.end('Not Found');
  }
});
server.on('error',err=>{console.error(`Could not start HTTPS server on ${host}:${port}: ${err.message}`);process.exitCode=1;});
server.listen(port,host,()=>{
  console.log('\nSolvi XR — HTTPS WebXR LAN server');
  console.log(`Local:    https://localhost:${port}/`);
  const addresses=localIPv4();
  for (const ip of addresses) console.log(`LAN:      https://${ip}:${port}/`);
  if (!addresses.length) console.log('LAN:      no active IPv4 LAN interface found — check Wi-Fi / Ethernet.');
  console.log(`TLS:      ${method}${generated?' (new certificate)':' (cached)'}`);
  console.log('Quest:    use the LAN URL in Quest Browser while on the same network.');
  console.log('Trust:    development certs may show a warning; WebXR requires a secure origin.');
  console.log('Firewall: allow inbound TCP on port '+port+' for private LAN only.');
  console.log('Stop:     Ctrl+C\n');
});
