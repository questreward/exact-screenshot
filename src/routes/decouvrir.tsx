import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Briefcase, Landmark, Newspaper, Users, Wallet } from "lucide-react";
import { PublicLayout } from "@/components/game/PublicLayout";
import { LearnShowcase } from "@/components/game/LearnShowcase";
import { Button } from "@/components/ui/button";
import world from "@/assets/world-square.jpg";
import sTrain from "@/assets/v2/int-train.webp";
import sPompiers from "@/assets/v2/cab-pompiers.webp";
import sCaf from "@/assets/v2/desk-caf.webp";
import sMairie from "@/assets/v2/inst-mairie.webp";
import sManif from "@/assets/v2/manif.webp";
import sShop from "@/assets/v2/shop-mode.webp";

const SHOTS = [
  { src: sTrain, label: "Prendre le train vers une autre ville" },
  { src: sPompiers, label: "Partir en intervention avec les pompiers" },
  { src: sCaf, label: "Faire ses démarches au guichet de la CAF" },
  { src: sMairie, label: "Siéger au conseil municipal" },
  { src: sManif, label: "Manifester pour son quartier" },
  { src: sShop, label: "Faire les boutiques" },
];
const STRENGTHS = [
  "100 % gratuit, sur téléphone et ordinateur",
  "5 vraies villes françaises sur une vraie carte",
  "Des habitants qui vivent, parlent et réagissent",
  "Du lycée jusqu'à l'Élysée : 577 sièges de député",
  "Jouer avec et contre de vrais joueurs",
  "Tout est fictif : tu apprends sans risque",
];

export const Route = createFileRoute("/decouvrir")({
  head: () => ({
    meta: [
      { title: "Découvrir le jeu — CIVITAS" },
      { name: "description", content: "Études, travail, argent, démarches, élections : découvrez ce que l'on vit et apprend dans CIVITAS." },
      { property: "og:title", content: "Découvrir CIVITAS" },
      { property: "og:description", content: "Une vie entière à construire dans une France contemporaine vivante, pour comprendre le pays en jouant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (q: Record<string, unknown>): { ami?: string } => {
    const a = typeof q["ami"] === "string" ? q["ami"].replace(/[^\p{L} '-]/gu, "").trim().slice(0, 30) : "";
    return a ? { ami: a } : {};
  },
  component: Discover,
});

const STEPS = [
  { icon: GraduationCap, title: "Étudier", text: "Lycée, études, diplômes : ton parcours commence à 16 ans." },
  { icon: Briefcase, title: "Travailler", text: "Entretiens, promotions, chômage, ou ta propre entreprise." },
  { icon: Wallet, title: "Gérer", text: "Loyer, banque, impôts, achats : ton argent, tes choix." },
  { icon: Users, title: "S'engager", text: "Associations, syndicats, manifestations, pétitions." },
  { icon: Newspaper, title: "Informer", text: "Journaliste, débats publics, vérification des faits." },
  { icon: Landmark, title: "Gouverner", text: "Maire, député, ministre : tes décisions changent la ville." },
];

function Discover() {
  const { ami } = Route.useSearch();
  return (
    <PublicLayout>
      {ami && <p className="mt-2 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-center font-semibold">🎉 {ami} t'invite à rejoindre CIVITAS !</p>}
      <div className="relative mt-4 overflow-hidden rounded-3xl border border-border shadow-elegant">
        <img src={world} alt="Une place de ville française animée dans CIVITAS" className="h-64 w-full object-cover sm:h-80" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h1 className="font-display text-3xl font-bold sm:text-5xl">Une vie. Mille trajectoires.</h1>
          <p className="mt-2 text-foreground/90">Un monde persistant inspiré de la France d'aujourd'hui.</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-border bg-gradient-card p-4 shadow-card">
            <Icon className="h-6 w-6 text-primary" />
            <h2 className="mt-2 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="hero" size="lg" className="min-h-12 w-full sm:w-auto"><Link to="/auth" search={{ mode: "signup" }}>Créer mon personnage</Link></Button>
        <Button asChild variant="outline" size="lg" className="min-h-12 w-full sm:w-auto"><a href="#apercus">Voir des images du jeu</a></Button>
      </div>

      <h2 className="mt-14 mb-4 font-display text-3xl font-bold">Les points forts</h2>
      <ul className="grid gap-2 sm:grid-cols-2">{STRENGTHS.map((t) => <li key={t} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 text-sm font-medium"><span className="text-primary">✓</span>{t}</li>)}</ul>

      <h2 id="apercus" className="mt-14 mb-4 scroll-mt-6 font-display text-3xl font-bold">Dans le jeu</h2>
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3">
        {SHOTS.map((s) => <figure key={s.label} className="w-60 shrink-0 snap-center">
          <div className="overflow-hidden rounded-[2rem] border-4 border-foreground/80 bg-card shadow-elegant"><img src={s.src} alt={s.label} loading="lazy" className="aspect-[9/16] w-full object-cover" /></div>
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">{s.label}</figcaption></figure>)}
      </div>

      <h2 className="mt-16 mb-8 font-display text-3xl font-bold">Ce que tu apprends en jouant</h2>
      <LearnShowcase />

      <div className="mt-16 rounded-3xl border border-border bg-gradient-card p-6 text-center shadow-card">
        <p className="font-display text-xl font-bold">Prêt à écrire ta vie ?</p>
        <p className="mt-1 text-sm text-muted-foreground">Tout est fictif : montants, personnages et institutions. Rien n'est réel, sauf ce que tu apprends.</p>
        <Button asChild variant="hero" size="lg" className="mt-5 w-full sm:w-auto">
          <Link to="/auth" search={{ mode: "signup" }}>Commencer</Link>
        </Button>
      </div>
    </PublicLayout>
  );
}
