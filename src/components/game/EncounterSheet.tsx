import { useQuery } from '@tanstack/react-query';
import { MapPin, History } from 'lucide-react';
import { socialQuery } from '@/services/game';
import { EncounterHistory } from './EncounterHistory';
import { ExperienceState } from './ExperienceState';

export function EncounterSheet({ npcId, name, locationName }: { npcId: string; name: string; locationName?: string }) {
  const social = useQuery(socialQuery);
  return <section aria-label={`Fiche de rencontre de ${name}`} className="space-y-3 border-t border-border py-3">
    <h4 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" />Fiche de rencontre · {name}</h4>
    <p className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span>Lieu de cet échange : {locationName ?? 'non précisé'}</span></p>
    {social.isPending && <ExperienceState kind="loading" title="Recherche de vos actions…" />}
    {social.isError && <ExperienceState kind="error" title="Actions momentanément indisponibles" onRetry={() => void social.refetch()} />}
    {social.data && <EncounterHistory npcId={npcId} social={social.data} />}
    <p className="text-xs text-muted-foreground">Les lieux des anciennes actions ne sont pas enregistrés. Le lieu actuel ne leur est pas attribué.</p>
  </section>;
}