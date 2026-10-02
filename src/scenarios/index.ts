// Every file in this folder (except this one and tests) is a scenario. The file name is its id.
import type { Scenario } from "../engine";

const modules = import.meta.glob<{ default: Scenario }>(["./*.ts", "!./index.ts", "!./*.test.ts"], { eager: true });

export const scenarios: Record<string, Scenario> = Object.fromEntries(
  Object.entries(modules)
    .map(([path, mod]) => [path.slice(2, -3), mod.default] as const)
    // The spike scenario first, so it's the default.
    .sort(([a], [b]) => (a === "parked-fire-truck" ? -1 : b === "parked-fire-truck" ? 1 : a.localeCompare(b))),
);
