import {
  Globe2, Map, Smartphone, User, Briefcase, Landmark, Users, Newspaper, Settings,
  MessageCircle, Contact, Share2, Wallet, CalendarDays, UserCircle, type LucideIcon,
} from "lucide-react";

export type Section = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  available: boolean;
};

// Sections not yet available route to /section/$id and show a "coming soon" screen.
export const SECTIONS: Section[] = [
  { id: "monde", label: "Monde", icon: Globe2, description: "L'état du monde, la date, la société.", available: false },
  { id: "carte", label: "Carte", icon: Map, description: "Explorez votre ville et ses lieux.", available: true },
  { id: "telephone", label: "Téléphone", icon: Smartphone, description: "Votre outil principal au quotidien.", available: true },
  { id: "personnage", label: "Personnage", icon: User, description: "Votre identité et votre apparence.", available: true },
  { id: "vie", label: "Vie", icon: Briefcase, description: "Études, travail et vie quotidienne.", available: true },
  { id: "ma-ville", label: "Ma Ville", icon: Landmark, description: "Institutions et participation citoyenne.", available: true },
  { id: "politique", label: "Politique", icon: Landmark, description: "Partis, élections, institutions.", available: false },
  { id: "organisations", label: "Organisations", icon: Users, description: "Associations et organisations locales.", available: true },
  { id: "actualites", label: "Actualités", icon: Newspaper, description: "Le journal du monde et de votre ville.", available: true },
  { id: "parametres", label: "Paramètres", icon: Settings, description: "Langue, notifications, confidentialité.", available: true },
];

export type PhoneApp = { id: string; label: string; icon: LucideIcon; available: boolean };

export const PHONE_APPS: PhoneApp[] = [
  { id: "profil", label: "Profil", icon: UserCircle, available: true },
  { id: "banque", label: "Banque", icon: Wallet, available: true },
  { id: "messages", label: "Messages", icon: MessageCircle, available: false },
  { id: "contacts", label: "Contacts", icon: Contact, available: true },
  { id: "organisations", label: "Organisations", icon: Users, available: true },
  { id: "social", label: "Réseau social", icon: Share2, available: false },
  { id: "actualites", label: "Actualités", icon: Newspaper, available: true },
  { id: "agenda", label: "Agenda", icon: CalendarDays, available: true },
  { id: "ma-ville", label: "Ma Ville", icon: Landmark, available: true },
  { id: "vie", label: "Vie", icon: Briefcase, available: true },
  { id: "carte", label: "Carte", icon: Map, available: true },
  { id: "politique", label: "Politique", icon: Landmark, available: false },
];

export const COMING_SOON = "Disponible dans une prochaine étape";
