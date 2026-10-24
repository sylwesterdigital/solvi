## v0.10.0 — Focused Reach interactions

- Pointer beams are hidden during target practice unless the user aims at the menu. Hand-tracking and controller models remain visible.
- A larger but side-mounted Reach control panel stays out of the catch area, supports grip/trigger/pinch repositioning, and keeps the central reaching corridor protected.
- Lobby lighting gently dims during Reach; the inactive side HUD is subdued until looked at with a pointer. Targets retain their bright, unlit colors.

**Validation:** Automated logic and syntax checks only; headset interaction must still be verified on Quest 3S.

## v0.9.0 — Development release workflow

- Version indicator next to Rantlist.me logo.
- Toggleable, scrollable [dev] history.
- Signed-by-hash full update ZIP format with guarded local tests and SSH deployment.
- Vanilla JS, Three.js and existing XR scene unchanged.

# Changelog

## v0.8 — spatial navigation and wall menu
- Centre the large lobby wall panel in the headset's initial field of view and keep it above floor level.
- Ballistic thumbstick teleportation with arc, safe/invalid floor landing disc and release-to-teleport.
- Move the viewer with XR offset reference spaces rather than moving the whole lobby.
- Add direct controller grip/trigger or hand pinch drag-and-drop of the menu header.
- Save relative menu position, provide A/X Bring Menu Here and 2D reset.
- Preserve v0.7 controller/hand models, rich lobby, moving Solvi and separate challenge HUD.
- Add pure helper tests for placement, floor boundaries, teleport offset and stick input.
- Update static deployment verification for xr-navigation.js.

## 0.5.0 — Restored scenic XR world; minimized challenge HUD; active Solvi
- Added distant floating islands, illuminated rings, garden sculptures, central fountain and skyline without putting geometry in the active reach zone.
- Collapsed XR lobby panel into a small challenge bar with Pause, Safe Place, End; targets always render clearly in front and receive selection priority.
- Reduced Solvi walking intervals during active tasks; walking takes place on a protected side stage. Happy/waving animations on occasional successes.
- High Contrast no longer disables walking automatically; Reduced Motion and Pause still do. Added a direct Walk test button.
- Added pure policy tests for menu/target hit arbitration and challenge layout.

## v0.4 — Reactive lobby and Solvi movement
- Always-on-top world-space XR controller/hand beams with interactive hover/press UI.
- Menu placed farther away, simpler 3D environment and larger central Enter VR button.
- Web Audio hover/click cues and controller haptic selection where available.
- Organic Solvi movement/poses from existing 24-clip GLB, honoring motion settings.
- Large immersive progress digits, desktop progress display and high-contrast treatment.
- Existing snapshot 2 rsync deployment script retained.

# Changelog

## 0.2.0 (LAN + HTTPS)
- Added standalone LAN HTTPS server, bound to `0.0.0.0:8443`, using Node built-ins.
- Automatic LAN IP detection and certificate generation with matching IP Subject Alternative Names via mkcert or OpenSSL.
- Added `start-lan.sh` / `start-lan.bat`, custom `PORT`/`SOLVI_LAN_IP`, and Quest certificate/firewall/trust instructions.
- Prevented serving hidden files, private keys, or unapproved file types.
- Kept HTTP launcher for desktop-only preview; no build dependencies added.

## 0.1.0 (starter)
- Vanilla HTML/CSS/ES modules and Three.js scene with an experimental WebXR menu.
- Lightweight Rantlist.me Solvi lobby and Reach activity, local-only storage and exports.
- Semantic FeedbackBus, generic staircase and score function, pure logic tests.
- Pause, safe place, recenter and accessibility control placeholders.
- Clear separation between implemented pilot functionality and future roadmap.

## 0.3.0 — Real Solvi GLB and input parity (work in progress)

- 24-animation GLB integrated: Idle default; optional Waving and Belly Dance.
- Controller rays persist over panels and track handedness from XRInputSource.
- Optional hand-tracking input with index ray, pinch, poke and Reach fingertip touch.
- Standard, Calm, High Contrast lobby variants; persist selected style.
- Offline vendoring script now includes Three.js GLTF/DRACO addons and decoders.
- Preserves static hosting, local data, 2D fallback and HTTPS LAN scripts.

## v0.7 — 2026-10-24

- Fixed challenge menu compositing: independent lobby and Reach HUD meshes/canvases. Only one is visible per mode.
- Added WebXR controller models via `XRControllerModelFactory` and controller grip spaces, with visible fallback meshes.
- Added joint hand visualisation via `XRHandModelFactory`; skinned hand meshes are attempted where assets are present.
- Expanded vendor download to include all official WebXR factory modules.
- Added optional first-party-hosted WebXR profile asset cache for Quest controller models and generic hands.
- Kept the v0.6 scenic lobby and Solvi animation behaviour.
- Added regression tests for HUD/lobby visibility policy.
