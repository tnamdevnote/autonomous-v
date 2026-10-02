# Architecture and decisions

Record of the decisions behind the feasibility spike (agreed with the team lead in a design
interview, 2026-10-02). Change this file when a decision changes.

## Context

- **Brief:** AV passengers need real-time status visibility and immediate reassurance during
  ride disruptions (stalls, strange maneuvers, routing holds). Hypothesis: anxiety comes from
  lack of **control**, lack of **system visibility** and lack of **trust**.
- **This spike** tests the prototyping technique before the team settles the design.
- **Setting:** Waymo, passenger experience. Riders: nervous first-timer and routine commuter.

## Decisions

| # | Decision | Why |
|---|---|---|
| 1 | One web app, one route per surface (`/world`, `/cabin`, `/phone`, `/control`, plus `/` lab) | Runs on one laptop now; each route can move to its own device later without a rewrite |
| 2 | Scripted timeline + Wizard of Oz: the facilitator can pause, skip, clear the car and reply as Rider Support | Same disruption for every participant, but the facilitator can react to what they do |
| 3 | Stylized React Three Fiber world, not video | The car has to *respond* to rider actions; video can't branch. The same scene drives the "what the car sees" view on the cabin screen |
| 4 | Cabin screens: coded React variants **and** Figma PNGs with hotspots | Coded = real behaviour; Figma = same-day concept tests. Hotspots can fire real rider actions |
| 5 | Scenarios are data files built from a fixed library of steps and events | Teammates add and tweak scenarios without code; new *kinds* of events need code |
| 6 | Vite + React + TypeScript, R3F + drei, Zustand, React Router; Vercel for previews | Least setup, fast iteration, R3F and Zustand designed to work together |
| 7 | `/control` owns the simulation; other screens render state and send intents | One source of truth: every screen shows the same moment |
| 8 | Physical controls = keystrokes (H help, P pull over) | Any USB button / Stream Deck / Makey Makey works with no driver code |
| 9 | Voice = browser speech now; recorded audio once wording is final | Lines live in the scenario and can be edited instantly; a robotic voice may itself affect trust in real tests |
| 10 | Automatic session log + facilitator markers, exported as CSV/JSON | Lines up "truck appeared at 0:24" with "participant tensed at 0:25" |
| 11 | Variants differ only in what the screen/voice says; the car and world behave identically | Fair comparison between designs (`onlyFor` on scenario steps) |
| 12 | The engine always provides detections; each variant decides whether to highlight them | Whether highlighting the truck reassures or alarms is itself worth testing |

## How it fits together

```
 /control (or /)                                   /world  /cabin  /phone
┌──────────────────────────────┐   state 20×/s    ┌──────────────────────┐
│ SimHost                      │ ───────────────▶ │ SimFollower          │
│  SimEngine (pure TS)         │                  │  useSim() → render   │
│   ├ timeline + reactions     │ ◀─────────────── │  useRiderAction()    │
│   ├ car physics              │   intents        └──────────────────────┘
│   └ session log              │   (pressHelp…)
│  ticker (web worker, 30 Hz)  │
└──────────────────────────────┘
        transport: BroadcastChannel today → WebSocket relay later
```

- `src/engine/engine.ts`: the simulation. No React or browser APIs; unit-tested directly.
- `src/engine/sync/`: host/follower providers and the transport. To go multi-device, add a
  WebSocket transport with the same `Transport` shape in `transport.ts` and a tiny relay
  server that forwards messages between clients. Screens don't change.
- `src/engine/hooks.ts`: the screen API: `useSim()`, `useRiderAction()`, `getLive()`
  (smooth position for 3D, extrapolated between state updates).
- `src/engine/world.ts`: road geometry plus deterministic background traffic and parked
  cars, computed from time and position on every screen (never sent over the wire).
- The host's clock runs in a web worker so the simulation keeps going when `/control` is a
  background tab.

### The trip clock

The 3D drive is a ~900 m *slice* of the trip. The displayed arrival time is the planned
arrival (`startClock + minutesToDestination`) plus time lost versus cruising, so it slips
one-for-one while the car waits, and the phone shows whether the rider will be late.

## Verified in the spike

Automated (`npm test`, headless browser run): the scenario plays end to end; the car stops
short of the truck, holds, and proceeds on clearance, help → reply, or max wait; screens
in separate windows stay in sync; a Figma hotspot's "Get help" reaches the facilitator; the
log exports.

**Needs the team:** frame rate on the real test laptop (the headless browser has no GPU), a
real Figma frame, a teammate editing a scenario, and a pilot run to judge whether the stop
actually feels unsettling.

## Next steps

- Deploy to Vercel (import the repo; `vercel.json` handles routes)
- WebSocket relay for multi-device sessions
- Recorded voice lines once wording settles
- Real cabin designs to replace `transparent`; convert Figma frames to coded variants
