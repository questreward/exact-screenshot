import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cake, X } from "lucide-react";
import { Bonhomme } from "./Bonhomme";
import { agingQuery, characterQuery } from "@/services/game";

// Settles aging on each visit (1 year per real month, server-side) and celebrates a recent birthday.
export function BirthdayBanner() {
  const qc = useQueryClient();
  const { data } = useQuery(agingQuery);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { if (data) qc.invalidateQueries({ queryKey: characterQuery.queryKey }); }, [data?.age]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data?.new_birthday || hidden) return null;
  const next = data.next_birthday ? new Date(data.next_birthday).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
      <Bonhomme seed="anniversaire" mood="cheer" className="h-14 w-7 shrink-0" />
      <Cake className="h-7 w-7 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="font-display font-semibold">Joyeux anniversaire ! Tu as {data.age} ans.</p>
        {next && <p className="text-sm text-muted-foreground">Prochain anniversaire le {next} (1 an de jeu = 1 mois réel).</p>}
      </div>
      <button onClick={() => setHidden(true)} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground"><X className="h-5 w-5" /></button>
    </div>
  );
}
