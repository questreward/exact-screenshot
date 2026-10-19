// Presentation/validation helpers for the advisory AI law analysis (no game effect).
export const LAW_TEXT_MIN = 80;
export const LAW_TEXT_MAX = 6000;
export const LAW_INDICATORS = ["Logement", "Transports", "Emploi", "Commerce", "Environnement", "Sécurité", "Services", "Culture", "Satisfaction"] as const;

export type CityImpact = { city: string; summary: string; effects: { indicator: string; trend: "hausse" | "baisse" | "stable" }[] };
export type LawAnalysis = { title: string; overview: string; cities: CityImpact[]; risks: string[] };

export function validateLawText(raw: unknown): string {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text.length < LAW_TEXT_MIN) throw new Error(`Le texte doit faire au moins ${LAW_TEXT_MIN} caractères.`);
  if (text.length > LAW_TEXT_MAX) throw new Error(`Le texte ne doit pas dépasser ${LAW_TEXT_MAX} caractères.`);
  return text;
}

const TRENDS = new Set(["hausse", "baisse", "stable"]);
export function normalizeAnalysis(raw: unknown, cityNames: string[]): LawAnalysis {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const cities = (Array.isArray(o["cities"]) ? o["cities"] : [])
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : {}))
    .filter((c) => cityNames.includes(str(c["city"])))
    .map((c) => ({
      city: str(c["city"]),
      summary: str(c["summary"]),
      effects: (Array.isArray(c["effects"]) ? c["effects"] : [])
        .map((e) => (e && typeof e === "object" ? (e as Record<string, unknown>) : {}))
        .filter((e) => (LAW_INDICATORS as readonly string[]).includes(str(e["indicator"])) && TRENDS.has(str(e["trend"])))
        .map((e) => ({ indicator: str(e["indicator"]), trend: str(e["trend"]) as CityImpact["effects"][number]["trend"] }))
        .slice(0, 9),
    }));
  return {
    title: str(o["title"], 120) || "Projet de loi",
    overview: str(o["overview"], 1200),
    cities,
    risks: (Array.isArray(o["risks"]) ? o["risks"] : []).map((r) => str(r, 300)).filter(Boolean).slice(0, 5),
  };
}
