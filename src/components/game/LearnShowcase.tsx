import life from "@/assets/learn-life.jpg";
import politics from "@/assets/learn-politics.jpg";
import admin from "@/assets/learn-admin.jpg";
import society from "@/assets/learn-society.jpg";
import { cn } from "@/lib/utils";

export const LEARN = [
  { img: life, tag: "Vie et carrière", title: "Construire sa vie dès 16 ans",
    alt: "Une étudiante à la bibliothèque puis en route vers son travail",
    points: ["Choisir ses études et son orientation", "Passer des entretiens d'embauche", "Gérer son énergie et son agenda"] },
  { img: admin, tag: "Argent et démarches", title: "Comprendre le budget et les papiers",
    alt: "Une jeune femme fait son budget avec ses factures et son téléphone",
    points: ["Lire un bail, payer un loyer", "Comprendre impôts, CAF et assurance", "Éviter le découvert, épargner, acheter"] },
  { img: politics, tag: "Citoyenneté", title: "Voter, débattre, gouverner",
    alt: "Un conseil municipal et une électrice qui glisse son bulletin dans l'urne",
    points: ["Comment fonctionne une mairie", "Se présenter à une élection", "Voter des lois à l'Assemblée"] },
  { img: society, tag: "Société", title: "Agir dans une ville vivante",
    alt: "Une commerçante ouvre sa boutique pendant une manifestation filmée par le JT",
    points: ["Créer et gérer son entreprise", "Manifester, signer des pétitions", "Vérifier l'info, faire la une du JT"] },
];

export function LearnShowcase() {
  return (
    <div className="space-y-14 sm:space-y-20">
      {LEARN.map((l, i) => (
        <article key={l.title} className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
          <img src={l.img} alt={l.alt} width={1280} height={832} loading="lazy"
            className={cn("w-full rounded-3xl border border-border object-cover shadow-elegant", i % 2 && "md:order-2")} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{l.tag}</p>
            <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{l.title}</h3>
            <ul className="mt-4 space-y-2">
              {l.points.map((p) => (
                <li key={p} className="flex gap-3 text-muted-foreground"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />{p}</li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}
