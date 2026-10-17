import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/game/Logo";
import { CharacterAvatar } from "@/components/game/CharacterAvatar";
import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, type Appearance, type Option } from "@/game/appearance";
import { isPathAllowedForAge, isValidAge, MAX_AGE, MIN_AGE, type PathId } from "@/game/rules";
import { characterQuery, citiesQuery, createCharacter, formatMoney, pathsQuery } from "@/services/game";
import { cn } from "@/lib/utils";
import { gameMeta } from "@/game/metadata";

export const Route = createFileRoute("/_authenticated/creation")({
  head: () => ({ meta: gameMeta("Créer votre personnage", "Choisissez votre identité, votre ville et votre parcours dans CIVITAS.") }),
  beforeLoad: async ({ context }) => {
    const c = await context.queryClient.ensureQueryData(characterQuery);
    if (c) throw redirect({ to: "/tableau-de-bord" });
  },
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(citiesQuery),
    context.queryClient.ensureQueryData(pathsQuery),
  ]),
  component: Creation,
});

const STEPS = ["Identité", "Apparence", "Ville", "Parcours"];

const APPEARANCE_GROUPS: { key: keyof Appearance; label: string }[] = [
  { key: "silhouette", label: "Silhouette" },
  { key: "skin", label: "Visage — teint" },
  { key: "hair", label: "Cheveux" },
  { key: "hairColor", label: "Couleur des cheveux" },
  { key: "outfit", label: "Vêtements" },
  { key: "style", label: "Style" },
];

function Creation() {
  const { data: cities } = useSuspenseQuery(citiesQuery);
  const { data: paths } = useSuspenseQuery(pathsQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState(18);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [cityId, setCityId] = useState("");
  const [pathId, setPathId] = useState<PathId | "">("");
  const [saving, setSaving] = useState(false);

  const canNext = [
    firstName.trim().length > 0 && lastName.trim().length > 0 && isValidAge(age),
    true,
    !!cityId,
    !!pathId && isPathAllowedForAge(pathId, age),
  ][step];

  function setAgeSafe(v: number) {
    setAge(v);
    if (pathId && !isPathAllowedForAge(pathId, v)) setPathId("");
  }

  async function finish() {
    if (!pathId) return;
    setSaving(true);
    try {
      await createCharacter({ firstName, lastName, age, cityId, pathId, appearance });
      // Refresh the cached character (it was cached as "none" before creation).
      await qc.fetchQuery({ ...characterQuery, staleTime: 0 });
      qc.removeQueries({ queryKey: ["bank"] });
      qc.removeQueries({ queryKey: ["notifications"] });
      toast.success(`Bienvenue, ${firstName} !`);
      await navigate({ to: "/tableau-de-bord", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de créer le personnage");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo size={28} />
        <span className="text-sm text-muted-foreground">Étape {step + 1} / 4</span>
      </header>

      <ol className="mt-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="space-y-2">
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-gradient-primary" : "bg-muted")} />
            <p className={cn("text-xs sm:text-sm", i === step ? "text-foreground font-semibold" : "text-muted-foreground")}>{s}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid flex-1 gap-8 lg:grid-cols-[280px_1fr]">
        <div className="mx-auto w-44 lg:sticky lg:top-8 lg:w-full lg:self-start">
          <div className="aspect-[6/7] overflow-hidden rounded-3xl border border-border shadow-card">
            <CharacterAvatar appearance={appearance} />
          </div>
          <p className="mt-3 text-center font-display font-semibold">{(firstName || "Prénom") + " " + (lastName || "Nom")}</p>
          <p className="text-center text-sm text-muted-foreground">{age} ans</p>
        </div>

        <section key={step} className="animate-rise">
          {step === 0 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold">Qui êtes-vous ?</h1>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fn">Prénom</Label>
                  <Input id="fn" maxLength={40} className="h-12 text-base" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ln">Nom</Label>
                  <Input id="ln" maxLength={40} className="h-12 text-base" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Âge : <span className="font-display text-lg text-primary">{age} ans</span></Label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="secondary" size="icon" onClick={() => setAgeSafe(Math.max(MIN_AGE, age - 1))}>−</Button>
                  <input type="range" min={MIN_AGE} max={MAX_AGE} value={age} onChange={(e) => setAgeSafe(Number(e.target.value))} className="h-2 flex-1 accent-primary" aria-label="Âge" />
                  <Button type="button" variant="secondary" size="icon" onClick={() => setAgeSafe(Math.min(MAX_AGE, age + 1))}>+</Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {age < 18 ? "À 16–17 ans, seul le parcours Étudiant est accessible." : "Tous les parcours sont accessibles."}
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Votre apparence</h1>
              {APPEARANCE_GROUPS.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <p className="text-sm font-semibold">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {(APPEARANCE_OPTIONS[key] as Option[]).map((o) => {
                      const active = appearance[key] === o.id;
                      return (
                        <button key={o.id} type="button" onClick={() => setAppearance({ ...appearance, [key]: o.id })}
                          className={cn("flex h-11 items-center gap-2 rounded-xl border px-4 text-sm transition-all",
                            active ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
                          {o.value && <span className="h-4 w-4 rounded-full border border-border" style={{ background: o.value }} />}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold">Votre ville de départ</h1>
              <div className="grid gap-3 sm:grid-cols-2">
                {cities.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCityId(c.id)}
                    className={cn("rounded-2xl border p-5 text-left transition-all",
                      cityId === c.id ? "border-primary bg-primary/10 shadow-elegant" : "border-border bg-gradient-card hover:border-primary/40")}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{c.name}</h2>
                      {cityId === c.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.region}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h1 className="text-3xl font-bold">Votre parcours</h1>
              <div className="grid gap-3">
                {paths.map((p) => {
                  const allowed = isPathAllowedForAge(p.id as PathId, age);
                  return (
                    <button key={p.id} type="button" disabled={!allowed} onClick={() => setPathId(p.id as PathId)}
                      className={cn("rounded-2xl border p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        pathId === p.id ? "border-primary bg-primary/10 shadow-elegant" : "border-border bg-gradient-card hover:border-primary/40")}>
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">{p.name}</h2>
                        {allowed ? <span className="text-sm font-semibold text-primary">{formatMoney(p.starting_money)}</span>
                          : <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Dès {p.min_age} ans</span>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-10 flex gap-3">
            {step > 0 && (
              <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}><ChevronLeft /> Retour</Button>
            )}
            {step < 3 ? (
              <Button variant="hero" size="lg" className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuer</Button>
            ) : (
              <Button variant="hero" size="lg" className="flex-1" disabled={!canNext || saving} onClick={finish}>
                {saving ? "Création…" : "Commencer ma vie"}
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
