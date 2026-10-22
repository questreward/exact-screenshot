import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { securityDay } from "@/game/security-day";
import { daylight } from "@/game/daylight";
import { useWorldClock } from "./WorldClock";
import { WorkBackdrop } from "./WorkBackdrop";

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
    <WorkBackdrop job={service} title={d.base} />
    <div className="rounded-xl bg-muted p-3 text-sm">
      <p className="text-xs text-primary">{light.emoji} {hm(time)} · {d.base}</p>
      <p>{d.emoji} Consignes du service</p>
    </div>
    <ul className="space-y-2 text-sm">{d.prep.map(([emoji, label]) => <li key={label}>{emoji} {label}</li>)}</ul>
    {start(true)}
  </div>;
}

/** During the shift: rhythm of the day on real times, then alert → on-site steps before the existing decision. */
export function ShiftLive({ service, startsAt, endsAt, decided, children }: { service: string; startsAt: string; endsAt: string; decided: boolean; children: ReactNode }) {
  const d = securityDay(service);
  const { time } = useWorldClock();
  return <div className="space-y-3">
    <WorkBackdrop job={service} title={d.base} />
    <dl className="grid grid-cols-2 gap-3 border-y border-border py-3 text-sm"><dt>Prise de service</dt><dd>{hm(new Date(startsAt))}</dd><dt>Heure du jeu</dt><dd>{hm(time)}</dd><dt>Relève prévue</dt><dd>{hm(new Date(endsAt))}</dd><dt>Dossier</dt><dd>{decided ? 'Décision enregistrée' : 'Décision attendue'}</dd></dl>
    {!decided && <p className="border-l-2 border-primary pl-3 font-semibold">{d.alert}</p>}
    {children}
  </div>;
}

/** After the decision: return to base steps (presentation only). */
export function ReturnToBase({ service }: { service: string }) {
  const d = securityDay(service);
  return <div className="space-y-3 border-t border-border pt-3"><p className="text-sm">Votre décision est conservée dans le dossier du service. Le bilan sera confirmé à la relève.</p><Button asChild variant="outline" className="min-h-12 w-full"><Link to="/agenda">Consulter mon planning</Link></Button><p className="text-xs text-muted-foreground">{d.base} · aucun retour ni trajet ajouté au dossier.</p></div>;
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

const MEASURES = ["Zone sécurisée", "Personnes écoutées", "Secours prévenus", "Circulation organisée", "Rappel à la loi"];
/** Rapport du joueur : ce qu'il a fait, en ses mots. Reste sur cette page, n'invente aucun résultat. */
function ReportDraft({ service, onDone }: { service: string; onDone: () => void }) {
  const d = securityDay(service);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  return <div className="space-y-2 rounded-xl border border-border p-3">
    <p className="text-sm font-semibold">📝 Rapport d'intervention · {d.base}</p>
    <p className="text-xs text-muted-foreground">Coche ce que tu as fait.</p>
    <div className="flex flex-wrap gap-2">{MEASURES.map(m => { const on = picked.includes(m); return <button key={m} type="button" onClick={() => setPicked(p => on ? p.filter(x => x !== m) : [...p, m])} className={`min-h-11 rounded-full border px-3 text-sm ${on ? "border-primary bg-primary/15 font-semibold" : "border-border"}`}>{on ? "✅ " : ""}{m}</button>; })}</div>
    <label className="block text-sm">Observations<textarea maxLength={300} value={note} onChange={e => setNote(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background p-2" placeholder="Ce que tu as vu et fait…" /></label>
    <Button className="min-h-12 w-full" disabled={picked.length === 0} onClick={onDone}>Signer le rapport</Button>
    <p className="text-xs text-muted-foreground">Rapport visible sur cette page seulement. L'archivage sera disponible dans une prochaine étape.</p>
  </div>;
}
