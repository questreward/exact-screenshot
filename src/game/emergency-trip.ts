// Presentation only: base, vehicle and destination kind for a stored security mission id.
// The destination is the place type already described by the stored mission text; no outcome is implied.
export type EmergencyTrip = { base: string; vehicle: string; emoji: string; dest: string | null; destLabel: string };

const DEST: Record<string, [string | null, string]> = {
  "pol-patrouille": ["logement", "Hall d'immeuble"], "pol-plainte": [null, "Accueil au commissariat"],
  "pol-cambriolage": ["logement", "Logement cambriolé"], "pol-manif": ["place", "Parcours de la manifestation"], "pol-crise": ["mairie", "Secteur en crise"],
  "gen-route": ["station", "Point de contrôle routier"], "gen-surveillance": ["place", "Secteur surveillé"],
  "gen-cambriolage": ["logement", "Logement cambriolé"], "gen-manif": ["place", "Manifestation"], "gen-crise": ["mairie", "Zone à évacuer"],
  "samu-malaise": ["logement", "Domicile de la victime"], "samu-respiration": ["logement", "Domicile du patient"],
  "samu-accident": ["station", "Lieu de l'accident"], "samu-crise": ["mairie", "Afflux de blessés"], "samu-manif": ["place", "Poste médical"],
  "feu-malaise": ["logement", "Domicile de la victime"], "feu-accident": ["station", "Lieu de l'accident"],
  "feu-incendie": ["logement", "Feu signalé"], "feu-crise": ["mairie", "Renfort en ville"], "feu-manif": ["place", "Poste de secours"],
  "pc-poste": ["place", "Poste de secours"], "pc-crise": ["mairie", "Accueil des sinistrés"], "pc-manif": ["place", "Manifestation"], "pc-signalement": ["place", "Soutien à la population"],
};

export function emergencyTrip(service: string, missionId: string): EmergencyTrip {
  const [dest, destLabel] = DEST[missionId] ?? [null, "Sur place"];
  if (service === "police") return { base: "Commissariat", vehicle: "Voiture de police", emoji: "🚓", dest, destLabel };
  if (service === "gendarmerie") return { base: "Brigade de gendarmerie", vehicle: "Véhicule de gendarmerie", emoji: "🚓", dest, destLabel };
  if (service.startsWith("samu")) return { base: "Hôpital", vehicle: "Ambulance du SAMU", emoji: "🚑", dest, destLabel };
  if (service.startsWith("pompier")) return { base: "Caserne", vehicle: "Camion de pompiers", emoji: "🚒", dest, destLabel };
  return { base: "Local de la Protection civile", vehicle: "Véhicule de secours", emoji: "🚐", dest, destLabel };
}
