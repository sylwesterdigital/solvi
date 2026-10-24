/** LAN address selection, using Node.js built-ins only. */
import os from 'node:os';
import net from 'node:net';

function isPrivateIPv4(ip) {
  const a = ip.split('.').map(Number);
  return a.length === 4 && (a[0] === 10 ||
    (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
    (a[0] === 192 && a[1] === 168) ||
    (a[0] === 100 && a[1] >= 64 && a[1] <= 127));
}

export function localIPv4() {
  const override = process.env.SOLVI_LAN_IP?.trim();
  if (override && net.isIP(override) !== 4) {
    throw Error(`SOLVI_LAN_IP must be a valid IPv4 address; got: ${override}`);
  }
  const found = [];
  for (const [name, values] of Object.entries(os.networkInterfaces())) {
    if (/^(lo|docker|br-|veth|vmnet|vbox|utun|tailscale|wg)/i.test(name)) continue;
    for (const entry of values || []) {
      if (entry.internal || entry.family !== 'IPv4' || entry.address.startsWith('169.254.')) continue;
      if (!found.includes(entry.address)) found.push(entry.address);
    }
  }
  // Prefer Wi-Fi and wired private networks over other adapters.
  found.sort((a,b)=>Number(isPrivateIPv4(b))-Number(isPrivateIPv4(a)) ||
    Number(b.startsWith('192.168.'))-Number(a.startsWith('192.168.')) || a.localeCompare(b));
  if (override) return [override, ...found.filter(ip=>ip!==override)];
  return found;
}
