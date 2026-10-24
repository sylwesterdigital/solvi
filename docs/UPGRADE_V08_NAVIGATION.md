# v0.8 Quest navigation test checklist

1. Start in seated posture, facing any direction. The large lobby menu should appear centered ahead, above the floor.
2. Move your right controller away and hold the right thumbstick (push forward or click). Verify a blue parabolic arc and cyan destination ring on the virtual floor. Release to teleport; no artificial smooth motion should happen.
3. Aim outside the lobby floor. Destination should turn pink, release must not teleport.
4. Repeat from the left hand/controller. Verify remaining area of the lobby remains usable.
5. After teleport, menu and Solvi must remain in their original world positions. A/X should summon only the menu in front of the new viewer position.
6. Aim at the top-right MOVE PANEL handle. Hold grip, move controller to reposition the entire wall menu, and release. Trigger-hold should also work. Retest with tracked hand pinch.
7. Reload: saved relative menu position should return. Use Reset menu layout on desktop to restore default placement.
8. Start Reach. Wall menu should disappear entirely. Small HUD and targets should be visible. Teleport and confirm target/HUD re-anchor to new tracked head pose.
9. Check native controller rendering, hand tracking, pause, safe place and reduced-motion.

All features must be tested on physical Quest 3S; passing JavaScript tests cannot prove native XR runtime input behavior.
