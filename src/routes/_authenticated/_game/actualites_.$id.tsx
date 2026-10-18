import { createFileRoute } from "@tanstack/react-router";
import { markNewsRead, newsQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { NewsArticlePage } from "@/components/game/NewsArticlePage";
export const Route = createFileRoute("/_authenticated/_game/actualites_/$id")({
  loader: async ({ context, params }) => {
    const state = await context.queryClient.ensureQueryData(newsQuery);
    const article = state.articles.find(a => a.id === params.id);
    if (!article || article.read_at) return article;
    await markNewsRead(article.id);
    const updated = await context.queryClient.fetchQuery(newsQuery);
    return updated.articles.find(a => a.id === params.id);
  },
  head: ({ loaderData }) => ({ meta: gameMeta(loaderData?.title ?? "Article indisponible", loaderData?.summary ?? "Retrouvez les articles, les sources et les événements du monde CIVITAS.") }),
  component: ArticleRoute,
});
function ArticleRoute() { const { id } = Route.useParams(); return <NewsArticlePage id={id} />; }