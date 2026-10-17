import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, Wallet, Zap, Briefcase, Lock } from "lucide-react";
import { CharacterCard } from "@/components/game/CharacterCard";
import { SectionLink } from "@/components/game/GameShell";
import { SECTIONS, COMING_SOON } from "@/game/navigation";
import { bankQuery, characterQuery, eventsQuery, formatMoney, notificationsQuery, worldQuery } from "@/services/game";

export const Route = createFileRoute("/_authenticated/_game/tableau-de-bord")({
  head: () => ({ meta: [{ title: "Tableau de bord — CIVITAS" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context: { queryClient: q } }) => Promise.all([
    q.ensureQueryData(characterQuery), q.ensureQueryData(bankQuery), q.ensureQueryData(notificationsQuery),
    q.ensureQueryData(eventsQuery), q.ensureQueryData(worldQuery),
  ]),
  component: Dashboard,
});

function Dashboard() {
  const { data: character } = useSuspenseQuery(characterQuery);
  const { data: bank } = useSuspenseQuery(bankQuery);
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: world } = useSuspenseQuery(worldQuery);
  if (!character) return null;

  const worldDate = world ? new Date(world.world_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <p className="text-sm capitalize text-muted-foreground">{worldDate} · {world?.world_time?.slice(0, 5)}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Bonjour, {character.first_name}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><CharacterCard character={character} /></div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Link to="/telephone" search={{ app: "banque" }} className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card transition-colors hover:border-primary/40">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4 text-primary" /> Argent</p>
            <p className="mt-2 font-display text-2xl font-bold">{formatMoney(bank?.balance ?? 0)}</p>
          </Link>
          <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="h-4 w-4 text-primary" /> Énergie</p>
            <p className="mt-2 font-display text-2xl font-bold">{character.energy}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${character.energy}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Briefcase className="h-4 w-4 text-primary" /> Situation actuelle</p>
        <p className="mt-1 text-lg font-semibold">{character.situation}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5 text-primary" /> Notifications</h2>
          <ul className="mt-3 space-y-2">
            {notifs.length === 0 && <li className="text-sm text-muted-foreground">Aucune notification.</li>}
            {notifs.map((n) => (
              <li key={n.id} className="rounded-2xl bg-accent/60 p-3">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="h-5 w-5 text-primary" /> Événements du monde</h2>
          {events.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> Les événements du monde : {COMING_SOON.toLowerCase()}.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">{events.map((e) => <li key={e.id} className="rounded-2xl bg-accent/60 p-3">{e.title}</li>)}</ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Raccourcis</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTIONS.filter((s) => s.id !== "parametres").map((s) => (
            <SectionLink key={s.id} section={s}
              className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
              <s.icon className="h-6 w-6 text-primary" />
              <span className="font-semibold">{s.label}</span>
              {!s.available && <Lock className="absolute top-4 right-4 h-3.5 w-3.5 text-muted-foreground" />}
            </SectionLink>
          ))}
        </div>
      </div>
    </div>
  );
}
