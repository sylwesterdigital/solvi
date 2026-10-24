# Solvi XR v0.4 — reactive lobby, animated companion and pointer visibility

This is a **working-in-progress prototype**, not a validated medical application or accessibility certification.

## What changed

- XR menu is 2.15 m in front of the user's head instead of 1.4 m; it is physically smaller in the field of view. Large hit regions are retained.
- The floor and distant architecture are simplified. No floating island or tall foreground object is intended to obscure the XR interface.
- Controller and hand rays are rendered in **world space**, with `depthTest: false`, `depthWrite: false`, and higher render order than the XR panel; controller beam length is trimmed at the menu.
- XR hover and click states are drawn into the menu texture, and action selection briefly flashes a high-contrast pressed surface. Pointer tips and menu cursor are also always-on-top. Controllers and hands use identical actions.
- Desktop menu buttons now have prominent hover, focus and pressed states. Web Audio API synthesizes a restrained hover tick and a slightly stronger click chime; XR controller selection attempts a brief haptic pulse.
- Solvi uses the actual supplied GLB. When Reduced motion is **off**, he occasionally walks within a small area and transitions between Idle, Happy, Waving, Cross Punch, MMA Kick and Belly Dance; random actions are not a user instruction. No locomotion of the camera occurs.
- Reduced Motion and High Contrast suppress ambient cat locomotion and optional animations. Old settings saved locally persist; toggle **Reduced motion** off if the cat remains in Idle.
- The desktop lobby features a large central Enter VR action. The Progress view and XR session summary display large numbers in a dedicated area, rather than a paragraph-only modal.
- Higher-quality lighting, increased desktop device pixel ratio (capped at 2), anisotropic texture filtering and a larger model on screen improve presentation *without inventing texture detail*. The supplied GLB is unchanged.

## Hand/controller testing on Quest 3S (not performed in the build environment)

1. In XR, point either controller at a menu button: its label/background should highlight, and the ray and tip should remain visible **on top of the panel**.
2. Trigger selects the highlighted action. Hear the click sound and feel a small controller vibration if supported.
3. Switch to tracked hands: both hands should expose index-pointing rays and a visible fingertip marker. Pinch to select; touch the 3D button to select directly.
4. Navigate to Progress: three large numbers should be readable at a comfortable distance. Return to lobby.
5. Enable and disable High Contrast and Reduced Motion; Solvi must stop autonomous motion when either is enabled.
6. In Standard/Calm, leave the application idle for ~15–30 seconds to see Solvi walk, wave, pose or dance occasionally. Use character action buttons on desktop for direct testing.
7. Ensure the current XR menu never occludes both the controller ray and target, that there is no geometry over the main menu, and that selection works with **either hand**.
8. If the character looks soft in headset: check the **GLB's source textures** and headset rendering performance before raising XR framebuffer resolution.

## Deploy snapshot 2

From the extracted `solvi-vanilla-webxr/` directory:

```bash
chmod +x deploy.sh
./deploy.sh 2
```

This uses SSH port 18021 to `root@yolo.cx` and synchronizes only browser-facing static files to `/var/www/mojoworks/labs/solvi/2/`. It automatically downloads the Three.js vendor files to this project on a computer with Internet access. It does not upload SSL private keys, server scripts or test data. For a new immutable snapshot run `./deploy.sh 3`.

After deployment, hard refresh Quest Browser (or append `?v=04` to the URL) because older JS may be cached.

## Limits

Actual tracked-hand semantics vary by WebXR runtime. Controller and hand input and in-headset visuals require testing on Meta Quest 3S. The GLB's native geometry/texture resolution is fixed. The AI conversation is scripted. The High Contrast lobby is **WCAG-informed**, not WCAG 2.2 AA certified.
