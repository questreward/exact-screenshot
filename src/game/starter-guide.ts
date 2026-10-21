// Guide « Commencer CIVITAS » : 6 questions, réponses tirées de la situation réelle du joueur.
export type GuideInput = { firstName: string; age: number; city?: string | null; housing?: string | null; job?: string | null; studying?: string | null; balance?: number | null; hasVehicle: boolean };
export type GuideStep = { n: number; q: string; a: string; to: string; cta: string; done: boolean };

const euro = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

export function starterGuide(i: GuideInput): GuideStep[] {
  return [
    { n: 1, q: "Qui suis-je ?", a: `${i.firstName}, ${i.age} ans${i.city ? `, à ${i.city}` : ""}.`, to: "/mon-profil", cta: "Mon profil", done: true },
    { n: 2, q: "Où est-ce que je vis ?", a: i.housing ? `Tu habites : ${i.housing}.` : "Tu n'as pas encore de logement.", to: i.housing ? "/chez-moi" : "/logement", cta: i.housing ? "Chez moi" : "Chercher un logement", done: !!i.housing },
    { n: 3, q: "Comment gagner de l'argent ?", a: i.job ? `Tu travailles : ${i.job}.` : i.studying ? `Tu étudies (${i.studying}). Un petit job est possible selon ton âge.` : i.age >= 18 ? "Trouve un emploi pour toucher un salaire." : "À ton âge, tu commences par les études.", to: i.job ? "/carriere" : i.age >= 18 ? "/espace-emploi" : "/etudes", cta: i.job ? "Mon travail" : i.age >= 18 ? "Voir les offres" : "Mes études", done: !!i.job || !!i.studying },
    { n: 4, q: "Comment me déplacer ?", a: i.hasVehicle ? "Tu as un véhicule. Ouvre la carte, choisis un lieu, puis Conduire." : "À pied, en bus ou en train depuis la carte.", to: "/carte", cta: "Ouvrir la carte", done: true },
    { n: 5, q: "Que puis-je acheter ?", a: i.balance != null ? `Tu as ${euro(i.balance)} sur ton compte. Courses, meubles, vêtements à la boutique.` : "Courses, meubles, vêtements à la boutique.", to: "/boutique", cta: "Boutique", done: true },
    { n: 6, q: "Que puis-je faire ensuite ?", a: "Rencontre des habitants, engage-toi dans ta ville, vote, monte ton projet.", to: "/ma-ville", cta: "Ma Ville", done: false },
  ];
}
