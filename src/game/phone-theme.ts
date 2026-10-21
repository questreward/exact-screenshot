/** Thèmes du téléphone réservés aux VIP : apparence seulement, mémorisée sur l'appareil. */
import { useEffect, useState } from "react";
import { VIP_FLAG } from "@/game/place-memory";
export const PHONE_THEMES = [
  { id: "classique", label: "Classique", cls: "" },
  { id: "corail", label: "Corail", cls: "bg-gradient-to-b from-primary/25 to-transparent rounded-2xl p-2" },
  { id: "ardoise", label: "Ardoise", cls: "bg-gradient-to-b from-secondary to-transparent rounded-2xl p-2" },
  { id: "nuit", label: "Nuit étoilée", cls: "bg-gradient-to-b from-foreground/15 to-transparent rounded-2xl p-2" },
] as const;
const KEY = "civitas-phone-theme";
export function usePhoneTheme() {
  const [id, setId] = useState("classique");
  useEffect(() => { try { if (localStorage.getItem(VIP_FLAG) === "1") setId(localStorage.getItem(KEY) ?? "classique"); } catch { /* */ } }, []);
  const choose = (t: string) => { try { localStorage.setItem(KEY, t); } catch { /* */ } setId(t); };
  return { id, cls: PHONE_THEMES.find((t) => t.id === id)?.cls ?? "", choose };
}
