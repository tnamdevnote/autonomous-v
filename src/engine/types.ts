// Shared types for scenarios, simulation state and the messages screens send.

/** Named conditions a step can check with `if`, and a Figma design can use in `showFrame`. */
export type Condition =
  | "always"
  | "driving" // car is under way (including easing around an object)
  | "moving" // car speed > 0
  | "stopped" // car speed = 0, for any reason
  | "holding" // car has stopped for an object and is waiting to be cleared
  | "helpRequested"
  | "noHelpRequested"
  | "supportReplied"
  | "arrived"
  | "ended";

/** Things that can appear in the world. Add a kind here + a model in surfaces/world. */
export type ObjectKind = "fireTruck" | "parkedCar" | "cone";

/** Where a spawned object sits across the road. */
export type Place = "parking" | "lane" | "leftLane";

/** The library of actions a scenario step can perform. New action = engine code. */
export type Action =
  | { do: "drive"; mph?: number }
  | { do: "spawn"; id: string; kind: ObjectKind; aheadMeters: number; place?: Place; label?: string }
  | { do: "stopFor"; target: string; gapMeters?: number }
  | { do: "proceed"; nudgeMeters?: number }
  | { do: "status"; message: string; tone?: Tone }
  | { do: "clearStatus" }
  | { do: "say"; text: string }
  | { do: "supportMessage"; text: string }
  | { do: "remove"; id: string }
  | { do: "end" };

export type ActionName = Action["do"];

export type Tone = "info" | "warning" | "ok";

interface StepOptions {
  /** Only run this step for these cabin variants (file names, e.g. "transparent"). */
  onlyFor?: string[];
  /** Skip this step unless the condition is true when it's due. */
  if?: Condition;
  /** Free text for teammates; ignored by the engine. */
  note?: string;
}

/** A step on the main timeline, `at` seconds after Start. */
export type TimelineStep = Action & StepOptions & { at: number };

/** A step that reacts to an event, `after` seconds after the event (default 0). */
export type ReactionStep = Action & StepOptions & { after?: number };

export type Step = TimelineStep | ReactionStep;

/** Events the engine emits. Scenarios react to them in `on`. */
export type ScenarioEvent =
  | "start"
  | "carStopped"
  | "riderPressedHelp"
  | "riderPressedPullOver"
  | "fleetCleared"
  | "maxWaitElapsed"
  | "supportReplied"
  | "passedObject"
  | "arrived";

export interface Trip {
  destination: string;
  address?: string;
  /** Clock time shown at Start, e.g. "2:12 PM". */
  startClock: string;
  /** The rider's appointment, e.g. "2:28 PM". Shown on the phone. */
  appointment?: string;
  /** Trip length the rider is told at Start. Displayed arrival = start + this + time lost to stops. */
  minutesToDestination: number;
  /** Length of the simulated stretch of road. The 3D drive is a short slice of the whole trip. */
  routeMeters: number;
  cruiseMph: number;
}

export interface Scenario {
  name: string;
  description?: string;
  trip: Trip;
  /** If the car is holding this long with no clearance, the engine emits `maxWaitElapsed`. */
  maxWaitSeconds?: number;
  timeline: TimelineStep[];
  on?: Partial<Record<ScenarioEvent, ReactionStep[]>>;
}

// ---------------------------------------------------------------------------
// Simulation state (what every screen renders from)

export type CarMode = "idle" | "driving" | "holding" | "passing" | "arrived";

export interface SimObject {
  id: string;
  kind: ObjectKind;
  /** Distance along the route, metres. */
  s: number;
  /** Lateral position, metres. 0 = centre of our lane, negative = left. */
  x: number;
  length: number;
  width: number;
  height: number;
  label?: string;
}

export interface ChatMessage {
  from: "rider" | "support" | "system";
  text: string;
  t: number;
}

export interface SimState {
  sessionId: string;
  scenarioId: string;
  variantId: string;
  participant: string;
  status: "ready" | "running" | "paused" | "ended";
  /** Scenario seconds since Start. */
  t: number;
  /** Playback speed multiplier. */
  speed: number;
  voice: boolean;
  trip: Trip & { clockStart: number };
  car: {
    s: number;
    v: number;
    x: number;
    mode: CarMode;
    cruise: number;
    stopTarget: string | null;
    stopGap: number;
    passTarget: string | null;
    nudge: number;
    holdStartedAt: number | null;
  };
  objects: SimObject[];
  message: { text: string; tone: Tone; t: number } | null;
  utterance: { id: number; text: string } | null;
  support: { requested: boolean; requestedAt: number | null; messages: ChatMessage[] };
  pullOverRequested: boolean;
  /** Next few scheduled steps, for the facilitator console. */
  upcoming: { at: number; label: string }[];
  logCount: number;
}

export interface LogEntry {
  /** Scenario seconds. */
  t: number;
  /** Wall clock, ISO 8601. */
  wall: string;
  source: "engine" | "scenario" | "rider" | "facilitator";
  type: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Intents: what screens send to the simulation

export type RiderAction = "pressHelp" | "pressPullOver";

export type Intent =
  | { kind: "rider"; action: RiderAction; surface?: string }
  /** Anything else the rider does on a screen (opening it, switching tabs…). Logged only. */
  | { kind: "rider"; action: "interaction"; detail: string; surface?: string }
  | { kind: "facilitator"; action: "start" | "pause" | "resume" | "end" | "skipNext" | "clearToProceed" }
  | { kind: "facilitator"; action: "reset" }
  | { kind: "facilitator"; action: "load"; scenarioId: string; variantId: string }
  | { kind: "facilitator"; action: "setSpeed"; speed: number }
  | { kind: "facilitator"; action: "setVoice"; on: boolean }
  | { kind: "facilitator"; action: "setParticipant"; participant: string }
  | { kind: "facilitator"; action: "supportReply"; text: string; clear?: boolean }
  | { kind: "facilitator"; action: "marker"; label: string; value?: string | number };
