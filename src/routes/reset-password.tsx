import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLayout } from "@/components/game/PublicLayout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — CIVITAS" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte CIVITAS." },
      { property: "og:title", content: "Nouveau mot de passe — CIVITAS" },
      { property: "og:description", content: "Réinitialisation du mot de passe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/tableau-de-bord", replace: true });
  }

  return (
    <PublicLayout>
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-border bg-gradient-card p-7 shadow-card">
        <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">Mot de passe</Label>
            <Input id="pw" type="password" minLength={8} required className="h-12 text-base" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>Enregistrer</Button>
        </form>
      </div>
    </PublicLayout>
  );
}
