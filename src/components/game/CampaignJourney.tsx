import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { electionsQuery } from "@/services/game";
import type { Election, ElectionState } from "@/game/elections";
import { electionBanner, electionCalendar, supportReasons } from "@/game/campaign-journey";

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export function CampaignJourney({ e, s }: { e: Election; s: ElectionState }) {
  const cal = electionCalendar(e, s.world_now);
  const mine = e.candidates.find(c => c.mine && c.status === "validated");
  const reasons = mine ? supportReasons(s, mine.id) : [];
  return <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
    <h2 className="font-semibold">📅 Calendrier de l'élection</h2>
    <ol className="grid grid-cols-5 gap-1 text-center text-[11px]">{cal.steps.map((st, i) =>
      <li key={st.label} className={`rounded-lg p-1 ${i === cal.current ? "bg-primary text-primary-foreground font-semibold" : i < cal.current ? "bg-muted text-muted-foreground" : "bg-muted/40"}`}>
        <span className="block text-lg">{st.emoji}</span>{st.label}<span className="block">{day(st.at)}</span></li>)}</ol>
    {mine && <div className="rounded-xl bg-muted p-3 text-sm">
      <p className="font-semibold">📈 Ton soutien : {mine.support} %</p>
      {reasons.length ? <><p className="text-xs text-muted-foreground">Il bouge à cause de :</p>
        <ul className="mt-1 space-y-0.5">{reasons.map(r => <li key={r.id}>{r.delta >= 0 ? "＋" : "－"} {r.title} <span className={r.delta >= 0 ? "text-success" : "text-destructive"}>({r.delta >= 0 ? "+" : ""}{r.delta})</span></li>)}</ul></>
        : <p className="text-xs text-muted-foreground">Mène des actions de campagne (terrain, meeting, débat) pour le faire évoluer.</p>}
    </div>}
  </section>;
}

export function ElectionBanner() {
  const { data } = useQuery(electionsQuery);
  const b = data ? electionBanner(data) : null;
  if (!b) return null;
  return <Link to="/elections/$id" params={{ id: b.id }} className={`flex min-h-14 items-center rounded-2xl px-4 font-semibold ${b.kind === "elu" ? "bg-success/20" : "bg-primary/15"}`}>{b.text}</Link>;
}
