import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useRef } from "react";
const Street3D = lazy(() => import("@/components/game/street3d/Street3D").then((m) => ({ default: m.Street3D })));
export const Route = createFileRoute("/zz-test-rue")({ ssr: false, component: () => { const input = useRef({ x: 0, y: 0, yaw: 0 }); (globalThis as any).__inp = input; return <div style={{ position: "fixed", inset: 0 }}><ClientOnly><Suspense fallback={null}><Street3D phase={(new URLSearchParams(location.search).get("p") as any) ?? "journee"} characterUrl="/models/characters/character-male-a.glb" input={input} onDoor={(d) => { (globalThis as any).__door = d?.label; }} crowd={{ people: 6, cars: 4 }} /></Suspense></ClientOnly></div>; } });
