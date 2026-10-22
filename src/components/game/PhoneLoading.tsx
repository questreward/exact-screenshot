import { Smartphone } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ExperienceState } from './ExperienceState';

/** Device placeholder does not depend on any loaded account or world query. */
export function PhoneLoading({ failed = false, onRetry }: { failed?: boolean; onRetry?: () => void }) {
  return <div className="flex min-w-0 justify-center"><div className="phone-shell" data-app="loading">
    <div className="phone-status"><span className="flex min-h-12 items-center gap-2 text-sm font-semibold"><Smartphone className="h-4 w-4" />CIVITAS</span><Button asChild variant="ghost" className="min-h-12"><Link to="/tableau-de-bord">Fermer</Link></Button></div>
    <div className="phone-screen" aria-busy={!failed}>
      <ExperienceState kind={failed ? 'error' : 'loading'} title={failed ? 'Impossible d’ouvrir cette application' : 'Ouverture du téléphone…'} description={failed ? 'Votre partie est conservée. Vérifiez votre connexion et réessayez.' : 'Vos informations sont en cours de chargement.'} {...(onRetry ? { onRetry } : {})} />
      {!failed && <div aria-hidden className="mt-8 space-y-5"><div className="h-16 w-2/3 rounded-lg bg-muted/50" /><div className="phone-app-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="flex h-24 flex-col items-center gap-3"><div className="h-14 w-14 rounded-lg bg-muted/50" /><div className="h-3 w-16 rounded bg-muted/50" /></div>)}</div></div>}
    </div>
  </div></div>;
}