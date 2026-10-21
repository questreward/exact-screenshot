// Récit d'intervention par l'IA locale : texte seulement, ne change jamais le jeu ni le résultat de la mission.
export const MIN_ACTION = 5;
export const MAX_ACTION = 300;
export const MAX_REACTION = 700;
export const MAX_KIT = 6;

export type InterventionInput = { action: string; kit: string[] };

export function validateIntervention(input: unknown): InterventionInput {
  const d = (input ?? {}) as { action?: unknown; kit?: unknown };
  const action = typeof d.action === "string" ? d.action.trim() : "";
  if (action.length < MIN_ACTION) throw new Error("Décris ton action en quelques mots.");
  if (action.length > MAX_ACTION) throw new Error(`Action trop longue (${MAX_ACTION} caractères maximum).`);
  const kit = Array.isArray(d.kit) ? d.kit.filter((k): k is string => typeof k === "string" && /^[\w-]{1,30}$/.test(k)).slice(0, MAX_KIT) : [];
  return { action, kit };
}

export function interventionPrompt(p: { job: string; title: string; step: string; choices: string[]; kit: string[]; city: string }): string {
  return [
    `Tu es le narrateur d'une intervention professionnelle dans le jeu CIVITAS, en France. Métier du joueur : ${p.job}.`,
    `Mission : ${p.title}. Situation actuelle : ${p.step}`,
    p.choices.length ? `Options prévues par le jeu à cette étape : ${p.choices.join(" ; ")}.` : "",
    p.kit.length ? `Matériel que le joueur a pris dans le véhicule : ${p.kit.join(", ")}.` : "Le joueur n'a pas précisé de matériel.",
    `Ville : ${p.city}.`,
    "Décris en français, en 2 à 4 phrases, la réaction réaliste des personnes présentes et de la situation à l'action du joueur, avec le vocabulaire et les procédures françaises du métier.",
    "Ne décide JAMAIS du résultat final de la mission, n'annonce ni réussite ni échec, ni blessé grave ni décès, ni argent, ni sanction : le jeu décide seul.",
    "Si l'action est dangereuse ou contraire à la procédure, fais réagir un collègue ou le chef d'agrès pour le rappeler, sans moraliser longuement.",
    "Termine en rappelant au joueur de choisir une des options prévues pour poursuivre.",
  ].filter(Boolean).join("\n");
}

export function cleanReaction(text: unknown): string {
  const s = typeof text === "string" ? text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
  if (!s) throw new Error("Le récit n'est pas disponible pour le moment.");
  return s.length > MAX_REACTION ? s.slice(0, MAX_REACTION - 1).trimEnd() + "…" : s;
}
