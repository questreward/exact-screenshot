import { ArrowDownRight, ArrowUpRight, Clock } from "lucide-react";
import type { CityEffect } from "@/services/game";
import { INDICATOR_LABELS, formatEuros } from "@/game/society";

const when = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Liste lisible des conséquences (passées et à venir) : quoi, combien, quand, pourquoi. */
export function EffectsList({ effects, title = "Conséquences" }: { effects: CityEffect[] | null; title?: string }) {
  if (!effects?.length) return null;
  return <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
    <ul className="space-y-1">
      {effects.map((e, i) => {
        const v = e.kind === "treasury" ? e.amount : e.delta;
        const up = v >= 0;
        return <li key={i} className={`flex items-start gap-2 rounded-lg p-2 text-sm ${e.applied ? "bg-muted" : "border border-dashed border-border"}`}>
          {e.applied ? (up ? <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />)
            : <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="min-w-0 flex-1">
            <b>{e.kind === "treasury" ? `Budget ${up ? "+" : ""}${formatEuros(v)}` : `${INDICATOR_LABELS[e.indicator ?? ""] ?? e.indicator} ${up ? "+" : ""}${v}`}</b>
            <span className="block text-xs text-muted-foreground">{e.label} · {e.applied ? "fait" : `prévu le ${when(e.due_at)}`}</span>
          </span>
        </li>;
      })}
    </ul>
  </div>;
}
