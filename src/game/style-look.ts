import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cosmeticShopQuery } from "@/services/game";
import type { StyleLook } from "@/components/game/CharacterAvatar";

// Choix « porté / retiré » gardé sur l'appareil ; seuls les objets réellement possédés s'affichent.
const KEY = "civitas-style-off";
export const STYLE_SLOT: Record<string, keyof StyleLook> = {
  "cadre-or": "cadre", "cadre-tricolore": "cadre", "tenue-costume": "tenue", "tenue-sport": "tenue",
  "tenue-soiree": "tenue", "badge-pionnier": "badge", "fond-tour": "fond", "fond-mer": "fond",
};

function readWorn(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

export function useStyleLook() {
  const { data } = useQuery({ ...cosmeticShopQuery, throwOnError: false });
  const [worn, setWorn] = useState<Record<string, string>>({});
  useEffect(() => { setWorn(readWorn()); const f = () => setWorn(readWorn()); window.addEventListener("civitas-style", f); return () => window.removeEventListener("civitas-style", f); }, []);
  const look: StyleLook = {};
  const owned = data?.owned ?? new Set<string>();
  for (const id of owned) { const slot = STYLE_SLOT[id]; if (slot && !look[slot]) look[slot] = id; }
  for (const [slot, id] of Object.entries(worn)) {
    const s = slot as keyof StyleLook;
    if (id === "aucun") delete look[s]; else if (owned.has(id)) look[s] = id;
  }
  function wear(id: string, on: boolean) {
    const slot = STYLE_SLOT[id]; if (!slot) return;
    const next = { ...readWorn(), [slot]: on ? id : "aucun" };
    localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event("civitas-style"));
  }
  return { look, wear };
}
