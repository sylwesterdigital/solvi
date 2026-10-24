# Solvi XR v0.6 — Floor-height and original lobby restoration

This update corrects the WebXR entry bug in v0.5. The original, dark neon
floating-island lobby from the early Solvi starter is restored. This release
does **not** add a new visual redesign.

## Root cause

v0.5 called `placeUI()` immediately after `setSession()`; at that instant,
`renderer.xr.getCamera()` may not have a valid tracked pose. Coordinates
near Y=0 were treated as eye level, so the large menu was centred at Y=-0.13
and the cat at Y=-1.42, under the real room floor in local-floor space.

## Changes

- Request `local-floor` for immersive VR and wait for the first valid XRFrame
  `getViewerPose()` before showing or positioning any menu.
- Read the real headset position and yaw in the same reference space used
  by Three.js, with an explicit `local` fallback for runtimes without floor.
- Place the panel at the **tracked** eye height, seated or standing, and place
  the cat and original circular floor at actual floor height.
- Rotate the original lobby scenery toward the user's forward direction,
  rather than assuming the XR reference space always faces -Z.
- Guard task target placement before the first tracked pose and re-place
  targets after entering or recentering VR.
- Keep the v0.5 compact exercise HUD, high-visibility rays, hand tracking,
  animated GLB companion, and Standard/Calm/High Contrast variations.
- Cache-busting module query set to v06 when deploying over snapshot 2.

## Test on Quest 3S

1. Deploy `./deploy.sh 2`. Force close/reopen Quest Browser if an older version
   was cached. Open `https://mojoworks.xyz/labs/solvi/2/?v=06`.
2. Seated, enter immersive VR. Main menu should be straight ahead near eye
   level; Solvi should stand with feet at floor level to the right.
3. Recenter while looking in a new direction; menu, cat and lobby should move
   in front of the new view at the correct height.
4. Start Reach; the full menu should collapse into the upper-left compact HUD
   and visible targets should sit within comfortable forward reach.
5. Stand up (only if safe) and recenter; floor stays fixed, menu relocates to
   standing eye height, Solvi stays on the floor.
6. Turn Reduced Motion OFF to verify intermittent walking. High Contrast
   deliberately hides scenic decoration; choose Standard to view the classic lobby.

## Build and publish

Run `./deploy.sh 2` inside this project. It fetches browser modules if absent,
then rsyncs to `root@yolo.cx` on SSH port 18021, preserving the directory
structure. No changes to server configuration are required if snapshot 2
worked before.

Checks run locally: `node --check js/scene.js`, `npm test`, `bash -n deploy.sh`.
Actual Quest tracking and headset display remain to be tested on physical hardware.
