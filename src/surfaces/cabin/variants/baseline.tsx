// BASELINE: roughly today's experience. Map-like view of what the car sees, arrival
// time, a small Help button, and no explanation when the car stops.
import { CarViz, RiderButton, SupportPanel, TripInfo } from "../components";

export const meta = {
  name: "Baseline (today-like)",
  description: "What-the-car-sees view and ETA. No explanation when the car stops.",
};

export default function Baseline() {
  return (
    <div className="cabin">
      <div className="cabin-viz">
        <CarViz showPath />
      </div>
      <aside className="cabin-side">
        <TripInfo />
        <div className="cabin-spacer" />
        <div className="cabin-tiles">
          <div className="tile">♫ Music</div>
          <div className="tile">❄ 70°</div>
        </div>
        <RiderButton action="pressHelp" kind="quiet">
          Help
        </RiderButton>
      </aside>
      <SupportPanel />
    </div>
  );
}
