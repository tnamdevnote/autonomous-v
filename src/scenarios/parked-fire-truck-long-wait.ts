import { defineScenario } from "../engine";
import base from "./parked-fire-truck";

/*
 * Example variation: same ride, but the car waits up to 4 minutes on its own and the
 * appointment is tighter. Shows how to tweak a scenario by reusing another one.
 * (Copying the whole file and editing it works just as well.)
 */
export default defineScenario({
  ...base,
  name: "Parked fire truck (long wait)",
  description: "Same as Parked fire truck, but the car can wait up to 4 minutes and the appointment is tighter.",
  trip: { ...base.trip, appointment: "2:27 PM" },
  maxWaitSeconds: 240,
});
