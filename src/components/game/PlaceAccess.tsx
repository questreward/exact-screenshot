import { Clock, DoorOpen, Lock } from 'lucide-react';
import type { OpenState } from '@/game/place-doors';

/** Display only: the existing secured operations continue to decide access. */
export function PlaceAccess({ hours, state, accessible, here }: { hours: string | null; state: OpenState | null; accessible: boolean; here: boolean }) {
  return <section aria-label="Horaires et accès" className="space-y-2 border-y border-border py-3">
    <h4 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" />Horaires du lieu</h4>
    <p className="break-words text-sm">{hours || 'Horaires non renseignés'}</p>
    <p role="status" className={`flex items-start gap-2 text-sm ${!accessible || state?.open === false ? 'text-destructive' : state?.open ? 'text-success' : 'text-muted-foreground'}`}>
      {!accessible || state?.open === false ? <Lock className="h-4 w-4 shrink-0" /> : <DoorOpen className="h-4 w-4 shrink-0" />}
      <span>{!accessible ? 'Lieu indisponible' : state?.open === false ? `Fermé · prochaine ouverture ${state.opensAt ?? 'non précisée'}` : state?.open ? 'Ouvert selon les horaires enregistrés' : 'Ouverture non précisée · accès vérifié lors de votre action'}</span>
    </p>
    <p className="text-xs text-muted-foreground">{!accessible ? 'Espaces et rayons indisponibles.' : state?.open === false ? 'Entrée dans les espaces et exploration des rayons indisponibles. Vous pouvez quitter votre espace actuel.' : !here ? 'Rejoignez ce lieu pour accéder à ses espaces et rayons.' : 'Espaces accessibles selon leurs droits ; rayons consultables sur place.'}</p>
  </section>;
}