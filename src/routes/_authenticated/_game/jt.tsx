import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Tv, Mic, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { answerTvInterview, citiesQuery, tvQuery, type TvSegment } from "@/services/game";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/_game/jt")({
  validateSearch: (s: Record<string, unknown>): { city?: string | undefined } => ({ city: typeof s["city"] === "string" ? s["city"] : undefined }),
  loaderDeps: ({ search }) => ({ city: search.city }),
  head: () => ({ meta: gameMeta("Journal télévisé", "Le JT local et national de CIVITAS : actualités du jour et interviews des personnalités.") }),
  loader: async ({ context: { queryClient: q }, deps }) => { await Promise.all([q.ensureQueryData(tvQuery(deps.city)), q.ensureQueryData(citiesQuery)]); },
  component: TvPage,
});

function Segments({ items, empty }: { items: TvSegment[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <ol className="space-y-3">{items.map((g, i) => <li key={g.id} className="rounded-lg border border-border bg-card p-4">
    <p className="text-xs text-primary">{g.kind === "interview" ? "Interview" : `Sujet ${i + 1}`}</p>
    <h3 className="font-semibold">{g.title}</h3>
    {g.body && <p className="mt-1 text-sm text-muted-foreground">{g.body}</p>}
    {g.news_id && <Button asChild variant="link" className="h-10 px-0"><Link to="/actualites/$id" params={{ id: g.news_id }}>Lire l'article</Link></Button>}
  </li>)}</ol>;
}

function Invitation({ id, question }: { id: string; question: string }) {
  const [answer, setAnswer] = useState("");
  const send = useLifeMutation(answerTvInterview, "Déclaration envoyée au JT");
  return <div className="space-y-2">
    <p className="text-sm font-medium">{question}</p>
    <Textarea value={answer} maxLength={280} onChange={e => setAnswer(e.target.value)} placeholder="Votre déclaration (280 caractères maximum)" />
    <p className="text-xs text-muted-foreground">{answer.length} / 280 · diffusée dans le JT de demain</p>
    <Button className="h-12" disabled={answer.trim().length < 10 || send.isPending} onClick={() => send.mutate({ interviewId: id, answer: answer.trim() })}>{send.isPending ? <LoaderCircle className="animate-spin" /> : <Mic />} Répondre</Button>
  </div>;
}

function TvPage() {
  const { city } = Route.useSearch();
  const { data: tv } = useSuspenseQuery(tvQuery(city));
  const { data: cities } = useSuspenseQuery(citiesQuery);
  const [tab, setTab] = useState<"local" | "national">("local");
  const cityName = cities.find(c => c.id === tv.city_id)?.name ?? tv.city_id;
  const date = new Date(tv.date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return <div className="space-y-6 animate-rise">
    <div className="flex items-center gap-3"><Tv className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Journal télévisé</h1><p className="text-sm capitalize text-muted-foreground">{date}</p></div></div>
    {tv.invitations.length > 0 && <section className="space-y-4 rounded-lg border border-primary bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Mic className="h-5 w-5 text-primary" />Vous êtes invité au JT</h2>
      {tv.invitations.map(iv => iv.answer ? <p key={iv.id} className="text-sm">« {iv.answer} » <span className="block text-xs text-muted-foreground">Réponse enregistrée, diffusée demain.</span></p> : <Invitation key={iv.id} id={iv.id} question={iv.question} />)}
    </section>}
    <div className="grid grid-cols-2 gap-2">
      <Button className="h-12" variant={tab === "local" ? "default" : "outline"} onClick={() => setTab("local")}>JT de {cityName}</Button>
      <Button className="h-12" variant={tab === "national" ? "default" : "outline"} onClick={() => setTab("national")}>JT national</Button>
    </div>
    {tab === "local" && <nav className="flex flex-wrap gap-2">{cities.map(c => <Button key={c.id} size="sm" className="h-10" variant={tv.city_id === c.id ? "secondary" : "ghost"} asChild><Link to="/jt" search={{ city: c.id }}>{c.name}</Link></Button>)}</nav>}
    {tab === "local" ? <Segments items={tv.local} empty="Journée calme : aucun sujet local aujourd'hui." /> : <Segments items={tv.national} empty="Aucun sujet national aujourd'hui." />}
  </div>;
}
