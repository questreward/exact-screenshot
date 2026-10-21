import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chooseSituation, situationsQuery, type Situation } from "@/services/game";

/** Situations du quotidien : une à la fois, choix réels, fil « Activité récente ». */
export function DailySituations() {
  const qc = useQueryClient();
  const { data, error } = useQuery(situationsQuery);
  const [showFeed, setShowFeed] = useState(false);
  const choose = useMutation({
    mutationFn: chooseSituation,
    onSuccess: (r) => { toast(r.message); qc.invalidateQueries({ queryKey: ["situations"] }); qc.invalidateQueries({ queryKey: ["bank"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (error || !data) return null;
  const open = data.items.find((i) => i.status === "open");
  const past = data.items.filter((i) => i.status !== "open");
  const missed = past.filter((i) => i.status === "missed" && i.day !== data.day);
  const todayCount = data.items.filter((i) => i.day === data.day).length;

  return (
    <section className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">✨ Situations du jour</h2>
        <span className="text-xs text-muted-foreground">{todayCount}/{data.max} aujourd'hui</span>
      </div>
      {open ? <OpenCard s={open} busy={choose.isPending} onPick={(c) => choose.mutate({ id: open.id, choice: c })} />
        : <p className="mt-2 text-sm text-muted-foreground">{data.unlocked >= data.max ? "C'est tout pour aujourd'hui. Revenez demain !" : "Rien pour l'instant. Une nouvelle situation arrive à 8h, 12h, 16h et 19h."}</p>}
      {missed.length > 0 && (
        <div className="mt-4 rounded-2xl bg-accent/60 p-3 text-sm">
          <p className="font-semibold">Vous avez manqué :</p>
          <ul className="mt-1 space-y-1">{missed.slice(0, 3).map((m) => <li key={m.id}>{m.snapshot.emoji} {m.snapshot.title}</li>)}</ul>
        </div>
      )}
      {past.length > 0 && (
        <button type="button" onClick={() => setShowFeed((v) => !v)} className="mt-3 min-h-11 w-full rounded-2xl border border-border text-sm font-semibold">
          📰 Activité récente {showFeed ? "▲" : "▼"}
        </button>
      )}
      {showFeed && (
        <ul className="mt-2 space-y-2">
          {past.map((p) => (
            <li key={p.id} className="rounded-2xl bg-background/60 p-3 text-sm">
              <p className="font-semibold">{p.snapshot.emoji} {p.snapshot.title}</p>
              <p className="text-muted-foreground">{p.status === "missed" ? "Manquée" : `${p.outcome?.label} — ${p.outcome?.message}`}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OpenCard({ s, busy, onPick }: { s: Situation; busy: boolean; onPick: (c: string) => void }) {
  return (
    <div className="mt-3">
      <p className="text-base font-semibold">{s.snapshot.emoji} {s.snapshot.title}</p>
      <p className="text-sm text-muted-foreground">{s.snapshot.body}</p>
      <p className="mt-3 text-sm font-semibold">Que voulez-vous faire ?</p>
      <div className="mt-2 grid gap-2">
        {s.snapshot.options.map((o) => (
          <button key={o.id} type="button" disabled={busy} onClick={() => onPick(o.id)}
            className="min-h-12 rounded-2xl bg-primary/10 px-4 py-2 text-left active:scale-[0.98] disabled:opacity-50">
            <span className="block font-semibold">{o.label}</span>
            <span className="block text-xs text-muted-foreground">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
