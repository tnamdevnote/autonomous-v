import type { RiderAction } from "../engine";

/**
 * Keyboard shortcuts for rider actions. Any USB button, Stream Deck or Makey Makey
 * that sends these keys works as a physical control in the car.
 */
export const RIDER_KEYS: Record<string, RiderAction> = {
  h: "pressHelp",
  p: "pressPullOver",
};
