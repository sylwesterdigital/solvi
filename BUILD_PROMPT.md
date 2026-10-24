# Simplified build prompt — Solvi XR / NeuroReach pilot

Build a lightweight **vanilla JavaScript WebXR application** for **Rantlist.me**, featuring the humanoid-cat guide **Solvi** and a calm immersive lobby. The prototype explores **upper-limb reaching combined with simple cognitive challenges** on **Meta Quest 3S**. It is for healthy usability pilots, **not** a medical device and makes no therapeutic claims.

## Technology constraints

- Use **HTML, CSS, modern JavaScript ES modules and Three.js**.
- **No React, Vue, Angular, TypeScript, A-Frame, React Three Fiber, Babylon.js, Vite, bundler, backend or account system.**
- Minimal separate JavaScript files for UI, WebXR scene, interaction, feedback and local storage. Small focused libraries may be added *only where materially necessary*.
- Must run without an npm build. Provide a **desktop HTTP preview** on localhost and a **LAN-facing HTTPS server** for WebXR (`0.0.0.0:8443` by default). The HTTPS server discovers the computer’s IPv4 LAN addresses, creates certificates with IP Subject Alternative Names using mkcert or OpenSSL, and prints the correct Quest URL. Do not distribute private keys. Explain Quest certificate trust, LAN firewall requirements, and fallback to a trusted HTTPS domain/tunnel when necessary.
- Procedural, efficient meshes first; custom art can be swapped in later. Track rendering performance on Quest before calling it ready.

## User experience

1. **Lobby:** calm seated space with Solvi facing the user, a short captioned greeting, a small menu for Activities, Information, Activation Plan, Games and Progress.
2. **Reach activity:** one clearly cued target at a time. Left = blue square and 'L'; right = orange diamond and 'R'. Controller-tip touch succeeds without a trigger. Also support ray + trigger for **menu** selection.
3. **Accessible interaction:** large stable buttons, captions, sound/vibration where available, simple instructions, no forced locomotion, short sessions, pause/safe place and recenter visible at all times. Every essential cue must have a non-colour alternative. Respect reduced motion.
4. **Adaptation:** at least ten difficulty steps. Three successes raise difficulty; one unsuccessful trial lowers it. Only compare against the participant's own past attempts.
5. **Feedback:** route semantic events (success, miss, timeout, wrong hand, complete) through one FeedbackBus; never call audio and haptics from tasks directly. All device features must be detected and gracefully optional.
6. **Privacy:** anonymous `P001`-type participant codes. Keep trial/session/kinematic data local with IndexedDB; export well-structured JSON and CSV on the desktop screen. No cloud service by default.
7. **Solvi communication:** a clear separation between local scripted demo dialogue and any eventual model-connected assistant. Never claim that the current prototype supplies a licensed therapist or diagnosis.

## Incremental delivery

**Milestone 1 — a runnable prototype:** local desktop preview and reachable HTTPS LAN WebXR server, lobby, Solvi character, basic WebXR UI, one Reach activity, pause, recenter, captions, sound and optional haptics, a basic session summary, local storage, JSON/CSV export, README and tests for pure business logic.

**Milestone 2 — research readiness:** multi-direction per-hand reach calibration, robust motion-onset and trajectory metrics, 30 Hz batched kinematic sampling, tester controls, device performance instrumentation, consent and privacy review, structured headset QA.

**Milestone 3 — cognitive games:** add go/no-go, visual search, spatial memory, drawing and mental arithmetic one at a time, with independent task configuration and tests.

**Milestone 4 — platform:** personalized plans, themed environments, Solvi AI provider adapter with explicit safety boundaries, progress comparisons against personal baseline, Rantlist.me plugin integration.

## Acceptance rules

Work **one milestone at a time**; do not mark later milestones as implemented. Run unit tests for pure logic. Verify in a desktop browser and test WebXR interaction on Quest 3S before claiming hardware support. Report all limitations, expected failure modes and remaining accessibility gaps. No clinical claims. Keep code readable and framework-free.

## Key references for design (not claims of compliance)

- W3C WCAG 2.2 and WCAG2ICT
- W3C XR Accessibility User Requirements (XAUR)
- ISO 9241-210 human-centred design
- IEC 62366-1 usability engineering *if* medical-device scope becomes relevant
