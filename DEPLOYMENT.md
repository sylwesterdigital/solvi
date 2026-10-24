# Publish Solvi XR to mojoworks.xyz (snapshot 2)

From this project folder, on your Mac:

```bash
./deploy.sh
```

This single command:
1. Downloads and configures Three.js, GLTFLoader, DRACOLoader and the Draco files **if not already locally available** (requires Node.js 18+ and Internet the first time).
2. Creates `/var/www/mojoworks/labs/solvi/2/` on `root@yolo.cx` using SSH port `18021`.
3. Uses `rsync` to copy **only** `index.html`, `styles.css`, `js`, `assets`, `vendor`.
4. Checks critical deployed file paths via SSH and attempts a public HTTPS check.

Public URL: <https://mojoworks.xyz/labs/solvi/2/>

If `Permission denied`, make sure the `ssh -p 18021 root@yolo.cx` login works and SSH credentials are configured on your machine.

If needed, create an additional version without overwriting snapshot 2:

```bash
./deploy.sh 3
```

## Important

- Run the script **from the unpacked v0.3 project** (the script finds the correct directory automatically).
- `rsync` source directory names **must not** have trailing `/` or files will be flattened on the host. The script handles this correctly.
- The destination web server must already route `/labs/solvi/2/` to `/var/www/mojoworks/labs/solvi/2/` and provide a trusted HTTPS certificate.
- This does not configure Nginx/Apache and does not create a public domain certificate.
- If public HTTPS fails but the SSH verification passes, review the server's virtual-host routing and browser-console errors.
- The script does **not** use `--delete`, so older files are left untouched. The previous snapshot `/1/` is never modified.
- The exported WebXR build is a prototype; test pointer rays, hand tracking and animated GLB loading on Quest.
