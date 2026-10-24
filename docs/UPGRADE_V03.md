# Solvi XR v0.3 — model, hand tracking, rays, lobby variants

## Scope of this work-in-progress

- Replaces the procedural 3D cat with **your** `assets/anthropomorphiccat3dmodel.glb`. The GLB has 24 named animation clips; `Idle` plays at start. `Waving` and `Belly Dance` are exposed as optional manual actions when reduced motion is off. All other clips remain in the asset but are **not** automatically triggered.
- Your file uses `KHR_draco_mesh_compression` and `EXT_texture_webp`. It needs `GLTFLoader`, `DRACOLoader`, and a Draco decoder in addition to Three.js. See below.
- Shows thick emissive-style depth-independent **controller pointer beams while menus are visible**. Beams are bound to source connection state, and colors are assigned from `inputSource.handedness` (never controller slot index).
- Requests optional WebXR `hand-tracking`. Hand input uses index-finger pointing, index/thumb pinch (with hysteresis), and near-touch on the VR menu. Reach targets can be touched with the index fingertip. The **same** app action handlers and Reach scoring are used by both devices.
- Hand tracking does not provide controller vibration. The existing FeedbackBus generates available sound/caption/visual feedback and silently skips absent haptics.
- Lobby styles: **Standard**, **Calm**, **High Contrast**. The style selection persists in localStorage and is available in the desktop utility bar and the XR lobby.
- Accessibility style uses opaque black panels, large bright text, yellow selected primary buttons, large hit targets, clear focus indicators. It's an **accessible design prototype**, not independently audited or certified to WCAG 2.2 AA or XAUR. Verify contrast in the actual headset and carry out usability tests with target users.

## Files to upload to your snapshot

After running `node download-three.mjs` once on your computer, deploy from the project folder:

```bash
rsync -avz -e 'ssh -p 18021' \
  index.html styles.css js assets vendor \
  root@yolo.cx:/var/www/mojoworks/labs/solvi/2/
```

Do **not** put trailing `/` after the source directory names: `js`, `assets`, `vendor`. This preserves the directory layout. Deploy to `/2/` (recommended) so snapshot `/1/` remains unchanged. Verify HTTPS is already configured by the web server.

## Run locally

```bash
node download-three.mjs
node serve.mjs            # desktop at http://localhost:8080
# or
node serve-https.mjs      # HTTPS / LAN on 8443, with development TLS setup
```

`download-three.mjs` downloads the matching Three core, GLTFLoader, DRACOLoader, BufferGeometryUtils, and Draco decoder binaries. This script requires internet **once** and creates the complete `vendor/` tree. Do not attempt to deploy `vendor/` before downloading it. For the packaged copy, an internet connection is required until the download is run.

On Quest Browser use the deployed HTTPS URL. Turn on hand tracking in device settings and put down the controllers to test hands. Availability and gestures vary between headset firmware/browser versions.

## Things to check on headset

1. Controller rays visible in the hub and in the Pause menu, both hands, whichever controller connects first.
2. Single-controller mode: the one connected ray remains visible and can select every menu button.
3. Hand tracking: index finger indicator visible; pinch selects; poke can activate a button; one-finger contact completes Reach targets.
4. Controller Reach and hand Reach use correct left/right cues; mismatched hands should not score.
5. Solvi appears with its WebP texture and returns to idle after Waving or Belly Dance.
6. Turn on High Contrast via XR lobby style button and review text/target legibility.
7. Pause, recenter, narration/captions, and locally exported data remain functional.
8. Confirm 72 FPS on the Quest 3S with the ~5.7 MB character and a normal active session; further LOD/compression may be required.

## Limitations

- The supplied GLB animation count/metadata was inspected, but rendering, skeleton deformation, Draco decoding, and input interactions have **not** been verified on a Quest headset in this environment.
- Gesture detection thresholds are WIP. Some runtimes may require a different pinch detection strategy; visual calibration should be done on-device.
- User hands are represented with a fingertip and pointer, not a full articulated skin mesh. XRHand joints are available for future skeletal rendering.
- This is a pilot, **not a medical device** and does not connect to a live AI therapist.
- Stereo accessibility in immersive VR cannot be concluded from CSS contrast ratios alone. Follow formal WCAG2ICT/XAUR evaluation and usability testing.

Alternatively, run `./deploy.sh 2` on macOS/Linux after vendoring; it verifies dependencies and uses the correct `rsync` source-directory syntax. The script never deletes older snapshots.

**Character orientation:** In `js/scene.js`, `CAT_YAW_RADIANS` defaults to `0` (the original GLB orientation). If the character looks away from the player, change it to `Math.PI` and re-upload `js/scene.js`.
