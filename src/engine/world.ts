// Road geometry and the deterministic background world (traffic, parked cars).
// Everything here is a pure function of route position and scenario time, so every
// screen computes the same world without it being sent over the wire.
//
// Coordinates: s = metres along the route (forward), x = metres across (right positive).
// In three.js space a point is (x, y, -s).

import type { ObjectKind, Place, SimObject } from "./types";

export const LANE_WIDTH = 3.5;
/** Centre of our lane. */
export const EGO_X = 0;
export const LEFT_LANE_X = -LANE_WIDTH;
export const PARKING_X = 3.1;
export const ROAD_LEFT_EDGE = -5.25;
export const ROAD_RIGHT_EDGE = 4.5;

export const EGO_SIZE = { length: 4.7, width: 1.9, height: 1.6 };

export const OBJECT_SIZES: Record<ObjectKind, { length: number; width: number; height: number }> = {
  fireTruck: { length: 10, width: 2.5, height: 3.2 },
  parkedCar: { length: 4.6, width: 1.9, height: 1.5 },
  cone: { length: 0.4, width: 0.4, height: 0.7 },
};

export function placeX(place: Place): number {
  switch (place) {
    case "parking":
      return PARKING_X;
    case "lane":
      return EGO_X;
    case "leftLane":
      return LEFT_LANE_X;
  }
}

/** Cheap deterministic hash → [0, 1). */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const CAR_COLORS = ["#d9dde3", "#2b2f36", "#8a919c", "#6d1f24", "#1e3a5f", "#c9c3b4", "#3c4a3a", "#f2f2f2"];

export interface BackgroundCar {
  id: string;
  s: number;
  x: number;
  color: string;
}

const TRAFFIC_SPEED = 13; // m/s, a bit faster than us so they overtake
const TRAFFIC_SPACING = 70;

/** Human-driven cars in the left lane. They don't stop for the parked truck. */
export function trafficAt(t: number, centreS: number, range = 260): BackgroundCar[] {
  const lead = TRAFFIC_SPEED * t + 25;
  const kMin = Math.floor((lead - (centreS + range)) / TRAFFIC_SPACING) - 1;
  const kMax = Math.ceil((lead - (centreS - range)) / TRAFFIC_SPACING) + 1;
  const cars: BackgroundCar[] = [];
  for (let k = kMin; k <= kMax; k++) {
    if (hash01(k * 3.3) < 0.18) continue; // gaps in traffic
    const s = lead - k * TRAFFIC_SPACING + (hash01(k) - 0.5) * 24;
    if (Math.abs(s - centreS) > range) continue;
    cars.push({ id: `traffic-${k}`, s, x: LEFT_LANE_X, color: CAR_COLORS[Math.floor(hash01(k * 7.7) * CAR_COLORS.length)] });
  }
  return cars;
}

/** Cars parked along the curb, leaving room around scenario objects in the parking lane. */
export function parkedCarsAlong(routeMeters: number, objects: SimObject[]): BackgroundCar[] {
  const keepClear = objects.filter((o) => Math.abs(o.x - PARKING_X) < 1.5);
  const cars: BackgroundCar[] = [];
  for (let i = 0, s = 40; s < routeMeters + 200; i++, s += 9 + hash01(i * 1.9) * 26) {
    if (hash01(i * 5.1) < 0.45) continue;
    if (keepClear.some((o) => Math.abs(o.s - s) < o.length / 2 + 14)) continue;
    cars.push({ id: `parked-${i}`, s, x: PARKING_X, color: CAR_COLORS[Math.floor(hash01(i * 2.3) * CAR_COLORS.length)] });
  }
  return cars;
}
