/** Generate a LAN-IP-aware TLS certificate. Zero npm dependencies; requires mkcert or OpenSSL. */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { X509Certificate } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { localIPv4 } from './lan.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(root, '.certs');
const certPath = path.join(dir, 'cert.pem');
const keyPath = path.join(dir, 'key.pem');
const manifestPath = path.join(dir, 'manifest.json');
const privateNames = ['localhost','127.0.0.1',...localIPv4()];

function has(binary) {
  try { execFileSync(binary, ['-version'], {stdio:'ignore'}); return true; } catch { return false; }
}
function hasMkcert() {
  try { execFileSync('mkcert',['-help'],{stdio:'ignore'}); return true; } catch { return false; }
}

async function validExisting() {
  try {
    const meta=JSON.parse(await readFile(manifestPath,'utf8'));
    if (JSON.stringify(meta.names) !== JSON.stringify(privateNames)) return false;
    const cert = new X509Certificate(await readFile(certPath));
    if (new Date(cert.validTo).getTime() < Date.now()+24*3600*1000) return false;
    await readFile(keyPath);
    return true;
  } catch { return false; }
}

export async function ensureCertificates() {
  await mkdir(dir,{recursive:true,mode:0o700});
  if (await validExisting()) {
    const meta=JSON.parse(await readFile(manifestPath,'utf8'));
    return {certPath,keyPath,method:meta.method,generated:false,names:privateNames};
  }
  const tempCert=path.join(dir,`cert-${process.pid}.pem`);
  const tempKey=path.join(dir,`key-${process.pid}.pem`);
  let method;
  try {
    if (hasMkcert()) {
      method='mkcert';
      execFileSync('mkcert',['-cert-file',tempCert,'-key-file',tempKey,...privateNames],{stdio:'pipe'});
    } else if (has('openssl')) {
      method='openssl-self-signed';
      const san = privateNames.map(ip=>ip==='localhost'?'DNS:localhost':`IP:${ip}`).join(',');
      execFileSync('openssl',[
        'req','-x509','-newkey','rsa:2048','-sha256','-nodes',
        '-days','30','-keyout',tempKey,'-out',tempCert,
        '-subj','/CN=Solvi XR local development',
        '-addext',`subjectAltName=${san}`,
        '-addext','basicConstraints=critical,CA:FALSE',
        '-addext','keyUsage=critical,digitalSignature,keyEncipherment',
        '-addext','extendedKeyUsage=serverAuth'
      ],{stdio:'pipe'});
    } else {
      throw Error('No TLS certificate generator found. Install mkcert (recommended) or OpenSSL, then retry.');
    }
    await chmod(tempKey,0o600);
    // Persist after successfully creating both files. Existing data is not exposed by static server.
    await writeFile(certPath,await readFile(tempCert),{mode:0o600});
    await writeFile(keyPath,await readFile(tempKey),{mode:0o600});
    await chmod(keyPath,0o600);
    await writeFile(manifestPath,JSON.stringify({names:privateNames,method,createdAt:new Date().toISOString()},null,2));
  } catch (err) {
    const details=err.stderr?.toString()?.trim();
    throw Error(`Could not create a TLS certificate: ${details || err.message}`);
  } finally {
    await Promise.allSettled([rm(tempCert,{force:true}),rm(tempKey,{force:true})]);
  }
  return {certPath,keyPath,method,generated:true,names:privateNames};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result=await ensureCertificates();
    console.log(`${result.generated?'Created':'Reused'} TLS certificate: ${result.certPath}`);
    console.log(`Generator: ${result.method}`);
    console.log(`Certificate names: ${result.names.join(', ')}`);
    console.log('On a separate device, a development certificate may need to be explicitly trusted.');
  } catch(err) { console.error(err.message); process.exitCode=1; }
}
