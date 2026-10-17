import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/game/PublicLayout";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — CIVITAS" },
      { name: "description", content: "Mentions légales du jeu CIVITAS." },
      { property: "og:title", content: "Mentions légales — CIVITAS" },
      { property: "og:description", content: "Informations légales relatives au jeu CIVITAS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicLayout>
      <article className="mt-6 space-y-4 text-muted-foreground">
        <h1 className="text-3xl font-bold text-foreground">Mentions légales</h1>
        <p>CIVITAS est un prototype de jeu vidéo en cours de développement.</p>
        <p><strong className="text-foreground">Éditeur :</strong> [Nom de l'éditeur]</p>
        <p><strong className="text-foreground">Hébergement :</strong> Lovable.</p>
        <p>CIVITAS est une œuvre de fiction. Toute ressemblance avec des personnes ou partis existants serait fortuite.</p>
      </article>
    </PublicLayout>
  ),
});
