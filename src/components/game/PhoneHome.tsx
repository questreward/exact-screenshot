import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import { phoneSearch } from "@/game/phone-search";
import { bankQuery, economyQuery, formatMoney, lifeQuery, newsQuery, communicationQuery, notificationsQuery, markNotificationRead } from "@/services/game";
import { MAIN_PHONE_APPS, MORE_PHONE_APPS } from "@/game/navigation";
import { nextStep, notificationEmoji, notificationTarget } from "@/game/next-step";
import { useWorldClock } from "./WorldClock";
import { badgeLabel } from "@/game/communication";

// Écran d'accueil du téléphone : résumés de la vie du joueur + 9 applications. Lecture seule.
export function PhoneHome({ open }: { open: (id?: string) => void }) {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: bank } = useSuspenseQuery(bankQuery);
  const { data: economy } = useSuspenseQuery(economyQuery);
  const { data: news } = useSuspenseQuery(newsQuery);
  const { data: comm } = useSuspenseQuery(communicationQuery);
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const { time } = useWorldClock();
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  const hits = phoneSearch(q);
  const step = nextStep({ now: time, activities: life.activities, notifications: notifs, hasHousing: !!life.housing, studying: !!life.enrollment, working: !!life.employment, age: life.character.age });
  const car = economy.assets.find(a => a.catalog.kind === "vehicle");
  const unread = notifs.filter(n => !n.read).length;
  const badge = (id: string) => id === "messages" ? comm.unread : id === "actualites" ? news.unread_count : 0;
  const tile = "flex min-h-16 flex-col justify-center rounded-2xl bg-card p-3 text-left active:scale-[0.98]";
  return <div className="space-y-4">
    <div className="text-center">
      <p className="font-display text-4xl font-semibold">{time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</p>
      <p className="text-xs capitalize text-muted-foreground">{time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
    </div>
    <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-3 focus-within:border-primary">
      <Search className="h-5 w-5 shrink-0 text-primary" />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher… (permis, maison, salaire)" aria-label="Rechercher dans le téléphone" className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground" />
    </label>
    {q.trim().length >= 2 && <div className="rounded-2xl border border-border bg-card">{hits.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Rien trouvé. Essaie un autre mot.</p> :
      <ul className="divide-y divide-border">{hits.map(h => <li key={h.to}><Link to={h.to as "/carte"} className="flex min-h-14 items-center gap-3 p-3 active:bg-muted"><span className="text-2xl" aria-hidden>{h.emoji}</span><span className="min-w-0"><span className="block text-sm font-semibold">{h.label}</span><span className="block truncate text-xs text-muted-foreground">{h.hint}</span></span></Link></li>)}</ul>}</div>}
    {notifs.filter(n => !n.read).slice(0, 2).map(n => <button key={n.id} type="button" onClick={() => open("notifications")} className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card/90 p-3 text-left shadow-card animate-rise"><span className="text-xl" aria-hidden>{notificationEmoji(n)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{n.title}</span><span className="block truncate text-xs text-muted-foreground">{n.body}</span></span></button>)}
    <Link to={step.to as "/agenda"} className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-primary bg-card p-3 active:scale-[0.98]">
      <span className="text-2xl" aria-hidden>{step.emoji}</span>
      <span className="min-w-0"><span className="block text-[11px] font-bold uppercase text-primary">📅 Aujourd’hui</span><span className="block truncate text-sm font-semibold">{step.title}</span></span>
    </Link>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <button type="button" onClick={() => open("banque")} className={tile}><span className="text-[11px] text-muted-foreground">💶 Argent</span><span className="font-bold">{bank ? formatMoney(bank.balance) : "—"}</span></button>
      <Link to="/chez-moi" className={tile}><span className="text-[11px] text-muted-foreground">🏠 Logement</span><span className="truncate font-semibold">{life.housing?.name ?? "Aucun"}</span></Link>
      <Link to="/conduite" className={tile}><span className="text-[11px] text-muted-foreground">🚗 Véhicule</span><span className="truncate font-semibold">{car ? `${car.catalog.name} · ${car.condition}` : "Aucun"}</span></Link>
      <button type="button" onClick={() => open("notifications")} className={tile}><span className="text-[11px] text-muted-foreground">🔔 Notifications</span><span className={`font-semibold ${unread ? "text-primary" : ""}`}>{unread ? `${unread} nouvelle${unread > 1 ? "s" : ""}` : "Rien de neuf"}</span></button>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {MAIN_PHONE_APPS.map(a => {
        const n = badge(a.id);
        const inner = <><span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-3xl shadow-elegant"><span aria-hidden>{a.emoji}</span>{n > 0 && <span aria-label={`${n} non lus`} className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{badgeLabel(n)}</span>}</span><span className="text-xs font-medium">{a.label}</span></>;
        return a.to ? <Link key={a.id} to={a.to as "/carte"} className="flex flex-col items-center gap-1.5 active:scale-95">{inner}</Link>
          : <button key={a.id} type="button" onClick={() => open(a.app)} className="flex flex-col items-center gap-1.5 active:scale-95">{inner}</button>;
      })}
    </div>
    <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl text-sm font-semibold text-primary">Plus d’applications <ChevronDown className={`h-4 w-4 transition-transform ${more ? "rotate-180" : ""}`} /></button>
    {more && <div className="grid grid-cols-4 gap-2">{MORE_PHONE_APPS.map(a => <button key={a.id} type="button" onClick={() => open(a.id)} className="flex min-h-16 flex-col items-center gap-1 rounded-xl p-1 text-[11px] active:scale-95"><a.icon className="h-6 w-6 text-primary" />{a.label}</button>)}</div>}
  </div>;
}

export function NotificationsApp() {
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const q = useQueryClient();
  const navigate = useNavigate();
  const go = async (n: (typeof notifs)[number]) => {
    if (!n.read) { await markNotificationRead(n.id); await q.invalidateQueries({ queryKey: ["notifications"] }); }
    const to = notificationTarget(n);
    if (to === "/telephone") navigate({ to: "/telephone", search: { app: "messages" } }); else navigate({ to: to as "/agenda" });
  };
  if (notifs.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">🔔 Aucune notification pour le moment.</p>;
  return <ul className="space-y-2">{notifs.map(n => <li key={n.id}>
    <button type="button" onClick={() => void go(n)} className={`flex min-h-16 w-full items-start gap-3 rounded-2xl p-3 text-left active:scale-[0.98] ${n.read ? "bg-card" : "border-2 border-primary bg-primary/10"}`}>
      <span className="text-2xl" aria-hidden>{notificationEmoji(n)}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{n.title}</span><span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span><span className="mt-1 block text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
      {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Non lue" />}
    </button>
  </li>)}</ul>;
}
