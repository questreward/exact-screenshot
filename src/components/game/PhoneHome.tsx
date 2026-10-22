import { usePhoneTheme } from "@/game/phone-theme";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExperienceState } from "./ExperienceState";
import { Bell, Briefcase, CloudSun, Map, MessageCircle, Newspaper, Landmark, Users, Wallet, ShoppingBag, CalendarDays, FolderLock, User, ChevronDown, Search } from "lucide-react";
import { phoneSearch } from "@/game/phone-search";
import { lifeQuery, newsQuery, communicationQuery, notificationsQuery, markNotificationRead } from "@/services/game";
import { MAIN_PHONE_APPS, MORE_PHONE_APPS } from "@/game/navigation";
import { notificationEmoji, notificationTarget } from "@/game/next-step";
import { useWorldClock } from "./WorldClock";
import { phoneNotificationTarget } from "@/game/phone-state";
import { toast } from "sonner";
import { badgeLabel } from "@/game/communication";

const APP_ICONS = { maps: Map, messages: MessageCircle, actualites: Newspaper, civi: Landmark, social: Users, banque: Wallet, shopping: ShoppingBag, agenda: CalendarDays, documents: FolderLock, moi: User };

// Existing data only: no bank, estate or social app is loaded just to show the home screen.
export function PhoneHome({ open }: { open: (id?: string) => void }) {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: news } = useSuspenseQuery(newsQuery);
  const { data: comm } = useSuspenseQuery(communicationQuery);
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const { time } = useWorldClock();
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
  const hits = phoneSearch(q);
  const theme = usePhoneTheme();
  const running = life.activities.find(a => a.status === "running");
  const unread = notifs.filter(n => !n.read).length;
  const badge = (id: string) => id === "messages" ? comm.unread : id === "actualites" ? news.unread_count : 0;
  return <div className={`phone-wallpaper space-y-5 ${theme.cls}`}>
    <div className="py-4 text-center"><p className="font-display text-4xl font-semibold tabular-nums">{time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p></div>
    {running && <Button variant="secondary" onClick={() => open("travail")} className="h-auto w-full justify-start gap-3 py-3 text-left"><CalendarDays className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0"><span className="block text-xs text-muted-foreground">En cours</span><span className="block break-words font-semibold">{running.title}</span><span className="block text-xs text-muted-foreground">{running.location?.name}</span></span></Button>}
    {notifs.filter(n => !n.read).slice(0, 1).map(n => <Button variant="secondary" key={n.id} onClick={() => open("notifications")} className="h-auto min-h-14 w-full justify-start gap-3 py-3 text-left"><span className="text-xl" aria-hidden>{notificationEmoji(n)}</span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{n.title}</span><span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span></span></Button>)}
    <label className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-3 focus-within:border-primary"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une application ou un service" aria-label="Rechercher dans le téléphone" className="h-11 min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label>
    {q.trim().length >= 2 && <div className="rounded-lg border border-border bg-card">{hits.length ? <ul className="divide-y divide-border">{hits.map(h => <li key={h.to}><Link to={h.to as "/carte"} className="flex min-h-14 items-center gap-3 p-3"><span aria-hidden>{h.emoji}</span><span className="min-w-0"><span className="block text-sm font-semibold">{h.label}</span><span className="block text-xs text-muted-foreground">{h.hint}</span></span></Link></li>)}</ul> : <p className="p-3 text-sm text-muted-foreground">Aucun résultat.</p>}</div>}
    <div className="phone-app-grid">{MAIN_PHONE_APPS.map(a => {
      const n = badge(a.id); const Icon = APP_ICONS[a.id as keyof typeof APP_ICONS] ?? User;
      const inner = <><span className="phone-app-icon" data-tone={a.id}><Icon aria-hidden />{n > 0 && <span aria-label={`${n} non lus`} className="phone-badge">{badgeLabel(n)}</span>}</span><span className="phone-app-label">{a.label}</span></>;
      return a.to ? <Link key={a.id} to={a.to as "/carte"} className="phone-app-launch">{inner}</Link> : <Button variant="ghost" key={a.id} onClick={() => open(a.app)} className="phone-app-launch">{inner}</Button>;
    })}</div>
    <div className="phone-dock"><Button variant="ghost" onClick={() => open("notifications")} className="phone-app-launch"><span className="phone-app-icon"><Bell aria-hidden />{unread > 0 && <span className="phone-badge">{badgeLabel(unread)}</span>}</span><span className="phone-app-label">Notifications</span></Button><Button variant="ghost" onClick={() => open("travail")} className="phone-app-launch"><span className="phone-app-icon" data-tone="shopping"><Briefcase aria-hidden /></span><span className="phone-app-label">Travail</span></Button><Button variant="ghost" onClick={() => open("meteo")} className="phone-app-launch"><span className="phone-app-icon" data-tone="meteo"><CloudSun aria-hidden /></span><span className="phone-app-label">Météo</span></Button></div>
    <Button variant="ghost" onClick={() => setMore(!more)} aria-expanded={more} className="min-h-11 w-full text-sm text-muted-foreground">Bibliothèque d’applications<ChevronDown className={`transition-transform ${more ? "rotate-180" : ""}`} /></Button>
    {more && <div className="phone-app-grid">{MORE_PHONE_APPS.map(a => <Button variant="ghost" key={a.id} onClick={() => open(a.id)} className="phone-app-launch"><span className="phone-app-icon"><a.icon aria-hidden /></span><span className="phone-app-label">{a.label}</span></Button>)}</div>}
    <StarterGuide life={life} />
  </div>;
}

export function NotificationsApp() {
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const q = useQueryClient(); const navigate = useNavigate(); const [reading, setReading] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const read = async (n: (typeof notifs)[number]) => {
    if (n.read) return;
    setReading(n.id);
    try { await markNotificationRead(n.id); await q.invalidateQueries({ queryKey: ["notifications"] }); }
    catch { toast.error("La notification n’a pas pu être marquée comme lue. Réessayez."); }
    finally { setReading(null); }
  };
  const go = async (n: (typeof notifs)[number]) => {
    await read(n);
    const target = phoneNotificationTarget(n, notificationTarget(n));
    if (target.id) void navigate({ to: "/actualites/$id", params: { id: target.id } });
    else if (target.app) void navigate({ to: "/telephone", search: { app: target.app } });
    else void navigate({ to: target.to as "/agenda" });
  };
  const list = notifs.filter(n => !unreadOnly || !n.read);
  return <div className="space-y-4"><div className="flex gap-2" aria-label="Filtrer les notifications"><Button variant={unreadOnly ? "ghost" : "secondary"} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Toutes</Button><Button variant={unreadOnly ? "secondary" : "ghost"} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Non lues · {notifs.filter(n => !n.read).length}</Button></div>
    {!list.length ? <ExperienceState kind="empty" title="Tout est à jour" description="Aucune notification dans cette liste." /> : <ul className="divide-y divide-border">{list.map(n => <li key={n.id} className="py-3"><Button variant="ghost" onClick={() => void go(n)} disabled={reading === n.id} className="flex h-auto min-h-16 w-full items-start justify-start gap-3 px-1 py-2 text-left"><span aria-hidden className="text-xl">{notificationEmoji(n)}</span><span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${n.read ? "" : "text-primary"}`}>{n.title}</span><span className="mt-1 block text-sm text-muted-foreground">{n.body}</span><time className="mt-2 block text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span>{!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lue" />}</Button>{!n.read && <Button variant="link" size="sm" disabled={reading === n.id} onClick={() => void read(n)} className="ml-8 text-xs">{reading === n.id ? "Enregistrement…" : "Marquer comme lue"}</Button>}</li>)}</ul>}
  </div>;
}

function StarterGuide({ life }: { life: { character: { first_name: string } } }) {
  return <Button asChild variant="link" className="w-full text-xs text-muted-foreground"><Link to="/aide">{life.character.first_name}, retrouver mon guide CIVITAS</Link></Button>;
}
