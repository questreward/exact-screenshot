// Presentation and validation for NPC chats. Narrative only: never changes game state.
export type ChatTurn = { role: "user" | "assistant"; content: string };
export type NpcPersona = { first_name: string; last_name: string; age: number; profession: string; description: string; traits: string[]; place: string; city: string; relation: string; hour: string; events: string[] };

export const MAX_MESSAGE = 300;
export const MAX_TURNS = 8;
export const NPC_CHAT_STARTERS = ["Comment ça va ?", "Quoi de neuf en ville ?", "Tu fais quoi dans la vie ?"];

export function validateChat(input: unknown): { npcId: string; history: ChatTurn[] } {
  const d = (input ?? {}) as { npcId?: unknown; history?: unknown };
  if (typeof d.npcId !== "string" || !/^[0-9a-f-]{36}$/i.test(d.npcId)) throw new Error("Habitant inconnu.");
  if (!Array.isArray(d.history) || d.history.length === 0) throw new Error("Message vide.");
  const history = d.history.slice(-MAX_TURNS).map((t: unknown) => {
    const x = (t ?? {}) as { role?: unknown; content?: unknown };
    if ((x.role !== "user" && x.role !== "assistant") || typeof x.content !== "string") throw new Error("Message invalide.");
    const content = x.content.trim();
    if (!content) throw new Error("Message vide.");
    if (content.length > MAX_MESSAGE) throw new Error(`Message trop long (${MAX_MESSAGE} caractères maximum).`);
    return { role: x.role, content } as ChatTurn;
  });
  if (history[history.length - 1]!.role !== "user") throw new Error("Message invalide.");
  return { npcId: d.npcId, history };
}

export function npcSystemPrompt(p: NpcPersona): string {
  return [
    `Tu incarnes ${p.first_name} ${p.last_name}, ${p.age} ans, ${p.profession}, habitant fictif de ${p.city} dans le jeu CIVITAS.`,
    p.description && `Portrait : ${p.description}`,
    p.traits.length > 0 && `Caractère : ${p.traits.join(", ")}.`,
    `Tu es actuellement à ${p.place}, il est ${p.hour}. Relation avec ton interlocuteur : ${p.relation}.`,
    p.events.length > 0 ? `Événements publics en cours en ville : ${p.events.join(" ; ")}.` : "Aucun événement public particulier en ce moment.",
    "Réponds en français, à l'oral, en 1 à 3 phrases, en restant dans ton personnage.",
    "Ne promets jamais d'argent, de cadeau, de vote ou de service : tu ne peux rien changer dans le jeu.",
    "N'invente pas de faits sur de vrais joueurs et ne parle pas de leur vie privée. Refuse poliment les sujets choquants.",
  ].filter(Boolean).join("\n");
}

export function cleanReply(text: unknown): string {
  const s = typeof text === "string" ? text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
  if (!s) throw new Error("L'habitant ne peut pas répondre pour le moment.");
  return s.length > 600 ? s.slice(0, 597).trimEnd() + "…" : s;
}
