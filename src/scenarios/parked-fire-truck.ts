import { defineScenario } from "../engine";

/*
 * PARKED FIRE TRUCK: the spike scenario.
 *
 * A fire truck is parked at the curb. No emergency, and it isn't blocking our lane,
 * but the car stops anyway and won't continue until one of these happens:
 *   - the facilitator clicks "Clear to proceed" (fleet response) on /control
 *   - the rider asks for help and support replies with "Also clear the car"
 *   - the car has waited `maxWaitSeconds`
 *
 * HOW TO EDIT (no coding needed):
 *   - Change any number or text below and save. The app reloads by itself.
 *   - `at` = seconds after Start. `after` = seconds after the event it's listed under.
 *   - `onlyFor: ["transparent"]` = only happens with that cabin design. Leave it out
 *     to happen with every design.
 *   - `if: "holding"` = skip the step if the car is no longer waiting by then.
 *   - To make a variation, copy this file to a new name in this folder. It shows up
 *     in the Scenario menu on /control automatically.
 * Full list of steps, events and conditions: docs/scenarios.md
 */
export default defineScenario({
  name: "Parked fire truck",
  description: "Non-emergency fire truck parked at the curb. The car stops anyway and waits.",

  trip: {
    destination: "Dr. Rivera's Office",
    address: "412 Oak St",
    startClock: "2:12 PM",
    appointment: "2:28 PM",
    minutesToDestination: 14,
    routeMeters: 900,
    cruiseMph: 25,
  },

  maxWaitSeconds: 120,

  timeline: [
    { at: 0, do: "spawn", id: "truck", kind: "fireTruck", aheadMeters: 230, place: "parking", label: "Fire truck · parked" },
    { at: 0, do: "stopFor", target: "truck", gapMeters: 14 },
    { at: 0, do: "drive" },
    { at: 1, do: "say", text: "Hi there. We're heading to 412 Oak Street. Sit back and enjoy the ride." },
  ],

  on: {
    carStopped: [
      { do: "status", tone: "warning", message: "Stopped for a fire truck parked near our lane", onlyFor: ["transparent"] },
      {
        after: 1,
        do: "say",
        text: "We've stopped because a fire truck is parked near our lane. We're checking that it's safe to go around.",
        onlyFor: ["transparent"],
      },
      {
        after: 20,
        if: "holding",
        do: "status",
        tone: "info",
        message: "Still checking with our support team. This usually takes under a minute.",
        onlyFor: ["transparent"],
      },
      { after: 60, if: "holding", do: "say", text: "Sorry for the wait. You can talk to Rider Support at any time.", onlyFor: ["transparent"] },
    ],

    riderPressedHelp: [{ do: "status", tone: "info", message: "Connecting you to Rider Support…", onlyFor: ["transparent"] }],

    riderPressedPullOver: [
      { do: "status", tone: "info", message: "Pull over requested. Rider Support has been told.", onlyFor: ["transparent"] },
    ],

    fleetCleared: [
      { do: "status", tone: "ok", message: "All clear. Going around the fire truck.", onlyFor: ["transparent"] },
      { do: "say", text: "Thanks for waiting. We're cleared to go around the fire truck.", onlyFor: ["transparent"] },
      { after: 1.5, do: "proceed" },
    ],

    maxWaitElapsed: [
      { do: "status", tone: "ok", message: "Path is clear. Continuing.", onlyFor: ["transparent"] },
      { after: 1, do: "proceed" },
    ],

    passedObject: [{ after: 4, do: "clearStatus" }],

    arrived: [
      { do: "say", text: "We've arrived. Please remember your belongings." },
      { after: 5, do: "end" },
    ],
  },
});
