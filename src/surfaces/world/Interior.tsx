// The car's interior, seen from the middle of the back seat. Modelled loosely on the
// Waymo Jaguar I-Pace: empty driver's seat with a steering wheel, a centre screen
// on the dashboard showing the selected cabin design, vents, console, mirror.
//
// Car-local coordinates: origin at the car's centre on the road, -z is forward,
// +x is right, metres.

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { getLive } from "../../engine";
import { pinElement } from "./pinToQuad";

/** Rear-seat passenger's eyes: middle seat, sitting slightly forward. */
const EYE = new THREE.Vector3(0, 1.2, 0.3);
/** Vertical field of view, and the most we show horizontally on wide screens. */
export const BASE_FOV = 58;
const MAX_HFOV = 90;
/** Where the passenger looks (slightly down, so the dashboard is in view). */
const LOOK = new THREE.Vector3(0, 0.75, -6);

/** Physical size of the centre screen; the 1280×800 cabin design is scaled onto it. */
export const DASH_SCREEN = { width: 0.3, height: 0.1875, designWidth: 1280, designHeight: 800 };

const C = {
  dashTop: "#3b3e43",
  dashFace: "#2e3136",
  dashLower: "#26292d",
  trimLight: "#6c6f74",
  chrome: "#b9bec5",
  pianoBlack: "#101114",
  leather: "#252e3d",
  headliner: "#3d4045",
  pillar: "#33363b",
  label: "#a9a69d",
};

function Mat({ color, metal = false, gloss = false }: { color: string; metal?: boolean; gloss?: boolean }) {
  return <meshStandardMaterial color={color} metalness={metal ? 0.8 : 0.05} roughness={metal ? 0.3 : gloss ? 0.35 : 0.75} />;
}

function Box({ args, position, rotation, color, radius = 0, metal, gloss }: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  radius?: number;
  metal?: boolean;
  gloss?: boolean;
}) {
  if (radius > 0)
    return (
      <RoundedBox args={args} radius={radius} smoothness={3} position={position} rotation={rotation}>
        <Mat color={color} metal={metal} gloss={gloss} />
      </RoundedBox>
    );
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <Mat color={color} metal={metal} gloss={gloss} />
    </mesh>
  );
}

/** A bar between two points (pillars, posts). */
function Beam({ from, to, size, color }: { from: [number, number, number]; to: [number, number, number]; size: [number, number]; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { position: a.add(b).multiplyScalar(0.5), quaternion, length };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <boxGeometry args={[size[0], length, size[1]]} />
      <Mat color={color} />
    </mesh>
  );
}

/**
 * `screenEl` is the DOM element showing the cabin design; it's kept pinned to the
 * centre screen's position in 3D every frame.
 */
export function Interior({ screenEl }: { screenEl: RefObject<HTMLDivElement | null> }) {
  const cabin = useRef<THREE.Group>(null);
  const screenAnchor = useRef<THREE.Group>(null);
  const motion = useRef({ v: 0, dive: 0, t: 0 });
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }, delta) => {
    const live = getLive();
    if (!live) return;
    const m = motion.current;
    m.t += delta;
    // Nose dips a little under braking; gentle road shake while moving.
    const accel = delta > 0 ? (live.v - m.v) / delta : 0;
    m.v = live.v;
    m.dive += (THREE.MathUtils.clamp(-accel * 0.08, -0.25, 0.25) - m.dive) * Math.min(1, delta * 2.5);
    const shake = Math.min(1, live.v / 11) * (0.003 * Math.sin(m.t * 7.3) + 0.0015 * Math.sin(m.t * 13.7));

    // Wide windows: keep the horizontal view to ~90° (like a phone camera) instead of
    // showing more and more of the front headrests.
    const cam = camera as THREE.PerspectiveCamera;
    const fov = Math.min(BASE_FOV, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(MAX_HFOV / 2)) / cam.aspect)));
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    cabin.current!.position.set(live.x, 0, -live.s);
    camera.position.set(live.x + EYE.x, EYE.y + shake, -live.s + EYE.z);
    camera.lookAt(look.set(live.x + LOOK.x, LOOK.y - m.dive, -live.s + LOOK.z));

    if (screenEl.current && screenAnchor.current) {
      cabin.current!.updateMatrixWorld();
      camera.updateMatrixWorld();
      pinElement(screenEl.current, screenAnchor.current, camera, size, DASH_SCREEN);
    }
  });

  return (
    <group ref={cabin}>
      <pointLight position={[0, 1.15, -0.2]} intensity={0.7} distance={3} decay={2} />
      <Dashboard screenAnchor={screenAnchor} />
      <SteeringWheel />
      <CentreConsole />
      <FrontSeat x={-0.42} />
      <FrontSeat x={0.42} />
      <Roof />
      <Sides />
    </group>
  );
}

function Dashboard({ screenAnchor }: { screenAnchor: RefObject<THREE.Group | null> }) {
  return (
    <group>
      {/* top surface running up to the windshield */}
      <Box args={[1.58, 0.07, 0.56]} position={[0, 0.975, -1.25]} rotation={[0.06, 0, 0]} color={C.dashTop} radius={0.03} />
      {/* face towards the cabin */}
      <Box args={[1.56, 0.4, 0.1]} position={[0, 0.78, -1.0]} color={C.dashFace} radius={0.03} />
      <Box args={[1.56, 0.22, 0.3]} position={[0, 0.5, -1.08]} color={C.dashLower} />
      {/* passenger-side light trim + chrome line */}
      <Box args={[0.6, 0.11, 0.025]} position={[0.46, 0.8, -0.948]} color={C.trimLight} radius={0.01} />
      <Box args={[0.62, 0.012, 0.012]} position={[0.46, 0.735, -0.944]} color={C.chrome} metal />
      <Vent x={0.66} y={0.88} width={0.1} />
      <Vent x={-0.7} y={0.88} width={0.08} />
      {/* centre stack: vents, screen, chrome line, buttons */}
      <Vent x={-0.085} y={0.955} width={0.15} />
      <Vent x={0.085} y={0.955} width={0.15} />
      <DashScreen anchor={screenAnchor} />
      <Box args={[0.42, 0.012, 0.012]} position={[0, 0.7, -0.944]} color={C.chrome} metal />
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.668, -0.944]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.012, 20]} />
          <Mat color={C.chrome} metal />
        </mesh>
      ))}
      <Box args={[0.04, 0.025, 0.012]} position={[0, 0.668, -0.944]} color="#5a1a1a" radius={0.004} />
      <InstrumentCluster />
    </group>
  );
}

function Vent({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <group position={[x, y, -0.948]}>
      <Box args={[width + 0.016, 0.052, 0.012]} position={[0, 0, 0]} color={C.chrome} metal radius={0.005} />
      <Box args={[width, 0.038, 0.014]} position={[0, 0, 0.002]} color="#121316" />
      {[-0.008, 0.008].map((dy) => (
        <Box key={dy} args={[width - 0.01, 0.004, 0.004]} position={[0, dy, 0.01]} color="#3a3d42" />
      ))}
    </group>
  );
}

/** The centre screen's glass and bezel. The live design is pinned onto `anchor`. */
function DashScreen({ anchor }: { anchor: RefObject<THREE.Group | null> }) {
  const { width, height } = DASH_SCREEN;
  return (
    <group position={[0, 0.82, -0.938]} rotation={[-0.12, 0, 0]}>
      <Box args={[width + 0.03, height + 0.026, 0.02]} position={[0, 0, -0.011]} color={C.pianoBlack} radius={0.008} gloss />
      <group ref={anchor} position={[0, 0, 0.001]} />
    </group>
  );
}

function InstrumentCluster() {
  return (
    <group position={[-0.38, 0.95, -1.0]}>
      <Box args={[0.38, 0.06, 0.16]} position={[0, 0.07, -0.05]} color={C.dashTop} radius={0.02} />
      <mesh position={[0, 0, 0.012]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[0.32, 0.1]} />
        <meshBasicMaterial color="#0b1520" />
      </mesh>
      {[-0.06, 0.06].map((x) => (
        <mesh key={x} position={[x, 0, 0.014]} rotation={[-0.15, 0, 0]}>
          <ringGeometry args={[0.028, 0.034, 32]} />
          <meshBasicMaterial color={x < 0 ? "#2bd4c4" : "#4a7ba6"} />
        </mesh>
      ))}
    </group>
  );
}

/** Nobody's holding it. */
function SteeringWheel() {
  return (
    <group position={[-0.38, 0.9, -0.86]} rotation={[-0.38, 0, 0]}>
      <mesh>
        <torusGeometry args={[0.185, 0.022, 14, 48]} />
        <Mat color="#141518" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.05, 28]} />
        <Mat color="#1c1d21" />
      </mesh>
      <mesh position={[0, 0, 0.026]}>
        <ringGeometry args={[0.04, 0.046, 28]} />
        <Mat color={C.chrome} metal />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box args={[0.12, 0.034, 0.022]} position={[side * 0.115, 0, 0]} color="#1c1d21" />
          <Box args={[0.1, 0.006, 0.006]} position={[side * 0.11, 0.019, 0.01]} color={C.chrome} metal />
        </group>
      ))}
      <Box args={[0.034, 0.12, 0.022]} position={[0, -0.115, 0]} color="#1c1d21" />
      <mesh position={[0, 0, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.2, 16]} />
        <Mat color="#1a1b1e" />
      </mesh>
    </group>
  );
}

function CentreConsole() {
  return (
    <group>
      {/* sloping piano-black panel with the climate dials */}
      <group position={[0, 0.53, -0.9]} rotation={[-0.75, 0, 0]}>
        <Box args={[0.28, 0.26, 0.04]} position={[0, 0, 0]} color={C.pianoBlack} radius={0.012} gloss />
        {[-0.085, 0.085].map((x) => (
          <group key={x} position={[x, 0.03, 0.025]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.034, 0.034, 0.02, 28]} />
              <Mat color={C.chrome} metal />
            </mesh>
            <mesh position={[0, 0, 0.011]}>
              <circleGeometry args={[0.026, 28]} />
              <meshBasicMaterial color="#10202a" />
            </mesh>
          </group>
        ))}
        <Box args={[0.09, 0.03, 0.01]} position={[0, 0.03, 0.022]} color="#1d2a33" />
        {[-0.03, 0.03].map((x) => (
          <Box key={x} args={[0.05, 0.016, 0.01]} position={[x, -0.06, 0.022]} color="#2a2d31" radius={0.003} />
        ))}
      </group>
      {/* console body and armrest between the front seats */}
      <Box args={[0.26, 0.16, 0.7]} position={[0, 0.4, -0.5]} color={C.dashLower} radius={0.03} />
      <Box args={[0.06, 0.03, 0.22]} position={[0.08, 0.49, -0.62]} color={C.pianoBlack} radius={0.008} gloss />
      <Box args={[0.24, 0.08, 0.32]} position={[0, 0.56, -0.12]} color={C.leather} radius={0.03} />
    </group>
  );
}

function FrontSeat({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <Box args={[0.5, 0.12, 0.5]} position={[0, 0.45, -0.5]} color={C.leather} radius={0.04} />
      <group position={[0, 0.74, -0.28]} rotation={[0.2, 0, 0]}>
        <Box args={[0.42, 0.58, 0.12]} position={[0, 0, 0]} color={C.leather} radius={0.05} />
        {[-1, 1].map((side) => (
          <Box key={side} args={[0.06, 0.52, 0.15]} position={[side * 0.215, -0.02, -0.01]} color="#202837" radius={0.025} />
        ))}
        {[-0.065, 0.065].map((px) => (
          <mesh key={px} position={[px, 0.33, 0.01]}>
            <cylinderGeometry args={[0.007, 0.007, 0.1, 8]} />
            <Mat color={C.chrome} metal />
          </mesh>
        ))}
        <Box args={[0.25, 0.17, 0.09]} position={[0, 0.43, 0.02]} color={C.leather} radius={0.04} />
      </group>
    </group>
  );
}

function Roof() {
  return (
    <group>
      <Box args={[1.56, 0.03, 1.6]} position={[0, 1.56, -0.02]} color={C.headliner} />
      {/* windshield header + A-pillars */}
      <Box args={[1.44, 0.07, 0.16]} position={[0, 1.51, -0.79]} color={C.pillar} radius={0.02} />
      <Beam from={[-0.76, 0.98, -1.47]} to={[-0.66, 1.52, -0.8]} size={[0.1, 0.08]} color={C.pillar} />
      <Beam from={[0.76, 0.98, -1.47]} to={[0.66, 1.52, -0.8]} size={[0.1, 0.08]} color={C.pillar} />
      {/* sun visors with their warning labels */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.38, 1.515, -0.7]} rotation={[-0.3, 0, 0]}>
          <Box args={[0.52, 0.02, 0.16]} position={[0, 0, 0]} color="#4a4d52" radius={0.008} />
          <mesh position={[side * 0.08, -0.011, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.18, 0.06]} />
            <meshStandardMaterial color={C.label} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* overhead console + rear-view mirror */}
      <Box args={[0.28, 0.03, 0.18]} position={[0, 1.535, -0.68]} color="#2c2f33" radius={0.012} />
      <Beam from={[0, 1.5, -0.74]} to={[0, 1.43, -0.79]} size={[0.025, 0.025]} color="#1b1c1f" />
      <Box args={[0.27, 0.075, 0.035]} position={[0, 1.4, -0.8]} color="#18191c" radius={0.015} />
      <mesh position={[0, 1.4, -0.781]}>
        <planeGeometry args={[0.245, 0.055]} />
        <meshStandardMaterial color="#8c97a3" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  );
}

function Sides() {
  const parts: ReactNode[] = [];
  for (const side of [-1, 1]) {
    parts.push(
      <Box key={`door${side}`} args={[0.06, 0.5, 1.75]} position={[side * 0.8, 0.7, -0.35]} color="#24272b" />,
      <Box key={`sill${side}`} args={[0.1, 0.04, 1.75]} position={[side * 0.77, 0.97, -0.35]} color={C.leather} radius={0.015} />,
      <Beam key={`b${side}`} from={[side * 0.78, 0.97, 0.12]} to={[side * 0.7, 1.55, 0.12]} size={[0.07, 0.14]} color={C.pillar} />,
    );
  }
  return <group>{parts}</group>;
}
