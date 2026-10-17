import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/game/Logo";
import { SiteFooter } from "@/components/game/SiteFooter";
import cityHero from "@/assets/city-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CIVITAS — Votre vie. Votre pouvoir." },
      { name: "description", content: "Étudiez, travaillez, entreprenez, entrez en politique : vivez une vie entière dans une France contemporaine vivante." },
      { property: "og:title", content: "CIVITAS — Votre vie. Votre pouvoir." },
      { property: "og:description", content: "Le jeu de simulation politique et sociale multijoueur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const LIGHTS = [
  { l: "12%", t: "48%" }, { l: "22%", t: "62%" }, { l: "38%", t: "44%" }, { l: "47%", t: "58%" },
  { l: "58%", t: "40%" }, { l: "66%", t: "55%" }, { l: "78%", t: "36%" }, { l: "88%", t: "60%" },
];

function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <img
          src={cityHero}
          alt="Une ville française vivante au crépuscule, avec sa mairie, ses tramways et ses passants"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-20 h-full w-full object-cover animate-slow-zoom"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        {/* drifting clouds */}
        <div className="pointer-events-none absolute top-[8%] -z-10 h-24 w-80 rounded-full bg-foreground/10 blur-3xl animate-drift" />
        <div className="pointer-events-none absolute top-[18%] -z-10 h-16 w-64 rounded-full bg-foreground/10 blur-3xl animate-drift" style={{ animationDelay: "-45s" }} />
        {/* city lights */}
        {LIGHTS.map((p, i) => (
          <span key={i} className="pointer-events-none absolute -z-10 h-1.5 w-1.5 rounded-full bg-primary-glow shadow-elegant animate-twinkle"
            style={{ left: p.l, top: p.t, animationDelay: `${i * 0.4}s` }} />
        ))}

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
          <Logo size={34} />
          <Link to="/auth" className="text-sm font-semibold text-foreground/80 hover:text-foreground">Se connecter</Link>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-end px-5 pb-16 text-center sm:pb-24">
          <p className="mb-4 rounded-full border border-border glass px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary uppercase animate-rise">
            Simulation politique & sociale
          </p>
          <h1 className="font-display text-6xl font-extrabold tracking-[0.12em] sm:text-8xl animate-rise" style={{ animationDelay: "0.1s" }}>
            CIVITAS
          </h1>
          <p className="mt-4 text-xl text-foreground/90 sm:text-2xl animate-rise" style={{ animationDelay: "0.2s" }}>
            Votre vie. <span className="text-primary">Votre pouvoir.</span>
          </p>
          <div className="mt-10 flex w-full max-w-md flex-col gap-3 animate-rise" style={{ animationDelay: "0.3s" }}>
            <Button asChild variant="hero" size="lg"><Link to="/auth" search={{ mode: "signup" }}>Commencer</Link></Button>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="glass" size="lg"><Link to="/auth">Se connecter</Link></Button>
              <Button asChild variant="glass" size="lg"><Link to="/decouvrir">Découvrir</Link></Button>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
