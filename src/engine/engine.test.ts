import { describe, expect, it } from "vitest";
import scenario from "../scenarios/parked-fire-truck";
import { SimEngine } from "./engine";
import { arrivalClock, plannedArrivalClock } from "./selectors";
import type { Scenario } from "./types";

function start(variantId = "transparent", s: Scenario = scenario) {
  const engine = new SimEngine(s, { scenarioId: "test", variantId });
  engine.handle({ kind: "facilitator", action: "start" });
  return engine;
}

/** Advance in small real-time slices until `done` or the time limit. */
function runUntil(engine: SimEngine, done: () => boolean, limit = 600) {
  const end = engine.state.t + limit;
  while (!done() && engine.state.t < end && engine.state.status === "running") engine.advance(0.05);
}

const events = (engine: SimEngine) => engine.log.filter((e) => e.type === "event").map((e) => e.detail);

describe("parked fire truck", () => {
  it("stops before the truck and holds", () => {
    const engine = start();
    runUntil(engine, () => engine.state.car.mode === "holding");
    const truck = engine.state.objects.find((o) => o.id === "truck")!;
    expect(engine.state.car.mode).toBe("holding");
    expect(engine.state.car.v).toBe(0);
    expect(engine.state.car.s).toBeCloseTo(truck.s - 14, 1);
    expect(engine.state.t).toBeGreaterThan(15);
    expect(engine.state.t).toBeLessThan(35);
    expect(events(engine)).toContain("carStopped");
  });

  it("proceeds on its own after maxWaitSeconds, passes the truck and arrives", () => {
    const engine = start();
    runUntil(engine, () => engine.state.car.mode === "holding");
    const stoppedAt = engine.state.t;
    runUntil(engine, () => engine.state.car.mode === "passing");
    expect(engine.state.t - stoppedAt).toBeGreaterThanOrEqual(120);
    expect(engine.state.t - stoppedAt).toBeLessThan(123);
    runUntil(engine, () => engine.state.status === "ended");
    expect(events(engine)).toEqual(["start", "carStopped", "maxWaitElapsed", "passedObject", "arrived"]);
    expect(engine.state.car.s).toBeCloseTo(scenario.trip.routeMeters, 1);
  });

  it("eases left around the truck and back into the lane", () => {
    const engine = start();
    runUntil(engine, () => engine.state.car.mode === "holding");
    engine.handle({ kind: "facilitator", action: "clearToProceed" });
    let minX = 0;
    runUntil(engine, () => {
      minX = Math.min(minX, engine.state.car.x);
      return engine.state.car.mode === "driving";
    });
    expect(minX).toBeLessThan(-0.6);
    runUntil(engine, () => false, 10);
    expect(Math.abs(engine.state.car.x)).toBeLessThan(0.1);
  });

  it("help → support reply with clearance gets the car moving before max wait", () => {
    const engine = start();
    runUntil(engine, () => engine.state.car.mode === "holding");
    const stoppedAt = engine.state.t;
    runUntil(engine, () => false, 10);
    engine.handle({ kind: "rider", action: "pressHelp", surface: "cabin" });
    expect(engine.state.support.requested).toBe(true);
    expect(engine.state.message?.text).toMatch(/Rider Support/);

    engine.handle({ kind: "facilitator", action: "supportReply", text: "You're cleared, going now.", clear: true });
    expect(engine.state.support.messages.at(-1)).toMatchObject({ from: "support", text: "You're cleared, going now." });
    runUntil(engine, () => engine.state.car.mode === "passing");
    expect(engine.state.t - stoppedAt).toBeLessThan(15);
    expect(events(engine)).toEqual(["start", "carStopped", "riderPressedHelp", "supportReplied", "fleetCleared"]);
  });

  it("only resolves a hold once", () => {
    const engine = start();
    runUntil(engine, () => engine.state.car.mode === "holding");
    engine.handle({ kind: "facilitator", action: "clearToProceed" });
    engine.handle({ kind: "facilitator", action: "clearToProceed" });
    expect(events(engine).filter((e) => e === "fleetCleared")).toHaveLength(1);
  });

  it("skips `if: holding` steps once the car is moving again", () => {
    const engine = start();
    runUntil(engine, () => engine.state.car.mode === "holding");
    engine.handle({ kind: "facilitator", action: "clearToProceed" });
    runUntil(engine, () => false, 30);
    expect(engine.state.message?.text ?? "").not.toMatch(/Still checking/);
    expect(engine.log.some((e) => e.type === "skipped" && e.detail?.includes("Still checking"))).toBe(true);
  });

  it("runs onlyFor steps only for the matching variant", () => {
    const baseline = start("baseline");
    runUntil(baseline, () => baseline.state.t > 40);
    expect(baseline.state.message).toBeNull();

    const transparent = start("transparent");
    runUntil(transparent, () => transparent.state.t > 40);
    expect(transparent.state.message?.text).toMatch(/fire truck/);
  });

  it("arrival time slips one-for-one while waiting", () => {
    const engine = start();
    runUntil(engine, () => engine.state.car.mode === "holding");
    const before = arrivalClock(engine.state);
    runUntil(engine, () => false, 30);
    expect(arrivalClock(engine.state) - before).toBeCloseTo(30, 0);
    expect(arrivalClock(engine.state)).toBeGreaterThan(plannedArrivalClock(engine.state));
  });

  it("pause stops the clock; speed scales it", () => {
    const engine = start();
    engine.handle({ kind: "facilitator", action: "pause" });
    engine.advance(0.5);
    expect(engine.state.t).toBe(0);
    engine.handle({ kind: "facilitator", action: "resume" });
    engine.handle({ kind: "facilitator", action: "setSpeed", speed: 2 });
    engine.advance(0.5);
    expect(engine.state.t).toBeCloseTo(1, 5);
  });

  it("skipNext fires the next scheduled step immediately", () => {
    const engine = start();
    engine.advance(0.1);
    expect(engine.state.utterance).toBeNull();
    engine.handle({ kind: "facilitator", action: "skipNext" });
    expect(engine.state.utterance?.text).toMatch(/412 Oak Street/);
  });

  it("logs rider actions and facilitator markers", () => {
    const engine = start();
    engine.handle({ kind: "rider", action: "pressPullOver", surface: "keyboard" });
    engine.handle({ kind: "facilitator", action: "marker", label: "anxiety", value: 5 });
    const types = engine.log.map((e) => `${e.source}:${e.type}`);
    expect(types).toContain("rider:pressPullOver");
    expect(engine.log.find((e) => e.type === "marker")?.detail).toBe("anxiety: 5");
  });
});
