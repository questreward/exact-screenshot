import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Bookmark, CheckCheck, Newspaper, Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { bookmarkNews, newsQuery } from "@/services/game";
import { filterNews, newsAge, newsDate, NEWS_CATEGORIES, NEWS_SCOPES, type NewsArticle, type NewsState } from "@/game/news";
import transportImage from "@/assets/news-transport.jpg";
import cultureImage from "@/assets/news-culture.jpg";

export function articleImage(key: string | null) {
  return key === "transport" ? transportImage : key === "culture" ? cultureImage : null;
}
export function useBookmark() {
  const q = useQueryClient();
  return useMutation({ mutationFn: bookmarkNews, onSuccess: () => q.invalidateQueries({ queryKey: newsQuery.queryKey }), onError: (e: Error) => toast.error(e.message) });
}
export function NewsLabels({ article: a, state }: { article: NewsArticle; state: NewsState }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold"><span className="text-primary">{a.category}</span><span className="text-muted-foreground">{NEWS_SCOPES[a.scope]}{a.city_name ? ` · ${a.city_name}` : a.scope === "regional" ? ` · ${a.region}` : ""}</span>{a.importance >= state.settings.important_threshold && <span className="text-primary">Important</span>}{!a.read_at && newsAge(a, state) === "new" && <span className="text-success">Nouveau</span>}{newsAge(a, state) === "archived" && <span className="text-muted-foreground">Archivé</span>}</div>;
}
export function NewsFeed() {
  const { data: state } = useSuspenseQuery(newsQuery);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState("all");
  const [archived, setArchived] = useState(false);
  const [limit, setLimit] = useState(state.settings.page_size);
  const bookmark = useBookmark();
  const articles = filterNews(state, { query, scope, category: category === "all" ? "" : category, mode, archived });
  return <div className="space-y-6 animate-rise">
    <header className="border-b border-border pb-5"><p className="mb-2 text-xs font-semibold uppercase text-primary">CIVITAS · Le journal du monde</p><div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold sm:text-4xl">Actualités</h1><Newspaper className="h-8 w-8 shrink-0 text-primary" /></div><p className="mt-3 text-sm text-muted-foreground">{newsDate(state.world_now)} · {state.unread_count} non lu{state.unread_count > 1 ? "s" : ""}</p></header>
    <div className="flex gap-1 overflow-x-auto border-b border-border pb-3" role="tablist" aria-label="Fil d’actualités">{[["all", "À la une", Newspaper], ["unread", "Non lus", CheckCheck], ["saved", "Enregistrés", Bookmark]].map(([id, label, Icon]) => { const Symbol = Icon as typeof Newspaper; return <Button key={String(id)} variant={mode === id ? "secondary" : "ghost"} role="tab" aria-selected={mode === id} onClick={() => { setMode(String(id)); setLimit(state.settings.page_size); }} className="shrink-0"><Symbol />{String(label)}</Button>; })}</div>
    <div className="space-y-3"><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Rechercher une actualité" placeholder="Titre, source, catégorie, ville…" value={query} onChange={e => { setQuery(e.target.value); setLimit(state.settings.page_size); }} className="h-12 pl-10" /></div>
      <div className="grid min-w-0 grid-cols-2 gap-3"><Select value={scope} onValueChange={v => { setScope(v); setLimit(state.settings.page_size); }}><SelectTrigger className="h-12 w-full min-w-0" aria-label="Portée des actualités"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem><SelectItem value="local">Locales</SelectItem><SelectItem value="regional">Régionales</SelectItem><SelectItem value="national">Nationales</SelectItem></SelectContent></Select><Select value={category} onValueChange={v => { setCategory(v); setLimit(state.settings.page_size); }}><SelectTrigger className="h-12 w-full min-w-0" aria-label="Catégorie des actualités"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les catégories</SelectItem>{NEWS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><label className="flex min-h-11 items-center gap-3"><Switch checked={archived} onCheckedChange={setArchived} aria-label="Inclure les archives" />Inclure les archives</label><Button asChild variant="ghost" className="px-2 text-xs"><Link to="/parametres"><SlidersHorizontal />Préférences</Link></Button></div></div>
    {articles.length === 0 ? <div className="border-y border-border py-14 text-center"><Newspaper className="mx-auto mb-4 h-8 w-8 text-muted-foreground" /><p className="font-semibold">{mode === "saved" ? "Aucun article enregistré." : mode === "unread" ? "Aucune actualité non lue." : "Aucun article pour cette recherche."}</p></div> : <div className="grid gap-5 lg:grid-cols-2">{articles.slice(0, limit).map((a, i) => { const image = articleImage(a.image); return <article key={a.id} className="relative min-w-0 overflow-hidden rounded-lg border border-border bg-card">{image && <Link to="/actualites/$id" params={{ id: a.id }} tabIndex={-1} aria-hidden="true"><img src={image} alt={a.category === "Culture" ? "Une rencontre culturelle dans CIVITAS" : "Les transports et la vie locale dans CIVITAS"} loading={i === 0 ? "eager" : "lazy"} width={1536} height={1024} className="aspect-[2/1] w-full object-cover" /></Link>}<div className="p-5"><NewsLabels article={a} state={state} /><h2 className="mt-3 text-xl font-semibold leading-snug break-words"><Link to="/actualites/$id" params={{ id: a.id }} className="transition-colors hover:text-primary">{a.title}</Link></h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.summary}</p><div className="mt-5 flex items-end justify-between gap-2 border-t border-border pt-3"><div className="min-w-0 text-xs"><p className="font-semibold">{a.source?.name ?? "CIVITAS"}</p><p className="mt-1 text-muted-foreground">{newsDate(a.published_at)}{a.read_at ? " · Lu" : ""}</p></div><Button size="icon" variant="ghost" title={a.bookmarked ? "Retirer des favoris" : "Enregistrer l’article"} aria-label={a.bookmarked ? "Retirer des favoris" : "Enregistrer l’article"} aria-pressed={a.bookmarked} disabled={bookmark.isPending} onClick={() => bookmark.mutate({ newsId: a.id, saved: !a.bookmarked })}><Bookmark className={a.bookmarked ? "fill-primary text-primary" : "text-muted-foreground"} /></Button></div></div></article>; })}</div>}
    {articles.length > limit && <Button variant="outline" className="w-full" onClick={() => setLimit(v => v + state.settings.page_size)}>Plus d’articles</Button>}
  </div>;
}
export function NewsSummary() {
  const { data: state } = useSuspenseQuery(newsQuery);
  const articles = filterNews(state, { query: "", scope: "", category: "", mode: "all", archived: false }).slice(0, 3);
  return <section className="border-y border-border py-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-semibold"><Newspaper className="h-5 w-5 text-primary" />Actualités</h2><span className="text-xs text-muted-foreground">{state.unread_count} non lus</span></div><ul className="divide-y divide-border">{articles.map(a => <li key={a.id}><Link to="/actualites/$id" params={{ id: a.id }} className="flex min-h-16 items-center justify-between gap-4 py-3 text-sm font-semibold hover:text-primary"><span>{a.title}<span className="mt-1 block text-xs font-normal text-muted-foreground">{a.source?.name} · {a.city_name ?? NEWS_SCOPES[a.scope]}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-primary" /></Link></li>)}</ul><Button asChild variant="link" className="mt-2 px-0"><Link to="/actualites">Voir les actualités<ArrowUpRight /></Link></Button></section>;
}