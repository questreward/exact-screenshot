import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor, useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { BUILDINGS, LIMIT, ROAD_HALF, WALK, nearestDoor, walkable, type Door } from "@/game/street3d";
import type { DayPhase } from "@/game/world";

export type StreetInput = { x: number; y: number; yaw: number };

const SPEED = 4.2;
const CAM_DIST = 11;
const CAM_HEIGHT = 9.5;

const SKY: Record<DayPhase, { sky: string; sun: number; amb: number; lamps: boolean }> = {
  matin: { sky: "#f4c9a0", sun: 1.6, amb: 0.7, lamps: false },
  journee: { sky: "#9cc8e8", sun: 2.2, amb: 0.9, lamps: false },
  soiree: { sky: "#e08a6a", sun: 0.9, amb: 0.5, lamps: true },
  nuit: { sky: "#1c2433", sun: 0.25, amb: 0.35, lamps: true },
};

function canvasTexture(draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: [number, number]) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!; draw(g, 256);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function noise(g: CanvasRenderingContext2D, s: number, base: string, spread: number) {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2500; i++) { const v = Math.random() * spread; g.fillStyle = `rgba(${v > spread / 2 ? 255 : 0},${v > spread / 2 ? 255 : 0},${v > spread / 2 ? 255 : 0},0.05)`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
}

function Ground() {
  const [asphaltX, asphaltZ, walk, grass] = useMemo(() => {
    const road = (vertical: boolean) => canvasTexture((g, s) => { noise(g, s, "#3a3d42", 10); g.fillStyle = "#e9e4d6"; if (vertical) g.fillRect(s / 2 - 3, 20, 6, s / 2 - 40); else g.fillRect(20, s / 2 - 3, s / 2 - 40, 6); }, vertical ? [1, 15] : [15, 1]);
    return [road(false), road(true),
      canvasTexture((g, s) => { noise(g, s, "#b9b4a8", 10); g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 2; for (let i = 0; i <= s; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); } }, [30, 30]),
      canvasTexture((g, s) => noise(g, s, "#5d7a4c", 10), [20, 20])];
  }, []);
  const W = LIMIT * 2 + 4;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial map={grass} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow><planeGeometry args={[W, WALK * 2 + 14]} /><meshStandardMaterial map={walk} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow><planeGeometry args={[WALK * 2, W]} /><meshStandardMaterial map={walk} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} receiveShadow><planeGeometry args={[W, ROAD_HALF * 2]} /><meshStandardMaterial map={asphaltX} roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} receiveShadow><planeGeometry args={[ROAD_HALF * 2, W]} /><meshStandardMaterial map={asphaltZ} roughness={0.9} /></mesh>
    </group>
  );
}

export function Model({ url, ...props }: { url: string } & ThreeElements["group"]) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => { const c = scene.clone(true); c.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return c; }, [scene]);
  return <primitive object={obj} {...props} />;
}

function Lamp({ x, z, on, light = true }: { x: number; z: number; on: boolean; light?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={1.8} castShadow><cylinderGeometry args={[0.06, 0.08, 3.6, 8]} /><meshStandardMaterial color="#2b2f36" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position-y={3.65}><sphereGeometry args={[0.22, 12, 12]} /><meshStandardMaterial color="#fff3c4" emissive="#ffcf70" emissiveIntensity={on ? 3 : 0.1} /></mesh>
      {on && light && <pointLight position={[0, 3.4, 0]} intensity={6} distance={9} color="#ffd38a" />}
    </group>
  );
}

function DoorMarker({ door, active }: { door: Door; active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (ref.current) ref.current.position.y = 0.05 + Math.sin(s.clock.elapsedTime * 3) * 0.02; });
  return <mesh ref={ref} rotation-x={-Math.PI / 2} position={[door.x, 0.05, door.z]}><ringGeometry args={[0.55, 0.75, 32]} /><meshBasicMaterial color={active ? "#ff7a59" : "#ffffff"} transparent opacity={active ? 0.95 : 0.45} /></mesh>;
}

function Person({ url, start, lane, speed, dir }: { url: string; start: number; lane: number; speed: number; dir: 1 | -1 }) {
  const { scene, animations } = useGLTF(url);
  const obj = useMemo(() => { const c = cloneSkinned(scene); c.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; }); return c; }, [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  useEffect(() => { actions["walk"]?.reset().play(); }, [actions]);
  const pos = useRef(start);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    pos.current += dir * speed * dt;
    if (pos.current > LIMIT) pos.current = -LIMIT; if (pos.current < -LIMIT) pos.current = LIMIT;
    group.current?.position.set(pos.current, 0, lane);
    if (group.current) group.current.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  });
  return <group ref={group}><primitive object={obj} scale={1.15} /></group>;
}

function Car({ url, lane, axis, speed, start, playerRef, night }: { url: string; lane: number; axis: "x" | "z"; speed: number; start: number; playerRef: React.RefObject<THREE.Group | null>; night: boolean }) {
  const g = useRef<THREE.Group>(null);
  const pos = useRef(start);
  const dir = speed > 0 ? 1 : -1;
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const p = playerRef.current?.position;
    // Cars stop for a player standing in front of them.
    let blocked = false;
    if (p) {
      const along = axis === "x" ? p.x - pos.current : p.z - pos.current;
      const across = axis === "x" ? Math.abs(p.z - lane) : Math.abs(p.x - lane);
      blocked = across < 1.6 && along * dir > 0 && along * dir < 4.5;
    }
    if (!blocked) pos.current += speed * dt;
    const L = LIMIT + 6; if (pos.current > L) pos.current = -L; if (pos.current < -L) pos.current = L;
    if (axis === "x") { g.current?.position.set(pos.current, 0, lane); if (g.current) g.current.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { g.current?.position.set(lane, 0, pos.current); if (g.current) g.current.rotation.y = dir > 0 ? 0 : Math.PI; }
  });
  return <group ref={g}><Model url={url} />{night && <pointLight position={[0, 0.6, 1.8]} intensity={4} distance={7} color="#fff1c8" />}</group>;
}

export function Player({ url, input, playerRef, onDoor, canWalk = walkable, findDoor = nearestDoor, start = [-13, 0, 4], camDist = CAM_DIST, camHeight = CAM_HEIGHT, camWalk }: { camWalk?: (x: number, z: number) => boolean; url: string; input: React.RefObject<StreetInput>; playerRef: React.RefObject<THREE.Group | null>; onDoor: (d: Door | null) => void; canWalk?: (x: number, z: number) => boolean; findDoor?: (x: number, z: number) => Door | null; start?: [number, number, number]; camDist?: number; camHeight?: number }) {
  const { scene, animations } = useGLTF(url);
  const obj = useMemo(() => { const c = cloneSkinned(scene); c.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; }); return c; }, [scene]);
  const { actions } = useAnimations(animations, playerRef as React.RefObject<THREE.Group>);
  const moving = useRef(false);
  const lastDoor = useRef<string | null>(null);
  const camera = useThree((s) => s.camera);
  const camPos = useMemo(() => new THREE.Vector3(0, 30, 30), []);
  useEffect(() => { actions["idle"]?.play(); }, [actions]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const p = playerRef.current; const inp = input.current; if (!p || !inp) return;
    // Camera-relative movement: up on the stick goes where the camera looks.
    const fx = -Math.sin(inp.yaw), fz = -Math.cos(inp.yaw);
    const rx = Math.cos(inp.yaw), rz = -Math.sin(inp.yaw);
    let mx = rx * inp.x + fx * inp.y, mz = rz * inp.x + fz * inp.y;
    const len = Math.hypot(mx, mz);
    const isMoving = len > 0.08;
    if (isMoving) {
      mx /= Math.max(1, len); mz /= Math.max(1, len);
      const [nx, nz] = slideWith(canWalk, p.position.x, p.position.z, p.position.x + mx * SPEED * dt, p.position.z + mz * SPEED * dt);
      p.position.set(nx, 0, nz);
      const target = Math.atan2(mx, mz);
      let d = target - p.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      p.rotation.y += d * (1 - Math.exp(-12 * dt));
    }
    if (isMoving !== moving.current) {
      moving.current = isMoving;
      const from = actions[isMoving ? "idle" : "walk"], to = actions[isMoving ? "walk" : "idle"];
      from?.fadeOut(0.2); to?.reset().fadeIn(0.2).play();
    }
    const door = findDoor(p.position.x, p.position.z);
    if ((door?.id ?? null) !== lastDoor.current) { lastDoor.current = door?.id ?? null; onDoor(door); }
    // The camera stays in the street: it moves closer instead of going through buildings.
    let dist = camDist;
    while (dist > 2.5 && !(camWalk ?? canWalk)(p.position.x + Math.sin(inp.yaw) * dist, p.position.z + Math.cos(inp.yaw) * dist)) dist -= 0.5;
    const desired = new THREE.Vector3(p.position.x + Math.sin(inp.yaw) * dist, camHeight * (0.55 + 0.45 * dist / camDist), p.position.z + Math.cos(inp.yaw) * dist);
    camPos.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.position.copy(camPos);
    camera.lookAt(p.position.x, 1.4, p.position.z);
  });
  return <group ref={playerRef} position={start}><primitive object={obj} scale={1.2} /></group>;
}

/** Appareils modestes : peu de cœurs/mémoire ou petit écran tactile. */
function isLowEnd() {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number };
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 3;
}

function slideWith(ok: (x: number, z: number) => boolean, x: number, z: number, nx: number, nz: number): [number, number] {
  if (ok(nx, nz)) return [nx, nz];
  if (ok(nx, z)) return [nx, z];
  if (ok(x, nz)) return [x, nz];
  return [x, z];
}

export { isLowEnd };
export type StreetQuality = "auto" | "low" | "high";

const CARS = ["/models/car-kit/sedan.glb", "/models/car-kit/taxi.glb", "/models/car-kit/van.glb", "/models/car-kit/suv.glb", "/models/car-kit/police.glb", "/models/car-kit/hatchback-sports.glb"];
const PEOPLE = ["/models/characters/character-male-b.glb", "/models/characters/character-female-c.glb", "/models/characters/character-male-d.glb", "/models/characters/character-female-a.glb", "/models/characters/character-male-c.glb", "/models/characters/character-female-d.glb", "/models/characters/character-male-a.glb"];

export function Street3D({ phase, characterUrl, input, onDoor, crowd, quality = "auto" }: { quality?: StreetQuality; phase: DayPhase; characterUrl: string; input: React.RefObject<StreetInput>; onDoor: (d: Door | null) => void; crowd: { people: number; cars: number } }) {
  const look = SKY[phase];
  const playerRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState<string | null>(null);
  const lampsX = [-26, -18, -6, 6, 18, 26];
  const [autoLow, setLow] = useState(() => isLowEnd());
  const low = quality === "auto" ? autoLow : quality === "low";
  const [dpr, setDpr] = useState(low ? 1 : 1.5);
  useEffect(() => { if (quality !== "auto") setDpr(quality === "low" ? 1 : 1.5); }, [quality]);
  const people = low ? Math.min(crowd.people, 3) : crowd.people;
  const cars = low ? Math.min(crowd.cars + 2, 3) : crowd.cars + 2;
  return (
    <Canvas shadows={!low} dpr={dpr} camera={{ fov: 62, position: [-13, 9, 16] }} gl={{ antialias: !low, powerPreference: "high-performance" }}>
      {quality === "auto" && <PerformanceMonitor onDecline={() => { setDpr(1); setLow(true); }} onIncline={() => setDpr((d) => Math.min(d + 0.25, low ? 1 : 1.5))} />}
      <color attach="background" args={[look.sky]} />
      <fog attach="fog" args={[look.sky, 25, 70]} />
      <hemisphereLight args={[look.sky, "#4b4237", look.amb]} />
      <directionalLight position={[18, 25, 12]} intensity={look.sun} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} />
      {!low && <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.5} position={[0, 6, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={0.8} color={look.sky} position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>}
      <Ground />
      <Suspense fallback={null}>
        {BUILDINGS.map((b, i) => <Model key={i} url={b.model} position={[b.x, 0, b.z]} rotation-y={b.rot} scale={b.scale} />)}
        {[-28, 28].map((z) => [-2.5, 2.5].map((x) => <Model key={`t${z}${x}`} url="/models/city-kit-suburban/tree-large.glb" position={[x * 2, 0, z]} scale={4} />))}
        {lampsX.flatMap((x) => [<Lamp key={`l${x}n`} x={x} z={-6.2} on={look.lamps} light={!low && (x === -18 || x === 18)} />, <Lamp key={`l${x}s`} x={x} z={6.2} on={look.lamps} light={!low && (x === -6 || x === 6)} />])}
        {CARS.slice(0, cars).map((url, i) => {
          const axis = i % 3 === 2 ? "z" : "x"; const fwd = i % 2 === 0;
          return <Car key={i} url={url} axis={axis} lane={fwd ? 2 : -2} speed={(fwd ? 1 : -1) * (6 + i)} start={-25 + i * 11} playerRef={playerRef} night={look.lamps && !low} />;
        })}
        {PEOPLE.slice(0, people).map((url, i) => <Person key={i} url={url} start={-25 + i * 8} lane={i % 2 ? 5.6 : -5.6} speed={1.1 + (i % 3) * 0.2} dir={i % 2 ? 1 : -1} />)}
        <Player url={characterUrl} input={input} playerRef={playerRef} onDoor={(d) => { setActive(d?.id ?? null); onDoor(d); }} />
      </Suspense>
      {BUILDINGS.flatMap((b) => (b.door ? [<DoorMarker key={b.door.id} door={b.door} active={active === b.door.id} />] : []))}
    </Canvas>
  );
}
