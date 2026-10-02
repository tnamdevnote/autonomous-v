// TRANSPARENT: a first placeholder for "real-time status + reassurance". Explains why the
// car stopped, shows how long it's been waiting and how late you'll be, and puts the
// rider's options up front. Designers: replace this freely.
import { isHolding } from "../../../engine";
import { CarViz, RiderButton, StatusBanner, SupportPanel, TripInfo, useSim } from "../components";

export const meta = {
  name: "Transparent (placeholder)",
  description: "Highlights the fire truck, explains the stop, shows the wait and offers help.",
};

export default function Transparent() {
  const sim = useSim();
  const holding = isHolding(sim);
  return (
    <div className="cabin">
      <div className="cabin-viz">
        <CarViz showPath highlightStopTarget showStopLine />
      </div>
      <aside className="cabin-side">
        <StatusBanner />
        <TripInfo showDelay />
        <div className="cabin-spacer" />
        {holding && <p className="cabin-hint">You can talk to a person at any time.</p>}
        <div className="cabin-actions">
          <RiderButton action="pressHelp" kind="primary">
            Talk to Rider Support
          </RiderButton>
          <RiderButton action="pressPullOver">Pull over</RiderButton>
        </div>
      </aside>
      <SupportPanel />
    </div>
  );
}
