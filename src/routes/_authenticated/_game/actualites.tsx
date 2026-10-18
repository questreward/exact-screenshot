import { createFileRoute } from "@tanstack/react-router";
import { newsQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { NewsFeed } from "@/components/game/NewsFeed";
export const Route = createFileRoute("/_authenticated/_game/actualites")({
  head: () => ({ meta: gameMeta("Actualités", "Le journal fictif de CIVITAS : informations locales, régionales et nationales, sources et événements du monde.") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(newsQuery),
  component: NewsFeed,
});