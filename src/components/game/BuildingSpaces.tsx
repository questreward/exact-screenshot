import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DoorOpen, ArrowLeft, Lock, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';
import { enterLocationSpace, leaveLocationSpace } from '@/services/game';

/** Navigation des espaces enregistrés ; le serveur reste seul décisionnaire de l’entrée. */
export function BuildingSpaces({ spaces, here, currentSpace, closed = false }: { spaces: Tables<'location_spaces'>[]; here: boolean; currentSpace: string | null; closed?: boolean }) {
  const q = useQueryClient();
  const [uncertain, setUncertain] = useState(false);
  const refresh = async () => { await q.invalidateQueries({ queryKey: ['position'], refetchType: 'all' }, { throwOnError: true }); setUncertain(false); };
  const action = useMutation({
    mutationFn: async (spaceId: string | null) => {
      if (spaceId === null) await leaveLocationSpace(); else await enterLocationSpace(spaceId);
      await refresh();
    },
    onSuccess: () => toast.success('Votre position dans le bâtiment est actualisée.'),
    onError: (error: Error) => { setUncertain(true); toast.error(error.message); },
  });
  const retry = useMutation({ mutationFn: refresh, onError: (error: Error) => toast.error(error.message) });
  if (!spaces.length) return null;
  const inside = here ? spaces.find(space => space.id === currentSpace) : undefined;
  return <section className="space-y-3 border-y border-border py-4" aria-label="Espaces du bâtiment">
    <h4 className="flex items-center gap-2 font-semibold"><DoorOpen className="h-5 w-5 text-primary" />À l’intérieur</h4>
    <p role="status" className="text-sm text-muted-foreground">{inside ? `Vous êtes dans : ${inside.name}` : closed ? 'Lieu fermé · espaces indisponibles pour le moment.' : here ? 'Vous êtes au lieu. Choisissez un espace.' : 'Lieu consulté · rejoignez-le pour entrer.'}</p>
    {uncertain && <div role="alert" className="space-y-2 border-l-2 border-warning pl-3"><p className="text-sm">Votre position doit être vérifiée avant de continuer.</p><Button variant="outline" className="min-h-12 w-full" disabled={retry.isPending} onClick={() => retry.mutate()}>{retry.isPending && <LoaderCircle className="animate-spin" />}Vérifier ma position</Button></div>}
    <ul className="divide-y divide-border">{spaces.map(space => {
      const current = inside?.id === space.id;
      const parent = spaces.find(item => item.id === space.parent_id);
      return <li key={space.id} className="flex flex-wrap items-center gap-3 py-3"><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{space.name}</span>{parent && <span className="block text-xs text-muted-foreground">{parent.name}</span>}{!space.accessible && <span className="block text-xs text-muted-foreground">Disponible dans une prochaine étape</span>}</span>
        <Button variant={current ? 'secondary' : 'outline'} className="min-h-12 shrink-0" disabled={!here || ((!space.accessible || closed) && !current) || action.isPending || uncertain || retry.isPending} onClick={() => action.mutate(current ? null : space.id)}>{action.isPending && action.variables === (current ? null : space.id) ? <LoaderCircle className="animate-spin" /> : current ? <ArrowLeft /> : space.accessible && !closed ? <DoorOpen /> : <Lock />}{current ? 'Sortir' : 'Entrer'}</Button>
      </li>;
    })}</ul>
  </section>;
}