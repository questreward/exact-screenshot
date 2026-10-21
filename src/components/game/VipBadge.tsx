import { useQuery } from "@tanstack/react-query";
import { vipBadgeQuery } from "@/services/game";

/** Badge ⭐ VIP public : affiché seulement si l'abonnement est actif. */
export function VipBadge({ characterId }: { characterId: string }) {
  const { data } = useQuery({ ...vipBadgeQuery(characterId), throwOnError: false });
  if (!data) return null;
  return <span className="inline-flex min-h-7 items-center rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground">⭐ VIP</span>;
}
