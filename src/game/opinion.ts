// Aides d'affichage : sondages et débats publics. Les résultats viennent du serveur.
export const percents = (counts: number[]): number[] => {
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.map(c => (total ? Math.round((100 * c) / total) : 0));
};

export const FILTER_LABELS: Record<string, string> = { age: "Âge", situation: "Situation", quartier: "Quartier", affiliation: "Affiliation politique" };
export const SPONSOR_LABELS: Record<string, string> = { organisation: "Organisation", media: "Média", institution: "Institution" };
export const TOPIC_LABELS: Record<string, string> = { loi: "Loi", projet: "Projet municipal", crise: "Crise", election: "Élection", economie: "Décision économique" };
export const POST_LABELS: Record<string, string> = { position: "Position", reponse: "Réponse", question: "Question" };

/** Range les interventions : chaque position ou question, suivie de ses réponses. */
export function threadPosts<T extends { id: string; parent_id: string | null }>(posts: T[]): { post: T; replies: T[] }[] {
  const roots = posts.filter(p => !p.parent_id || !posts.some(q => q.id === p.parent_id));
  return roots.map(post => ({ post, replies: posts.filter(p => p.parent_id === post.id) }));
}
