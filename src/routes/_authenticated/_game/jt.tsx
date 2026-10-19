import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Tv, Mic, LoaderCircle, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, CloudSun, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { answerTvInterview, citiesQuery, politicsQuery, tvQuery, type TvSegment } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { CHANNELS, popularityBarometer, speechFor, weatherFor, anchorFor, reporterFor, topicFor, TOPIC_VIDEO, type ChannelId } from "@/game/tv";
import anchorNational from "@/assets/tv-anchor-national.jpg";
import anchorLocal from "@/assets/tv-anchor-local.jpg";
import anchorInfo from "@/assets/tv-anchor-info.jpg";

const castImages = import.meta.glob("@/assets/tv/*.jpg", { eager: true, import: "default" }) as Record<string, string>;
const IMG: Record<string, string> = { "anchor-national": anchorNational, "anchor-local": anchorLocal, "anchor-info": anchorInfo };
for (const [path, url] of Object.entries(castImages)) IMG[path.split("/").pop()!.replace(".jpg", "")] = url;

export const Route = createFileRoute("/_authenticated/_game/jt")({
  validateSearch: (s: Record<string, unknown>): { city?: string | undefined } => ({ city: typeof s["city"] === "string" ? s["city"] : undefined }),
  loaderDeps: ({ search }) => ({ city: search.city }),
  head: () => ({ meta: gameMeta("Journal télévisé", "Trois chaînes, un présentateur, la météo, le baromètre des partis et les joueurs à l'antenne.") }),
  loader: async ({ context: { queryClient: q }, deps }) => { await Promise.all([q.ensureQueryData(tvQuery(deps.city)), q.ensureQueryData(citiesQuery), q.ensureQueryData(politicsQuery)]); },
  component: TvPage,
});

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

function useVoice() {
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported(typeof window !== "undefined" && "speechSynthesis" in window); return () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }; }, []);
  const speak = (text: string, onEnd: () => void) => {
    const synth = window.speechSynthesis; synth.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = "fr-FR"; u.rate = 1.02;
    const fr = synth.getVoices().find(v => v.lang.startsWith("fr")); if (fr) u.voice = fr;
    u.onend = onEnd; synth.speak(u);
  };
  const stop = () => { if (supported) window.speechSynthesis.cancel(); };
  return { supported, speak, stop };
}

function Studio({ channel, segments, ticker, cityName }: { channel: ChannelId; segments: TvSegment[]; ticker: string[]; cityName: string }) {
  const info = CHANNELS.find(c => c.id === channel)!;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const voice = useVoice();
  const seg = segments[idx];

  useEffect(() => { setIdx(0); setPlaying(false); voice.stop(); }, [channel, segments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing || !seg) return;
    const next = () => setIdx(i => { if (i + 1 >= segments.length) { setPlaying(false); return i; } return i + 1; });
    if (voiceOn && voice.supported) { voice.speak(speechFor(seg.kind, seg.title, seg.body), next); return () => voice.stop(); }
    const t = window.setTimeout(next, 9000); return () => window.clearTimeout(t);
  }, [playing, idx, voiceOn, seg]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (d: number) => { voice.stop(); setIdx(i => Math.min(Math.max(i + d, 0), Math.max(segments.length - 1, 0))); };

  const today = new Date().toISOString().slice(0, 10);
  const anchor = anchorFor(channel, today);
  const topic = seg ? (seg.kind === "interview" ? "general" : topicFor(`${seg.title} ${seg.body}`)) : "general";
  const reporter = reporterFor(channel, topic, seg ? `${seg.title}|${today}` : today);
  const video = seg && seg.kind !== "interview" ? TOPIC_VIDEO[topic] : undefined;
  // Plateau : présentateur 4 s, puis reportage (vidéo ou reporter sur place) pendant la lecture.
  const [onSet, setOnSet] = useState(true);
  useEffect(() => { setOnSet(true); if (!playing) return; const t = window.setTimeout(() => setOnSet(false), 4000); return () => window.clearTimeout(t); }, [idx, playing, channel]);
  const showReport = playing && !onSet && seg;
  const person = showReport ? reporter : anchor;

  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
    <div className="relative aspect-video w-full overflow-hidden bg-muted">
      {showReport && video
        ? <video key={video} src={`/tv/${video}.mp4`} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        : <img key={person.id + idx} src={IMG[person.id]} alt={`${person.name}, ${person.role === "anchor" ? "présentateur" : "journaliste"} de ${info.name}`} width={1280} height={720} className={`absolute inset-0 h-full w-full object-cover ${playing ? "animate-[tvzoom_12s_ease-out_forwards]" : ""}`} />}
      {showReport && video && <img src={IMG[reporter.id]} alt={reporter.name} width={1280} height={720} className="absolute bottom-16 right-3 aspect-video w-1/3 rounded border-2 border-primary object-cover shadow-lg sm:bottom-24" />}
      <div className="absolute left-3 top-3 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">{info.name}</div>
      {playing && <div className="absolute right-3 top-3 flex items-center gap-1 rounded bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" />EN DIRECT</div>}
      {seg && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/90 to-transparent p-3 pt-10 sm:p-5 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{seg.kind === "interview" ? "Joueur à l'antenne" : channel === "local" ? cityName : "À la une"} · {idx + 1}/{segments.length}{showReport ? ` · ${reporter.name}, sur place` : ""}</p>
        <h3 className="font-heading text-lg font-bold leading-tight sm:text-2xl">{seg.title}</h3>
      </div>}
    </div>
    {ticker.length > 0 && <div className="flex items-center overflow-hidden bg-primary text-primary-foreground">
      <span className="shrink-0 bg-foreground px-3 py-2 text-xs font-bold text-background">FLASH</span>
      <div className="relative flex-1 overflow-hidden whitespace-nowrap py-2 text-sm"><span className="inline-block animate-[tvticker_40s_linear_infinite] pl-[100%]">{ticker.join("  •  ")}</span></div>
    </div>}
    <div className="space-y-3 p-4">
      {seg ? <>
        {seg.body && <p className="text-sm leading-relaxed text-muted-foreground">{seg.body}</p>}
        {seg.news_id && <Button asChild variant="link" className="h-10 px-0"><Link to="/actualites/$id" params={{ id: seg.news_id }}>Lire l'article complet</Link></Button>}
      </> : <p className="text-sm text-muted-foreground">Journée calme : aucun sujet pour cette édition.</p>}
      <div className="grid grid-cols-4 gap-2">
        <Button variant="outline" className="h-12" aria-label="Sujet précédent" disabled={idx === 0} onClick={() => go(-1)}><SkipBack /></Button>
        <Button className="h-12" aria-label={playing ? "Pause" : "Lancer le JT"} disabled={!segments.length} onClick={() => { if (playing) voice.stop(); setPlaying(p => !p); }}>{playing ? <Pause /> : <Play />}</Button>
        <Button variant="outline" className="h-12" aria-label="Sujet suivant" disabled={idx >= segments.length - 1} onClick={() => go(1)}><SkipForward /></Button>
        <Button variant="outline" className="h-12" aria-label={voiceOn ? "Couper la voix" : "Activer la voix"} disabled={!voice.supported} onClick={() => { voice.stop(); setVoiceOn(v => !v); }}>{voiceOn ? <Volume2 /> : <VolumeX />}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Présenté par {anchor.name} · {info.tagline}{!voice.supported && " · voix indisponible sur cet appareil"}</p>
    </div>
  </section>;
}

function TvPage() {
  const { city } = Route.useSearch();
  const { data: tv } = useSuspenseQuery(tvQuery(city));
  const { data: cities } = useSuspenseQuery(citiesQuery);
  const { data: politics } = useSuspenseQuery(politicsQuery);
  const [channel, setChannel] = useState<ChannelId>("national");
  const cityName = cities.find(c => c.id === tv.city_id)?.name ?? tv.city_id;
  const date = new Date(tv.date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  const segments = useMemo(() => {
    if (channel === "national") return tv.national;
    if (channel === "local") return tv.local;
    const mix: TvSegment[] = []; const n = Math.max(tv.national.length, tv.local.length);
    for (let i = 0; i < n; i++) { if (tv.national[i]) mix.push(tv.national[i]!); if (tv.local[i]) mix.push(tv.local[i]!); }
    return mix;
  }, [channel, tv]);
  const guests = [...tv.national, ...tv.local].filter(s => s.kind === "interview");
  const ticker = [...tv.national, ...tv.local].map(s => s.title);
  const weather = cities.slice(0, 6).map(c => weatherFor(c.id, c.name, tv.date));
  const poll = popularityBarometer(politics.organizations.filter(o => o.kind === "party")).slice(0, 6);

  return <div className="space-y-6 animate-rise">
    <style>{"@keyframes tvticker{from{transform:translateX(0)}to{transform:translateX(-100%)}}"}</style>
    <div className="flex items-center gap-3"><Tv className="h-8 w-8 text-primary" /><div><h1 className="text-3xl font-bold">Journal télévisé</h1><p className="text-sm capitalize text-muted-foreground">{date}</p></div></div>

    <div className="grid grid-cols-3 gap-2">{CHANNELS.map(c => <Button key={c.id} className="h-14 flex-col gap-0 px-1" variant={channel === c.id ? "default" : "outline"} onClick={() => setChannel(c.id)}>
      <span className="text-sm font-bold">{c.name}</span><span className="text-[10px] font-normal opacity-80">{c.id === "local" ? cityName : c.id === "info" ? "Continu" : "National"}</span>
    </Button>)}</div>
    {channel === "local" && <nav className="flex flex-wrap gap-2">{cities.map(c => <Button key={c.id} size="sm" className="h-10" variant={tv.city_id === c.id ? "secondary" : "ghost"} asChild><Link to="/jt" search={{ city: c.id }}>{c.name}</Link></Button>)}</nav>}

    <Studio channel={channel} segments={segments} ticker={ticker} cityName={cityName} />

    {tv.invitations.length > 0 && <section className="space-y-4 rounded-lg border border-primary bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Mic className="h-5 w-5 text-primary" />Vous êtes invité au JT</h2>
      {tv.invitations.map(iv => iv.answer ? <p key={iv.id} className="text-sm">« {iv.answer} » <span className="block text-xs text-muted-foreground">Réponse enregistrée, diffusée demain.</span></p> : <Invitation key={iv.id} id={iv.id} question={iv.question} />)}
    </section>}

    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-primary" />Joueurs à l'antenne</h2>
      {guests.length ? <ul className="space-y-3">{guests.map(g => <li key={g.id} className="border-l-2 border-primary pl-3"><p className="font-medium">{g.title}</p><p className="text-sm text-muted-foreground">« {g.body} »</p></li>)}</ul>
        : <p className="text-sm text-muted-foreground">Aucun joueur à l'antenne aujourd'hui. Les personnalités invitées hier passeront ici une fois leur réponse envoyée.</p>}
    </section>

    <div className="grid gap-4 md:grid-cols-2">
      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><CloudSun className="h-5 w-5 text-primary" />Météo</h2>
        <ul className="divide-y divide-border">{weather.map(w => <li key={w.city} className="flex items-center justify-between py-2 text-sm"><span className="font-medium">{w.city}</span><span className="text-muted-foreground">{w.sky}</span><span>{w.min}° / <b>{w.max}°</b></span></li>)}</ul>
      </section>
      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><BarChart3 className="h-5 w-5 text-primary" />Baromètre des partis</h2>
        {poll.length ? <ul className="space-y-2">{poll.map(p => <li key={p.id} className="text-sm"><div className="flex justify-between"><span>{p.symbol} {p.name}</span><b>{p.score.toLocaleString("fr-FR")} %</b></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, p.score)}%` }} /></div></li>)}</ul>
          : <p className="text-sm text-muted-foreground">Aucun parti pour l'instant.</p>}
        <p className="text-xs text-muted-foreground">Notoriété calculée selon l'influence, la réputation et les adhérents de chaque parti. Ce n'est pas une intention de vote.</p>
      </section>
    </div>
  </div>;
}
