import {
  Globe2, Map, Smartphone, User, Briefcase, Landmark, PiggyBank, Users, Newspaper, Settings,
  MessageCircle, Contact, Share2, Wallet, CalendarDays, UserCircle, Vote, FileText, Sparkles, Tv, Network, BookOpen, GraduationCap, Trophy, FileSignature, Swords, Heart, HeartPulse, Scale, Megaphone, BarChart3, Hammer, Siren, BookOpenText, IdCard, Compass, FolderLock, PieChart, MessagesSquare, ScrollText, Handshake, SearchCheck, ShoppingBag, Home, Store, Wrench, Building2, Car, type LucideIcon,
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
  { id: "agenda", label: "Agenda", icon: CalendarDays, description: "Activités en cours et rendez-vous.", available: true },
  { id: "elections", label: "Élections", icon: Vote, description: "Candidatures, campagnes et votes municipaux.", available: true },
  { id: "conduite", label: "En route", icon: Car, description: "Conduite et voyages entre villes.", available: true },
  { id: "chez-moi", label: "Chez moi", icon: Home, description: "Aménagement de votre logement.", available: true },
  { id: "caisse-des-aides", label: "Caisse des aides", icon: Landmark, description: "Droits, paiements et attestations fictifs.", available: true },
  { id: "espace-emploi", label: "Espace Emploi", icon: Briefcase, description: "Offres et actualisation mensuelle.", available: true },
  { id: "espace-sante", label: "Espace Santé", icon: HeartPulse, description: "Médecin traitant et remboursements fictifs.", available: true },
  { id: "voyages", label: "Voyages", icon: Globe2, description: "Séjours à l’étranger, congés et cartes postales.", available: true },
  { id: "banque", label: "Banque", icon: Wallet, description: "Compte, carte et relevés · FICTIF.", available: true },
  { id: "la-poste", label: "La Poste", icon: FileText, description: "Courriers et recommandés · FICTIF.", available: true },
  { id: "conjoncture", label: "Conjoncture", icon: BarChart3, description: "Inflation, SMIC, prix des villes et finances publiques.", available: true },
  { id: "monde", label: "Monde", icon: Globe2, description: "L'état du monde, la date, la société.", available: true },
  { id: "carte", label: "Carte", icon: Map, description: "Explorez votre ville et ses lieux.", available: true },
  { id: "france", label: "France", icon: Map, description: "La vraie carte de France, communes et circonscriptions.", available: true },
  { id: "telephone", label: "Téléphone", icon: Smartphone, description: "Votre outil principal au quotidien.", available: true },
  { id: "personnage", label: "Personnage", icon: User, description: "Votre identité et votre apparence.", available: true },
  { id: "mon-profil", label: "Mon profil", icon: IdCard, description: "Carte d'identité, photo, apparence et signature.", available: true },
  { id: "titres", label: "Titres sécurisés", icon: FolderLock, description: "CNI, passeport et carte grise fictifs.", available: true },
  { id: "mes-documents", label: "Mes documents", icon: FolderLock, description: "Coffre-fort : contrats, quittances, impôts, formulaires.", available: true },
  { id: "orientation", label: "Mon orientation", icon: Compass, description: "Parti soutenu ou indépendant, positionnement et historique.", available: true },
  { id: "ma-vie", label: "Ma vie", icon: BookOpenText, description: "Journal de vie, réputations et compétences.", available: true },
  { id: "mon-parcours", label: "Mon parcours", icon: ScrollText, description: "Ton CV citoyen : études, emplois, engagements, mandats.", available: true },
  { id: "secours", label: "Police, pompiers, secours", icon: Siren, description: "Police, gendarmerie, pompiers, SAMU, protection civile : concours, horaires, missions.", available: true },
  { id: "permis", label: "Permis de conduire", icon: Car, description: "Code, leçons et examen, dès 17 ans.", available: true },
  { id: "transports", label: "Transports", icon: Car, description: "Abonnement, contrôles, assurance auto, contrôle technique et amendes.", available: true },
  { id: "etudes", label: "Études supérieures", icon: Compass, description: "Vœux, bourse, partiels, diplômes et résidence universitaire.", available: true },
  { id: "impots", label: "Impôts", icon: Landmark, description: "Prélèvement à la source, déclaration de revenus et avis d'imposition.", available: true },
  { id: "retraite", label: "Ma retraite", icon: PiggyBank, description: "Relevé de carrière, trimestres, estimation de pension et départ à 64 ans.", available: true },
  { id: "carriere", label: "Ma carrière", icon: Briefcase, description: "Entretiens d'embauche, promotions, chômage et salaire.", available: true },
  { id: "vie", label: "Vie", icon: Briefcase, description: "Études, travail et vie quotidienne.", available: true },
  { id: "boutique", label: "Boutique", icon: ShoppingBag, description: "Vrais produits : téléphones, maison, mode, loisirs.", available: true },
  { id: "marche", label: "Marché", icon: Store, description: "Magasins des villes, commerces de joueurs et marché entre joueurs.", available: true },
  { id: "services", label: "Services", icon: Wrench, description: "Garages et déménageurs : entreprises de joueurs en priorité, sinon entreprises fictives.", available: true },
  { id: "agence", label: "Agence immobilière", icon: Building2, description: "Louer chez un joueur, confier son bien, acheter avec une agence.", available: true },
  { id: "concession", label: "Concessionnaire", icon: Car, description: "Voitures neuves, reprises et occasions chez les concessions des joueurs.", available: true },
  { id: "construction", label: "Construction", icon: Hammer, description: "Rénover ou agrandir ton logement avec une entreprise de joueur ou fictive.", available: true },
  { id: "recrutement", label: "Recrutement", icon: Briefcase, description: "Trouver un emploi ou des candidats avec une agence.", available: true },
  { id: "assurances", label: "Assurances", icon: HeartPulse, description: "Choisir une assurance ou gérer sa compagnie.", available: true },
  { id: "civitas-services", label: "CIVITAS Services", icon: Compass, description: "Toutes les démarches, logements, emplois et entreprises réunis par besoin.", available: true },
  { id: "logement", label: "Logement", icon: Home, description: "Annonces de location, bail, emménager dans un bien acheté.", available: true },
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
  { id: "presse", label: "Médias", icon: Newspaper, description: "Ton journal et ta chaîne : articles, émissions, abonnés.", available: true },
  { id: "reseau", label: "Réseau", icon: Network, description: "Profils des joueurs, contacts, abonnements et messages.", available: true },
  { id: "civi", label: "Civi", icon: MessagesSquare, description: "Le réseau social du jeu : publications, abonnés et buzz.", available: true },
  { id: "presidence", label: "Présidence", icon: Landmark, description: "Élysée : présidentielle, allocutions, lois et référendums.", available: true },
  { id: "petitions", label: "Pétitions", icon: FileSignature, description: "Pétitions de ville ou nationales et référendums.", available: true },
  { id: "debats", label: "Débats", icon: Swords, description: "Défiez un joueur en débat, le public tranche.", available: true },
  { id: "debats-publics", label: "Débats publics", icon: MessagesSquare, description: "Positions, questions et réponses sur une loi, un projet ou une crise.", available: true },
  { id: "sondages", label: "Sondages", icon: PieChart, description: "Opinion des joueurs et opinion simulée des habitants.", available: true },
  { id: "vie-des-partis", label: "Vie des partis", icon: Handshake, description: "Coalitions, votes internes, présidence et programme.", available: true },
  { id: "verification", label: "Vérification des faits", icon: SearchCheck, description: "Vérifier une affirmation avec les données de la ville.", available: true },
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

export type SectionGroup = { id: string; label: string; ids: string[] };

// "Plus" menu headings: every section belongs to exactly one group.
export const SECTION_GROUPS: SectionGroup[] = [
  { id: "vie", label: "Vie", ids: ["personnage", "mon-profil", "ma-vie", "mon-parcours", "vie", "agenda", "famille", "sante", "espace-sante", "etudes", "carriere", "espace-emploi", "secours", "retraite", "trophees"] },
  { id: "argent", label: "Argent", ids: ["banque", "patrimoine", "assurances", "impots", "caisse-des-aides", "conjoncture"] },
  { id: "achats", label: "Achats et services", ids: ["boutique", "marche", "services", "civitas-services", "concession", "recrutement"] },
  { id: "logement", label: "Logement", ids: ["logement", "chez-moi", "construction", "agence"] },
  { id: "deplacements", label: "Déplacements", ids: ["carte", "france", "permis", "conduite", "transports", "voyages"] },
  { id: "papiers", label: "Papiers", ids: ["demarches", "vie-administrative", "mes-documents", "titres", "la-poste", "telephone"] },
  { id: "citoyen", label: "Citoyenneté", ids: ["ma-ville", "projets", "petitions", "justice", "elections", "politique", "orientation", "vie-des-partis", "mandat", "lois", "presidence", "debats", "debats-publics", "sondages", "verification"] },
  { id: "infos", label: "Ville et actualités", ids: ["monde", "evenements", "crises", "actualites", "jt", "presse"] },
  { id: "social", label: "Social", ids: ["civi", "reseau", "organisations", "syndicats", "classements"] },
  { id: "reglages", label: "Réglages", ids: ["parametres"] },
];

// Bottom-bar hubs: short themed lists opened by "Ma vie" and "Ma ville".
export const LIFE_HUB = ["personnage", "ma-vie", "vie", "agenda", "famille", "sante", "etudes", "carriere", "patrimoine", "logement", "chez-moi", "mes-documents"];
export const CITY_HUB = ["ma-ville", "evenements", "crises", "projets", "actualites", "jt", "politique", "elections", "mandat", "organisations", "civitas-services", "justice"];

export function hubSections(ids: string[]) {
  return ids.map((id) => SECTIONS.find((s) => s.id === id)).filter((s): s is Section => !!s);
}

export function groupedSections() {
  return SECTION_GROUPS.map((g) => ({
    ...g,
    sections: g.ids.map((id) => SECTIONS.find((s) => s.id === id)).filter((s): s is Section => !!s),
  }));
}

// Personal home shortcuts (kept short on purpose).
export const HOME_SHORTCUTS = ["civitas-services", "vie", "carriere", "telephone", "carte", "ma-ville"];

/** Les 10 applications principales du téléphone (chantier 7) : chacune ouvre un système existant. */
export type MainPhoneApp = { id: string; label: string; emoji: string; to?: string; app?: string };
export const MAIN_PHONE_APPS: MainPhoneApp[] = [
  { id: "maps", label: "Maps", emoji: "🗺️", to: "/carte" },
  { id: "messages", label: "Messages", emoji: "💬", app: "messages" },
  { id: "actualites", label: "Actualités", emoji: "📰", to: "/actualites" },
  { id: "civi", label: "Civi", emoji: "🏛️", app: "social" },
  { id: "social", label: "Vie sociale", emoji: "👥", app: "vie-sociale" },
  { id: "banque", label: "Banque", emoji: "💶", app: "banque" },
  { id: "shopping", label: "Shopping", emoji: "🛒", to: "/boutique" },
  { id: "agenda", label: "Agenda", emoji: "📅", to: "/agenda" },
  { id: "documents", label: "Documents", emoji: "📁", to: "/mes-documents" },
  { id: "moi", label: "Moi", emoji: "👤", app: "profil" },
];
/** Applications rangées dans « Plus » pour ne rien perdre de l'existant. */
export const MORE_PHONE_APPS = PHONE_APPS.filter(a => !["profil", "banque", "messages", "social", "actualites", "agenda", "carte"].includes(a.id));
