import { createFileRoute, Link } from "@tanstack/react-router";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/aide")({
  head: () => ({ meta: gameMeta("Aide", "Comprendre CIVITAS en quelques minutes : travailler, gagner de l'argent, se loger, conduire, la carte, le social et la politique.") }),
  component: HelpPage,
});

type Topic = { emoji: string; title: string; text: string[]; to: string; cta: string };
const TOPICS: Topic[] = [
  { emoji: "🚀", title: "Commencer", text: ["Ton accueil te dit quoi faire maintenant (carte « Prochaine étape »).", "La barre du bas mène à l'essentiel ; « Plus » montre tout le reste."], to: "/tableau-de-bord", cta: "Mon accueil" },
  { emoji: "💼", title: "Travailler", text: ["Rends-toi à ton travail (marque 💼 sur la carte), prends ton service, fais les vérifications.", "Pendant le service, des clients ou des appels arrivent : choisis comment réagir. Le salaire arrive à la fin."], to: "/carriere", cta: "Ma carrière" },
  { emoji: "💶", title: "Gagner de l'argent", text: ["Salaire, situations du jour (20 à 80 €), ventes de ton entreprise.", "Tout est noté à la banque avec l'origine de chaque opération."], to: "/banque", cta: "Ma banque" },
  { emoji: "🛍️", title: "Acheter", text: ["La boutique a des promos chaque semaine et des soldes en janvier et juillet.", "Un produit très demandé peut coûter un peu plus cher."], to: "/boutique", cta: "La boutique" },
  { emoji: "🏠", title: "Se loger", text: ["Loue ou achète, puis aménage ton logement et invite tes amis."], to: "/logement", cta: "Logement" },
  { emoji: "🚗", title: "Conduire", text: ["Surveille l'essence et l'état du véhicule ; fais le plein en station.", "Le contrôle technique détecte les problèmes."], to: "/conduite", cta: "En route" },
  { emoji: "🗺️", title: "Utiliser la carte", text: ["Appuie sur un lieu pour voir sa fiche, ses horaires et sa fréquentation.", "⭐ pour le garder en favori ; tes lieux récents apparaissent en haut."], to: "/carte", cta: "La carte" },
  { emoji: "👥", title: "Social", text: ["Ajoute des amis, suis des joueurs, rejoins des associations, discute avec les habitants."], to: "/reseau", cta: "Mon réseau" },
  { emoji: "🏛️", title: "Politique", text: ["Rejoins un parti, présente-toi, fais campagne, vote. Les élus prennent des décisions visibles dans la ville."], to: "/politique", cta: "CIVITAS Politique" },
  { emoji: "🏢", title: "Entreprises", text: ["Ouvre un garage ou une société, fixe ton tarif, lance des promotions de 3 jours."], to: "/services", cta: "Mon entreprise" },
  { emoji: "📅", title: "Événements", text: ["La ville vit : événements, crises, actualités et JT. Les importants arrivent en notification."], to: "/evenements", cta: "Événements" },
];

function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="font-heading text-2xl font-bold">❓ Aide</h1>
        <p className="text-sm text-muted-foreground">Tout CIVITAS expliqué simplement. Appuie sur un thème.</p>
      </header>
      {TOPICS.map((t) => (
        <details key={t.title} className="rounded-2xl border border-border bg-card p-4">
          <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold"><span className="text-2xl">{t.emoji}</span>{t.title}</summary>
          <ul className="mt-2 space-y-1 text-sm">{t.text.map((x) => <li key={x}>• {x}</li>)}</ul>
          <Link to={t.to as "/carte"} className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">{t.cta} →</Link>
        </details>
      ))}
      <section className="rounded-2xl bg-accent/60 p-4 text-sm">
        <p className="font-semibold">🆘 Besoin d'aide ?</p>
        <p className="mt-1">Le guide de la ville te propose des activités selon ton envie.</p>
        <Link to="/guide" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-card font-semibold">Ouvrir le guide →</Link>
      </section>
    </div>
  );
}
