// Présentation seulement : décor et courriers affichés à l'entrée des espaces administratifs.
import type { PostLetter } from "./post";

export type DeskService = "caf" | "emploi" | "sante" | "banque" | "poste" | "impots" | "prefecture";

export const DESK: Record<DeskService, { title: string; place: string; online: string; sender: RegExp }> = {
  caf: { title: "Caisse des aides", place: "Accueil · guichet", online: "Mon compte en ligne", sender: /aide|caisse|alloc/i },
  emploi: { title: "Espace Emploi", place: "Agence · conseiller", online: "Mon espace candidat", sender: /emploi|travail/i },
  sante: { title: "Espace Santé", place: "Accueil · assurance maladie", online: "Mon compte santé", sender: /sant[ée]|maladie/i },
  banque: { title: "Banque", place: "Agence · conseiller", online: "Ma banque en ligne", sender: /banque/i },
  poste: { title: "La Poste", place: "Bureau de poste · guichet", online: "Ma boîte aux lettres", sender: /./ },
  impots: { title: "Impôts", place: "Centre des finances · accueil", online: "Mon espace fiscal", sender: /fiscal|imp[ôo]t/i },
  prefecture: { title: "Préfecture", place: "Hall des titres · guichets", online: "Mes démarches en ligne", sender: /titre|pr[ée]fecture/i },
};

// Courriers non lus venant de ce service, du plus récent au plus ancien.
export function unreadFor(service: DeskService, letters: PostLetter[]): PostLetter[] {
  const re = DESK[service].sender;
  return letters.filter((l) => !l.read_at && !l.archived && re.test(l.sender))
    .sort((a, b) => b.presented_at.localeCompare(a.presented_at));
}
