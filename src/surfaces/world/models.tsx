// Low-poly models for the windshield view. Each model's origin is at road level,
// centred, facing forward (-z).

import type { ObjectKind } from "../../engine";

export function FireTruck() {
  const red = "#b3121b";
  const chrome = "#c9ccd1";
  const wheels: [number, number][] = [
    [-1.1, -3.4],
    [1.1, -3.4],
    [-1.1, 2.2],
    [1.1, 2.2],
    [-1.1, 3.6],
    [1.1, 3.6],
  ];
  return (
    <group>
      {/* cab */}
      <mesh position={[0, 1.55, -3.75]}>
        <boxGeometry args={[2.5, 2.4, 2.5]} />
        <meshStandardMaterial color={red} roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.1, -5.01]}>
        <boxGeometry args={[2.2, 1.0, 0.02]} />
        <meshStandardMaterial color="#1b2430" roughness={0.2} metalness={0.4} />
      </mesh>
      {/* unlit light bar: non-emergency */}
      <mesh position={[0, 2.85, -4.3]}>
        <boxGeometry args={[1.9, 0.15, 0.35]} />
        <meshStandardMaterial color="#7a1e1e" />
      </mesh>
      {/* body */}
      <mesh position={[0, 1.65, 1.2]}>
        <boxGeometry args={[2.5, 2.7, 7.4]} />
        <meshStandardMaterial color={red} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.2, 1.2]}>
        <boxGeometry args={[2.52, 0.18, 7.42]} />
        <meshStandardMaterial color="#f4f1e8" />
      </mesh>
      {/* ladder */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 3.15, 0.2]}>
          <boxGeometry args={[0.08, 0.12, 8.6]} />
          <meshStandardMaterial color={chrome} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[0, 3.15, -3.8 + i * 0.6]}>
          <boxGeometry args={[1.1, 0.05, 0.05]} />
          <meshStandardMaterial color={chrome} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* bumper */}
      <mesh position={[0, 0.45, -5.05]}>
        <boxGeometry args={[2.6, 0.3, 0.2]} />
        <meshStandardMaterial color={chrome} metalness={0.8} roughness={0.25} />
      </mesh>
      {wheels.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.5, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} />
          <meshStandardMaterial color="#151515" />
        </mesh>
      ))}
    </group>
  );
}

export function Car({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.85, 0.7, 4.5]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.18, 0.2]}>
        <boxGeometry args={[1.6, 0.5, 2.3]} />
        <meshStandardMaterial color="#1c2229" roughness={0.15} metalness={0.5} />
      </mesh>
    </group>
  );
}

export function Cone() {
  return (
    <mesh position={[0, 0.35, 0]}>
      <coneGeometry args={[0.2, 0.7, 12]} />
      <meshStandardMaterial color="#ff6a13" />
    </mesh>
  );
}

export function ObjectModel({ kind }: { kind: ObjectKind }) {
  switch (kind) {
    case "fireTruck":
      return <FireTruck />;
    case "parkedCar":
      return <Car color="#8a919c" />;
    case "cone":
      return <Cone />;
  }
}
