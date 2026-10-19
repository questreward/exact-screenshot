import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Briefcase, Landmark, Newspaper, Users, Wallet } from "lucide-react";
import { PublicLayout } from "@/components/game/PublicLayout";
import { LearnShowcase } from "@/components/game/LearnShowcase";
import { Button } from "@/components/ui/button";
import world from "@/assets/world-square.jpg";

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
  return (
    <PublicLayout>
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
