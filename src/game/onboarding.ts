// Presentation-only guided discovery; progress kept on this device.
import { useEffect, useState } from "react";

export type TourStep = { id: string; emoji: string; title: string; text: string; to: string; cta: string };

export function tourSteps(o: { studying: boolean; working: boolean; hasHousing: boolean; rescue: boolean }): TourStep[] {
  const action: TourStep = o.rescue
    ? { id: "action", emoji: "🚒", title: "Ta première action", text: "Prends ton service : c'est une vraie journée du jeu.", to: "/secours", cta: "Prendre mon service" }
    : o.studying
      ? { id: "action", emoji: "🎓", title: "Ta première action", text: "Va en cours : ta formation avance vraiment.", to: "/vie", cta: "Aller en cours" }
      : o.working
        ? { id: "action", emoji: "💼", title: "Ta première action", text: "Va travailler : ta journée te rapporte un salaire.", to: "/vie", cta: "Aller travailler" }
        : { id: "action", emoji: "🔎", title: "Ta première action", text: "Choisis une activité du quotidien pour commencer.", to: "/vie", cta: "Choisir" };
  return [
    { id: "quotidien", emoji: "⏰", title: "Ton quotidien", text: "Le temps avance tout seul. Ton agenda montre ce qui t'attend.", to: "/agenda", cta: "Ouvrir mon agenda" },
    { id: "telephone", emoji: "📱", title: "Ton téléphone", text: "Messages, banque, Civi : tout passe par lui.", to: "/telephone", cta: "Ouvrir le téléphone" },
    { id: "ville", emoji: "🗺️", title: "Ta ville", text: "Ta position, ton logement, les magasins et les transports.", to: "/carte", cta: "Voir la carte" },
    action,
    { id: "argent", emoji: "💶", title: "Ton argent", text: "Salaire, dépenses, achats : tout arrive sur ton compte.", to: "/banque", cta: "Voir mon compte" },
    { id: "monde", emoji: "📰", title: "La ville vit sans toi", text: "Il se passe des choses en ce moment même.", to: "/evenements", cta: "Voir ce qui se passe" },
    o.hasHousing
      ? { id: "perso", emoji: "🛋️", title: "Ta vie perso", text: "Aménage ton chez-toi à ton goût.", to: "/chez-moi", cta: "Aller chez moi" }
      : { id: "perso", emoji: "🏠", title: "Ta vie perso", text: "Trouve un endroit où vivre.", to: "/logement", cta: "Chercher un logement" },
    { id: "social", emoji: "💬", title: "Les autres", text: "Civi et le Réseau : rencontre d'autres joueurs, si tu en as envie.", to: "/civi", cta: "Ouvrir Civi" },
  ];
}

export const FREEDOM = [
  { label: "Travailler", to: "/vie" }, { label: "Explorer la ville", to: "/carte" }, { label: "Faire des achats", to: "/boutique" },
  { label: "Rentrer chez moi", to: "/chez-moi" }, { label: "Rencontrer des gens", to: "/reseau" },
  { label: "M'engager", to: "/organisations" }, { label: "Faire de la politique", to: "/politique" },
];

type State = { intro: boolean; done: string[]; finished: boolean };
const KEY = "civitas-tour-v3";
const EMPTY: State = { intro: false, done: [], finished: false };

export function useTour() {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    try { setState({ ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }); } catch { setState(EMPTY); }
  }, []);
  const save = (s: State) => { setState(s); localStorage.setItem(KEY, JSON.stringify(s)); };
  return {
    state,
    seeIntro: () => state && save({ ...state, intro: true }),
    complete: (id: string) => state && save({ ...state, done: [...new Set([...state.done, id])] }),
    finish: () => state && save({ ...state, intro: true, finished: true }),
  };
}
