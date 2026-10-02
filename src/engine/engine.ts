// The simulation. Pure TypeScript, no React or browser APIs, so it runs the same in a
// browser tab, a test, or (later) a server. One instance is authoritative per session.

import { parseClock } from "./clock";
import { describeStep } from "./scenario";
import { checkCondition, getObject, stopPoint } from "./selectors";
import type { Intent, LogEntry, Scenario, ScenarioEvent, SimState, Step } from "./types";
import { OBJECT_SIZES, placeX } from "./world";

const MPH = 0.44704;
const ACCEL = 1.6; // m/s²
const BRAKE = 2.2; // m/s², comfortable deceleration
const PASS_SPEED = 4.5; // m/s while easing around an object
const SUBSTEP = 1 / 30; // s
const DEFAULT_GAP = 12; // m between stop point and object centre

interface Pending {
  fireAt: number;
  seq: number;
  step: Step;
  origin: string;
}

export interface EngineOptions {
  scenarioId: string;
  variantId: string;
  participant?: string;
  speed?: number;
  voice?: boolean;
}

export class SimEngine {
  readonly state: SimState;
  readonly log: LogEntry[] = [];
  private queue: Pending[] = [];
  private seq = 0;
  private utterances = 0;
  /** Set once the current hold has been cleared or timed out, so it only resolves once. */
  private holdResolved = false;

  constructor(
    readonly scenario: Scenario,
    options: EngineOptions,
  ) {
    const { trip } = scenario;
    this.state = {
      sessionId: newSessionId(),
      scenarioId: options.scenarioId,
      variantId: options.variantId,
      participant: options.participant ?? "",
      status: "ready",
      t: 0,
      speed: options.speed ?? 1,
      voice: options.voice ?? true,
      trip: { ...trip, clockStart: parseClock(trip.startClock) },
      car: {
        s: 0,
        v: 0,
        x: 0,
        mode: "idle",
        cruise: trip.cruiseMph * MPH,
        stopTarget: null,
        stopGap: DEFAULT_GAP,
        passTarget: null,
        nudge: 1,
        holdStartedAt: null,
      },
      objects: [],
      message: null,
      utterance: null,
      support: { requested: false, requestedAt: null, messages: [] },
      pullOverRequested: false,
      upcoming: [],
      logCount: 0,
    };
    this.record("engine", "loaded", `${scenario.name} · variant ${options.variantId}`);
  }

  /** A copy of the state that's safe to send to other screens. */
  snapshot(): SimState {
    const upcoming = [...this.queue]
      .filter((p) => this.applies(p.step))
      .sort(byDue)
      .slice(0, 4)
      .map((p) => ({ at: p.fireAt, label: `${p.origin}: ${describeStep(p.step)}` }));
    return structuredClone({ ...this.state, upcoming });
  }

  handle(intent: Intent): void {
    const s = this.state;
    if (intent.kind === "rider" && intent.action === "interaction") {
      this.record("rider", "interaction", intent.surface ? `${intent.detail} (${intent.surface})` : intent.detail);
      return;
    }
    if (intent.kind === "rider") {
      this.record("rider", intent.action, intent.surface);
      if (intent.action === "pressHelp") {
        if (!s.support.requested) {
          s.support.requested = true;
          s.support.requestedAt = s.t;
          s.support.messages.push({ from: "system", text: "Help requested. Connecting you to Rider Support…", t: s.t });
        }
        this.emit("riderPressedHelp");
      } else {
        s.pullOverRequested = true;
        this.emit("riderPressedPullOver");
      }
      this.processDue();
      return;
    }

    switch (intent.action) {
      case "start":
        if (s.status !== "ready") return;
        s.status = "running";
        this.record("facilitator", "start");
        for (const step of this.scenario.timeline) this.enqueue(step.at, step, "timeline");
        this.emit("start");
        break;
      case "pause":
        if (s.status === "running") s.status = "paused";
        this.record("facilitator", "pause");
        break;
      case "resume":
        if (s.status === "paused") s.status = "running";
        this.record("facilitator", "resume");
        break;
      case "end":
        s.status = "ended";
        this.record("facilitator", "end");
        break;
      case "setSpeed":
        s.speed = Math.min(8, Math.max(0.25, intent.speed));
        this.record("facilitator", "setSpeed", `${s.speed}x`);
        break;
      case "setVoice":
        s.voice = intent.on;
        this.record("facilitator", "setVoice", intent.on ? "on" : "off");
        break;
      case "setParticipant":
        s.participant = intent.participant;
        this.record("facilitator", "setParticipant", intent.participant);
        break;
      case "skipNext": {
        const next = [...this.queue].filter((p) => this.applies(p.step)).sort(byDue)[0];
        this.record("facilitator", "skipNext", next ? describeStep(next.step) : "nothing scheduled");
        if (next) {
          this.queue = this.queue.filter((p) => p !== next);
          this.fire(next.step);
        }
        break;
      }
      case "clearToProceed":
        this.record("facilitator", "clearToProceed");
        if (s.car.mode !== "holding" || this.holdResolved) {
          this.record("engine", "ignored", "car isn't waiting to be cleared");
          break;
        }
        this.holdResolved = true;
        this.emit("fleetCleared");
        break;
      case "supportReply":
        s.support.messages.push({ from: "support", text: intent.text, t: s.t });
        this.record("facilitator", "supportReply", intent.text);
        this.emit("supportReplied");
        if (intent.clear) this.handle({ kind: "facilitator", action: "clearToProceed" });
        break;
      case "marker":
        this.record("facilitator", "marker", intent.value === undefined ? intent.label : `${intent.label}: ${intent.value}`);
        break;
      case "reset":
      case "load":
        // Handled by the host, which builds a fresh engine.
        break;
    }
    this.processDue();
  }

  /** Advance by `realSeconds` of wall time (scaled by playback speed). */
  advance(realSeconds: number): void {
    if (this.state.status !== "running") return;
    let remaining = Math.min(realSeconds, 1) * this.state.speed;
    while (remaining > 1e-9 && this.state.status === "running") {
      const h = Math.min(SUBSTEP, remaining);
      remaining -= h;
      this.state.t += h;
      this.physics(h);
      this.processDue();
    }
  }

  // -------------------------------------------------------------------------

  private physics(h: number): void {
    const car = this.state.car;
    if (car.mode === "idle" || car.mode === "arrived") {
      car.v = 0;
      return;
    }
    if (car.mode === "holding") {
      car.v = 0;
      const maxWait = this.scenario.maxWaitSeconds;
      if (maxWait && !this.holdResolved && car.holdStartedAt !== null && this.state.t - car.holdStartedAt >= maxWait) {
        this.holdResolved = true;
        this.emit("maxWaitElapsed");
      }
      return;
    }

    const passing = car.mode === "passing" ? getObject(this.state, car.passTarget) : undefined;
    const besidePassTarget = passing !== undefined && car.s > passing.s - 35 && car.s < passing.s + 8;

    // Speed: cruise, slowed while easing past an object, and never faster than we can stop.
    const stopAt = stopPoint(this.state);
    const envelope = Math.sqrt(2 * BRAKE * Math.max(0, stopAt - car.s));
    const target = Math.min(besidePassTarget ? PASS_SPEED : car.cruise, envelope);
    car.v = car.v < target ? Math.min(target, car.v + ACCEL * h) : Math.max(target, car.v - BRAKE * 1.5 * h);
    car.s = Math.min(stopAt, car.s + car.v * h);

    // Ease left around the object, then back into the lane.
    const xTarget = besidePassTarget ? -car.nudge : 0;
    car.x += (xTarget - car.x) * Math.min(1, h * 1.5);

    if (stopAt - car.s < 0.25 && car.v < 1) {
      car.s = stopAt;
      car.v = 0;
      if (car.stopTarget !== null && stopAt < this.state.trip.routeMeters) {
        car.mode = "holding";
        car.holdStartedAt = this.state.t;
        this.holdResolved = false;
        this.emit("carStopped");
      } else {
        car.mode = "arrived";
        this.emit("arrived");
      }
      return;
    }

    if (passing && car.s > passing.s + 10) {
      car.mode = "driving";
      car.passTarget = null;
      this.emit("passedObject");
    }
  }

  private applies(step: Step): boolean {
    return !step.onlyFor || step.onlyFor.includes(this.state.variantId);
  }

  private fire(step: Step): void {
    if (!this.applies(step)) return;
    if (step.if && !checkCondition(this.state, step.if)) {
      this.record("engine", "skipped", `${describeStep(step)} (not ${step.if})`);
      return;
    }
    const s = this.state;
    const car = s.car;
    this.record("scenario", step.do, describeStep(step));
    switch (step.do) {
      case "drive":
        if (car.mode === "idle") car.mode = "driving";
        if (step.mph) car.cruise = step.mph * MPH;
        break;
      case "spawn":
        s.objects = s.objects.filter((o) => o.id !== step.id);
        s.objects.push({
          id: step.id,
          kind: step.kind,
          s: car.s + step.aheadMeters,
          x: placeX(step.place ?? "parking"),
          ...OBJECT_SIZES[step.kind],
          label: step.label,
        });
        break;
      case "stopFor": {
        const target = getObject(s, step.target);
        const gap = step.gapMeters ?? DEFAULT_GAP;
        if (!target) this.record("engine", "error", `stopFor: no object "${step.target}"`);
        else if (target.s - gap < car.s) this.record("engine", "error", `stopFor: already past "${step.target}"`);
        else {
          car.stopTarget = target.id;
          car.stopGap = gap;
        }
        break;
      }
      case "proceed":
        if (car.mode !== "holding" && car.stopTarget === null) break;
        car.passTarget = car.stopTarget;
        car.stopTarget = null;
        car.holdStartedAt = null;
        car.nudge = step.nudgeMeters ?? 1;
        car.mode = "passing";
        break;
      case "status":
        s.message = { text: step.message, tone: step.tone ?? "info", t: s.t };
        break;
      case "clearStatus":
        s.message = null;
        break;
      case "say":
        s.utterance = { id: ++this.utterances, text: step.text };
        break;
      case "supportMessage":
        s.support.messages.push({ from: "support", text: step.text, t: s.t });
        break;
      case "remove":
        s.objects = s.objects.filter((o) => o.id !== step.id);
        break;
      case "end":
        s.status = "ended";
        break;
    }
  }

  private emit(event: ScenarioEvent): void {
    this.record("engine", "event", event);
    for (const step of this.scenario.on?.[event] ?? []) this.enqueue(this.state.t + (step.after ?? 0), step, event);
  }

  private enqueue(fireAt: number, step: Step, origin: string): void {
    this.queue.push({ fireAt, seq: this.seq++, step, origin });
  }

  private processDue(): void {
    for (;;) {
      let next: Pending | undefined;
      for (const p of this.queue) if (p.fireAt <= this.state.t + 1e-9 && (!next || byDue(p, next) < 0)) next = p;
      if (!next) return;
      this.queue = this.queue.filter((p) => p !== next);
      this.fire(next.step);
    }
  }

  private record(source: LogEntry["source"], type: string, detail?: string): void {
    this.log.push({ t: Math.round(this.state.t * 100) / 100, wall: new Date().toISOString(), source, type, detail });
    this.state.logCount = this.log.length;
  }
}

function byDue(a: Pending, b: Pending): number {
  return a.fireAt - b.fireAt || a.seq - b.seq;
}

function newSessionId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `S-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
