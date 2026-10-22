import { GameSelect } from "@/components/game/GameSelect";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { campaignMeetingsQuery, civicLocationsQuery, planCampaignMeeting, publishCampaignAnnouncement } from "@/services/game";
import type { Candidate, Election } from "@/game/elections";

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const HOURS = [2, 6, 24];

// Meeting at a place the candidate picks + announcement in political news. Limits and checks live in secured SQL.
export function CampaignStage({ ca, e }: { ca: Candidate; e: Election }) {
  const qc = useQueryClient();
  const { data: places = [] } = useQuery(civicLocationsQuery(e.city_id));
  const { data: meetings = [] } = useQuery({ ...campaignMeetingsQuery(e.id), retry: false });
  const [place, setPlace] = useState("");
  const [hours, setHours] = useState(6);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await qc.invalidateQueries(); } catch (err) { toast.error(err instanceof Error ? err.message : "Action impossible"); } finally { setBusy(false); }
  };
  const mine = meetings.filter(m => m.candidacy_id === ca.id);
  const nameOf = (id: string) => places.find(p => p.id === id)?.name ?? "Lieu";

  return <div className="mb-6 space-y-5">
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">📣 Organiser un meeting</h2>
      <p className="text-sm text-muted-foreground">Choisis le lieu dans ta ville. Les habitants joueurs reçoivent une invitation et le meeting apparaît sur la carte et dans les actualités. Un meeting par jour.</p>
      <GameSelect value={place} onChange={ev => setPlace(ev.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base">
        <option value="">Choisir un lieu…</option>
        {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </GameSelect>
      <div className="grid grid-cols-3 gap-2">{HOURS.map(h => <Button key={h} type="button" variant={hours === h ? "default" : "outline"} className="min-h-12" onClick={() => setHours(h)}>Dans {h} h</Button>)}</div>
      <Button className="min-h-12 w-full" disabled={!place || busy} onClick={() => run(() => planCampaignMeeting({ candidacyId: ca.id, locationId: place, hoursAhead: hours }), "Meeting annoncé, les habitants sont invités")}>Annoncer le meeting</Button>
      {mine.length > 0 && <ul className="space-y-2">{mine.map(m => <li key={m.id} className="rounded-xl bg-muted p-3 text-sm">
        <p className="font-medium">{nameOf(m.location_id)}</p><p className="text-xs text-muted-foreground">{when(m.starts_at)} · {m.invited} habitant(s) invité(s)</p>
        <Button asChild variant="outline" className="mt-2 min-h-12"><Link to="/carte" search={{ city: e.city_id, location: m.location_id }}>Voir le lieu du meeting</Link></Button></li>)}</ul>}
    </section>
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">📰 Publier une annonce</h2>
      <p className="text-sm text-muted-foreground">Ton texte paraît dans les actualités politiques de la ville. Une annonce par jour, 280 caractères maximum.</p>
      <Textarea value={text} maxLength={280} onChange={ev => setText(ev.target.value)} placeholder="Ex. : Je présenterai samedi mon plan pour les transports." className="min-h-24 text-base" />
      <p className="text-right text-xs text-muted-foreground">{text.length}/280</p>
      <Button className="min-h-12 w-full" disabled={text.trim().length < 10 || busy} onClick={() => run(async () => { await publishCampaignAnnouncement({ candidacyId: ca.id, text }); setText(""); }, "Annonce publiée dans les actualités")}>Publier dans les actualités</Button>
    </section>
  </div>;
}
