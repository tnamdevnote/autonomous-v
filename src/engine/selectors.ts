// Read-only helpers for screens. All take a SimState and derive something from it.

import { parseClock } from "./clock";
import type { Condition, SimObject, SimState } from "./types";
import { parkedCarsAlong, trafficAt, type BackgroundCar } from "./world";

export function checkCondition(state: SimState, condition: Condition): boolean {
  switch (condition) {
    case "always":
      return true;
    case "driving":
      return state.car.mode === "driving" || state.car.mode === "passing";
    case "moving":
      return state.car.v > 0.1;
    case "stopped":
      return state.car.v <= 0.1;
    case "holding":
      return state.car.mode === "holding";
    case "helpRequested":
      return state.support.requested;
    case "noHelpRequested":
      return !state.support.requested;
    case "supportReplied":
      return state.support.messages.some((m) => m.from === "support");
    case "arrived":
      return state.car.mode === "arrived";
    case "ended":
      return state.status === "ended";
  }
}

export const isHolding = (state: SimState) => state.car.mode === "holding";

/** Seconds the car has been holding, or 0. */
export function heldSeconds(state: SimState): number {
  return state.car.holdStartedAt === null ? 0 : state.t - state.car.holdStartedAt;
}

export function getObject(state: SimState, id: string | null): SimObject | undefined {
  return id === null ? undefined : state.objects.find((o) => o.id === id);
}

/** The object the car is stopping (or stopped) for. */
export function stopTargetObject(state: SimState): SimObject | undefined {
  return getObject(state, state.car.stopTarget);
}

/** Where the car will come to rest: in front of its stop target, or the end of the route. */
export function stopPoint(state: SimState): number {
  const target = stopTargetObject(state);
  const route = state.trip.routeMeters;
  return target ? Math.min(route, target.s - state.car.stopGap) : route;
}

export const currentClock = (state: SimState) => state.trip.clockStart + state.t;

/** Time lost versus driving at cruise speed the whole way (stops, slow-downs). */
export function delaySeconds(state: SimState): number {
  return Math.max(0, state.t - state.car.s / state.car.cruise);
}

export const plannedArrivalClock = (state: SimState) => state.trip.clockStart + state.trip.minutesToDestination * 60;

/** Displayed arrival: the planned arrival, slipping one-for-one with time lost. */
export const arrivalClock = (state: SimState) => plannedArrivalClock(state) + delaySeconds(state);

export function appointmentClock(state: SimState): number | null {
  if (!state.trip.appointment) return null;
  const c = parseClock(state.trip.appointment);
  return Number.isNaN(c) ? null : c;
}

/** Fraction of the simulated route driven, 0..1. */
export const routeProgress = (state: SimState) => Math.min(1, state.car.s / state.trip.routeMeters);

export interface Detection {
  id: string;
  kind: SimObject["kind"] | "car";
  s: number;
  x: number;
  length: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
  /** True for scenario objects, false for background traffic and parked cars. */
  scenario: boolean;
}

const CAR_DIMS = { length: 4.6, width: 1.9, height: 1.5 };

/** Everything the car "sees" around position s at time t: scenario objects + background. */
export function detectionsAt(state: SimState, t: number, s: number, range = 160): Detection[] {
  const near = (d: { s: number }) => Math.abs(d.s - s) < range;
  const bg = (c: BackgroundCar): Detection => ({ ...c, ...CAR_DIMS, kind: "car", scenario: false });
  return [
    ...state.objects.filter(near).map((o): Detection => ({ ...o, scenario: true })),
    ...parkedCarsAlong(state.trip.routeMeters, state.objects).filter(near).map(bg),
    ...trafficAt(t, s, range).map(bg),
  ];
}
