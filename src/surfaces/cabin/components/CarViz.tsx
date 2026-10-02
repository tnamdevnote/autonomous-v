// "What the car sees": a Waymo-style 3D view for the cabin screen. Variants choose
// what to emphasise with props; the engine always provides every detection.

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import {
  detectionsAt,
  EGO_SIZE,
  getLive,
  ROAD_LEFT_EDGE,
  ROAD_RIGHT_EDGE,
  stopPoint,
  trafficAt,
  useSim,
  useSimStore,
  type Detection,
} from "../../../engine";
import { useCabinDisplay } from "../display";

export interface CarVizProps {
  /** Colour and label the object the car is stopped (or stopping) for. */
  highlightStopTarget?: boolean;
  /** Draw the planned path ahead of the car. */
  showPath?: boolean;
  /** Draw a line where the car intends to stop. */
  showStopLine?: boolean;
}

export function CarViz(props: CarVizProps) {
  const { quality } = useCabinDisplay();
  const label = useRef<HTMLDivElement>(null);
  return (
    <div className="carviz">
      <Canvas resize={{ offsetSize: true }} dpr={quality === "low" ? 0.5 : [1, 2]} camera={{ fov: 42, position: [0, 12, 14] }}>
        <color attach="background" args={["#0d1218"]} />
        <fog attach="fog" args={["#0d1218", 40, 120]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 30, 10]} intensity={1.2} />
        <VizScene {...props} label={label} />
      </Canvas>
      {/* Label for the highlighted object; positioned over it each frame. */}
      <div ref={label} className="viz-label" />
    </div>
  );
}

const ROAD_COLOR = "#1a222b";
const LINE_COLOR = "#33414f";
const PATH_COLOR = "#2bd4c4";
const HIGHLIGHT = "#ff8a3d";

function VizScene({ highlightStopTarget, showPath, showStopLine, label }: CarVizProps & { label: RefObject<HTMLDivElement | null> }) {
  const state = useSim();
  const ego = useRef<THREE.Group>(null);
  const path = useRef<THREE.Mesh>(null);
  const stopLine = useRef<THREE.Mesh>(null);
  const route = state.trip.routeMeters;
  const target = highlightStopTarget ? (state.car.stopTarget ?? (state.car.mode === "passing" ? state.car.passTarget : null)) : null;
  const labelPos = useMemo(() => new THREE.Vector3(), []);
  const placed = useRef(false);

  useFrame(({ camera, size }) => {
    const live = getLive();
    const sim = useSimStore.getState().state;
    if (!live || !sim) return;
    ego.current!.position.set(live.x, 0, -live.s);
    // Ease the camera after the car; jump straight there on the first frame.
    const follow = new THREE.Vector3(live.x * 0.5, 13, -live.s + 15);
    camera.position.lerp(follow, placed.current ? 0.2 : 1);
    placed.current = true;
    camera.lookAt(live.x * 0.5, 0, -live.s - 16);

    // Path from the car to where it plans to stop (or 60 m ahead).
    const end = Math.min(stopPoint(sim), live.s + 60);
    const len = Math.max(0.01, end - live.s - EGO_SIZE.length / 2);
    if (path.current) {
      path.current.visible = len > 0.5;
      path.current.scale.set(1, len, 1);
      path.current.position.set(live.x, 0.02, -(live.s + EGO_SIZE.length / 2 + len / 2));
    }
    if (stopLine.current) {
      stopLine.current.visible = sim.car.stopTarget !== null;
      stopLine.current.position.set(0, 0.03, -(stopPoint(sim) + EGO_SIZE.length / 2 + 0.6));
    }

    const el = label.current;
    const obj = target ? sim.objects.find((o) => o.id === target) : undefined;
    if (el) {
      if (obj?.label) {
        labelPos.set(obj.x, obj.height + 1.2, -obj.s).project(camera);
        el.textContent = obj.label;
        el.style.display = "block";
        el.style.transform = `translate(${((labelPos.x + 1) / 2) * size.width}px, ${((1 - labelPos.y) / 2) * size.height}px) translate(-50%, -100%)`;
      } else {
        el.style.display = "none";
      }
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(ROAD_LEFT_EDGE + ROAD_RIGHT_EDGE) / 2, 0, -route / 2]}>
        <planeGeometry args={[ROAD_RIGHT_EDGE - ROAD_LEFT_EDGE, route + 600, 1, Math.ceil((route + 600) / 8)]} />
        <meshBasicMaterial color={ROAD_COLOR} />
      </mesh>
      {[ROAD_LEFT_EDGE, -1.75, 1.75, ROAD_RIGHT_EDGE].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -route / 2]}>
          <planeGeometry args={[0.1, route + 600, 1, Math.ceil((route + 600) / 8)]} />
          <meshBasicMaterial color={LINE_COLOR} />
        </mesh>
      ))}

      {showPath && (
        <mesh ref={path} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 1]} />
          <meshBasicMaterial color={PATH_COLOR} transparent opacity={0.35} />
        </mesh>
      )}
      {showStopLine && (
        <mesh ref={stopLine} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.2, 0.35]} />
          <meshBasicMaterial color={HIGHLIGHT} />
        </mesh>
      )}

      <group ref={ego}>
        <mesh position={[0, EGO_SIZE.height / 2, 0]}>
          <boxGeometry args={[EGO_SIZE.width, EGO_SIZE.height, EGO_SIZE.length]} />
          <meshStandardMaterial color="#f4f7fa" />
        </mesh>
        <mesh position={[0, EGO_SIZE.height + 0.15, 0.2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
          <meshStandardMaterial color={PATH_COLOR} emissive={PATH_COLOR} emissiveIntensity={0.6} />
        </mesh>
      </group>

      <Detections highlightId={target} />
    </group>
  );
}

function Detections({ highlightId }: { highlightId: string | null }) {
  const state = useSim();
  // Scenario objects and parked cars only change with state; traffic moves every frame.
  const fixed = useMemo(() => detectionsAt(state, state.t, state.car.s, 140).filter((d) => !d.id.startsWith("traffic-")), [state]);
  return (
    <group>
      {fixed.map((d) => (
        <DetectionBox key={d.id} d={d} highlight={d.id === highlightId} />
      ))}
      <MovingTraffic />
    </group>
  );
}

function DetectionBox({ d, highlight }: { d: Detection; highlight: boolean }) {
  const color = highlight ? HIGHLIGHT : d.scenario ? "#8fa3b8" : "#5c6f82";
  return (
    <group position={[d.x, d.height / 2, -d.s]}>
      <mesh>
        <boxGeometry args={[d.width, d.height, d.length]} />
        <meshStandardMaterial color={color} transparent opacity={highlight ? 0.9 : 0.55} />
      </mesh>
    </group>
  );
}

function MovingTraffic() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    const live = getLive();
    if (!live || !ref.current) return;
    const cars = trafficAt(live.t, live.s, 140);
    cars.forEach((c, i) => ref.current!.setMatrixAt(i, m.makeTranslation(c.x, 0.75, -c.s)));
    ref.current.count = cars.length;
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 20]} frustumCulled={false}>
      <boxGeometry args={[1.9, 1.5, 4.6]} />
      <meshStandardMaterial color="#5c6f82" transparent opacity={0.55} />
    </instancedMesh>
  );
}
