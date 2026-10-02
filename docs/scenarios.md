# Writing scenarios

A scenario is one file in `src/scenarios/`. The file name is its id; it appears in the
Scenario menu on `/control` automatically. Start by copying `parked-fire-truck.ts`.

```ts
export default defineScenario({
  name: "…",                 // shown on /control
  trip: { … },               // what the rider is told
  maxWaitSeconds: 120,       // optional
  timeline: [ … ],           // steps at fixed times after Start
  on: { carStopped: [ … ] }, // steps that react to events
});
```

## trip

| Field | Example | Meaning |
|---|---|---|
| `destination` | `"Dr. Rivera's Office"` | Shown on the cabin screen and phone |
| `address` | `"412 Oak St"` | Optional |
| `startClock` | `"2:12 PM"` | Clock time at Start |
| `appointment` | `"2:28 PM"` | Optional; the phone shows on time / late |
| `minutesToDestination` | `14` | Trip length the rider is told |
| `routeMeters` | `900` | Length of the simulated stretch of road |
| `cruiseMph` | `25` | Driving speed |

## Steps

Every step has `do` plus its own fields. Timeline steps have `at` (seconds after Start);
reaction steps have `after` (seconds after the event, default 0).

| `do` | Fields | What happens |
|---|---|---|
| `spawn` | `id`, `kind` (`fireTruck`, `parkedCar`, `cone`), `aheadMeters`, `place` (`parking`, `lane`, `leftLane`), `label` | Puts an object on the road ahead |
| `stopFor` | `target` (an id), `gapMeters` | The car will stop in front of that object and wait (emits `carStopped`) |
| `drive` | `mph` (optional) | Starts driving / changes speed |
| `proceed` | `nudgeMeters` (optional, default 1) | Ends the wait; eases around the object and continues |
| `status` | `message`, `tone` (`info`, `warning`, `ok`) | Sets the status message screens can show |
| `clearStatus` | | Removes it |
| `say` | `text` | The car speaks |
| `supportMessage` | `text` | A scripted Rider Support message |
| `remove` | `id` | Removes an object |
| `end` | | Ends the session |

Options on any step:

- `onlyFor: ["transparent"]`: only for those cabin designs (file names in `src/surfaces/cabin/variants/`, or `figma-<folder>`)
- `if: "holding"`: skip unless the condition is true when the step is due
- `note: "…"`: a comment for teammates

## Events (keys of `on`)

| Event | When |
|---|---|
| `start` | Facilitator pressed Start |
| `carStopped` | The car came to rest for its `stopFor` target |
| `riderPressedHelp` / `riderPressedPullOver` | Rider tapped a button or pressed H / P |
| `fleetCleared` | Facilitator clicked Clear to proceed (or replied with a clearance) |
| `maxWaitElapsed` | The car waited `maxWaitSeconds` without being cleared |
| `supportReplied` | Facilitator sent a Rider Support reply |
| `passedObject` | The car finished easing around the object |
| `arrived` | End of the route |

The engine doesn't move the car on `fleetCleared` or `maxWaitElapsed` by itself; the
scenario decides (usually `{ after: 1.5, do: "proceed" }`).

## Conditions (for `if`, and `showFrame` in Figma designs)

`always`, `driving`, `moving`, `stopped`, `holding`, `helpRequested`, `noHelpRequested`,
`supportReplied`, `arrived`, `ended`.

## Checking your edit

Run `npm test`: it validates every scenario and plays it to the end with every cabin
design. Problems also show at the top of `/control`.
