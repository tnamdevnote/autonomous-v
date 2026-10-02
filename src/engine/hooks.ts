// The API screens use. A screen reads state with useSim() and sends actions with
// useRiderAction(); it never touches the engine directly.

import { useCallback } from "react";
import { stopPoint } from "./selectors";
import { useSimStore } from "./sync/store";
import type { RiderAction, SimState } from "./types";

/** Live simulation state (updates ~20×/s). Only use inside <SimGate>, which waits for a state. */
export function useSim(): SimState {
  const state = useSimStore((s) => s.state);
  if (!state) throw new Error("useSim() used outside <SimGate>");
  return state;
}

/** Returns a function that sends a rider action, e.g. `const help = useRiderAction("pressHelp")`. */
export function useRiderAction(action: RiderAction, surface?: string): () => void {
  const send = useSimStore((s) => s.send);
  return useCallback(() => send({ kind: "rider", action, surface }), [send, action, surface]);
}

/** Send any intent (facilitator controls). */
export function useSend() {
  return useSimStore((s) => s.send);
}

/**
 * Smooth car position for 3D animation: extrapolates between the ~20 Hz state updates.
 * Not a hook — call it inside useFrame().
 */
export function getLive(): { t: number; s: number; x: number; v: number } | null {
  const { state, receivedAt } = useSimStore.getState();
  if (!state) return null;
  const { car } = state;
  if (state.status !== "running") return { t: state.t, s: car.s, x: car.x, v: car.v };
  const dt = Math.min(0.25, (performance.now() - receivedAt) / 1000) * state.speed;
  return { t: state.t + dt, s: Math.min(stopPoint(state), car.s + car.v * dt), x: car.x, v: car.v };
}
