// Figma frames as clickable cabin screens: exported images + hotspots. Quick to make,
// but static — anything that must update live (ETA, the 3D view) needs a coded variant.

import { useEffect, useState } from "react";
import { checkCondition, useRiderAction, useSim, type Condition, type RiderAction } from "../../engine";

export interface Hotspot {
  /** Position and size in frame pixels (read them off Figma's inspect panel). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Go to another frame of this design… */
  goTo?: string;
  /** …and/or send a real rider action to the simulation. */
  action?: RiderAction;
  label?: string;
}

export interface DesignFrame {
  image: string;
  hotspots?: Hotspot[];
}

export interface Design {
  name: string;
  description?: string;
  /** Frame size in pixels. Default 1280×800, the cabin screen size. */
  width?: number;
  height?: number;
  frames: Record<string, DesignFrame>;
  /** Which frame to show for the car's situation. First match wins. */
  showFrame: { when: Condition; frame: string }[];
}

export function defineDesign(design: Design): Design {
  return design;
}

function HotspotButton({ spot, onGo }: { spot: Hotspot; onGo: (frame: string) => void }) {
  const fire = useRiderAction(spot.action ?? "pressHelp", "cabin (figma)");
  return (
    <button
      className="hotspot"
      aria-label={spot.label ?? spot.goTo ?? spot.action}
      style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }}
      onClick={() => {
        if (spot.action) fire();
        if (spot.goTo) onGo(spot.goTo);
      }}
    />
  );
}

export function FigmaScreen({ design }: { design: Design }) {
  const sim = useSim();
  const auto = design.showFrame.find((r) => checkCondition(sim, r.when))?.frame ?? Object.keys(design.frames)[0];
  // A hotspot's goTo overrides the automatic frame until the car's situation changes.
  const [manual, setManual] = useState<string | null>(null);
  useEffect(() => setManual(null), [auto]);
  const frame = design.frames[manual ?? auto] ?? design.frames[auto];
  const showOutlines = new URLSearchParams(location.search).has("hotspots");

  return (
    <div className={`figma-screen${showOutlines ? " show-hotspots" : ""}`} style={{ width: design.width ?? 1280, height: design.height ?? 800 }}>
      <img src={frame.image} alt="" draggable={false} />
      {frame.hotspots?.map((spot, i) => (
        <HotspotButton key={i} spot={spot} onGo={setManual} />
      ))}
    </div>
  );
}
