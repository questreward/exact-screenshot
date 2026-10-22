import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Street3D } from "@/components/game/street3d/Street3D";
export const Route = createFileRoute("/zz-test-rue")({ ssr: false, component: T });
function T() { const input = useRef({ x: 0, y: 0, yaw: Math.PI / 2 }); const q = new URLSearchParams(location.search);
  return <div style={{ position: "fixed", inset: 0 }}><Street3D phase="journee" characterUrl="/models/characters/character-male-a.glb" input={input} onDoor={() => {}} crowd={{ people: 4, cars: 2 }} quality="high" street={Number(q.get("rue") ?? 0)} weather={(q.get("w") ?? "clair") as "pluie"} /></div>; }
