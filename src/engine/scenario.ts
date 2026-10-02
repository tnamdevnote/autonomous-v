import { parseClock } from "./clock";
import type { ActionName, Condition, Scenario, ScenarioEvent, Step } from "./types";

/** Wrap a scenario object so the editor type-checks and autocompletes it. */
export function defineScenario(scenario: Scenario): Scenario {
  return scenario;
}

const ACTIONS: ActionName[] = ["drive", "spawn", "stopFor", "proceed", "status", "clearStatus", "say", "supportMessage", "remove", "end"];
const EVENTS: ScenarioEvent[] = [
  "start",
  "carStopped",
  "riderPressedHelp",
  "riderPressedPullOver",
  "fleetCleared",
  "maxWaitElapsed",
  "supportReplied",
  "passedObject",
  "arrived",
];
const CONDITIONS: Condition[] = [
  "always",
  "driving",
  "moving",
  "stopped",
  "holding",
  "helpRequested",
  "noHelpRequested",
  "supportReplied",
  "arrived",
  "ended",
];

/**
 * Catch the mistakes TypeScript can't (or that slip through when someone edits in a hurry).
 * Returns human-readable problems; empty means OK.
 */
export function validateScenario(scenario: Scenario, knownVariants?: string[]): string[] {
  const problems: string[] = [];
  const { trip } = scenario;
  if (!trip) return ["Missing `trip`."];
  if (Number.isNaN(parseClock(trip.startClock))) problems.push(`trip.startClock "${trip.startClock}" isn't a time like "2:12 PM".`);
  if (trip.appointment && Number.isNaN(parseClock(trip.appointment)))
    problems.push(`trip.appointment "${trip.appointment}" isn't a time like "2:28 PM".`);
  if (!(trip.routeMeters > 0)) problems.push("trip.routeMeters must be more than 0.");
  if (!(trip.cruiseMph > 0)) problems.push("trip.cruiseMph must be more than 0.");
  if (!(trip.minutesToDestination > 0)) problems.push("trip.minutesToDestination must be more than 0.");

  const all: { where: string; step: Step }[] = [
    ...scenario.timeline.map((step, i) => ({ where: `timeline[${i}]`, step })),
    ...Object.entries(scenario.on ?? {}).flatMap(([event, steps]) => {
      if (!EVENTS.includes(event as ScenarioEvent)) problems.push(`on.${event}: unknown event. Known: ${EVENTS.join(", ")}.`);
      return (steps ?? []).map((step, i) => ({ where: `on.${event}[${i}]`, step }));
    }),
  ];

  const spawned = new Set(all.flatMap(({ step }) => (step.do === "spawn" ? [step.id] : [])));

  for (const { where, step } of all) {
    if (!ACTIONS.includes(step.do)) {
      problems.push(`${where}: unknown action "${step.do}". Known: ${ACTIONS.join(", ")}.`);
      continue;
    }
    if ("at" in step && !(step.at >= 0)) problems.push(`${where}: "at" must be 0 or more.`);
    if ("after" in step && step.after !== undefined && !(step.after >= 0)) problems.push(`${where}: "after" must be 0 or more.`);
    if (step.if && !CONDITIONS.includes(step.if)) problems.push(`${where}: unknown condition "${step.if}".`);
    if ((step.do === "stopFor" || step.do === "remove") && !spawned.has(step.do === "stopFor" ? step.target : step.id))
      problems.push(`${where}: nothing is spawned with id "${step.do === "stopFor" ? step.target : step.id}".`);
    if (knownVariants && step.onlyFor)
      for (const v of step.onlyFor)
        if (!knownVariants.includes(v)) problems.push(`${where}: onlyFor "${v}" isn't a cabin variant (${knownVariants.join(", ")}).`);
  }
  return problems;
}

export function describeStep(step: Step): string {
  switch (step.do) {
    case "spawn":
      return `spawn ${step.kind} "${step.id}" ${step.aheadMeters} m ahead`;
    case "stopFor":
      return `stop for "${step.target}"`;
    case "status":
      return `status: ${step.message}`;
    case "say":
      return `say: ${step.text}`;
    case "supportMessage":
      return `support: ${step.text}`;
    case "drive":
      return step.mph ? `drive at ${step.mph} mph` : "drive";
    case "remove":
      return `remove "${step.id}"`;
    default:
      return step.do;
  }
}
