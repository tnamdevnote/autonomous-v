import { useEffect, type ReactNode } from "react";
import { SimEngine } from "../engine";
import { validateScenario } from "../scenario";
import type { Intent, Scenario } from "../types";
import { useSimStore } from "./store";
import { createTransport } from "./transport";

const PUBLISH_EVERY_MS = 50;

interface HostProps {
  scenarios: Record<string, Scenario>;
  variants: string[];
  children: ReactNode;
}

/**
 * Runs the authoritative simulation in this tab and broadcasts it.
 * Used by the facilitator console (/control) and the all-in-one lab (/).
 */
export function SimHost({ scenarios, variants, children }: HostProps) {
  useEffect(() => {
    const hostId = crypto.randomUUID();
    const transport = createTransport();
    const firstScenario = Object.keys(scenarios)[0];
    const firstVariant = variants.includes("baseline") ? "baseline" : variants[0];

    const build = (scenarioId: string, variantId: string, previous?: SimEngine) => {
      const engine = new SimEngine(scenarios[scenarioId], {
        scenarioId,
        variantId,
        participant: previous?.state.participant,
        speed: previous?.state.speed,
        voice: previous?.state.voice,
      });
      useSimStore.setState({ problems: validateScenario(scenarios[scenarioId], variants), log: [] });
      return engine;
    };

    let engine = build(firstScenario, firstVariant);
    let lastPublish = 0;
    let publishedLogCount = -1;

    const publish = () => {
      const state = engine.snapshot();
      lastPublish = performance.now();
      const update: Partial<ReturnType<typeof useSimStore.getState>> = { state, receivedAt: lastPublish };
      if (engine.log.length !== publishedLogCount) {
        publishedLogCount = engine.log.length;
        update.log = engine.log.slice();
      }
      useSimStore.setState(update);
      transport.send({ type: "state", hostId, state });
    };

    const handle = (intent: Intent) => {
      if (intent.kind === "facilitator" && intent.action === "load") {
        if (!scenarios[intent.scenarioId]) return;
        engine = build(intent.scenarioId, intent.variantId, engine);
      } else if (intent.kind === "facilitator" && intent.action === "reset") {
        engine = build(engine.state.scenarioId, engine.state.variantId, engine);
      } else {
        engine.handle(intent);
      }
      publishedLogCount = -1;
      publish();
    };

    transport.onMessage((msg) => {
      if (msg.type === "intent") handle(msg.intent);
      else if (msg.type === "hello") publish();
      else if (msg.type === "state" && msg.hostId !== hostId) useSimStore.setState({ hostConflict: true });
    });

    const ticker = new Worker(new URL("./ticker.worker.ts", import.meta.url), { type: "module" });
    let lastTick = performance.now();
    ticker.onmessage = () => {
      const now = performance.now();
      engine.advance((now - lastTick) / 1000);
      lastTick = now;
      if (now - lastPublish >= PUBLISH_EVERY_MS) publish();
    };

    useSimStore.setState({ role: "host", send: handle, hostConflict: false });
    publish();

    return () => {
      ticker.terminate();
      transport.close();
      useSimStore.setState({ role: "none", state: null, send: () => {} });
    };
  }, [scenarios, variants]);

  return <>{children}</>;
}

/** Mirrors the simulation running in another tab and forwards actions to it. */
export function SimFollower({ children }: { children: ReactNode }) {
  useEffect(() => {
    const transport = createTransport();
    transport.onMessage((msg) => {
      if (msg.type === "state") useSimStore.setState({ state: msg.state, receivedAt: performance.now() });
    });
    useSimStore.setState({ role: "follower", send: (intent) => transport.send({ type: "intent", intent }) });
    transport.send({ type: "hello" });
    return () => {
      transport.close();
      useSimStore.setState({ role: "none", state: null, send: () => {} });
    };
  }, []);

  return <>{children}</>;
}
