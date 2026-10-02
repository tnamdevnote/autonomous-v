// The view from the back seat: the car's interior with a live centre screen, and a
// stylized street outside that reacts to the simulation (the car stops, waits and
// eases around objects as the engine says). Tap the centre screen to open it.

import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  getLive,
  hash01,
  parkedCarsAlong,
  ROAD_LEFT_EDGE,
  ROAD_RIGHT_EDGE,
  trafficAt,
  useSend,
  useSim,
  type BackgroundCar,
} from "../../engine";
import { CabinScreen } from "../cabin/CabinScreen";
import { CabinDisplayProvider } from "../cabin/display";
import { BASE_FOV, Interior } from "./Interior";
import { ObjectModel } from "./models";
import { ScreenModal } from "./ScreenModal";

const SKY = "#c7d9ea";

export function WorldView({ surface = "world" }: { surface?: string }) {
  const [screenOpen, setScreenOpen] = useState(false);
  const screenEl = useRef<HTMLDivElement>(null);
  const send = useSend();
  const openScreen = useCallback(() => {
    setScreenOpen(true);
    send({ kind: "rider", action: "interaction", detail: "opened centre screen", surface });
  }, [send, surface]);
  const closeScreen = useCallback(() => {
    setScreenOpen(false);
    send({ kind: "rider", action: "interaction", detail: "closed centre screen", surface });
  }, [send, surface]);

  return (
    <div className="world-view">
      <Canvas resize={{ offsetSize: true }} dpr={[1, 1.75]} camera={{ fov: BASE_FOV, near: 0.03, far: 900 }}>
        <color attach="background" args={[SKY]} />
        <fog attach="fog" args={[SKY, 80, 480]} />
        <hemisphereLight args={["#f3f7ff", "#7d7a6c", 1.1]} />
        <directionalLight position={[40, 80, 30]} intensity={1.7} />
        <Street />
        <ScenarioObjects />
        <Traffic />
        <Interior screenEl={screenEl} />
      </Canvas>
      {/* The centre screen: the selected cabin design, pinned onto the dashboard in 3D. */}
      <div
        ref={screenEl}
        className="dash-screen"
        role="button"
        tabIndex={0}
        aria-label="Open the car's screen"
        onClick={openScreen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openScreen()}
      >
        <CabinDisplayProvider value={{ surface: "dashboard", quality: "low" }}>
          <CabinScreen />
        </CabinDisplayProvider>
      </div>
      {screenOpen && <ScreenModal onClose={closeScreen} />}
    </div>
  );
}

function Street() {
  const route = useSim().trip.routeMeters;
  const objects = useSim().objects;
  const from = -250;
  const to = route + 450;
  const length = to - from;
  const mid = -(from + to) / 2;
  const parked = useMemo(() => parkedCarsAlong(route, objects), [route, objects]);
  const roadWidth = ROAD_RIGHT_EDGE - ROAD_LEFT_EDGE;
  // Long surfaces are split into ~8 m pieces: one giant triangle reaching behind the
  // camera gets its depth wrong on some GPUs.
  const segments = Math.ceil(length / 8);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, mid]}>
        <planeGeometry args={[400, length, 8, segments]} />
        <meshStandardMaterial color="#a9a69b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(ROAD_LEFT_EDGE + ROAD_RIGHT_EDGE) / 2, 0, mid]}>
        <planeGeometry args={[roadWidth, length, 1, segments]} />
        <meshStandardMaterial color="#45474b" roughness={0.95} />
      </mesh>
      {/* lane edge lines */}
      {[ROAD_LEFT_EDGE + 0.2, 1.75].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, mid]}>
          <planeGeometry args={[0.14, length, 1, segments]} />
          <meshStandardMaterial color="#e9e9e4" />
        </mesh>
      ))}
      <Dashes from={from} to={to} />
      {/* sidewalks */}
      {[
        [ROAD_RIGHT_EDGE, ROAD_RIGHT_EDGE + 4],
        [ROAD_LEFT_EDGE - 4, ROAD_LEFT_EDGE],
      ].map(([a, b]) => (
        <mesh key={a} position={[(a + b) / 2, 0.08, mid]}>
          <boxGeometry args={[b - a, 0.16, length, 1, 1, segments]} />
          <meshStandardMaterial color="#c4c1b8" />
        </mesh>
      ))}
      <Buildings from={from} to={to} />
      <Trees from={from} to={to} />
      <InstancedCars cars={() => parked} max={200} />
    </group>
  );
}

function Dashes({ from, to }: { from: number; to: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = Math.floor((to - from) / 9);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      m.makeTranslation(-1.75, 0.01, -(from + i * 9));
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [from, count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.14, 0.01, 3]} />
      <meshStandardMaterial color="#f2f2ec" />
    </instancedMesh>
  );
}

const FACADES = ["#d8cfc0", "#b9a48c", "#9c8f80", "#c7c2b8", "#8e9aa3", "#d2b48c", "#a3846a", "#e2ddd3"];

function Buildings({ from, to }: { from: number; to: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const blocks = useMemo(() => {
    const list: { x: number; s: number; w: number; d: number; h: number; color: string }[] = [];
    for (const side of [1, -1]) {
      let i = side === 1 ? 0 : 1000;
      for (let s = from; s < to; i++) {
        const w = 10 + hash01(i) * 14;
        const d = 12 + hash01(i * 1.7) * 10;
        const h = 7 + Math.pow(hash01(i * 2.9), 2) * 32;
        const edge = side === 1 ? ROAD_RIGHT_EDGE + 4.5 : ROAD_LEFT_EDGE - 4.5;
        list.push({ x: edge + (side * d) / 2, s: s + w / 2, w: w - 0.6, d, h, color: FACADES[Math.floor(hash01(i * 4.1) * FACADES.length)] });
        s += w;
      }
    }
    return list;
  }, [from, to]);

  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    blocks.forEach((b, i) => {
      m.makeScale(b.d, b.h, b.w).setPosition(b.x, b.h / 2, -b.s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]}>
      <boxGeometry />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

function Trees({ from, to }: { from: number; to: number }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const list: { x: number; s: number; size: number }[] = [];
    for (let i = 0, s = from; s < to; i++, s += 16) {
      if (hash01(i * 8.3) < 0.3) continue;
      list.push({ x: hash01(i) < 0.5 ? ROAD_RIGHT_EDGE + 2.6 : ROAD_LEFT_EDGE - 2.6, s, size: 1.6 + hash01(i * 3.1) });
    }
    return list;
  }, [from, to]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    spots.forEach((t, i) => {
      trunks.current!.setMatrixAt(i, m.makeTranslation(t.x, 1.4, -t.s));
      crowns.current!.setMatrixAt(i, m.makeScale(t.size, t.size * 1.2, t.size).setPosition(t.x, 3.6, -t.s));
    });
    trunks.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceMatrix.needsUpdate = true;
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.15, 0.2, 2.8, 6]} />
        <meshStandardMaterial color="#5b4636" />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, spots.length]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#5d7d4a" flatShading />
      </instancedMesh>
    </group>
  );
}

/** Cars drawn as instances; `cars` is called every frame so traffic moves smoothly. */
function InstancedCars({ cars, max }: { cars: () => BackgroundCar[]; max: number }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const cabins = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const list = cars().slice(0, max);
    list.forEach((car, i) => {
      bodies.current!.setMatrixAt(i, m.makeTranslation(car.x, 0.6, -car.s));
      bodies.current!.setColorAt(i, c.set(car.color));
      cabins.current!.setMatrixAt(i, m.makeTranslation(car.x, 1.18, -car.s + 0.2));
    });
    bodies.current!.count = cabins.current!.count = list.length;
    bodies.current!.instanceMatrix.needsUpdate = true;
    cabins.current!.instanceMatrix.needsUpdate = true;
    if (bodies.current!.instanceColor) bodies.current!.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, max]} frustumCulled={false}>
        <boxGeometry args={[1.85, 0.7, 4.5]} />
        <meshStandardMaterial roughness={0.35} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={cabins} args={[undefined, undefined, max]} frustumCulled={false}>
        <boxGeometry args={[1.6, 0.5, 2.3]} />
        <meshStandardMaterial color="#1c2229" roughness={0.15} metalness={0.5} />
      </instancedMesh>
    </group>
  );
}

function Traffic() {
  return (
    <InstancedCars
      max={20}
      cars={() => {
        const live = getLive();
        return live ? trafficAt(live.t, live.s) : [];
      }}
    />
  );
}

function ScenarioObjects() {
  const { objects } = useSim();
  return (
    <group>
      {objects.map((o) => (
        <group key={o.id} position={[o.x, 0, -o.s]}>
          <ObjectModel kind={o.kind} />
        </group>
      ))}
    </group>
  );
}
