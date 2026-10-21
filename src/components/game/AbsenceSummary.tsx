import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { bankQuery, formatMoney, newsQuery, notificationsQuery } from "@/services/game";
import { absenceSummary } from "@/game/absence";
import { useWorldClock } from "./WorldClock";

const KEY = "civitas-last-seen";

// Shown once when the player comes back after 2+ game hours; only recorded facts.
export function AbsenceSummary() {
  const { time } = useWorldClock();
  const { data: bank } = useQuery(bankQuery);
  const { data: notifs } = useQuery(notificationsQuery);
  const { data: news } = useQuery(newsQuery);
  const [since, setSince] = useState<string | null>(null);
  const now = time.toISOString();
  useEffect(() => {
    setSince(localStorage.getItem(KEY));
    const save = () => localStorage.setItem(KEY, new Date(Math.max(Date.parse(localStorage.getItem(KEY) ?? "0"), time.getTime())).toISOString());
    const id = setInterval(save, 60000);
    return () => { clearInterval(id); save(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!since || !bank) return null;
  const s = absenceSummary(since, now, { txs: (bank as any).transactions ?? [], notifs: (notifs ?? []) as any, news: news?.articles ?? [] });
  if (s.hours < 2) return null;
  const close = () => { localStorage.setItem(KEY, now); setSince(null); };
  return <section className="rounded-3xl border-2 border-primary bg-card p-5 animate-rise">
    <h2 className="font-heading text-xl font-bold">👋 {s.hours >= 72 ? "Bon retour !" : "Pendant votre absence…"}</h2>
    <p className="text-sm text-muted-foreground">Tu étais absent {s.hours >= 48 ? `${Math.floor(s.hours / 24)} jours` : `${s.hours} heures`} (temps du jeu).</p>
    {s.empty ? <p className="mt-3 text-sm">Rien de nouveau n'a été enregistré pour toi.</p> : <div className="mt-3 space-y-3 text-sm">
      {s.ops > 0 && <div><p className="font-semibold">💶 Finances</p><p>+{formatMoney(s.income)} reçus · −{formatMoney(s.expenses)} dépensés ({s.ops} opération(s))</p>{s.salary && <p>✅ {s.salary}</p>}</div>}
      {s.notifs.length > 0 && <div><p className="font-semibold">🔔 Pour toi</p><ul>{s.notifs.map(n => <li key={n.id}>• {n.title}</li>)}</ul></div>}
      {s.news.length > 0 && <div><p className="font-semibold">📰 Actualités importantes</p><ul>{s.news.map(n => <li key={n.id}>• {n.title}</li>)}</ul></div>}
    </div>}
    <Button className="mt-4 min-h-12 w-full" onClick={close}>Reprendre ma vie</Button>
  </section>;
}
