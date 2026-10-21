import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { securityDay } from "@/game/security-day";
import { daylight } from "@/game/daylight";
import { useWorldClock } from "./WorldClock";

const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function Checklist({ items, onDone, cta, children }: { items: [string, string][]; onDone?: () => void; cta: string; children?: (ready: boolean) => ReactNode }) {
  const [done, setDone] = useState<number[]>([]);
  const ready = done.length >= items.length;
  return <div className="space-y-2">
    {items.map(([e, l], i) => { const ok = done.includes(i); return <Button key={l} variant={ok ? "secondary" : "outline"} className="min-h-14 w-full justify-between" onClick={() => setDone(d => ok ? d : [...d, i])}>
      <span>{e} {l}</span><span>{ok ? "✅" : "Faire"}</span></Button>; })}
    {children ? children(ready) : onDone && <Button className="min-h-14 w-full" disabled={!ready} onClick={onDone}>{ready ? cta : `Encore ${items.length - done.length} étape(s)`}</Button>}
  </div>;
}

/** Before the shift: briefing + preparation; the real start button is rendered by the page once ready. */
export function ShiftPrep({ service, start }: { service: string; start: (ready: boolean) => ReactNode }) {
  const d = securityDay(service);
  const { time } = useWorldClock();
  const light = daylight(time.getUTCHours());
  return <div className="space-y-3">
    <div className="rounded-xl bg-muted p-3 text-sm">
      <p className="text-xs text-primary">{light.emoji} {hm(time)} · {d.base}</p>
      <p>👥 {d.team} · {d.emoji} {d.vehicle}</p>
    </div>
    <Checklist items={d.prep} cta="">{start}</Checklist>
  </div>;
}

/** During the shift: rhythm of the day on real times, then alert → on-site steps before the existing decision. */
export function ShiftLive({ service, startsAt, endsAt, decided, children }: { service: string; startsAt: string; endsAt: string; decided: boolean; children: ReactNode }) {
  const d = securityDay(service);
  const { time } = useWorldClock();
  const [step, setStep] = useState(0);
  const s = Date.parse(startsAt), e = Date.parse(endsAt), now = time.getTime();
  const times = d.rhythm.map((label, i) => ({ label, at: new Date(s + (e - s) * (i / (d.rhythm.length - 1))) }));
  const cur = [...times].reverse().find(t => t.at.getTime() <= now) ?? times[0]!;
  const onSite = step >= d.act.length;
  return <div className="space-y-3">
    <ol className="flex gap-1 overflow-x-auto pb-1">{times.map(t => <li key={t.label} className={`shrink-0 rounded-lg px-2 py-1 text-xs ${t === cur ? "bg-primary text-primary-foreground font-semibold" : t.at.getTime() < now ? "bg-muted text-muted-foreground" : "border border-border"}`}>{hm(t.at)} {t.label}</li>)}</ol>
    {!decided && <p className="animate-pulse rounded-lg bg-destructive/15 p-3 text-center font-display font-bold">{d.alert}</p>}
    {decided || onSite ? children : <div className="space-y-2">
      <div className="flex gap-1">{d.act.map((a, i) => <span key={a} className={`h-2 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`} />)}</div>
      <p className="text-sm text-muted-foreground">Étape {step + 1}/{d.act.length}</p>
      <Button className="min-h-14 w-full text-base" onClick={() => setStep(x => x + 1)}>{d.act[step]}</Button>
      <p className="text-xs text-muted-foreground">Ensuite, tu choisis comment agir. Le résultat suit les règles du service.</p>
    </div>}
  </div>;
}

/** After the decision: return to base steps (presentation only). */
export function ReturnToBase({ service }: { service: string }) {
  const d = securityDay(service);
  const [ok, setOk] = useState(false);
  if (ok) return <p className="rounded-lg bg-success/15 p-3 text-sm">✅ De retour : {d.base.toLowerCase()}. Prêt pour la suite du service.</p>;
  return <div className="space-y-2"><p className="text-sm font-semibold">Retour : {d.base}</p><Checklist items={d.back} cta="Retour au planning" onDone={() => setOk(true)} /></div>;
}

/** End of shift summary for the last settled shift. */
export function ShiftSummary({ service, endsAt, hours, outcome, pay }: { service: string; endsAt: string; hours: number; outcome: string; pay: number }) {
  const d = securityDay(service);
  return <div className="rounded-2xl border-2 border-success bg-card p-4 text-center animate-page">
    <p className="text-xs text-muted-foreground">{hm(new Date(endsAt))} — Fin de service</p>
    <h3 className="font-heading text-lg font-bold">Ma journée de travail est terminée</h3>
    <p className="text-sm">{d.emoji} {hours} h · {outcome}</p>
    {pay > 0 && <div className="my-3 rounded-xl bg-success/15 p-3"><p className="text-sm">💶 Indemnités du service</p><p className="font-display text-2xl font-bold">+ {pay} €</p></div>}
    <div className="grid gap-2">
      <Button asChild className="min-h-12"><Link to="/banque">Voir ma banque</Link></Button>
      <Button asChild variant="outline" className="min-h-12"><Link to="/chez-moi">🏠 Rentrer chez moi</Link></Button>
    </div>
  </div>;
}
