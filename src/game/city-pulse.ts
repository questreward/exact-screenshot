// Bloc Ultime, priorité 1 : « la ville en direct ».
// Présentation uniquement : scènes d'ambiance déterministes tirées de l'heure du jeu et de la ville.
// Elles n'écrivent rien, ne donnent ni argent ni récompense et ne changent aucune jauge.

export type PulseKind =
  | "incendie" | "accident" | "malaise" | "panne" | "cambriolage" | "manifestation" | "embouteillage"
  | "livraison" | "client" | "affluence" | "politique" | "electricite" | "sport" | "meteo" | "incident";

export type PulseStage = "signale" | "en_cours" | "maitrise";

export type PulseScene = {
  id: string; kind: PulseKind; emoji: string; title: string; place: string;
  stage: PulseStage; stageLabel: string; responder: string | null;
  reactions: string[]; link: "/secours" | "/actualites" | "/carte";
};

type Def = { emoji: string; title: string; responder: string | null; places: string[]; reactions: string[]; link: PulseScene["link"] };

const DEFS: Record<PulseKind, Def> = {
  incendie: { emoji: "🔥", title: "Départ de feu", responder: "Pompiers", link: "/secours",
    places: ["un immeuble d'habitation", "une cuisine de restaurant", "un local poubelles", "un entrepôt"],
    reactions: ["Des habitants regardent depuis le trottoir d'en face.", "Une voisine appelle le 18.", "Les passants s'éloignent de la fumée.", "Quelqu'un filme la scène avec son téléphone.", "Les occupants suivent les consignes d'évacuation."] },
  accident: { emoji: "🚗", title: "Accrochage", responder: "Police", link: "/secours",
    places: ["un carrefour", "un rond-point", "le boulevard principal", "la sortie d'un parking"],
    reactions: ["Les conducteurs ralentissent.", "Deux automobilistes s'arrêtent pour aider.", "Un témoin appelle les secours.", "La circulation se fait sur une seule voie."] },
  malaise: { emoji: "🚑", title: "Personne qui fait un malaise", responder: "SAMU", link: "/secours",
    places: ["une station de métro", "un supermarché", "un parc", "une salle d'attente"],
    reactions: ["Un passant s'agenouille pour l'aider.", "Une cliente appelle le 15.", "Les curieux s'écartent pour laisser de la place.", "Un agent de sécurité apporte une couverture."] },
  panne: { emoji: "🛠️", title: "Véhicule en panne", responder: null, link: "/carte",
    places: ["une avenue", "un arrêt de bus", "une rue commerçante"],
    reactions: ["Des klaxons retentissent.", "Un livreur aide à pousser la voiture.", "Les piétons contournent le véhicule."] },
  cambriolage: { emoji: "🚨", title: "Tentative de cambriolage", responder: "Police", link: "/secours",
    places: ["une boutique de téléphones", "un appartement", "une pharmacie"],
    reactions: ["Le commerçant baisse son rideau.", "Des voisins sortent sur le palier.", "Un témoin donne une description à la police."] },
  manifestation: { emoji: "📣", title: "Rassemblement", responder: "Police", link: "/actualites",
    places: ["la place de la mairie", "devant la préfecture", "le parvis de la gare"],
    reactions: ["Des banderoles se lèvent.", "Des curieux s'arrêtent pour écouter.", "Les commerçants ferment leurs terrasses.", "Un journaliste interroge les participants."] },
  embouteillage: { emoji: "🚦", title: "Embouteillage", responder: null, link: "/carte",
    places: ["le périphérique", "l'entrée du centre-ville", "le pont principal"],
    reactions: ["Les bus prennent du retard.", "Des cyclistes remontent la file.", "Les conducteurs changent d'itinéraire."] },
  livraison: { emoji: "🚚", title: "Grosse livraison", responder: null, link: "/carte",
    places: ["le marché couvert", "un supermarché", "une rue piétonne"],
    reactions: ["Les livreurs déchargent les palettes.", "Les passants attendent sur le côté.", "Un commerçant vérifie la commande."] },
  client: { emoji: "😤", title: "Client mécontent", responder: null, link: "/carte",
    places: ["une boulangerie", "un guichet de banque", "une boutique de vêtements"],
    reactions: ["Le vendeur reste calme et propose une solution.", "Les autres clients patientent.", "Le responsable arrive."] },
  affluence: { emoji: "🛍️", title: "Commerce très fréquenté", responder: null, link: "/carte",
    places: ["le centre commercial", "une nouvelle boutique", "le marché"],
    reactions: ["Une file d'attente se forme dehors.", "Les vendeurs s'activent.", "Des amis se donnent rendez-vous devant l'entrée."] },
  politique: { emoji: "🏛️", title: "Rendez-vous politique", responder: null, link: "/actualites",
    places: ["la mairie", "une salle municipale", "un café du centre"],
    reactions: ["Des habitants posent des questions aux élus.", "Un militant distribue des tracts.", "La presse locale prend des notes."] },
  electricite: { emoji: "💡", title: "Coupure de courant", responder: null, link: "/carte",
    places: ["un quartier résidentiel", "une rue commerçante", "un groupe d'immeubles"],
    reactions: ["Les commerçants sortent sur le pas de la porte.", "Les feux de circulation clignotent.", "Une équipe technique arrive sur place."] },
  sport: { emoji: "⚽", title: "Rencontre sportive", responder: null, link: "/actualites",
    places: ["le stade municipal", "un gymnase", "un terrain de quartier"],
    reactions: ["Les supporters chantent.", "Les bars voisins se remplissent.", "Des familles arrivent en tramway."] },
  meteo: { emoji: "🌧️", title: "Grosse averse", responder: null, link: "/carte",
    places: ["le centre-ville", "les quais", "les grands boulevards"],
    reactions: ["Les passants courent se mettre à l'abri.", "Les terrasses se vident.", "Les parapluies s'ouvrent."] },
  incident: { emoji: "⚠️", title: "Incident dans un lieu public", responder: "Police", link: "/secours",
    places: ["une gare", "une bibliothèque", "un parc"],
    reactions: ["Un agent sécurise la zone.", "Les visiteurs sont orientés vers une autre sortie.", "Le calme revient peu à peu."] },
};

const KINDS = Object.keys(DEFS) as PulseKind[];
const STAGE_LABEL: Record<PulseStage, string> = { signale: "Signalé", en_cours: "Intervention en cours", maitrise: "Situation maîtrisée" };

/** Hachage simple et stable (même ville + même heure = mêmes scènes pour tout le monde). */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Trois scènes différentes par heure de jeu et par ville ; l'avancement suit les minutes. */
export function cityPulse(cityName: string, gameNow: Date): PulseScene[] {
  const hourKey = gameNow.toISOString().slice(0, 13);
  const minute = gameNow.getUTCMinutes();
  const used = new Set<PulseKind>();
  const scenes: PulseScene[] = [];
  for (let i = 0; used.size < 3 && i < 20; i++) {
    const seed = hash(`${cityName}|${hourKey}|${i}`);
    const kind = KINDS[seed % KINDS.length];
    if (used.has(kind)) continue;
    used.add(kind);
    const d = DEFS[kind];
    const offset = (seed >>> 8) % 30;
    const t = (minute + offset) % 60;
    const stage: PulseStage = t < 15 ? "signale" : t < 45 ? "en_cours" : "maitrise";
    const shown = stage === "signale" ? 1 : stage === "en_cours" ? 3 : d.reactions.length;
    const start = (seed >>> 4) % d.reactions.length;
    const reactions = Array.from({ length: Math.min(shown, d.reactions.length) }, (_, k) => d.reactions[(start + k) % d.reactions.length]);
    scenes.push({
      id: `${hourKey}-${kind}`, kind, emoji: d.emoji, title: d.title,
      place: d.places[(seed >>> 12) % d.places.length], stage, stageLabel: STAGE_LABEL[stage],
      responder: d.responder, reactions, link: d.link,
    });
  }
  return scenes;
}
