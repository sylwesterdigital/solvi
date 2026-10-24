/** Dependency-free loopback-only HTTP server (desktop preview). Run: node serve.mjs */
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));const port=Number(process.env.PORT)||8080;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.md':'text/markdown; charset=utf-8'};
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!(target===root||target.startsWith(root+path.sep))||target.endsWith('key.pem')||path.basename(target).startsWith('.')||!types[path.extname(target)]){res.writeHead(403);res.end('Forbidden');return;}const st=await stat(target);if(!st.isFile()){res.writeHead(404);res.end('Not found');return;}const file=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','Cross-Origin-Resource-Policy':'same-origin'});res.end(file);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log(`Solvi XR → http://localhost:${port}\nFor the 30-second test: http://localhost:${port}/?demo=1\nCtrl+C to stop.`));
