import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, LoaderCircle, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLifeMutation } from "@/components/game/LifeControls";
import { callProtest, joinProtest, protestsQuery, type ProtestsState } from "@/services/game";
import { PROTEST_STATUS, availableHours, canCallProtest, protestProgress } from "@/game/protests";
import { newsDate } from "@/game/news";

const fieldClass = "h-12 w-full rounded-md border border-input bg-background px-3 text-sm";
const DAYS = ["Aujourd'hui", "Demain", "Dans 2 jours", "Dans 3 jours", "Dans 4 jours", "Dans 5 jours", "Dans 6 jours"];

function CallForm({ s, onClose }: { s: ProtestsState; onClose: () => void }) {
  const [cause, setCause] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState("");
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState<number | "">("");
  const [link, setLink] = useState<"none" | "consultation" | "decision">("none");
  const [consultationId, setConsultationId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const call = useLifeMutation(callProtest, "Appel à manifester publié");
  const hours = availableHours(s.now, day);
  const consultation = s.consultations.find(c => c.id === consultationId);
  const ready = cause.trim().length >= 5 && locationId && hour !== "" && (link !== "consultation" || optionId) && (link !== "decision" || decisionId);
  return <div className="space-y-3 rounded-lg border border-border bg-background p-4">
    <label className="block space-y-1 text-sm">Cause défendue<Input className="h-12" value={cause} maxLength={120} placeholder="Ex. : Plus de pistes cyclables" onChange={e => setCause(e.target.value)} /></label>
    <label className="block space-y-1 text-sm">Message (facultatif)<Textarea value={description} maxLength={500} onChange={e => setDescription(e.target.value)} /></label>
    <label className="block space-y-1 text-sm">Lieu<select className={fieldClass} value={locationId} onChange={e => setLocationId(e.target.value)}><option value="">Choisir une place, un parc ou la mairie…</option>{s.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-2">
      <label className="block space-y-1 text-sm">Jour<select className={fieldClass} value={day} onChange={e => { setDay(Number(e.target.value)); setHour(""); }}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></label>
      <label className="block space-y-1 text-sm">Heure<select className={fieldClass} value={hour} onChange={e => setHour(e.target.value === "" ? "" : Number(e.target.value))}><option value="">—</option>{hours.map(h => <option key={h} value={h}>{h} h</option>)}</select></label>
    </div>
    <label className="block space-y-1 text-sm">Faire pression sur…<select className={fieldClass} value={link} onChange={e => setLink(e.target.value as typeof link)}><option value="none">Rien de précis</option><option value="consultation" disabled={!s.consultations.length}>Une consultation en cours</option><option value="decision" disabled={!s.decisions.length}>Une décision de la mairie (la contester)</option></select></label>
    {link === "consultation" && <>
      <select className={fieldClass} aria-label="Consultation" value={consultationId} onChange={e => { setConsultationId(e.target.value); setOptionId(""); }}><option value="">Choisir la consultation…</option>{s.consultations.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      {consultation && <select className={fieldClass} aria-label="Option défendue" value={optionId} onChange={e => setOptionId(e.target.value)}><option value="">Option que vous défendez…</option>{consultation.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>}
    </>}
    {link === "decision" && <select className={fieldClass} aria-label="Décision contestée" value={decisionId} onChange={e => setDecisionId(e.target.value)}><option value="">Choisir la décision…</option>{s.decisions.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select>}
    <p className="text-xs text-muted-foreground">Durée {s.settings.duration_minutes} min · −{s.settings.energy_cost} énergie · Réussite à partir de {s.settings.success_threshold} participants. Vous êtes inscrit automatiquement.</p>
    <div className="flex flex-wrap gap-2">
      <Button className="h-12" disabled={!ready || call.isPending} onClick={() => call.mutate({ cause: cause.trim(), description: description.trim(), locationId, dayOffset: day, hour: Number(hour), consultationId: link === "consultation" ? consultationId : undefined, optionId: link === "consultation" ? optionId : undefined, decisionId: link === "decision" ? decisionId : undefined }, { onSuccess: onClose })}>{call.isPending ? <LoaderCircle className="animate-spin" /> : <Megaphone />} Publier l'appel</Button>
      <Button variant="ghost" className="h-12" onClick={onClose}>Annuler</Button>
    </div>
  </div>;
}

export function ProtestsCard() {
  const { data: s, isLoading } = useQuery(protestsQuery);
  const [open, setOpen] = useState(false);
  const join = useLifeMutation(joinProtest, "Manifestation ajoutée à votre agenda");
  if (isLoading || !s) return null;
  const adult = canCallProtest(s.age, s.settings.min_age);
  const organizing = s.protests.some(p => p.mine && p.status === "planned");
  return <section className="space-y-4 rounded-lg border border-border bg-card p-5">
    <div className="flex items-center gap-2"><Megaphone className="h-6 w-6 text-primary" /><h2 className="text-xl font-semibold">Manifestations</h2></div>
    <p className="text-sm text-muted-foreground">Rassemblez les habitants autour d'une cause. Une manifestation réussie rapporte réputation et influence, fait l'actualité et pèse sur la consultation ou la décision visée.</p>
    {!open && <Button className="h-12 w-full sm:w-auto" disabled={!adult || organizing} onClick={() => setOpen(true)}><Megaphone /> Appeler à manifester</Button>}
    {!adult && <p className="text-xs text-muted-foreground">Il faut avoir {s.settings.min_age} ans pour organiser ; vous pouvez rejoindre une manifestation.</p>}
    {organizing && !open && <p className="text-xs text-muted-foreground">Vous organisez déjà une manifestation.</p>}
    {open && <CallForm s={s} onClose={() => setOpen(false)} />}
    {s.protests.length === 0 ? <p className="text-sm text-muted-foreground">Aucune manifestation dans votre ville pour le moment.</p> :
      <div className="space-y-3">{s.protests.map(p => <article key={p.id} className="space-y-2 border-t border-border pt-3">
        <p className="text-xs text-primary">{PROTEST_STATUS[p.status]} · {newsDate(p.starts_at)}</p>
        <h3 className="font-semibold">{p.cause}</h3>
        {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.location.name} · Organisée par {p.organizer}</p>
        {p.option && <p className="text-xs">Soutient « {p.option} » ({p.consultation}){p.effects.includes("consultation_pressure") ? ` · pression +${s.settings.pressure_percent} % obtenue` : ""}</p>}
        {p.decision && <p className="text-xs">Conteste « {p.decision} »{p.effects.includes("decision_contested") ? " · décision désormais contestée" : ""}</p>}
        {p.status === "planned" ? <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${protestProgress(p.registered, s.settings.success_threshold)}%` }} /></div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{p.registered} joueur{p.registered > 1 ? "s" : ""} inscrit{p.registered > 1 ? "s" : ""} · des habitants peuvent se joindre le jour venu</p>
          {!p.joined && <Button variant="outline" className="h-12" disabled={join.isPending} onClick={() => join.mutate(p.id)}><Users /> Participer</Button>}
          {p.joined && <p className="text-xs text-primary">Inscrit · présentez-vous sur place et touchez « Commencer » dans l'agenda.</p>}
        </> : <p className="text-sm">{p.player_count + p.npc_count} participants ({p.player_count} joueur{p.player_count > 1 ? "s" : ""}, {p.npc_count} habitant{p.npc_count > 1 ? "s" : ""})</p>}
      </article>)}</div>}
  </section>;
}
