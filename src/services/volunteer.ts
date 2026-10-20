import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export type VolunteerDossierState = {
  branches: { city_id: string; label: string }[];
  attachments: { id: string; city_id: string; attached_at: string }[];
  notes: { shift_id: string; note: string; created_at: string }[];
};
type Rpc = (fn: string, args?: object) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
export const volunteerDossierQuery = queryOptions({
  queryKey: ['volunteer-dossier'], staleTime: 0,
  queryFn: async (): Promise<VolunteerDossierState | null> => {
    const { data, error } = await (supabase.rpc as unknown as Rpc)('volunteer_dossier_state');
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return null;
      throw new Error(error.message);
    }
    return data as VolunteerDossierState;
  },
});
export async function volunteerAction(fn: 'volunteer_attach' | 'volunteer_save_note', args: object) {
  const { data, error } = await (supabase.rpc as unknown as Rpc)(fn, args);
  if (error) throw new Error(error.message);
  return data as VolunteerDossierState;
}
