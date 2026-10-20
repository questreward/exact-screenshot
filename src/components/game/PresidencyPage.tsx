import { useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SpeechDraftHelper } from '@/components/game/SpeechDraftHelper';
import { presidencyAction, presidencyQuery, type PrState } from '@/services/game';

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ACT: Record<string, string> = { premier_ministre: 'Nomination', promulgation: 'Promulgation', renvoi: 'Renvoi au Parlement', dissolution: 'Dissolution', discours: 'Allocution', referendum: 'Référendum' };
const box = 'space-y-3 rounded-xl border border-border bg-card p-4';

export function PresidencyPage() {
  const { data: s } = useSuspenseQuery(presidencyQuery);
  const qc = useQueryClient();
  const act = useMutation({
    mutationFn: presidencyAction,
    onSuccess: (d) => { qc.setQueryData(presidencyQuery.queryKey, d); toast.success('C’est enregistré.'); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <section className={box}>
        <p className="text-sm text-muted-foreground">Président(e) de la République</p>
        <p className="font-heading text-2xl font-bold">{s.president_name ? `${s.president_name}${s.is_president ? ' (vous)' : ''}` : 'Fonction vacante'}</p>
        {s.interim && s.president && <p className="text-sm">Président(e) par intérim jusqu’à la première présidentielle gagnée.</p>}
        <p className="text-sm">Premier ministre : <strong>{s.prime_minister ?? 'non nommé'}</strong></p>
        <p className="text-xs text-muted-foreground">Mandat de {s.settings.mandate_days} jours de jeu (1 semaine = 1 an de quinquennat). Personnages fictifs, institutions réelles.</p>
      </section>
      {s.is_president && <PowersPanel s={s} pending={act.isPending} run={act.mutate} />}
      <ElectionPanel s={s} pending={act.isPending} run={act.mutate} />
      {s.referendum && (
        <section className={box}>
          <h2 className="font-heading text-lg font-bold">Référendum en cours</h2>
          <p className="font-semibold">{s.referendum.question}</p>
          <p className="text-sm text-muted-foreground">Vote secret jusqu’au {fmt(s.referendum.closes_at)}.</p>
          {s.referendum.voted ? <p className="text-sm">Ton vote est enregistré.</p> : (
            <div className="grid grid-cols-2 gap-2">
              <Button className="min-h-12" disabled={act.isPending || !s.eligible} onClick={() => window.confirm('Voter OUI ? Ce vote est définitif.') && act.mutate({ _action: 'referendum_vote', _target: s.referendum!.id, _yes: true })}>Oui</Button>
              <Button className="min-h-12" variant="outline" disabled={act.isPending || !s.eligible} onClick={() => window.confirm('Voter NON ? Ce vote est définitif.') && act.mutate({ _action: 'referendum_vote', _target: s.referendum!.id, _yes: false })}>Non</Button>
            </div>
          )}
        </section>
      )}
      <section className={box}>
        <h2 className="font-heading text-lg font-bold">Journal de l’Élysée</h2>
        {s.acts.length === 0 && <p className="text-sm text-muted-foreground">Aucun acte pour l’instant.</p>}
        <ul className="space-y-2">
          {s.acts.map((a, i) => (
            <li key={i} className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-xs text-muted-foreground">{ACT[a.kind] ?? a.kind} · {a.president} · {fmt(a.created_at)}</p>
              {a.body && <p className="whitespace-pre-wrap break-words">{a.body}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type Run = (a: Parameters<typeof presidencyAction>[0]) => void;

function ElectionPanel({ s, pending, run }: { s: PrState; pending: boolean; run: Run }) {
  const e = s.election;
  const now = new Date(s.now);
  if (!e) return null;
  const phase = now < new Date(e.opens_at) ? 'avant' : now < new Date(e.round1_at) ? 'parrainages' : !e.round1_counted ? 'tour1' : 'tour2';
  const me = e.candidates.some((c) => c.character_id === s.actor);
  return (
    <section className={box}>
      <h2 className="font-heading text-lg font-bold">Élection présidentielle</h2>
      <ol className="space-y-1 text-sm">
        <li className={phase === 'parrainages' ? 'font-semibold text-primary' : ''}>1. Candidatures et parrainages : jusqu’au {fmt(e.round1_at)}</li>
        <li className={phase === 'tour1' ? 'font-semibold text-primary' : ''}>2. Premier tour : jusqu’au {fmt(e.round2_at)}</li>
        <li className={phase === 'tour2' ? 'font-semibold text-primary' : ''}>3. Second tour : jusqu’au {fmt(e.closes_at)}</li>
      </ol>
      <p className="text-xs text-muted-foreground">Il faut {s.settings.sponsors_required} parrainages de joueurs pour être sur le bulletin. Chaque joueur de {s.settings.min_age} ans ou plus donne un seul parrainage et vote une fois par tour, en secret.</p>
      {!s.eligible && <p className="text-sm">Il faut avoir {s.settings.min_age} ans pour participer.</p>}
      {phase === 'parrainages' && !me && <Button className="min-h-12 w-full" disabled={pending || !s.eligible} onClick={() => window.confirm('Te déclarer candidat(e) à la présidentielle ?') && run({ _action: 'candidate' })}>Me déclarer candidat(e)</Button>}
      {phase === 'tour2' && e.finalists ? (
        <ul className="space-y-2">
          {e.finalists.map((f) => (
            <li key={f.character_id} className="flex items-center gap-2 rounded-lg bg-muted p-3">
              <span className="flex-1 font-semibold">{f.name}</span>
              <Button className="min-h-11" disabled={pending || !s.eligible || e.voted.includes(2)} onClick={() => window.confirm(`Voter pour ${f.name} ? Vote secret et définitif.`) && run({ _action: 'vote', _target: f.character_id })}>Voter</Button>
            </li>
          ))}
          {e.voted.includes(2) && <li className="text-sm">Ton vote du second tour est enregistré.</li>}
        </ul>
      ) : (
        <ul className="space-y-2">
          {e.candidates.length === 0 && <li className="text-sm text-muted-foreground">Aucune candidature pour l’instant.</li>}
          {e.candidates.map((c) => {
            const ok = c.sponsors >= s.settings.sponsors_required;
            return (
              <li key={c.character_id} className="space-y-2 rounded-lg bg-muted p-3">
                <p><span className="font-semibold">{c.name}{c.character_id === s.actor ? ' (vous)' : ''}</span> · {c.sponsors}/{s.settings.sponsors_required} parrainages {ok && '✓'}</p>
                {phase === 'parrainages' && c.character_id !== s.actor && (
                  <Button className="min-h-11 w-full" variant="outline" disabled={pending || !s.eligible || !!e.my_sponsor} onClick={() => window.confirm(`Parrainer ${c.name} ? Un seul parrainage, définitif.`) && run({ _action: 'sponsor', _target: c.character_id })}>
                    {e.my_sponsor === c.character_id ? 'Parrainé(e) par vous' : 'Parrainer'}
                  </Button>
                )}
                {phase === 'tour1' && ok && (
                  <Button className="min-h-11 w-full" disabled={pending || !s.eligible || e.voted.includes(1)} onClick={() => window.confirm(`Voter pour ${c.name} ? Vote secret et définitif.`) && run({ _action: 'vote', _target: c.character_id })}>Voter</Button>
                )}
              </li>
            );
          })}
          {e.voted.includes(1) && <li className="text-sm">Ton vote du premier tour est enregistré.</li>}
        </ul>
      )}
      {s.last_results?.results?.round1 && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">Dernier scrutin : {s.last_results.winner ? `${s.last_results.winner} élu(e)` : 'aucun élu'}</p>
          {s.last_results.results.round1.map((r) => <p key={r.character_id}>1er tour · {r.name} : {r.votes} voix</p>)}
          {s.last_results.results.round2?.map((r) => <p key={r.character_id}>2nd tour · {r.name} : {r.votes} voix</p>)}
        </div>
      )}
    </section>
  );
}

function PowersPanel({ s, pending, run }: { s: PrState; pending: boolean; run: Run }) {
  const [pm, setPm] = useState('');
  const [speech, setSpeech] = useState('');
  const [question, setQuestion] = useState('');
  const req = () => crypto.randomUUID();
  return (
    <section className={box}>
      <h2 className="font-heading text-lg font-bold">Bureau du Président</h2>
      <div className="space-y-2">
        <h3 className="font-semibold">Nommer le Premier ministre</h3>
        <select aria-label="Joueur à nommer" value={pm} onChange={(e) => setPm(e.target.value)} className="min-h-12 w-full rounded-md border border-input bg-background px-3">
          <option value="">Choisir un joueur…</option>
          {s.players.map((p) => <option key={p.character_id} value={p.character_id}>{p.name}</option>)}
        </select>
        <Button className="min-h-12 w-full" disabled={!pm || pending} onClick={() => run({ _action: 'pm', _target: pm, _request: req() })}>Nommer</Button>
        <p className="text-xs text-muted-foreground">Le titre est officiel et annoncé aux actualités ; les ministres fictifs actuels restent en place.</p>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Lois votées en attente (24 h avant l’entrée en vigueur)</h3>
        {s.pending_laws.length === 0 && <p className="text-sm text-muted-foreground">Aucune loi en attente.</p>}
        {s.pending_laws.map((l) => (
          <div key={l.id} className="space-y-2 rounded-lg bg-muted p-3 text-sm">
            <p className="font-semibold">{l.title}</p>
            <p className="text-xs text-muted-foreground">Entre en vigueur le {fmt(l.in_force_at)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button className="min-h-11" disabled={pending} onClick={() => run({ _action: 'promulgate', _target: l.id, _request: req() })}>Promulguer</Button>
              <Button className="min-h-11" variant="outline" disabled={pending} onClick={() => window.confirm('Renvoyer ce texte au Parlement pour une nouvelle délibération ? Il repassera devant l’Assemblée puis le Sénat.') && run({ _action: 'refer_back', _target: l.id, _request: req() })}>Renvoyer</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Allocution au JT</h3>
        <SpeechDraftHelper onDraft={setSpeech} />
        <textarea value={speech} maxLength={s.settings.speech_limit} onChange={(e) => setSpeech(e.target.value)} rows={4} aria-label="Texte de l’allocution" className="w-full rounded-md border border-input bg-background p-3 text-base" placeholder="Mes chers compatriotes…" />
        <Button className="min-h-12 w-full" disabled={!speech.trim() || pending} onClick={() => run({ _action: 'speech', _body: speech, _request: req() })}>Diffuser l’allocution</Button>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Référendum national</h3>
        <input value={question} maxLength={s.settings.question_limit} onChange={(e) => setQuestion(e.target.value)} aria-label="Question du référendum" className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-base" placeholder="Approuvez-vous… ?" />
        <Button className="min-h-12 w-full" disabled={!question.trim() || pending || !!s.referendum} onClick={() => window.confirm('Lancer ce référendum pendant 2 jours ?') && run({ _action: 'referendum', _body: question, _request: req() })}>Lancer le référendum</Button>
        <p className="text-xs text-muted-foreground">Un référendum à la fois. Le résultat est publié aux actualités ; il est consultatif.</p>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Dissolution de l’Assemblée</h3>
        <Button className="min-h-12 w-full" variant="destructive" disabled={!s.can_dissolve || pending} onClick={() => window.confirm('Dissoudre l’Assemblée nationale ? Des législatives anticipées s’ouvrent immédiatement. Une seule dissolution par mandat.') && run({ _action: 'dissolve', _request: req() })}>Dissoudre l’Assemblée</Button>
        <p className="text-xs text-muted-foreground">Impossible pendant une élection nationale en cours, et une seule fois par mandat.</p>
      </div>
    </section>
  );
}
