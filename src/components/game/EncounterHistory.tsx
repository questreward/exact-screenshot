import { History } from 'lucide-react';
import type { SocialState } from '@/game/social';
import { encounterHistory } from '@/game/encounter-history';
import { gameDate, gameHour } from '@/game/life';

export function EncounterHistory({ npcId, social }: { npcId: string; social: SocialState }) {
  const exchanges = encounterHistory(social.history, npcId);
  return <section className="space-y-3 border-t border-border pt-3" aria-label="Rencontres enregistrées">
    <h4 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" />Nos rencontres</h4>
    {!exchanges.length ? <p className="text-xs text-muted-foreground">Aucun échange enregistré.</p> : <ol className="space-y-3 border-l border-border pl-3">{exchanges.slice(0, 5).map(exchange => <li key={exchange.id} className="space-y-1 text-xs">
      <time dateTime={exchange.occurred_at} className="text-muted-foreground">{gameDate(exchange.occurred_at).toLocaleDateString('fr-FR', { timeZone: 'UTC' })} · {gameHour(exchange.occurred_at)}</time>
      <p>{social.rules.find(rule => rule.id === exchange.action_id)?.title ?? 'Échange enregistré'}</p>
      <p className="text-primary">Relation : {exchange.relation_gain > 0 ? '+' : ''}{exchange.relation_gain}</p>
    </li>)}</ol>}
  </section>;
}