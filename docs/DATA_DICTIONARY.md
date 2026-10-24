# Pilot data dictionary (prototype v0.1)

All records live in **this browser's IndexedDB**, `solvi-xr-pilot-v1`. No remote server or accounts are used. No names are collected: `participantCode` is of form `P001`.

| Store | Fields | Notes |
|---|---|---|
| sessions | `sessionId`, `participantCode`, `startISO`, `endISO`, `module`, `durationSec`, `status`, `score`, `hits`, `misses`, `settingsSnapshot` | Stored on completion; interruption may discard unfinished sessions |
| trials | `sessionId`, `participantCode`, `module`, `trialIndex`, `timestampISO`, `cuedHand`, `usedHand`, `level`, `practice`, `stimulus`, `response`, `reactionTimeMs`, `endpointErrorMm`, `points`, `streak`, `via`, `feedbackConfig` | `stimulus` and `feedbackConfig` are JSON columns in CSV |
| kinematics | `sessionId`, `participantCode`, `timestampMs`, `hand`, `px`, `py`, `pz`, `qx`, `qy`, `qz`, `qw` | XR-only sampled 10 Hz; units: metres, quaternion |
| comfort | `sessionId`, `participantCode`, `timestampISO`, `comfort0to10`, `dizzyOrNauseous` | Simplified two-choice comfort report, not a validated questionnaire |
| calibration | Reserved | Per-arm five-direction calibration is not implemented in this starter |

**Known limitations:** controller labels depend on device support; sample rate is not validated and may be lower under load; hit reaction times currently measure appearance-to-contact not movement onset; missed/delayed drawing and cognitive-module records are not yet implemented; browser storage may be cleared by the OS/browser. Do not interpret results as clinical outcomes. Trial CSV is exported for the selected code; full JSON contains filtered data across all local stores. Data deletion clears all participant records in this prototype's database.
