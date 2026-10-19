import {
  Globe2, Map, Smartphone, User, Briefcase, Landmark, Users, Newspaper, Settings,
  MessageCircle, Contact, Share2, Wallet, CalendarDays, UserCircle, Vote, FileText, Sparkles, Tv, Network, BookOpen, GraduationCap, Trophy, FileSignature, Swords, Heart, HeartPulse, Scale, Megaphone, BarChart3, Hammer, Siren, BookOpenText, IdCard, Compass, FolderLock, PieChart, MessagesSquare, ScrollText, type LucideIcon,
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
  { id: "monde", label: "Monde", icon: Globe2, description: "L'état du monde, la date, la société.", available: true },
  { id: "carte", label: "Carte", icon: Map, description: "Explorez votre ville et ses lieux.", available: true },
  { id: "france", label: "France", icon: Map, description: "La vraie carte de France, communes et circonscriptions.", available: true },
  { id: "telephone", label: "Téléphone", icon: Smartphone, description: "Votre outil principal au quotidien.", available: true },
  { id: "personnage", label: "Personnage", icon: User, description: "Votre identité et votre apparence.", available: true },
  { id: "mon-profil", label: "Mon profil", icon: IdCard, description: "Carte d'identité, photo, apparence et signature.", available: true },
  { id: "mes-documents", label: "Mes documents", icon: FolderLock, description: "Coffre-fort : contrats, quittances, impôts, formulaires.", available: true },
  { id: "orientation", label: "Mon orientation", icon: Compass, description: "Parti soutenu ou indépendant, positionnement et historique.", available: true },
  { id: "ma-vie", label: "Ma vie", icon: BookOpenText, description: "Journal de vie, réputations et compétences.", available: true },
  { id: "mon-parcours", label: "Mon parcours", icon: ScrollText, description: "Ton CV citoyen : études, emplois, engagements, mandats.", available: true },
  { id: "vie", label: "Vie", icon: Briefcase, description: "Études, travail et vie quotidienne.", available: true },
  { id: "patrimoine", label: "Patrimoine", icon: Wallet, description: "Épargne, biens et projets de vie.", available: true },
  { id: "demarches", label: "Mes démarches", icon: FileText, description: "Démarches administratives simulées.", available: true },
  { id: "vie-administrative", label: "Vie administrative", icon: GraduationCap, description: "Apprendre logement, CAF, impôts et documents en missions.", available: true },
  { id: "evenements", label: "Événements", icon: Sparkles, description: "Ce qui se passe dans votre ville et pour vous.", available: true },
  { id: "ma-ville", label: "Ma Ville", icon: Landmark, description: "Institutions et participation citoyenne.", available: true },
  { id: "politique", label: "Politique", icon: Vote, description: "Mouvements, partis et engagement politique.", available: true },
  { id: "lois", label: "Lois", icon: BookOpen, description: "100 vraies lois françaises et réformes débattues.", available: true },
  { id: "mandat", label: "Mandat", icon: Landmark, description: "Conseil et projets municipaux.", available: true },
  { id: "organisations", label: "Organisations", icon: Users, description: "Associations et organisations locales.", available: true },
  { id: "actualites", label: "Actualités", icon: Newspaper, description: "Le journal du monde et de votre ville.", available: true },
  { id: "jt", label: "JT", icon: Tv, description: "Journal télévisé local et national, interviews.", available: true },
  { id: "presse", label: "Presse", icon: Newspaper, description: "Devenez journaliste : vos articles, votre photo, vos lecteurs.", available: true },
  { id: "reseau", label: "Réseau", icon: Network, description: "Profils des joueurs, contacts, abonnements et messages.", available: true },
  { id: "petitions", label: "Pétitions", icon: FileSignature, description: "Pétitions de ville ou nationales et référendums.", available: true },
  { id: "debats", label: "Débats", icon: Swords, description: "Défiez un joueur en débat, le public tranche.", available: true },
  { id: "debats-publics", label: "Débats publics", icon: MessagesSquare, description: "Positions, questions et réponses sur une loi, un projet ou une crise.", available: true },
  { id: "sondages", label: "Sondages", icon: PieChart, description: "Opinion des joueurs et opinion simulée des habitants.", available: true },
  { id: "famille", label: "Famille", icon: Heart, description: "Couple, enfants, logement partagé et amis proches.", available: true },
  { id: "projets", label: "Projets citoyens", icon: Hammer, description: "Proposez et portez des projets pour votre ville.", available: true },
  { id: "crises", label: "Crises", icon: Siren, description: "Crises en cours, réponses et conséquences à venir.", available: true },
  { id: "sante", label: "Santé", icon: HeartPulse, description: "Santé, moral, sport et médecin.", available: true },
  { id: "justice", label: "Justice", icon: Scale, description: "Porter plainte, se défendre, jugements.", available: true },
  { id: "syndicats", label: "Syndicats", icon: Megaphone, description: "Se syndiquer, revendiquer, faire grève.", available: true },
  { id: "classements", label: "Classements", icon: BarChart3, description: "Les joueurs les plus influents et populaires.", available: true },
  { id: "trophees", label: "Trophées", icon: Trophy, description: "Vos succès et vos prochains objectifs.", available: true },
  { id: "parametres", label: "Paramètres", icon: Settings, description: "Langue, notifications, confidentialité.", available: true },
];

export type PhoneApp = { id: string; label: string; icon: LucideIcon; available: boolean };

export const PHONE_APPS: PhoneApp[] = [
  { id: "profil", label: "Profil", icon: UserCircle, available: true },
  { id: "banque", label: "Banque", icon: Wallet, available: true },
  { id: "messages", label: "Messages", icon: MessageCircle, available: true },
  { id: "contacts", label: "Contacts", icon: Contact, available: true },
  { id: "reseau", label: "Joueurs", icon: Network, available: true },
  { id: "organisations", label: "Organisations", icon: Users, available: true },
  { id: "social", label: "Civi", icon: Share2, available: true },
  { id: "actualites", label: "Actualités", icon: Newspaper, available: true },
  { id: "jt", label: "JT", icon: Tv, available: true },
  { id: "agenda", label: "Agenda", icon: CalendarDays, available: true },
  { id: "ma-ville", label: "Ma Ville", icon: Landmark, available: true },
  { id: "demarches", label: "Démarches", icon: FileText, available: true },
  { id: "evenements", label: "Événements", icon: Sparkles, available: true },
  { id: "vie", label: "Vie", icon: Briefcase, available: true },
  { id: "carte", label: "Carte", icon: Map, available: true },
  { id: "politique", label: "Politique", icon: Vote, available: true },
];

export const COMING_SOON = "Disponible dans une prochaine étape";
