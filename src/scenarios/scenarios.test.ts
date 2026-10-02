// Safety net for teammates editing scenarios: every scenario must be valid and must
// play to the end, with and without the rider asking for help.
import { describe, expect, it } from "vitest";
import { SimEngine, validateScenario } from "../engine";
import { scenarios } from ".";

const variantFiles = import.meta.glob("../surfaces/cabin/variants/*.tsx");
const designFolders = import.meta.glob("../designs/*/design.ts");
const variants = [
  ...Object.keys(variantFiles).map((p) => p.split("/").pop()!.replace(".tsx", "")),
  ...Object.keys(designFolders).map((p) => `figma-${p.split("/").at(-2)}`),
];

describe.each(Object.entries(scenarios))("scenario %s", (id, scenario) => {
  it("is valid", () => {
    expect(validateScenario(scenario, variants)).toEqual([]);
  });

  it.each(variants)("plays to the end with variant %s", (variantId) => {
    for (const askForHelp of [false, true]) {
      const engine = new SimEngine(scenario, { scenarioId: id, variantId });
      engine.handle({ kind: "facilitator", action: "start" });
      for (let i = 0; i < 20 * 60 * 15 && engine.state.status === "running"; i++) {
        engine.advance(0.05);
        if (askForHelp && engine.state.car.mode === "holding" && !engine.state.support.requested) {
          engine.handle({ kind: "rider", action: "pressHelp" });
          engine.handle({ kind: "facilitator", action: "supportReply", text: "Clearing you now.", clear: true });
        }
      }
      expect(engine.log.filter((e) => e.type === "error")).toEqual([]);
      expect(engine.state.status).toBe("ended");
    }
  });
});
