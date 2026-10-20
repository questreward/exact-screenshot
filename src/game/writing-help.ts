// Draft suggestions only: the player edits and publishes through existing screens.
export const WRITING_KINDS = {
  petition: { label: "pétition", words: "80 à 140 mots", guide: "une pétition citoyenne claire : la demande, les raisons, l'appel à signer" },
  article: { label: "article", words: "150 à 250 mots", guide: "un article de presse locale avec un titre implicite, des faits et un angle" },
  debat: { label: "argument de débat", words: "60 à 120 mots", guide: "un argument de débat percutant, structuré et respectueux" },
} as const;
export type WritingKind = keyof typeof WRITING_KINDS;
export const WRITING_TONES = { serieux: "sérieux", enthousiaste: "enthousiaste", combatif: "combatif", apaise: "apaisé" } as const;
export type WritingTone = keyof typeof WRITING_TONES;
export const MAX_IDEAS = 300;

export function validateWriting(input: unknown): { kind: WritingKind; tone: WritingTone; ideas: string; max: number } {
  const d = (input ?? {}) as Record<string, unknown>;
  if (typeof d["kind"] !== "string" || !(d["kind"] in WRITING_KINDS)) throw new Error("Type d'écrit inconnu.");
  if (typeof d["tone"] !== "string" || !(d["tone"] in WRITING_TONES)) throw new Error("Ton inconnu.");
  const ideas = typeof d["ideas"] === "string" ? d["ideas"].trim() : "";
  if (ideas.length < 5) throw new Error("Décris ton sujet en quelques mots.");
  if (ideas.length > MAX_IDEAS) throw new Error(`Idées trop longues (${MAX_IDEAS} caractères maximum).`);
  const max = Number(d["max"]);
  if (!Number.isInteger(max) || max < 30 || max > 20000) throw new Error("Longueur invalide.");
  return { kind: d["kind"] as WritingKind, tone: d["tone"] as WritingTone, ideas, max };
}

export function writingPrompt(kind: WritingKind, tone: WritingTone): string {
  const k = WRITING_KINDS[kind];
  return [
    `Tu aides un joueur du jeu CIVITAS (monde fictif) à rédiger ${k.guide}.`,
    `Ton ${WRITING_TONES[tone]}, en français, ${k.words}. Rends uniquement le texte, sans titre ni commentaire.`,
    "N'accuse personne, n'attaque aucune personne réelle ou joueur, aucun propos haineux, aucune information privée.",
  ].join("\n");
}

export function cleanDraft(text: unknown, max: number): string {
  const s = typeof text === "string" ? text.replace(/<[^>]*>/g, "").replace(/\*\*/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : "";
  if (!s) throw new Error("L'aide à l'écriture est indisponible pour le moment.");
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}
