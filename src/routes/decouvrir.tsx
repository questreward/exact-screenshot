import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Briefcase, Landmark, Newspaper, Users, Smartphone } from "lucide-react";
import { PublicLayout } from "@/components/game/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/decouvrir")({
  head: () => ({
    meta: [
      { title: "Découvrir le jeu — CIVITAS" },
      { name: "description", content: "Découvrez CIVITAS : étudier, travailler, entreprendre, s'engager et peut-être gouverner." },
      { property: "og:title", content: "Découvrir CIVITAS" },
      { property: "og:description", content: "Une vie entière à construire dans une France contemporaine vivante." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

const PILLARS = [
  { icon: GraduationCap, title: "Étudier", text: "Commencez dès 16 ans et construisez votre parcours." },
  { icon: Briefcase, title: "Travailler", text: "Trouvez un emploi, changez de voie, entreprenez." },
  { icon: Newspaper, title: "Informer", text: "Devenez journaliste et influencez l'opinion." },
  { icon: Users, title: "S'engager", text: "Rejoignez ou fondez associations et organisations." },
  { icon: Landmark, title: "Gouverner", text: "Entrez en politique, briguez des mandats." },
  { icon: Smartphone, title: "Vivre", text: "Votre téléphone est votre fenêtre sur le monde." },
];

function Discover() {
  return (
    <PublicLayout>
      <h1 className="mt-6 text-4xl font-bold">Une vie. Mille trajectoires.</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        CIVITAS est un monde persistant inspiré de la France contemporaine. Chaque joueur y mène sa propre vie, et ensemble ils façonnent la société.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PILLARS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card">
            <Icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Le jeu se construit étape par étape. Aujourd'hui : création du personnage, tableau de bord et téléphone.
      </p>
      <Button asChild variant="hero" size="lg" className="mt-8 w-full sm:w-auto">
        <Link to="/auth" search={{ mode: "signup" }}>Commencer</Link>
      </Button>
    </PublicLayout>
  );
}
