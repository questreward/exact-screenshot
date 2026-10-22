import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Street3D, type StreetInput } from "@/components/game/street3d/Street3D";
import { streetParking } from "@/game/street-parking";
export const Route = createFileRoute("/parking-check")({ ssr: false, component: Check });
function Check() {
  const input = useRef<StreetInput>({ x: 0, y: 0, yaw: 0 });
  const street = typeof window !== "undefined" && window.location.search.includes("fire") ? 1 : 0;
  return <div className="fixed inset-0"><Street3D phase="journee" characterUrl="/models/characters/character-male-a.glb" input={input} onDoor={() => {}} quality="low" street={street} crowd={{ people: 0, cars: 0 }} start={street ? [-13, 0, -3] : [-23, 0, -3]} parked={streetParking(street, [{ id: "test", name: "Clio", kind: "vehicle", acquired_at: "2026" }], true)} /></div>;
}