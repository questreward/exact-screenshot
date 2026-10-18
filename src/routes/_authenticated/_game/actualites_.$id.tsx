import { createFileRoute } from "@tanstack/react-router";
import { newsQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { NewsArticlePage } from "@/components/game/NewsArticlePage";
export const Route = createFileRoute("/_authenticated/_game/actualites_/$id")({
  loader: async ({ context, params }) => { const state = await context.queryClient.ensureQueryData(newsQuery); return state.articles.find(a => a.id === params.id); },
  head: ({ loaderData }) => ({ meta: gameMeta(loaderData?.title ?? "Article indisponible", loaderData?.summary ?? "Retrouvez les articles, les sources et les événements du monde CIVITAS.") }),
  component: ArticleRoute,
});
function ArticleRoute() { const { id } = Route.useParams(); return <NewsArticlePage id={id} />; }