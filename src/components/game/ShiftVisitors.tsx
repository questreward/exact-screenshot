import { useEffect, useState } from "react";
import { shiftVisitors, satisfaction, satisfactionLabel } from "@/game/client-dialogue";

const KEY = (day: string) => `civitas-visitors-${day}`;
type Done = Record<string, { s: number; reply: string; label: string }>;

export function readVisitorResults(day: string): Done {
  try { return JSON.parse(localStorage.getItem(KEY(day)) ?? "{}"); } catch { return {}; }
}

/** Clients / appels du service : dialogue à choix, satisfaction affichée, sans effet sur le salaire. */
export function ShiftVisitors({ day, jobKey }: { day: string; jobKey: string }) {
  const visitors = shiftVisitors(day, jobKey);
  const [done, setDone] = useState<Done>({});
  useEffect(() => { setDone(readVisitorResults(day)); }, [day]);
  const cur = visitors.find((v) => !done[v.id]);
  const save = (d: Done) => { setDone(d); localStorage.setItem(KEY(day), JSON.stringify(d)); };

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <p className="text-sm font-semibold">👤 Clients du service · {Object.keys(done).length}/{visitors.length}</p>
      {cur ? (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">{cur.name} · {cur.behavior.emoji} {cur.behavior.label}</p>
          {cur.returning && <p className="text-xs text-primary">« Bonjour, je suis déjà venu la semaine dernière. »</p>}
          <p className="mt-1 rounded-lg bg-muted p-2 text-sm">« {cur.scene.need} »</p>
          <p className="mt-2 text-sm font-semibold">Que voulez-vous faire ?</p>
          <div className="mt-1 grid gap-2">
            {cur.scene.choices.map((c) => (
              <button key={c.label} type="button" className="min-h-12 rounded-xl bg-primary/10 px-3 text-left text-sm font-semibold active:scale-[0.98]"
                onClick={() => save({ ...done, [cur.id]: { s: satisfaction(cur, c), reply: c.reply, label: c.label } })}>{c.label}</button>
            ))}
          </div>
        </div>
      ) : <p className="mt-1 text-sm text-muted-foreground">Tous les clients ont été reçus. Le service continue.</p>}
      {Object.keys(done).length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {visitors.filter((v) => done[v.id]).map((v) => <li key={v.id}>{v.name} : « {done[v.id]!.reply} » — {satisfactionLabel(done[v.id]!.s)}</li>)}
        </ul>
      )}
    </div>
  );
}
