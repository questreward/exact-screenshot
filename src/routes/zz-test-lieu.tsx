import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Interior3D } from "@/components/game/street3d/Interior3D";
import { INTERIORS } from "@/game/interior3d";
export const Route = createFileRoute("/zz-test-lieu")({ ssr: false, component: T });
function T() { const input = useRef({ x: 0, y: 0, yaw: 0 }); const id = new URLSearchParams(location.search).get("id") ?? "superette";
  return <div style={{ position: "fixed", inset: 0 }}><Interior3D room={INTERIORS[id]!} characterUrl="/models/characters/character-male-a.glb" input={input} onSpot={() => {}} quality="high" /></div>; }
