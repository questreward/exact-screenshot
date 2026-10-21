import { GameSelect } from "@/components/game/GameSelect";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { legislativeAction, legislativeQuery, type LegislativeState } from "@/services/game";
import { useLifeMutation } from "@/components/game/LifeControls";
import { legislativePhase, PHASE_LABEL } from "@/game/legislatives-phase";
import type { LegData } from "@/game/legislatives";

const fmt = (s: string) => new Date(s).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Dot({ leg, code }: { leg: LegData; code: string }) {
  return <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: leg.parties[code]?.color }} />;
}

/** Liste des candidats d'une circonscription pour un tour : étiquettes présentes en 2024 + candidats joueurs, ou qualifiés au 2e tour. */
function candidatesFor(leg: LegData, code: string, st: LegislativeState, round: 1 | 2): { party: string; name: string | null }[] {
  if (round === 2) return st.results.filter(r => r.round === 1 && r.qualified).map(r => ({ party: r.party_code, name: r.name }));
  const players = new Map(st.player_candidates.map(p => [p.party_code, p.name]));
  const parties = new Set([...(leg.seats[code]?.r1 ?? []).map(([p]) => p), ...players.keys()]);
  return [...parties].map(p => ({ party: p, name: players.get(p) ?? null }));
}

function Results({ leg, st }: { leg: LegData; st: LegislativeState }) {
  if (!st.results.length) return null;
  return <div className="space-y-2">{[1, 2].map(r => {
    const rows = st.results.filter(x => x.round === r); if (!rows.length) return null;
    const total = rows.reduce((s, x) => s + x.votes, 0) || 1;
    return <div key={r} className="space-y-1">
      <p className="text-xs font-semibold uppercase text-primary">{r === 1 ? "1er tour" : "2e tour"}</p>
      {rows.slice(0, 6).map(x => <p key={x.party_code} className="flex items-center gap-2 text-sm"><Dot leg={leg} code={x.party_code} />
        <span className="truncate">{x.name} · {leg.parties[x.party_code]?.label}</span>
        <span className="ml-auto tabular-nums">{(x.votes * 100 / total).toFixed(1).replace(".", ",")} %</span>
        {x.elected ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Élu" /> : x.qualified ? <span className="text-xs text-primary">qualifié</span> : null}</p>)}
    </div>;
  })}</div>;
}

/** Fiche d'une circonscription : candidature (partout en France) et résultats de l'élection en cours. */
export function CircoElection({ leg, code }: { leg: LegData; code: string }) {
  const { data: st, isError } = useQuery(legislativeQuery(code));
  const [party, setParty] = useState("");
  const act = useLifeMutation(legislativeAction, "Candidature enregistrée");
  const withdraw = useLifeMutation(legislativeAction, "Candidature retirée");
  if (isError) return <p className="text-xs text-muted-foreground">Candidatures et vote aux prochaines législatives : Disponible dans une prochaine étape.</p>;
  if (!st) return null;
  const phase = legislativePhase(st.election, new Date(st.now));
  const mine = st.my_candidacy;
  return <div className="space-y-3 rounded-lg border border-border p-3">
    <p className="flex items-center gap-2 text-sm font-semibold"><Vote className="h-4 w-4 text-primary" />Législatives · {PHASE_LABEL[phase]}</p>
    {st.player_candidates.length > 0 && <p className="text-sm">Candidats joueurs : {st.player_candidates.map(p => `${p.name} (${leg.parties[p.party_code]?.label ?? p.party_code})`).join(", ")}</p>}
    {phase === "candidacies" && (mine?.constituency_code === code
      ? <div className="space-y-2"><p className="text-sm">Vous êtes candidat ici sous l'étiquette {leg.parties[mine.party_code]?.label}.</p>
          <Button variant="outline" className="h-12 w-full" disabled={withdraw.isPending} onClick={() => withdraw.mutate({ command: "withdraw" })}>Retirer ma candidature</Button></div>
      : st.eligible
        ? <div className="space-y-2">
            <GameSelect className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm" value={party} onChange={e => setParty(e.target.value)} aria-label="Étiquette politique">
              <option value="">Choisir une étiquette…</option>
              {Object.entries(leg.parties).map(([c, p]) => <option key={c} value={c}>{p.label}</option>)}
            </GameSelect>
            <Button className="h-12 w-full" disabled={!party || act.isPending} onClick={() => act.mutate({ command: "candidacy", constituency_code: code, party_code: party })}>{act.isPending && <LoaderCircle className="animate-spin" />}{mine ? "Me présenter ici à la place" : "Me présenter ici"}</Button>
            <p className="text-xs text-muted-foreground">Vous remplacez le candidat simulé de votre étiquette et reprenez ses électeurs de 2024.</p>
          </div>
        : <p className="text-xs text-muted-foreground">Pour vous présenter : 18 ans, engagement 20, réputation politique 15 et influence 10.</p>)}
    <Results leg={leg} st={st} />
  </div>;
}

/** Bandeau général : calendrier et vote dans la circonscription du joueur. */
export function LegislativesPanel({ leg }: { leg: LegData }) {
  const { data: st, isError } = useQuery(legislativeQuery(null));
  const vote = useLifeMutation(legislativeAction, "A voté !");
  if (isError || !st) return null;
  const phase = legislativePhase(st.election, new Date(st.now));
  const round = phase === "round1" ? 1 : phase === "round2" ? 2 : null;
  const code = st.my_constituency;
  const voted = round ? st.my_votes[String(round)] : undefined;
  const e = st.election;
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2"><Vote className="h-5 w-5 text-primary" /><h2 className="font-heading text-lg font-bold">Élections législatives</h2></div>
    <p className="text-sm font-semibold text-primary">{PHASE_LABEL[phase]}</p>
    {e && !e.counted && <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
      <li>Candidatures : {fmt(e.candidacies_at)}</li><li>Clôture : {fmt(e.candidacies_end_at)}</li>
      <li>1er tour : {fmt(e.round1_at)}</li><li>2e tour : {fmt(e.round2_at)}</li>
    </ul>}
    {st.my_candidacy && <p className="text-sm">Votre candidature : {leg.seats[st.my_candidacy.constituency_code]?.dn} · {leg.seats[st.my_candidacy.constituency_code]?.l} ({leg.parties[st.my_candidacy.party_code]?.label})</p>}
    {round && code && (voted
      ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" />Vous avez voté au {round === 1 ? "1er" : "2e"} tour ({leg.parties[voted]?.label}).</p>
      : round === 2 && !st.results.some(r => r.round === 1 && r.qualified)
        ? <p className="text-sm text-muted-foreground">Votre député a été élu dès le 1er tour : pas de 2e tour chez vous.</p>
        : <div className="space-y-2">
            <p className="text-sm">Votre bureau : {leg.seats[code]?.dn}, {leg.seats[code]?.l}. Touchez un candidat pour voter.</p>
            {candidatesFor(leg, code, st, round).map(c => <Button key={c.party} variant="outline" className="h-12 w-full justify-start gap-2" disabled={vote.isPending}
              onClick={() => vote.mutate({ command: "vote", party_code: c.party })}><Dot leg={leg} code={c.party} /><span className="truncate">{c.name ? `${c.name} · ` : ""}{leg.parties[c.party]?.label}</span></Button>)}
          </div>)}
    {round && !code && <p className="text-sm text-muted-foreground">Votre ville n'a pas encore de bureau de vote.</p>}
    {phase === "candidacies" && !st.my_candidacy && <p className="text-xs text-muted-foreground">Touchez n'importe quelle circonscription sur la carte pour vous y présenter.</p>}
    {phase === "done" && <p className="text-sm">La nouvelle Assemblée de 577 députés est élue.</p>}
  </section>;
}
