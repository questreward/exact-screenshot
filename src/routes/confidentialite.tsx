import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/game/PublicLayout";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Confidentialité — CIVITAS" },
      { name: "description", content: "Comment CIVITAS protège vos données personnelles." },
      { property: "og:title", content: "Politique de confidentialité — CIVITAS" },
      { property: "og:description", content: "Vos données, leur usage et vos droits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicLayout>
      <article className="mt-6 space-y-4 text-muted-foreground">
        <h1 className="text-3xl font-bold text-foreground">Politique de confidentialité</h1>
        <p>Nous collectons uniquement votre adresse e-mail (pour votre compte) et les informations de votre personnage.</p>
        <p>Votre mot de passe n'est jamais stocké en clair ni accessible par l'équipe du jeu.</p>
        <p>Chaque joueur ne peut consulter que ses propres données privées (personnage, banque, paramètres).</p>
        <p>Vous pouvez demander la suppression de votre compte à tout moment.</p>
      </article>
    </PublicLayout>
  ),
});
