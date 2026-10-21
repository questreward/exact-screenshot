import { SECTIONS } from "./navigation";

export type PageIntro = {
  title: string;
  /** Short immersive line, as if a character welcomes you. */
  welcome: string;
  /** What this place is for in the game. */
  purpose: string;
  /** Optional big shortcut tiles (only real routes). */
  actions?: { label: string; to: string }[] | undefined;
};

/** Hand-written, immersive intros for the main places. */
const CUSTOM: Record<string, Omit<PageIntro, "title"> & { title?: string }> = {
  banque: { welcome: "« Bonjour ! Je suis Mme Laurent, votre conseillère à la Banque Horizon. »", purpose: "Ici, tu gères ton argent : ton solde, ta carte, tes virements à tes contacts et tes relevés du mois. Garde toujours un peu d’argent pour ton loyer et tes factures.", actions: [{ label: "Mon patrimoine", to: "/patrimoine" }, { label: "Impôts", to: "/impots" }] },
  patrimoine: { welcome: "« Faisons le point sur tout ce que vous possédez. »", purpose: "Ton patrimoine, c’est ton épargne, ton logement, ta voiture et tes entreprises. Plus il grandit, plus tu peux acheter, investir et lancer tes projets de vie.", actions: [{ label: "Banque", to: "/banque" }, { label: "Logement", to: "/logement" }, { label: "Concessionnaire", to: "/concession" }] },
  retraite: { welcome: "« Bienvenue à la caisse de retraite. Regardons votre relevé de carrière. »", purpose: "Chaque année de travail te donne des trimestres. Plus tu en as, plus ta pension sera élevée. Tu peux partir à 64 ans, à condition d’avoir quitté ton emploi.", actions: [{ label: "Ma carrière", to: "/carriere" }, { label: "Espace Emploi", to: "/espace-emploi" }] },
  impots: { welcome: "« Centre des finances publiques, que puis-je pour vous ? »", purpose: "Tu déclares tes revenus une fois par an et l’impôt est prélevé chaque mois. Oublier sa déclaration coûte 10 % de plus : pense à vérifier ton avis.", actions: [{ label: "Mes documents", to: "/mes-documents" }, { label: "Banque", to: "/banque" }] },
  "la-poste": { welcome: "« Bonjour, vous avez du courrier en attente au guichet. »", purpose: "Tes lettres, colis et recommandés arrivent ici. Certains documents importants (carte d’identité, passeport) doivent être retirés au guichet.", actions: [{ label: "Titres sécurisés", to: "/titres" }] },
  "caisse-des-aides": { welcome: "« Caisse des aides, bonjour. Voyons vos droits. »", purpose: "Selon ta situation, tu peux toucher des aides (logement, RSA…). Fais tes demandes, suis tes paiements et prends rendez-vous avec un conseiller.", actions: [{ label: "Mes services publics", to: "/services-publics" }] },
  titres: { welcome: "« Préfecture, service des titres. Avez-vous votre dossier ? »", purpose: "Demande ta carte d’identité, ton passeport ou ta carte grise. Une fois prêt, ton titre t’attend à La Poste.", actions: [{ label: "La Poste", to: "/la-poste" }] },
  vie: { welcome: "« Une nouvelle journée commence. Qu’allez-vous en faire ? »", purpose: "Ton quotidien : études ou travail, énergie, logement. Chaque journée de travail te rapporte un salaire, chaque cours te fait progresser.", actions: [{ label: "Agenda", to: "/agenda" }, { label: "Carte", to: "/carte" }] },
  carriere: { welcome: "« Votre carrière, étape par étape. »", purpose: "Suis ton métier, ton niveau et tes progrès. Plus tu travailles, plus tu deviens confirmé puis expert." },
  "espace-emploi": { welcome: "« Bienvenue à l’espace emploi. Des offres vous attendent. »", purpose: "Cherche un travail, postule et actualise ta situation chaque mois si tu es sans emploi." },
  logement: { welcome: "« Agence du logement, bonjour ! »", purpose: "Loue ou achète ton logement. Un logement plus grand coûte plus cher, mais te permet d’accueillir ta famille et tes amis." },
  boutique: { welcome: "« Bienvenue au magasin ! Prenez un panier. »", purpose: "Achète nourriture, vêtements et objets du quotidien. Les prix changent avec les soldes et les promotions." },
  carte: { welcome: "« Où allez-vous aujourd’hui ? »", purpose: "Ta ville sur une vraie carte. Touche un lieu pour y aller : travail, magasins, mairie, parcs." },
  elections: { welcome: "« Le bureau de vote est ouvert. »", purpose: "Présente-toi, fais campagne, et vote pour choisir le maire de ta ville. Ton vote reste secret." },
  "ma-ville": { welcome: "« Bienvenue à la mairie. »", purpose: "Découvre ce qui se passe dans ta ville : décisions, consultations, problèmes signalés et ton engagement citoyen." },
  sante: { welcome: "« Le cabinet médical vous reçoit. »", purpose: "Prends soin de ta santé et de ton moral : une bonne santé te donne plus d’énergie chaque jour." },
  transports: { welcome: "« Ticket ou abonnement ? »", purpose: "Bus, métro, voiture : choisis comment te déplacer. Attention aux contrôles sans ticket !" },
  etudes: { welcome: "« Bienvenue à l’université. »", purpose: "Choisis tes études, passe tes examens et obtiens des diplômes pour accéder à de meilleurs métiers." },
  assurances: { welcome: "« Mieux vaut prévenir que guérir. »", purpose: "Assure ton logement et ta voiture pour éviter de gros frais en cas de problème." },
  guide: { title: "Guide IA", welcome: "« Dites-moi ce que vous avez envie de faire. »", purpose: "Décris ton envie (sortir, travailler, te détendre) et le guide te propose des activités et un itinéraire dans les lieux de ta ville." },
  style: { title: "Boutique de style", welcome: "« Envie de changer de look ? »", purpose: "Achète des tenues et des cadres pour personnaliser ton personnage et ton profil public. Ce sont des objets de style, sans avantage dans le jeu." },
  "tableau-de-bord": { welcome: "« Bonjour, Citoyen ! »", purpose: "Ton accueil : ce qui se passe en ville, tes prochaines étapes et tes raccourcis." },
};

/** Intro for a path such as "/banque" or "/politique/abc". */
export function introFor(pathname: string): PageIntro | null {
  const id = pathname.split("/").filter(Boolean)[0] ?? "";
  if (!id) return null;
  const section = SECTIONS.find((s) => s.id === id);
  const custom = CUSTOM[id];
  if (!section && !custom) return null;
  const title = custom?.title ?? section?.label ?? id;
  return {
    title,
    welcome: custom?.welcome ?? `Bienvenue : ${title}.`,
    purpose: custom?.purpose ?? section?.description ?? "",
    actions: custom?.actions,
  };
}

export const CUSTOM_INTRO_IDS = Object.keys(CUSTOM);
