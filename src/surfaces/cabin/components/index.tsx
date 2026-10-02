// Building blocks for cabin screen variants. Use them, restyle them, or ignore them
// and build your own from useSim() + useRiderAction().

import type { ReactNode } from "react";
import {
  arrivalClock,
  delaySeconds,
  formatClock,
  formatDuration,
  heldSeconds,
  isHolding,
  routeProgress,
  useRiderAction,
  useSim,
  type RiderAction,
} from "../../../engine";

export { CarViz, type CarVizProps } from "./CarViz";
export { useSim, useRiderAction } from "../../../engine";

export function TripInfo({ showDelay = false }: { showDelay?: boolean }) {
  const sim = useSim();
  const delayMin = Math.round(delaySeconds(sim) / 60);
  return (
    <div className="trip-info">
      <div className="trip-eyebrow">Arriving</div>
      <div className="trip-arrival">
        {formatClock(arrivalClock(sim))}
        {showDelay && delayMin > 0 && <span className="trip-delay">+{delayMin} min</span>}
      </div>
      <div className="trip-destination">{sim.trip.destination}</div>
      {sim.trip.address && <div className="trip-address">{sim.trip.address}</div>}
      <div className="trip-progress">
        <div style={{ width: `${routeProgress(sim) * 100}%` }} />
      </div>
    </div>
  );
}

/** The scenario's current status message (scenario `status` steps), plus a wait timer. */
export function StatusBanner({ showTimer = true }: { showTimer?: boolean }) {
  const sim = useSim();
  if (!sim.message) return null;
  return (
    <div className={`status-banner tone-${sim.message.tone}`}>
      <div className="status-text">{sim.message.text}</div>
      {showTimer && isHolding(sim) && <div className="status-timer">Waiting {formatDuration(heldSeconds(sim))}</div>}
    </div>
  );
}

export function RiderButton({
  action,
  kind = "secondary",
  children,
}: {
  action: RiderAction;
  kind?: "primary" | "secondary" | "quiet";
  children: ReactNode;
}) {
  const press = useRiderAction(action, "cabin");
  return (
    <button className={`rider-button ${kind}`} onClick={press}>
      {children}
    </button>
  );
}

/** Messages from Rider Support (the facilitator), shown once the rider asks for help. */
export function SupportPanel() {
  const sim = useSim();
  const { messages } = sim.support;
  if (messages.length === 0) return null;
  return (
    <div className="support-panel">
      <div className="support-title">Rider Support</div>
      {messages.slice(-3).map((m, i) => (
        <div key={i} className={`support-msg from-${m.from}`}>
          {m.text}
        </div>
      ))}
    </div>
  );
}
