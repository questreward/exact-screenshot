import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { characterQuery } from "@/services/game";
import type { StyleLook } from "@/components/game/CharacterAvatar";

export const STYLE_SLOT: Record<string, keyof StyleLook> = {
  "cadre-or": "cadre", "cadre-tricolore": "cadre", "tenue-costume": "tenue", "tenue-sport": "tenue",
  "tenue-soiree": "tenue", "badge-pionnier": "badge", "fond-tour": "fond", "fond-mer": "fond",
  "vip-tenue-gala": "tenue", "vip-cadre-etoile": "cadre",
};

// Apparence + objets portés d'un joueur, enregistrés sur le serveur (visibles par les autres joueurs).
export const lookQuery = (characterId: string) => queryOptions({
  queryKey: ["cosmetic-look", characterId], retry: false, staleTime: 30000,
  queryFn: async (): Promise<{ appearance: unknown; look: StyleLook } | null> => {
    const { data, error } = await (supabase as any).rpc("cosmetic_look", { _character: characterId });
    if (error) throw new Error(error.message);
    return data ?? null;
  },
});

export function useStyleLook() {
  const qc = useQueryClient();
  const { data: ch } = useQuery({ ...characterQuery, throwOnError: false });
  const id = (ch as { id?: string } | null | undefined)?.id ?? "";
  const { data } = useQuery({ ...lookQuery(id), enabled: !!id, throwOnError: false });
  const look: StyleLook = data?.look ?? {};
  async function wear(item: string, on: boolean) {
    const { error } = await (supabase as any).rpc("cosmetic_wear", { _item: item, _on: on });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["cosmetic-look"] });
  }
  return { look, wear };
}
