# Quest WebXR on a local network (no framework)

## Goal

Run a Three.js/WebXR project from your computer at an address reachable in your headset:

```text
https://192.168.1.42:8443/
```

The computer has the example IP `192.168.1.42`; your own LAN IP will be printed by the server. A trusted secure context is required for WebXR. Meta Quest Browser normally lets you proceed through a local development-certificate warning, but this is browser/version dependent and should be verified on your headset.

## Minimum prerequisites

- Node.js 18+; **no `npm install`** necessary.
- OpenSSL on PATH, **or** mkcert on PATH.
- Quest and computer on the same LAN, without guest/client isolation.
- Allow incoming TCP **8443** on the computer's private firewall profile.

## Launch

Windows: double-click `start-lan.bat`, or run `node serve-https.mjs` in Command Prompt.

macOS/Linux: run `./start-lan.sh` or `node serve-https.mjs`.

You'll see localhost and network URL(s). Open the network URL in Quest Browser, accept/trust the development certificate if necessary, then select **Enter immersive VR**.

If you switch Wi-Fi networks and the computer's IP changes, restart the server to regenerate the certificate's **IP SAN** list.

## Firewall and network checks

- Check the computer's IP via `ipconfig` (Windows), `ipconfig getifaddr en0` (macOS Wi-Fi), or `ip -4 addr` (Linux).
- From another laptop or phone connected to the same Wi-Fi, try the URL shown by the server. You may have to accept the certificate warning before the page is accessible.
- On Windows, the Node.js firewall prompt should allow **private networks**, not public networks. If needed, create an inbound rule for TCP port 8443 on Private profile (administrator access required).
- On Linux with UFW, open port 8443 on your private LAN interface/subnet only, not to the internet.
- Do not open/forward port 8443 on the router to the public internet.

## Certificate considerations

`create-certs.mjs` generates a development certificate in `.certs/`, using **mkcert** if available, otherwise **OpenSSL**. The certificate includes `DNS:localhost` and `IP:127.0.0.1` plus detected LAN IPv4 addresses. Self-signed certificates are **not implicitly trusted** on the headset. Installing mkcert CA trust on your computer does **not** install trust on Quest.

When Quest Browser offers an option to proceed after the certificate warning, it is intended for a known **development server that you operate**. If immersive VR remains unavailable, inspect `window.isSecureContext` and WebXR support; use a trusted domain/HTTPS host, a properly configured trusted tunnel, or a verified device-specific certificate workflow.

Never share `.certs/key.pem` or the mkcert CA private key. The HTTP and HTTPS servers refuse access to dot-directories like `.certs`.

## Workstation preview

`node serve.mjs` serves HTTP only on `127.0.0.1:8080` for desktop testing. Do not use that HTTP URL over a LAN for headset WebXR.

## Verify TLS address coverage

```bash
node create-certs.mjs
openssl x509 -in .certs/cert.pem -noout -ext subjectAltName
```

The output should include `IP Address:` for the computer's actual LAN IP. Check HTTPS locally:

```bash
curl -kI https://localhost:8443/
```

The `-k` flag bypasses trust **only in this diagnostic curl command**, not in application code. Quest must still accept/trust the certificate according to its own browser behavior.
