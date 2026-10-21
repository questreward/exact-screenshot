import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/game/Logo";
import cityHero from "@/assets/city-hero.jpg";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode: s["mode"] === "signup" || s["mode"] === "forgot" ? (s["mode"] as Mode) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connexion — CIVITAS" },
      { name: "description", content: "Créez votre compte CIVITAS ou connectez-vous pour retrouver votre personnage." },
      { property: "og:title", content: "Connexion — CIVITAS" },
      { property: "og:description", content: "Rejoignez le monde de CIVITAS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => { setMode(search.mode ?? "signin"); }, [search.mode]);
  useEffect(() => {
    // Lecture locale instantanée (pas d'appel réseau) pour éviter une course avec le bouton.
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/tableau-de-bord", replace: true }); });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) throw new Error("Connexion incomplète, réessayez.");
        await navigate({ to: "/tableau-de-bord", replace: true });
        return; // garde « Patientez… » jusqu'à l'arrivée sur le tableau de bord
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth" } });
        if (error) throw error;
        if (data.session) navigate({ to: "/creation", replace: true });
        else setSent("Vérifiez vos e-mails : cliquez sur le lien de confirmation pour activer votre compte.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setSent("Si un compte existe, un e-mail de réinitialisation vient d'être envoyé.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg.includes("Invalid login") ? "E-mail ou mot de passe incorrect." : msg);
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = { signin: "Bon retour", signup: "Créer un compte", forgot: "Mot de passe oublié" };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <img src={cityHero} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 -z-10 bg-overlay" />
      <div className="w-full max-w-md rounded-3xl border border-border glass p-7 shadow-card animate-rise">
        <Link to="/" className="mb-6 inline-block"><Logo size={30} /></Link>
        <h1 className="text-3xl font-bold">{titles[mode]}</h1>
        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">{sent}</p>
            <Button variant="outline" className="w-full" onClick={() => { setSent(null); setMode("signin"); }}>Retour à la connexion</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" className="h-12 text-base" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" required minLength={8} className="h-12 text-base"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                {mode === "signup" && <p className="text-xs text-muted-foreground">8 caractères minimum.</p>}
              </div>
            )}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Patientez…" : mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
            </Button>
          </form>
        )}
        {!sent && (
          <div className="mt-6 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                <button className="py-2 hover:text-foreground" onClick={() => setMode("forgot")}>Mot de passe oublié ?</button>
                <button className="py-2 hover:text-foreground" onClick={() => setMode("signup")}>Pas encore de compte ? <span className="text-primary">Créer un compte</span></button>
              </>
            )}
            {mode !== "signin" && (
              <button className="py-2 hover:text-foreground" onClick={() => setMode("signin")}>Déjà un compte ? <span className="text-primary">Se connecter</span></button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
