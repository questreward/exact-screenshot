import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { bankQuery, economyQuery, formatMoney, lifeQuery, newsQuery, communicationQuery, notificationsQuery } from "@/services/game";
import { MAIN_PHONE_APPS, MORE_PHONE_APPS } from "@/game/navigation";
import { nextStep } from "@/game/next-step";
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
    <Link to={step.to as "/agenda"} className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-primary bg-card p-3 active:scale-[0.98]">
      <span className="text-2xl" aria-hidden>{step.emoji}</span>
      <span className="min-w-0"><span className="block text-[11px] font-bold uppercase text-primary">📅 Aujourd’hui</span><span className="block truncate text-sm font-semibold">{step.title}</span></span>
    </Link>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <button type="button" onClick={() => open("banque")} className={tile}><span className="text-[11px] text-muted-foreground">💶 Argent</span><span className="font-bold">{bank ? formatMoney(bank.balance) : "—"}</span></button>
      <Link to="/chez-moi" className={tile}><span className="text-[11px] text-muted-foreground">🏠 Logement</span><span className="truncate font-semibold">{life.housing?.name ?? "Aucun"}</span></Link>
      <Link to="/conduite" className={tile}><span className="text-[11px] text-muted-foreground">🚗 Véhicule</span><span className="truncate font-semibold">{car ? `${car.catalog.name} · ${car.condition}` : "Aucun"}</span></Link>
      <Link to="/evenements" className={tile}><span className="text-[11px] text-muted-foreground">🔔 Notifications</span><span className="font-semibold">{unread ? `${unread} nouvelle${unread > 1 ? "s" : ""}` : "Rien de neuf"}</span></Link>
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
