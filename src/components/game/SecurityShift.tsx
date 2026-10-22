import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { securityDay } from "@/game/security-day";
import { daylight } from "@/game/daylight";
import { useWorldClock } from "./WorldClock";
import { WorkBackdrop } from "./WorkBackdrop";

const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

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

/** Existing shift boundaries and decisions; never manufacture arrivals or completed procedures. */
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

/** Existing recorded decision, not a fabricated trip back to base. */
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
      <Button asChild variant="outline" className="min-h-12"><Link to="/chez-moi">🏠 Voir mon logement</Link></Button>
    </div>
  </div>;
}

