import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, HeartPulse, LoaderCircle, Smile, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLifeMutation } from "@/components/game/LifeControls";
import { healthAction, healthQuery } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { healthLabel, moraleLabel } from "@/game/society";

export const Route = createFileRoute("/_authenticated/_game/sante")({
  head: () => ({ meta: gameMeta("Santé", "Santé, moral, sport, détente et médecin de votre personnage.") }),
  component: HealthPage,
});

function Gauge({ label, value, text }: { label: string; value: number; text: string }) {
  return <div className="space-y-1">
    <div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span>{value}/100 · {text}</span></div>
    <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} /></div>
  </div>;
}

function HealthPage() {
  const { data: st, isError, isLoading } = useQuery(healthQuery);
  const act = useLifeMutation(healthAction, "C'est fait");
  const done = (k: "sport" | "detente" | "medecin") => st?.done_today.includes(k) ?? false;
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><HeartPulse className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Santé</h1><p className="text-sm text-muted-foreground">Prenez soin de votre personnage.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Santé et bien-être : Disponible dans une prochaine étape.</p>}
    {st && <>
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <Gauge label="Santé" value={st.health} text={healthLabel(st.health)} />
        <Gauge label="Moral" value={st.morale} text={moraleLabel(st.morale)} />
        {st.illness
          ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"><b>{st.illness}</b> : vous perdez {st.settings.illness_loss} points de santé par jour jusqu'à guérison{st.ill_until && ` (au plus tard le ${new Date(st.ill_until).toLocaleDateString("fr-FR")})`}.</p>
          : <p className="text-sm text-muted-foreground">Aucune maladie. Votre santé remonte de {st.settings.daily_recovery} points par jour.</p>}
      </section>
      <section className="grid gap-3">
        <Button className="h-14 justify-start gap-3 text-base" disabled={!!st.illness || done("sport") || st.energy < st.settings.sport_energy || act.isPending} onClick={() => act.mutate("sport")}>
          <Dumbbell />Faire du sport <span className="ml-auto text-xs opacity-80">−{st.settings.sport_energy} énergie · +{st.settings.sport_health} santé</span></Button>
        <Button variant="outline" className="h-14 justify-start gap-3 text-base" disabled={done("detente") || act.isPending} onClick={() => act.mutate("detente")}>
          <Smile />Moment de détente <span className="ml-auto text-xs text-muted-foreground">+{st.settings.relax_morale} moral</span></Button>
        <Button variant="outline" className="h-14 justify-start gap-3 text-base" disabled={done("medecin") || (!st.illness && st.health >= 70) || act.isPending} onClick={() => act.mutate("medecin")}>
          <Stethoscope />Voir un médecin <span className="ml-auto text-xs text-muted-foreground">{st.settings.doctor_cost} crédits · guérit</span></Button>
      </section>
      <p className="text-xs text-muted-foreground">Chaque action une fois par jour. Le sport est impossible en étant malade. Le médecin sert si vous êtes malade ou si votre santé est sous 70. On tombe parfois malade (environ {st.settings.illness_chance_pct} % de risque par jour). Le moral revient doucement vers {st.settings.morale_target}.</p>
    </>}
  </div>;
}
