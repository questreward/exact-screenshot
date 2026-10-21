import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cafAppointmentsQuery, cafBook, cafCancel } from "@/services/game";
import { CAF_MOTIVES, cafSlots } from "@/game/caf-slots";

const dayLabel = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const hourLabel = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Rendez-vous avec un conseiller de la Caisse des aides : motif → créneau → confirmation. */
export function CafAppointments({ now }: { now: string }) {
  const q = useQueryClient();
  const { data: list = [] } = useQuery(cafAppointmentsQuery);
  const [motive, setMotive] = useState<string>("logement");
  const [slot, setSlot] = useState<Date | null>(null);
  const refresh = () => q.invalidateQueries({ queryKey: ["caf-appointments"] });
  const book = useMutation({ mutationFn: () => cafBook(slot!.toISOString(), motive), onSuccess: () => { toast.success("Rendez-vous confirmé"); setSlot(null); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const cancel = useMutation({ mutationFn: cafCancel, onSuccess: () => { toast.success("Rendez-vous annulé"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  const t = new Date(now).getTime();
  const upcoming = list.filter((a) => a.status === "prevu" && new Date(a.starts_at).getTime() > t);
  const past = list.filter((a) => !upcoming.includes(a)).slice(0, 5);
  const motiveLabel = (id: string) => CAF_MOTIVES.find((m) => m.id === id)?.label ?? id;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h1 className="font-heading text-xl font-bold">Mes rendez-vous</h1>
      <div>
        <h2 className="font-semibold">📅 À venir</h2>
        {upcoming.length ? upcoming.map((a) => (
          <div key={a.id} className="mt-2 rounded-lg border border-primary bg-primary/10 p-3 text-sm">
            <p className="font-semibold capitalize">{dayLabel(new Date(a.starts_at))} à {hourLabel(new Date(a.starts_at))}</p>
            <p>Conseiller Caisse des aides · {motiveLabel(a.motive)}</p>
            <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate(a.id)} className="mt-2 min-h-11 w-full rounded-md border border-border font-semibold">Annuler ce rendez-vous</button>
          </div>)) : <p className="mt-1 text-sm text-muted-foreground">Aucun rendez-vous prévu.</p>}
      </div>
      {!upcoming.length && <div className="space-y-3">
        <h2 className="font-semibold">Prendre rendez-vous</h2>
        <div><p className="text-sm">1. Motif</p><div className="mt-1 flex flex-wrap gap-2">{CAF_MOTIVES.map((m) => (
          <button key={m.id} type="button" onClick={() => setMotive(m.id)} className={`min-h-11 rounded-full border px-3 text-sm ${motive === m.id ? "border-primary bg-primary/15 font-semibold" : "border-border"}`}>{m.label}</button>))}</div></div>
        <div><p className="text-sm">2. Créneau</p>{cafSlots(new Date(now)).map((d) => (
          <div key={d.day} className="mt-2"><p className="text-xs font-semibold capitalize text-muted-foreground">{dayLabel(d.slots[0]!)}</p>
            <div className="mt-1 grid grid-cols-3 gap-2">{d.slots.map((s) => (
              <button key={s.toISOString()} type="button" onClick={() => setSlot(s)} className={`min-h-11 rounded-md border text-sm ${slot?.getTime() === s.getTime() ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{hourLabel(s)}</button>))}</div></div>))}</div>
        {slot && <div className="rounded-lg bg-muted p-3 text-sm">
          <p>3. Confirmation : <b className="capitalize">{dayLabel(slot)} à {hourLabel(slot)}</b> · {motiveLabel(motive)}</p>
          <button type="button" disabled={book.isPending} onClick={() => book.mutate()} className="mt-2 min-h-12 w-full rounded-md bg-primary font-semibold text-primary-foreground">{book.isPending ? "Traitement…" : "Confirmer le rendez-vous"}</button>
        </div>}
      </div>}
      {past.length > 0 && <div><h2 className="font-semibold">Historique</h2><ul className="mt-1 text-sm text-muted-foreground">{past.map((a) => <li key={a.id}>{dayLabel(new Date(a.starts_at))} · {motiveLabel(a.motive)}{a.status === "annule" ? " · annulé" : ""}</li>)}</ul></div>}
      <p className="text-xs text-muted-foreground">Rendez-vous fictif CIVITAS, sans effet sur tes aides.</p>
    </section>
  );
}
