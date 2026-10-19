// « Vie administrative » — pedagogical content, fully config-driven.
// Add a mission by appending to MISSIONS; no component change needed.
// All amounts are fictional game simulations, never official calculations.

export type CategoryId = "logement" | "caf" | "impots" | "documents" | "sante" | "assurances" | "echeances";

export type Category = { id: CategoryId; label: string; emoji: string; unlockLevel: number };

export const CATEGORIES: Category[] = [
  { id: "logement", label: "Logement", emoji: "🏠", unlockLevel: 1 },
  { id: "caf", label: "CAF / APL", emoji: "💶", unlockLevel: 1 },
  { id: "impots", label: "Impôts", emoji: "🧾", unlockLevel: 1 },
  { id: "documents", label: "Documents", emoji: "📄", unlockLevel: 1 },
  { id: "sante", label: "Santé", emoji: "🏥", unlockLevel: 2 },
  { id: "assurances", label: "Assurances", emoji: "🛡️", unlockLevel: 2 },
  { id: "echeances", label: "Échéances", emoji: "📅", unlockLevel: 3 },
];

export type Choice = { label: string; correct: boolean; why: string };

export type Step =
  | { kind: "info"; title: string; text: string }
  | { kind: "quiz"; title: string; question: string; choices: Choice[]; multi?: boolean }
  | { kind: "apl"; title: string }
  | { kind: "tax"; title: string };

export type Mission = {
  id: string;
  category: CategoryId;
  emoji: string;
  title: string;
  intro: string;
  steps: Step[];
  knowledge: string[]; // unlocked in order as the mission is mastered
};

export const MISSIONS: Mission[] = [
  {
    id: "premier-logement",
    category: "logement",
    emoji: "🏠",
    title: "Premier logement",
    intro: "Tu viens de signer pour ton premier appartement. Découvre ce qu'il faut savoir avant de poser tes cartons.",
    knowledge: ["Je sais lire un avis de loyer.", "Je sais à quoi servent le dépôt de garantie et l'assurance habitation.", "Je sais prouver où j'habite."],
    steps: [
      { kind: "info", title: "Loyer et charges", text: "Le loyer paie le logement. Les charges paient ce qui est partagé : entretien de l'immeuble, eau froide, ordures ménagères… On parle souvent de « loyer charges comprises » (CC)." },
      { kind: "quiz", title: "Ton avis de loyer", question: "Avis de loyer : loyer 480 €, provision sur charges 45 €. Combien dois-tu payer ce mois-ci ?", choices: [
        { label: "480 €", correct: false, why: "Il manque les charges : elles sont à payer en plus du loyer." },
        { label: "525 €", correct: true, why: "Loyer + charges = 480 + 45 = 525 €. C'est le montant à régler." },
        { label: "45 €", correct: false, why: "Ce sont seulement les charges, le loyer reste à payer." },
      ] },
      { kind: "quiz", title: "Dépôt de garantie", question: "À quoi sert le dépôt de garantie versé à l'entrée ?", choices: [
        { label: "C'est le premier mois de loyer", correct: false, why: "Non, il s'ajoute au premier loyer." },
        { label: "Il couvre d'éventuels dégâts et t'est rendu à ton départ", correct: true, why: "Exact. Le propriétaire le rend après l'état des lieux de sortie, moins les réparations justifiées." },
        { label: "C'est une taxe pour la mairie", correct: false, why: "Non, il est versé au propriétaire et rendu ensuite." },
      ] },
      { kind: "info", title: "L'état des lieux", text: "À l'entrée et à la sortie, on décrit l'état du logement pièce par pièce. Prends des photos : c'est ce document qui permet de récupérer ton dépôt de garantie." },
      { kind: "quiz", title: "Assurance habitation", question: "En tant que locataire, l'assurance habitation est…", choices: [
        { label: "Obligatoire", correct: true, why: "Oui, le locataire doit être assuré au moins pour les risques locatifs (dégât des eaux, incendie…). Le propriétaire peut demander l'attestation chaque année." },
        { label: "Facultative", correct: false, why: "Pour un locataire, elle est obligatoire." },
        { label: "Payée par le propriétaire", correct: false, why: "C'est au locataire de s'assurer." },
      ] },
      { kind: "quiz", title: "Justificatif de domicile", question: "Quels documents peuvent servir de justificatif de domicile ? (plusieurs réponses)", multi: true, choices: [
        { label: "Une quittance de loyer", correct: true, why: "Oui, elle prouve que tu paies un loyer à cette adresse." },
        { label: "Une facture d'électricité ou internet", correct: true, why: "Oui, une facture récente à ton nom fonctionne." },
        { label: "Ta carte de cinéma", correct: false, why: "Non, elle ne prouve pas ton adresse." },
        { label: "Ton attestation d'assurance habitation", correct: true, why: "Oui, elle indique l'adresse assurée." },
      ] },
    ],
  },
  {
    id: "decouvrir-caf",
    category: "caf",
    emoji: "💶",
    title: "Découvrir la CAF / APL",
    intro: "L'aide au logement peut alléger ton loyer. Remplis une demande simulée pour comprendre ce qui compte.",
    knowledge: ["Je sais qu'une aide au logement est possible selon ma situation.", "Je sais que mes revenus influencent mes droits.", "Je sais qu'il faut signaler tout changement de situation."],
    steps: [
      { kind: "info", title: "C'est quoi l'APL ?", text: "L'APL est une aide versée par la CAF pour réduire le loyer. Son montant dépend notamment du loyer, des revenus et de la composition du foyer. Elle peut changer avec le temps." },
      { kind: "apl", title: "Ta demande simulée" },
      { kind: "quiz", title: "Changement de situation", question: "Tes revenus augmentent nettement avec un nouveau travail. Que fais-tu ?", choices: [
        { label: "Rien, la CAF le saura toute seule", correct: false, why: "Il vaut mieux le déclarer toi-même : sinon tu risques de devoir rembourser un trop-perçu." },
        { label: "Je signale le changement sur mon espace CAF", correct: true, why: "Bien vu. Signaler vite évite les mauvaises surprises et garde tes droits justes." },
        { label: "J'arrête de payer mon loyer", correct: false, why: "Surtout pas : le loyer reste dû quoi qu'il arrive." },
      ] },
    ],
  },
  {
    id: "premiere-declaration",
    category: "impots",
    emoji: "🧾",
    title: "Première déclaration de revenus",
    intro: "Chaque année, on déclare ses revenus de l'année précédente. Entraîne-toi sur une déclaration simplifiée.",
    knowledge: ["Je sais à quoi sert une déclaration de revenus.", "Je sais vérifier les informations avant de déclarer.", "Je sais gérer une déclaration seul."],
    steps: [
      { kind: "info", title: "Pourquoi déclarer ?", text: "La déclaration permet de calculer l'impôt sur le revenu et certains droits (aides, logement social…). Même avec de petits revenus, on la fait : elle sert souvent de justificatif." },
      { kind: "quiz", title: "Prélèvement à la source", question: "Avec le prélèvement à la source, l'impôt est…", choices: [
        { label: "Retiré chaque mois de ton salaire", correct: true, why: "Oui, l'employeur le retient directement. La déclaration annuelle sert ensuite à faire le bilan." },
        { label: "Payé une seule fois en janvier", correct: false, why: "Non, il est étalé chaque mois sur le salaire." },
        { label: "Supprimé pour les jeunes", correct: false, why: "Non, mais beaucoup de jeunes ont un taux à 0 % s'ils gagnent peu." },
      ] },
      { kind: "tax", title: "Ta déclaration simulée" },
      { kind: "quiz", title: "Lire son avis", question: "Sur l'avis d'impôt, quelle est la différence entre « impôt calculé » et « reste à payer » ?", choices: [
        { label: "C'est la même chose", correct: false, why: "Non : une partie a souvent déjà été prélevée chaque mois." },
        { label: "Le reste à payer = impôt calculé − ce qui a déjà été prélevé", correct: true, why: "Exact. Le reste peut même être négatif : on te rembourse." },
      ] },
    ],
  },
];

export type DocInfo = { name: string; what: string; when: string; where: string; keep: string };

export const DOCUMENTS: DocInfo[] = [
  { name: "Pièce d'identité", what: "Prouver qui tu es.", when: "Banque, examen, voyage, démarches.", where: "Mairie (carte d'identité, passeport).", keep: "Tant qu'elle est valide, puis la renouveler." },
  { name: "Justificatif de domicile", what: "Prouver ton adresse.", when: "Ouvrir un compte, s'inscrire, papiers d'identité.", where: "Facture, quittance, attestation d'assurance.", keep: "Moins de 3 mois pour être accepté." },
  { name: "Contrat de travail", what: "Fixe ton poste, ton salaire, tes horaires.", when: "Litige, demande de prêt ou de logement.", where: "Remis par l'employeur.", keep: "Jusqu'à la retraite." },
  { name: "Fiche de paie", what: "Détaille ton salaire et les cotisations.", when: "Location, aides, retraite.", where: "Chaque mois, par l'employeur.", keep: "Jusqu'à la retraite." },
  { name: "Contrat de location (bail)", what: "Règles entre toi et le propriétaire.", when: "Aides au logement, litige, départ.", where: "Signé à l'entrée.", keep: "Jusqu'à 3 ans après ton départ." },
  { name: "Quittance de loyer", what: "Prouve que le loyer est payé.", when: "Justificatif de domicile, nouveau logement.", where: "Demande-la au propriétaire.", keep: "3 ans." },
  { name: "Avis d'impôt", what: "Résumé de ta situation fiscale.", when: "Logement, aides, bourses, prêts.", where: "Ton espace en ligne des impôts.", keep: "3 ans minimum." },
  { name: "Relevé bancaire", what: "Liste les opérations de ton compte.", when: "Vérifier ses dépenses, prouver un paiement.", where: "Application ou site de ta banque.", keep: "5 ans." },
  { name: "Attestation d'assurance", what: "Prouve que tu es assuré.", when: "Remise des clés, chaque année au propriétaire.", where: "Ton assureur.", keep: "Durée du contrat + 2 ans." },
];

// Fictional calendar: month (1-12) and day of each yearly deadline.
export const DEADLINES: { id: string; emoji: string; label: string; month: number; day: number; mission?: string }[] = [
  { id: "loyer", emoji: "🏠", label: "Payer le loyer du mois", month: 0, day: 5, mission: "premier-logement" },
  { id: "declaration", emoji: "🧾", label: "Déclarer ses revenus", month: 5, day: 31, mission: "premiere-declaration" },
  { id: "assurance", emoji: "🛡️", label: "Renouveler l'assurance habitation", month: 9, day: 1, mission: "premier-logement" },
  { id: "caf", emoji: "💶", label: "Vérifier ses informations CAF", month: 1, day: 15, mission: "decouvrir-caf" },
  { id: "avis", emoji: "📄", label: "Recevoir et lire son avis d'impôt", month: 8, day: 1, mission: "premiere-declaration" },
];
