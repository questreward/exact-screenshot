import type { Sfx } from './sfx';

export type CabKind = 'pompiers' | 'police' | 'gendarmerie' | 'samu' | 'protection_civile';
export type Hotspot = { id: string; label: string; x: number; y: number; info: string; sound: Sfx };

/** Présentation seulement : quel intérieur afficher pour un métier. */
export function cabForJob(job: string): CabKind | null {
  if (job === 'pompier_pro' || job === 'pompier_vol') return 'pompiers';
  if (job === 'police') return 'police';
  if (job === 'gendarmerie') return 'gendarmerie';
  if (job.startsWith('samu_')) return 'samu';
  if (job === 'protection_civile') return 'protection_civile';
  return null;
}

export const CAB_TITLE: Record<CabKind, string> = {
  pompiers: 'Fourgon pompe-tonne (FPT)', police: 'Véhicule de patrouille', gendarmerie: 'Véhicule de brigade',
  samu: 'Cellule sanitaire SMUR', protection_civile: 'Véhicule de premiers secours (VPSP)',
};
export const CAB_SIREN: Record<CabKind, Sfx> = {
  pompiers: 'sirene_pompiers', police: 'sirene_police', gendarmerie: 'sirene_police', samu: 'sirene_pompiers', protection_civile: 'sirene_pompiers',
};

// Positions en % de l'image. Textes pédagogiques, jamais un fait de mission inventé.
export const CAB_HOTSPOTS: Record<CabKind, Hotspot[]> = {
  pompiers: [
    { id: 'radio', label: 'Radio', x: 63, y: 60, info: 'Le CTA-CODIS transmet l’adresse et la nature de l’appel reçu au 18 ou au 112.', sound: 'radio' },
    { id: 'gps', label: 'Tablette', x: 72, y: 55, info: 'La tablette affiche l’itinéraire et les points d’eau les plus proches.', sound: 'bip' },
    { id: 'ari', label: 'ARI', x: 22, y: 62, info: 'Appareil respiratoire isolant : environ 20 à 30 minutes d’air pour entrer dans la fumée.', sound: 'bip' },
    { id: 'casque', label: 'Casque F1', x: 27, y: 22, info: 'Le casque doré protège de la chaleur ; la visière se baisse avant d’entrer.', sound: 'bip' },
  ],
  police: [
    { id: 'radio', label: 'Radio', x: 66, y: 57, info: 'Les appels au 17 arrivent au centre d’information et de commandement, qui répartit les patrouilles.', sound: 'radio' },
    { id: 'terminal', label: 'Terminal', x: 51, y: 40, info: 'Le terminal embarqué permet de vérifier une plaque ou une identité.', sound: 'bip' },
    { id: 'pv', label: 'Carnet', x: 64, y: 88, info: 'Chaque intervention se termine par un compte rendu écrit.', sound: 'bip' },
  ],
  gendarmerie: [
    { id: 'radio', label: 'Radio', x: 60, y: 47, info: 'Le centre opérationnel de la gendarmerie (CORG) dirige les patrouilles hors des grandes villes.', sound: 'radio' },
    { id: 'carte', label: 'Carte', x: 62, y: 82, info: 'En zone rurale, la brigade couvre souvent plusieurs communes.', sound: 'bip' },
    { id: 'tablette', label: 'Tablette', x: 77, y: 55, info: 'La tablette NEOGEND sert à consulter les fichiers et rédiger sur place.', sound: 'bip' },
  ],
  samu: [
    { id: 'scope', label: 'Moniteur', x: 18, y: 17, info: 'Le scope surveille le cœur, la saturation en oxygène et la tension.', sound: 'bip' },
    { id: 'dae', label: 'Défibrillateur', x: 89, y: 30, info: 'Le défibrillateur analyse le rythme cardiaque avant de proposer un choc.', sound: 'bip' },
    { id: 'o2', label: 'Oxygène', x: 14, y: 65, info: 'L’oxygène est donné sur avis du médecin régulateur du 15.', sound: 'bip' },
    { id: 'brancard', label: 'Brancard', x: 52, y: 70, info: 'La victime est sanglée avant tout transport.', sound: 'bip' },
  ],
  protection_civile: [
    { id: 'sac', label: 'Sac de secours', x: 12, y: 30, info: 'Le sac contient pansements, attelles et matériel de premiers secours.', sound: 'bip' },
    { id: 'dae', label: 'Défibrillateur', x: 26, y: 38, info: 'Tout bénévole formé sait poser un défibrillateur automatisé.', sound: 'bip' },
    { id: 'couvertures', label: 'Couvertures', x: 47, y: 42, info: 'Les couvertures servent aussi lors des hébergements d’urgence.', sound: 'bip' },
    { id: 'gilet', label: 'Tenue', x: 87, y: 30, info: 'La tenue orange et bleue rend les bénévoles visibles sur les postes de secours.', sound: 'radio' },
  ],
};

/** Nombre de silhouettes à animer, proportionnel aux vrais participants (plafonné). */
export function crowdDots(participants: number): number {
  return Math.max(0, Math.min(60, Math.round(participants * 3)));
}
