// Presentation only: the player's political path, read from existing political and election state.
export const PATH_STEPS = [
  { id: "citoyen", emoji: "👤", label: "Citoyen", how: "Tout le monde commence ici." },
  { id: "sympathisant", emoji: "👥", label: "Sympathisant", how: "Donne ton avis sur un sujet politique." },
  { id: "militant", emoji: "🗣️", label: "Militant", how: "Rejoins un parti ou un mouvement." },
  { id: "responsable", emoji: "📣", label: "Responsable local", how: "Obtiens un rôle dans ton organisation." },
  { id: "candidat", emoji: "🗳️", label: "Candidat", how: "Dépose une candidature à une élection." },
  { id: "elu", emoji: "🏛️", label: "Élu", how: "Remporte une élection." },
] as const;

export type PathInput = {
  opinions: number;
  memberships: { status: string; role: string }[];
  candidacies: { electionStatus: string; status: string }[];
  mandates: { status: string }[];
};

export function politicalPath(i: PathInput) {
  const active = i.memberships.filter(m => m.status === "active");
  let level = 0;
  if (i.opinions > 0) level = 1;
  if (active.length) level = 2;
  if (active.some(m => !/^(member|membre)$/i.test(m.role))) level = 3;
  if (i.candidacies.some(c => c.electionStatus !== "completed" && !/refus|withdraw|retir/i.test(c.status))) level = 4;
  if (i.mandates.some(m => m.status === "active")) level = 5;
  return { level, step: PATH_STEPS[level]!, next: PATH_STEPS[level + 1] ?? null };
}
