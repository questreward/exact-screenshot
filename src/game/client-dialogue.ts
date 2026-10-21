// Presentation only: reusable client/visitor dialogues during a work shift. Never changes pay or money.
export type Behavior = { id: string; emoji: string; label: string; bias: number };
export const BEHAVIORS: Behavior[] = [
  { id: "presse", emoji: "⏱️", label: "Pressé", bias: -10 },
  { id: "prudent", emoji: "🤔", label: "Prudent", bias: 0 },
  { id: "passionne", emoji: "😍", label: "Passionné", bias: 10 },
  { id: "negociateur", emoji: "🤝", label: "Négociateur", bias: -5 },
  { id: "indecis", emoji: "😶", label: "Indécis", bias: -5 },
  { id: "habitue", emoji: "🙂", label: "Habitué", bias: 15 },
  { id: "gros", emoji: "💎", label: "Gros budget", bias: 5 },
  { id: "petit", emoji: "🪙", label: "Petit budget", bias: 0 },
];
export type Choice = { label: string; reply: string; delta: number; best?: string[] };
export type Scene = { need: string; choices: Choice[] };

const S: Record<string, Scene[]> = {
  concession: [
    { need: "Je cherche une voiture pour ma famille.", choices: [
      { label: "🚙 Montrer les SUV", reply: "Spacieux… mais un peu cher pour moi.", delta: 10, best: ["gros", "passionne"] },
      { label: "🚘 Montrer les berlines", reply: "Ça me semble raisonnable, merci.", delta: 15, best: ["prudent", "petit"] },
      { label: "💰 Demander le budget", reply: "Bonne idée, on part de là.", delta: 20, best: ["negociateur", "indecis"] },
      { label: "❌ Le renvoyer", reply: "Bon… j'irai ailleurs.", delta: -30 } ] },
    { need: "Vous pouvez me faire un prix ?", choices: [
      { label: "🎁 Offrir les tapis", reply: "C'est un beau geste !", delta: 15, best: ["negociateur"] },
      { label: "📄 Expliquer le tarif", reply: "D'accord, je comprends.", delta: 5, best: ["prudent"] },
      { label: "🚗 Proposer un essai", reply: "Allons-y, j'ai hâte !", delta: 20, best: ["passionne", "indecis"] } ] },
  ],
  commerce: [
    { need: "Bonjour, vous avez quelque chose de pas trop cher ?", choices: [
      { label: "🏷️ Montrer les promotions", reply: "Parfait, c'est ce qu'il me fallait.", delta: 20, best: ["petit", "negociateur"] },
      { label: "⭐ Conseiller le meilleur produit", reply: "Il est cher… mais il a l'air bien.", delta: 5, best: ["gros", "passionne"] },
      { label: "⚡ Servir vite", reply: "Merci, je suis pressé !", delta: 10, best: ["presse"] } ] },
    { need: "Je ne sais pas trop quoi choisir…", choices: [
      { label: "❓ Poser des questions", reply: "Vous m'avez bien aidé.", delta: 20, best: ["indecis", "prudent"] },
      { label: "👍 Recommander votre favori", reply: "Allez, je vous fais confiance.", delta: 10, best: ["habitue"] },
      { label: "⌛ Le laisser réfléchir", reply: "Je reviendrai peut-être.", delta: -5 } ] },
  ],
  banque: [
    { need: "Je voudrais comprendre mes frais.", choices: [
      { label: "📊 Détailler le relevé", reply: "C'est plus clair, merci.", delta: 20, best: ["prudent"] },
      { label: "🎁 Proposer une offre moins chère", reply: "Intéressant !", delta: 15, best: ["petit", "negociateur"] },
      { label: "📅 Donner un rendez-vous", reply: "Je n'ai pas le temps…", delta: -10, best: [] } ] },
  ],
  admin: [
    { need: "Il me manque un papier pour mon dossier.", choices: [
      { label: "📋 Donner la liste complète", reply: "Je reviens avec tout, merci.", delta: 15, best: ["prudent", "indecis"] },
      { label: "💻 Vérifier en ligne avec lui", reply: "Ah, c'est déjà enregistré !", delta: 20, best: ["presse"] },
      { label: "🎫 Lui faire reprendre un ticket", reply: "Encore attendre…", delta: -15 } ] },
  ],
  soin: [
    { need: "J'ai mal depuis ce matin, c'est grave ?", choices: [
      { label: "🩺 Examiner calmement", reply: "Je me sens rassuré.", delta: 20, best: ["prudent", "indecis"] },
      { label: "💬 Rassurer d'abord", reply: "Merci, ça va mieux déjà.", delta: 15 },
      { label: "⏩ Passer au suivant", reply: "Vous ne m'écoutez pas…", delta: -20 } ] },
  ],
  secours: [
    { need: "📞 « Il y a de la fumée chez mon voisin ! »", choices: [
      { label: "📍 Demander l'adresse exacte", reply: "C'est au 12, deuxième étage.", delta: 20 },
      { label: "🧘 Calmer l'appelant", reply: "D'accord… je respire.", delta: 10, best: ["presse", "indecis"] },
      { label: "🚨 Partir sans détails", reply: "Vous allez où ?!", delta: -15 } ] },
    { need: "Un passant vous interpelle : « Quelqu'un est tombé là-bas ! »", choices: [
      { label: "🏃 Y aller tout de suite", reply: "Merci, vite !", delta: 20 },
      { label: "📻 Prévenir l'équipe", reply: "Bonne réaction.", delta: 15, best: ["prudent"] } ] },
  ],
  default: [
    { need: "Vous pouvez m'aider deux minutes ?", choices: [
      { label: "🙂 Prendre le temps", reply: "C'est gentil, merci.", delta: 20 },
      { label: "⏱️ Répondre rapidement", reply: "D'accord, merci.", delta: 5, best: ["presse"] },
      { label: "🙅 Dire non", reply: "Tant pis…", delta: -15 } ] },
  ],
};
const MAP: Record<string, string> = { concession: "concession", commerce: "commerce", banque: "banque", admin: "admin", soin: "soin",
  pompier: "secours", police: "secours", gendarmerie: "secours", samu: "secours", pc: "secours" };
const NAMES = ["Mme Martin", "M. Bernard", "Léa", "M. Petit", "Mme Durand", "Karim", "Mme Moreau", "Hugo", "Mme Fontaine", "M. Garnier"];

const h = (s: string) => { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };

export type Visitor = { id: string; name: string; behavior: Behavior; scene: Scene; returning: boolean };
/** 3 visitors per shift, deterministic from day + job. */
export function shiftVisitors(day: string, jobKey: string, count = 3): Visitor[] {
  const pool = S[MAP[jobKey] ?? "default"]!;
  return Array.from({ length: count }, (_, i) => {
    const k = h(`${day}:${jobKey}:${i}`);
    const behavior = BEHAVIORS[k % BEHAVIORS.length]!;
    return { id: `${day}-${i}`, name: NAMES[(k >> 3) % NAMES.length]!, behavior, scene: pool[(k >> 5) % pool.length]!, returning: behavior.id === "habitue" };
  });
}
/** Satisfaction 0–100 after one choice; profile-matched choices score higher. */
export function satisfaction(v: Visitor, c: Choice) {
  const s = 50 + c.delta + v.behavior.bias + (c.best?.includes(v.behavior.id) ? 15 : 0);
  return Math.max(0, Math.min(100, s));
}
export function satisfactionLabel(s: number) { return s >= 75 ? "😄 Très satisfait" : s >= 50 ? "🙂 Satisfait" : s >= 30 ? "😐 Mitigé" : "😠 Mécontent"; }
