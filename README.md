# AV ride-disruption prototype

A web prototype for testing how passengers feel when an autonomous ride (Waymo) is
disrupted, and whether in-car design can turn "helpless waiting" into "feeling in control".

This is the **feasibility spike**. It answers three questions:

1. Can we simulate an unexpected situation? → a scripted, facilitator-controllable scenario
2. Can web tech (React Three Fiber) carry the in-car experience? → 3D windshield view + "what the car sees" on the cabin screen
3. Can users click through designed screens and see the outcome? → coded screens and Figma frames whose buttons change what the car does

![Lab view](docs/screenshots/lab-holding-transparent.png)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + scenario checks
npm run build      # production build (deploys as-is to Vercel)
```

## Screens (routes)

| Route | What | Who sees it |
|---|---|---|
| `/` | **Lab**: every screen at once on one laptop | you, while building |
| `/control` | Facilitator console: start/pause, Rider Support chat, "Clear to proceed", observation markers, log export | facilitator only |
| `/world` | Windshield view (put on a TV or big monitor) | participant |
| `/cabin` | 1280×800 cabin screen (put on a tablet) | participant |
| `/phone` | Rider's phone app | participant |

`/control` (or `/`) runs the simulation; the others mirror it. For a test session open
`/control` in one window and the participant screens in **other windows** of the same
browser (multi-device needs the WebSocket relay; see `docs/architecture.md`). Only one
`/control` or `/` at a time.

Keyboard / physical buttons on participant screens: **H** = help, **P** = pull over
(`src/config/keys.ts`). Any USB button that types those keys works.

## The spike scenario: parked fire truck

A fire truck is parked at the curb (no emergency, not blocking). The car stops anyway and
waits until the facilitator clicks **Clear to proceed**, Rider Support replies with a
clearance, or `maxWaitSeconds` passes. Then it eases around the truck and continues.

## Changing things

| I want to… | Edit | Notes |
|---|---|---|
| Change timings, wait length, screen text or voice lines | `src/scenarios/parked-fire-truck.ts` | No coding. Saves reload the app. |
| Make a new scenario | copy a file in `src/scenarios/` | Appears in the Scenario menu on `/control`. Reference: `docs/scenarios.md` |
| Change a cabin screen's layout or features | `src/surfaces/cabin/variants/*.tsx` | React. Read state with `useSim()`, send actions with `useRiderAction()` |
| Add a cabin design to compare | copy a file in `src/surfaces/cabin/variants/` | Appears in the Cabin design menu automatically |
| Test a Figma frame | `src/designs/<name>/design.ts` + exported images | See `src/designs/sample-figma/design.ts`. Add `?hotspots` to the URL to see hotspots |
| Change the phone app | `src/surfaces/phone/PhoneApp.tsx` | |
| Add a new *kind* of event (a swerve, a pedestrian…) | `src/engine/` + `src/surfaces/world/` | Needs code |
| Change the 3D street | `src/surfaces/world/` | |

`npm test` plays every scenario with every cabin design to catch broken edits.

## Running a session

1. Open `/control`; pick scenario, cabin design and participant ID.
2. Open `/world`, `/cabin`, `/phone` in separate windows on the participant's screens; tap each to begin (enables sound and full screen).
3. **Start**. Play Rider Support and fleet response from the console; tap observation markers (anxiety 1–7 etc.) as you watch.
4. **Export CSV/JSON** at the end: every scenario event, rider tap and marker, time-stamped.
5. **Reset** for the next participant or design.

Design decisions and how the pieces fit: [`docs/architecture.md`](docs/architecture.md).
