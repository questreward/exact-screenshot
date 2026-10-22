import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Model, Player, isLowEnd, type StreetInput, type StreetQuality } from "./Street3D";
import { exitSpot, nearestSpot, roomWalkable, type Fixture, type Interior, type Spot } from "@/game/interior3d";

const PRODUCT_COLORS = ["#e8664a", "#f2c14e", "#4a90c2", "#6bab5a", "#d9d2c3", "#9b5fb0"];

function Shelf({ f }: { f: Fixture }) {
  const w = f.w ?? 4;
  // One instanced mesh for all products keeps draw calls low on phones.
  const items = useMemo(() => {
    const out: { p: [number, number, number]; c: string }[] = [];
    for (let level = 0; level < 3; level++) for (let side = -1; side <= 1; side += 2) for (let i = 0; i < Math.floor(w / 0.45); i++)
      out.push({ p: [-w / 2 + 0.25 + i * 0.45, 0.55 + level * 0.6, side * 0.32], c: PRODUCT_COLORS[(i * 7 + level * 3 + side + 6) % PRODUCT_COLORS.length] ?? "#e8664a" });
    return out;
  }, [w]);
  // Colours are written when the mesh attaches, before its first draw.
  const fill = (m: THREE.InstancedMesh | null) => {
    if (!m || m.userData["filled"]) return; m.userData["filled"] = true;
    const o = new THREE.Object3D(); const col = new THREE.Color();
    items.forEach((it, i) => { o.position.set(...it.p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(it.c)); });
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <group position={[f.x, 0, f.z]} rotation-y={f.rot ?? 0}>
      <mesh position-y={1} castShadow><boxGeometry args={[w, 2, 0.15]} /><meshStandardMaterial color="#c9ccd1" /></mesh>
      {[0.3, 0.9, 1.5].map((y) => <mesh key={y} position-y={y}><boxGeometry args={[w, 0.05, 1]} /><meshStandardMaterial color="#e6e8eb" /></mesh>)}
      <instancedMesh ref={fill} args={[undefined, undefined, items.length]} castShadow><boxGeometry args={[0.32, 0.4, 0.28]} /><meshStandardMaterial /></instancedMesh>
    </group>
  );
}

function Rack({ f }: { f: Fixture }) {
  const w = f.w ?? 2.5;
  return (
    <group position={[f.x, 0, f.z]} rotation-y={f.rot ?? 0}>
      <mesh position-y={1.6}><cylinderGeometry args={[0.03, 0.03, w, 8]} /><meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} /></mesh>
      {[-w / 2, w / 2].map((x) => <mesh key={x} position={[x, 0.8, 0]} rotation-z={0}><cylinderGeometry args={[0.03, 0.03, 1.6, 8]} /><meshStandardMaterial color="#888" metalness={0.8} /></mesh>)}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.3 + i * ((w - 0.6) / 5), 1.15, 0]} castShadow><boxGeometry args={[0.08, 0.85, 0.55]} /><meshStandardMaterial color={i % 2 ? (f.color ?? "#c75b4a") : "#ece6da"} /></mesh>
      ))}
    </group>
  );
}

function Box({ f, size, color, y }: { f: Fixture; size: [number, number, number]; color: string; y?: number }) {
  return <mesh position={[f.x, y ?? size[1] / 2, f.z]} rotation-y={f.rot ?? 0} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} /></mesh>;
}

function Npc({ f }: { f: Fixture }) {
  const { scene, animations } = useGLTF(f.model!);
  const obj = useMemo(() => cloneSkinned(scene), [scene]);
  const g = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, g);
  useMemo(() => setTimeout(() => actions["idle"]?.play()), [actions]);
  return <group ref={g} position={[f.x, 0, f.z]} rotation-y={f.rot ?? 0}><primitive object={obj} scale={1.15} /></group>;
}

/** A saved piece of furniture: footprint and height from its recorded size and type. */
function HomeItem({ f }: { f: Fixture }) {
  const w = f.w ?? 1, d = f.d ?? 1, h = f.h ?? 0.8, c = f.color ?? "#b08a64";
  if (f.visual === "tv") return <group position={[f.x, 0, f.z]}><mesh position-y={0.25}><boxGeometry args={[w, 0.5, d]} /><meshStandardMaterial color="#6b4f3a" /></mesh><mesh position-y={0.85}><boxGeometry args={[w * 0.9, 0.6, 0.06]} /><meshStandardMaterial color={c} emissive="#1d3557" emissiveIntensity={0.4} /></mesh></group>;
  if (f.visual === "bed" || f.visual === "mattress") return <group position={[f.x, 0, f.z]}><mesh position-y={h / 2} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#6b4f3a" /></mesh><mesh position-y={h + 0.08}><boxGeometry args={[w * 0.95, 0.16, d * 0.95]} /><meshStandardMaterial color={c} /></mesh></group>;
  if (f.visual === "sofa") return <group position={[f.x, 0, f.z]}><mesh position-y={0.25} castShadow><boxGeometry args={[w, 0.5, d]} /><meshStandardMaterial color={c} /></mesh><mesh position={[0, 0.65, -d / 2 + 0.12]}><boxGeometry args={[w, 0.6, 0.24]} /><meshStandardMaterial color={c} /></mesh></group>;
  return <mesh position={[f.x, h / 2, f.z]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={c} /></mesh>;
}

function FixtureView({ f, accent }: { f: Fixture; accent: string }) {
  switch (f.kind) {
    case "shelf": return <Shelf f={f} />;
    case "rack": return <Rack f={f} />;
    case "counter": return <Box f={f} size={[f.w ?? 2, 1.1, 0.8]} color={f.color ?? accent} />;
    case "desk": return <Box f={f} size={[1.8, 0.8, 0.9]} color="#7a5c3e" />;
    case "table": return <Box f={f} size={[1.4, 0.5, 0.8]} color="#8a6a4a" />;
    case "sofa": return <group><Box f={f} size={[2.6, 0.5, 1.1]} color={f.color ?? accent} /><mesh position={[f.x, 0.85, f.z - 0.45]}><boxGeometry args={[2.6, 0.7, 0.25]} /><meshStandardMaterial color={f.color ?? accent} /></mesh></group>;
    case "bed": return <group><Box f={f} size={[2.2, 0.55, 3]} color="#6b4f3a" /><Box f={f} size={[2.1, 0.2, 2.9]} color={f.color ?? "#ddd"} y={0.65} /></group>;
    case "plant": return <group position={[f.x, 0, f.z]}><mesh position-y={0.3}><cylinderGeometry args={[0.3, 0.25, 0.6, 12]} /><meshStandardMaterial color="#b0603a" /></mesh><mesh position-y={1}><sphereGeometry args={[0.55, 12, 10]} /><meshStandardMaterial color="#4f7d3c" /></mesh></group>;
    case "car": return <group position={[f.x, 0, f.z]} rotation-y={f.rot ?? 0}><mesh position-y={0.04} rotation-x={-Math.PI / 2}><circleGeometry args={[3, 40]} /><meshStandardMaterial color="#d0d4da" /></mesh><Model url={f.model!} scale={1.6} /></group>;
    case "clerk": case "shopper": return <Npc f={f} />;
    case "wall": return <mesh position={[f.x, (f.h ?? 3) / 2, f.z]} castShadow receiveShadow><boxGeometry args={[f.w ?? 1, f.h ?? 3, f.d ?? 1]} /><meshStandardMaterial color="#ece4d6" /></mesh>;
    case "item": return <HomeItem f={f} />;
  }
}

function Spots({ spots, active }: { spots: Spot[]; active: string | null }) {
  const t = useRef(0);
  useFrame((_, d) => { t.current += d; });
  return <>{spots.map((s) => (
    <mesh key={s.id} rotation-x={-Math.PI / 2} position={[s.x, 0.03, s.z]}><ringGeometry args={[0.45, 0.62, 32]} /><meshBasicMaterial color={active === s.id ? "#ff7a59" : "#ffffff"} transparent opacity={active === s.id ? 0.95 : 0.5} /></mesh>
  ))}</>;
}

function Room({ r }: { r: Interior }) {
  const H = 4;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[r.w * 2, r.d * 2]} /><meshStandardMaterial color={r.floor} roughness={0.85} /></mesh>
      <mesh position={[0, H / 2, -r.d]}><planeGeometry args={[r.w * 2, H]} /><meshStandardMaterial color={r.wall} /></mesh>
      <mesh position={[-r.w, H / 2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[r.d * 2, H]} /><meshStandardMaterial color={r.wall} /></mesh>
      <mesh position={[r.w, H / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[r.d * 2, H]} /><meshStandardMaterial color={r.wall} /></mesh>
      <mesh position={[0, H - 0.4, -r.d + 0.02]}><planeGeometry args={[r.w * 1.2, 0.5]} /><meshStandardMaterial color={r.accent} /></mesh>
      <mesh position={[0, 0.02, r.d - 0.5]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.4, 1]} /><meshStandardMaterial color="#5a4a3a" /></mesh>
    </group>
  );
}

export function Interior3D({ room, characterUrl, input, onSpot, quality = "auto" }: { room: Interior; characterUrl: string; input: React.RefObject<StreetInput>; onSpot: (s: Spot | null) => void; quality?: StreetQuality }) {
  const playerRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState<string | null>(null);
  const low = quality === "auto" ? isLowEnd() : quality === "low";
  const spots = [...room.spots, exitSpot(room)];
  return (
    <Canvas shadows={!low} dpr={low ? 1 : 1.5} camera={{ fov: 60, position: [0, 8, room.d + 6] }} gl={{ antialias: !low }}>
      <color attach="background" args={["#20242b"]} />
      <hemisphereLight args={["#ffffff", "#8a7a6a", 1.1]} />
      <directionalLight position={[4, 10, 6]} intensity={1.4} castShadow={!low} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Room r={room} />
      <Suspense fallback={null}>
        {room.fixtures.map((f, i) => <FixtureView key={i} f={f} accent={room.accent} />)}
        <Player url={characterUrl} input={input} playerRef={playerRef} start={[0, 0, room.d - 2]} camDist={9} camHeight={7.5} camWalk={() => true}
          canWalk={(x, z) => roomWalkable(room, x, z)} findDoor={(x, z) => nearestSpot(room, x, z)}
          onDoor={(d) => { setActive(d?.id ?? null); onSpot(d as Spot | null); }} />
      </Suspense>
      <Spots spots={spots} active={active} />
    </Canvas>
  );
}
