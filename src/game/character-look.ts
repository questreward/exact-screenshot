// Présentation seulement : humeur et réplique affichées, sans effet sur le jeu.
export type Mood = "joyeux" | "neutre" | "fatigue";

export function moodFromEnergy(energy: number): Mood {
  if (energy >= 60) return "joyeux";
  if (energy >= 25) return "neutre";
  return "fatigue";
}

export function greetingLine(mood: Mood, phase: "matin" | "journee" | "soiree" | "nuit"): string {
  if (mood === "fatigue") return "Je suis épuisé… un peu de repos me ferait du bien.";
  if (phase === "nuit") return "Il est tard, la ville dort.";
  if (phase === "matin") return mood === "joyeux" ? "Belle journée qui commence !" : "Allez, un café et on y va.";
  if (phase === "soiree") return "Que faire ce soir ?";
  return mood === "joyeux" ? "Prêt pour la suite !" : "On avance, pas à pas.";
}
