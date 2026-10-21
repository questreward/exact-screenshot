import { useQuery } from "@tanstack/react-query";
import { securityQuery } from "@/services/game";
import { cabForJob } from "@/game/v2-scenes";

// Tenue affichée seulement : lue depuis la carrière enregistrée côté serveur.
export function useMyUniform() {
  const { data } = useQuery({ ...securityQuery, refetchInterval: false });
  const c = data?.career;
  return c && c.status !== "quitte" ? cabForJob(c.service) : null;
}
