import { defineDesign } from "../../surfaces/cabin/figma";
import driving from "./driving.svg";
import explain from "./explain.svg";
import stopped from "./stopped.svg";

/*
 * SAMPLE FIGMA DESIGN: shows how exported frames become a clickable cabin screen.
 *
 * To use your own:
 *   1. In Figma, export each frame at 1280×800 as PNG (or SVG) into a new folder
 *      next to this one, e.g. src/designs/calm-v1/
 *   2. Copy this file into that folder and point `image` at your files.
 *   3. Add hotspots: x / y / w / h in frame pixels (from Figma's inspect panel).
 *      `goTo` switches frames; `action` sends a real rider action ("pressHelp" or
 *      "pressPullOver") to the simulation.
 *   4. It appears in the Variant menu on /control as "Figma: <name>".
 * Add ?hotspots to the page URL to see hotspot outlines.
 */
export default defineDesign({
  name: "Sample frames",
  description: "Three exported frames with hotspots. Replace with real Figma exports.",
  frames: {
    driving: {
      image: driving,
      hotspots: [{ x: 830, y: 640, w: 400, h: 96, action: "pressHelp", label: "Help" }],
    },
    stopped: {
      image: stopped,
      hotspots: [
        { x: 830, y: 520, w: 400, h: 96, action: "pressHelp", label: "Get help" },
        { x: 830, y: 640, w: 400, h: 96, goTo: "explain", label: "What's happening?" },
      ],
    },
    explain: {
      image: explain,
      hotspots: [{ x: 830, y: 640, w: 400, h: 96, goTo: "stopped", label: "Back" }],
    },
  },
  showFrame: [
    { when: "holding", frame: "stopped" },
    { when: "always", frame: "driving" },
  ],
});
