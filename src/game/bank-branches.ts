// Positions fournies par le localisateur officiel Banque Populaire, vérifiées le 21/10/2026.
// Lieux réels uniquement : aucune affiliation, conseillers/opérations entièrement fictifs.
export const BANK_BRANCHES: Record<string, { name: string; address: string; at: [number, number]; source: string }> = {
  paris: { name: 'Banque Populaire · Paris République', address: '1 boulevard Magenta, 75010 Paris', at: [2.3623218, 48.8692804], source: 'https://agences.banquepopulaire.fr/fr/agence/paris-republique-1020700131' },
  lyon: { name: 'Banque Populaire · Lyon Tête d’Or Kléber', address: '2 place Kléber, 69006 Lyon', at: [4.8489518, 45.7692636], source: 'https://agences.banquepopulaire.fr/fr/agence/lyon-tete-d-or-kleber-1680700429' },
  marseille: { name: 'Banque Populaire · Marseille Vieux Port', address: '12 La Canebière, 13001 Marseille', at: [5.3752449, 43.2955269], source: 'https://agences.banquepopulaire.fr/fr/agence/marseille-vieux-port-1460700070' },
  bordeaux: { name: 'Banque Populaire · Bordeaux Pey Berland', address: '2 rue Dufour Dubergier, 33000 Bordeaux', at: [-0.5758874, 44.8367596], source: 'https://agences.banquepopulaire.fr/fr/agence/bordeaux-pey-berland-1090700049' },
  lille: { name: 'Banque Populaire · Lille Nationale', address: '106 rue Nationale, 59800 Lille', at: [3.0576322, 50.6348626], source: 'https://agences.banquepopulaire.fr/fr/agence/lille-nationale-1350700157' },
};