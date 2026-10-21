// Presentation only: which existing page to open after leaving a vehicle at a place kind.
export type Arrival = { to: string; label: string; emoji: string };

const MAP: Record<string, Arrival> = {
  mairie: { to: "/ma-ville", label: "Entrer dans la mairie", emoji: "🏛️" },
  banque: { to: "/banque", label: "Entrer dans la banque", emoji: "🏦" },
  administration: { to: "/demarches", label: "Aller au guichet", emoji: "📋" },
  gare: { to: "/voyages", label: "Entrer dans la gare", emoji: "🚉" },
  station: { to: "/transports", label: "Aller à la station", emoji: "🚇" },
  commerce: { to: "/boutique", label: "Entrer dans le magasin", emoji: "🛒" },
  cafe: { to: "/reseau", label: "S'installer au café", emoji: "☕" },
  logement: { to: "/chez-moi", label: "Rentrer chez moi", emoji: "🏠" },
  universite: { to: "/etudes", label: "Aller en cours", emoji: "🎓" },
  entreprise: { to: "/carriere", label: "Commencer ma journée de travail", emoji: "💼" },
};

export function arrivalFor(kind: string | null | undefined): Arrival {
  return (kind && MAP[kind]) || { to: "/carte", label: "Entrer dans le lieu", emoji: "📍" };
}
