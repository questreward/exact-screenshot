// Range les contacts existants par lien, d'après des faits déjà connus (score, lieu de travail, quartier).
export type LinkKind = "famille" | "ami" | "collegue" | "voisin" | "connaissance";
export const LINK_INFO: Record<LinkKind, { label: string; emoji: string; hint: string }> = {
  famille: { label: "Famille", emoji: "👨‍👩‍👧", hint: "Ta famille se gère dans Famille." },
  ami: { label: "Amis", emoji: "💛", hint: "Écris-leur, propose une sortie." },
  collegue: { label: "Collègues", emoji: "💼", hint: "Tu les croises au travail." },
  voisin: { label: "Voisins", emoji: "🏘️", hint: "Ils vivent dans ton quartier." },
  connaissance: { label: "Connaissances", emoji: "👋", hint: "Parle-leur pour mieux les connaître." },
};
export const LINK_ORDER: LinkKind[] = ["ami", "collegue", "voisin", "connaissance"];

export function linkOf(p: { score: number; npcLocation: string; npcDistrict: string }, me: { workLocation?: string | null; homeDistrict?: string | null }): LinkKind {
  if (p.score >= 50) return "ami";
  if (me.workLocation && p.npcLocation === me.workLocation) return "collegue";
  if (me.homeDistrict && p.npcDistrict === me.homeDistrict) return "voisin";
  return "connaissance";
}
