import { create } from "zustand";
import type { Intent, LogEntry, SimState } from "../types";

export interface SimStore {
  role: "host" | "follower" | "none";
  state: SimState | null;
  /** performance.now() when `state` arrived; used to extrapolate motion between updates. */
  receivedAt: number;
  /** Host only: the full session log. */
  log: LogEntry[];
  /** Host only: problems found in the loaded scenario. */
  problems: string[];
  /** Another tab is also running a simulation. */
  hostConflict: boolean;
  send: (intent: Intent) => void;
}

export const useSimStore = create<SimStore>(() => ({
  role: "none",
  state: null,
  receivedAt: 0,
  log: [],
  problems: [],
  hostConflict: false,
  send: () => {},
}));
