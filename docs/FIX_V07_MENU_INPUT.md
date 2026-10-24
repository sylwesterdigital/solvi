# Solvi XR v0.7 — Quest: collapsed menu and visible input devices

## Root causes

1. `scene.js` previously resized **one WebGL canvas texture and one plane** when changing from lobby to challenge. This reused GPU texture storage while the headset was rendering, which could result in overlapping/garbled UI during the transition. The older large menu also remained visually prominent.
2. `getController()` provides the **aim/target-ray pose** — not a rendered mesh of the physical controller. `getHand()` provides joint poses — it does not automatically draw a hand model. Therefore there was a ray but no visible hand or controller.

## Changes

- The full lobby now has its own `lobbyPanel`, canvas and GPU texture.
- The Reach challenge uses a separate, significantly smaller `hudPanel`, its own canvas and texture.
- Switching modes explicitly shows **only one panel**. HUD occupies the upper-left and targets have priority.
- Physical tracked controllers are represented by `XRControllerModelFactory` on **`getControllerGrip()`**, in addition to the target-ray beam on `getController()`.
- On a missing or unsupported profile, a local, immediately visible fallback controller shape remains. No invisible-controller state.
- Tracked hands use `XRHandModelFactory` to display joint spheres immediately, with an optional skinned generic-hand mesh when available.
- Index fingertip and pinch interactions remain mapped to the same selection actions as controller triggers.
- If the headset or server cannot fetch WebXR controller assets, the locally created fallback meshes and hand joints remain available.
- Existing animated Solvi and original v0.6 richer lobby geometry are retained; no broad visual redesign.

## Test on Quest 3S

1. Enter VR and verify two **visible** controllers plus two rays, or two tracked hands with joint markers.
2. Switch to hand tracking and back to controllers; check the active model follows the physical device.
3. Select **Start Reach**. The full lobby menu must disappear entirely. Only the small Reach HUD remains.
4. Reach targets must appear unobstructed and remain clickable using either controller ray or hand pinch.
5. Press Pause: the larger Safe Place panel replaces the small HUD (only one 3D panel at a time). Resume: compact HUD returns.
6. Test a second exercise and return to the lobby to ensure no duplicated panels accumulate.
7. Test with headset Wi-Fi temporarily unavailable after the page loaded: controllers should remain visible as fallback shapes; hand joints should remain visible if tracking is supplied by Quest.

**Limitations:** Model-profile downloads, Quest hand tracking, headset rendering and actual frame timing cannot be confirmed by automated desktop tests. This is an experimental prototype, not accessibility or clinical certification.

## Deploy

```bash
chmod +x deploy.sh
./deploy.sh 2
```

The script hosts files under `/var/www/mojoworks/labs/solvi/2/`. It downloads the Three.js addon modules and optionally caches common official Quest controllers and generic-hand models. If the controller-profile download fails, the fallback meshes remain operational.

For cache refresh, use `https://mojoworks.xyz/labs/solvi/2/?v=07` and reload Quest Browser. If Quest still loads stale JavaScript, clear the site data/cache.
