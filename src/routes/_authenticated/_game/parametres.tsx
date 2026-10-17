import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/components/game/GameShell";
import { saveSettings, settingsQuery } from "@/services/game";

export const Route = createFileRoute("/_authenticated/_game/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — CIVITAS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setEmail(data.user?.email ?? ""); setUserId(data.user?.id ?? ""); });
  }, []);

  async function update(patch: Parameters<typeof saveSettings>[1]) {
    try {
      await saveSettings(userId, patch);
      await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      toast.success("Préférence enregistrée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  const row = "flex min-h-16 items-center justify-between gap-4 border-b border-border py-3 last:border-0";

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-rise">
      <h1 className="text-3xl font-bold">Paramètres</h1>

      <section className="rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
        <h2 className="text-lg font-semibold">Profil</h2>
        <p className="mt-1 text-sm text-muted-foreground">Compte : {email}</p>
      </section>

      <section className="rounded-3xl border border-border bg-gradient-card px-5 py-2 shadow-card">
        <div className={row}>
          <div><p className="font-semibold">Langue</p><p className="text-sm text-muted-foreground">Langue de l'interface</p></div>
          <select value={settings?.language ?? "fr"} onChange={(e) => update({ language: e.target.value })}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
            <option value="fr">Français</option>
            <option value="en">English (bientôt)</option>
          </select>
        </div>
        <div className={row}>
          <div><p className="font-semibold">Notifications</p><p className="text-sm text-muted-foreground">Recevoir les alertes du jeu</p></div>
          <Switch checked={settings?.notifications_enabled ?? true} onCheckedChange={(v) => update({ notifications_enabled: v })} />
        </div>
        <div className={row}>
          <div><p className="font-semibold">Réduire les animations</p><p className="text-sm text-muted-foreground">Interface plus calme</p></div>
          <Switch checked={settings?.reduced_motion ?? false} onCheckedChange={(v) => update({ reduced_motion: v })} />
        </div>
        <div className={row}>
          <div><p className="font-semibold">Profil public</p><p className="text-sm text-muted-foreground">Visible par les autres joueurs (plus tard)</p></div>
          <Switch checked={settings?.profile_public ?? false} onCheckedChange={(v) => update({ profile_public: v })} />
        </div>
      </section>

      <Button variant="outline" size="lg" className="w-full" onClick={signOut}><LogOut /> Se déconnecter</Button>
    </div>
  );
}
