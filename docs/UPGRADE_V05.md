# Solvi XR v0.5 — Scenic lobby, live companion, and unobstructed exercises

## Changes

- **Restored immersive lobby atmosphere:** procedural floating islands, neon horizon arc, distant skyline, small sky gardens, subtle fountain and side lighting. All are deliberately placed *behind* the reachable exercise zone. The lobby stays seated/stationary.
- **Challenge menu is minimized:** full-page spatial menu swaps to a compact upper-left 3D HUD showing instructions, timer, hits and points, with Pause, Safe Place and End controls. A full menu returns after the challenge or when paused.
- **3D targets are never hidden behind lobby panels:** depth-tested HUD plus foreground target material / outline and target-first ray interaction for the closest valid hit. Controller and hand beams stay on top for reliable visibility.
- **Solvi walks during Reach:** the supplied 24-clip GLB is still used. A walking stage beside the player is protected from the exercise targets. During active challenges, Solvi starts a motion cycle quickly and takes shorter rests between walking, waving, happy, kicking or punching clips. Every five scored hits, Solvi can respond with a happy/waving gesture if not already walking.
- **High Contrast does not implicitly disable cat walking.** Only explicit Reduced Motion or Pause does that. High Contrast still reduces decorative backdrop complexity in XR.
- **Direct manual Walk button** in desktop sidebar and immersive lobby helps verify the animation immediately. The status text explains when Reduced Motion is preventing movement.
- **No extra frontend frameworks:** pure JavaScript, Three.js ES modules, WebXR and standard browser APIs.

## Important checks on the Meta Quest headset

1. Keep **Reduced Motion OFF** to see walking. Existing browser settings persist from older snapshots. High Contrast by itself no longer blocks cat locomotion.
2. Start Reach: the **full lobby menu should disappear** and a narrow status bar should appear at upper left. The target should have a bright outline nearer to the user than the HUD.
3. Both controller rays and tracked-hand rays should be visible over scenery and selectable UI elements. Pinch, poke, controller trigger, and near touch should be tested independently.
4. Solvi should walk occasionally on a side stage **during the game**. Check the avatar does not block the centre target field. Verify his feet and direction in the GLB.
5. After pausing, the full Safe Place menu should return; target interaction should freeze. After resuming, HUD and target interaction should return.
6. Enter Progress and verify large counters; return to the lobby and switch Standard/Calm/High Contrast.
7. Test Quest frame rate and fatigue comfort with real users before increasing visual detail. This is not a clinical or WCAG conformance certification.

## Deploy from the project directory

```sh
chmod +x deploy.sh
./deploy.sh 2
```

Default: `ssh -p 18021 root@yolo.cx` to `/var/www/mojoworks/labs/solvi/2/`. The deployment includes `js/xr-ui-policy.js` automatically, in addition to the existing GLB and Three.js vendor files. The deploy command downloads pinned Three.js/Draco dependencies when not already available, so first-time use requires Internet access on your computer.

After deployment, hard refresh the Quest Browser or use `https://mojoworks.xyz/labs/solvi/2/?v=05`. Actual SSH deployment and headset QA are not performed automatically in this packaging environment.
