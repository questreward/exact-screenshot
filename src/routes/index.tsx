import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/game/Logo";
import { SiteFooter } from "@/components/game/SiteFooter";
import { LearnShowcase } from "@/components/game/LearnShowcase";
import cityHero from "@/assets/city-hero.jpg";
import { Briefcase, Landmark, Megaphone, Vote, Check } from "lucide-react";
import vMairie from "@/assets/v2/inst-mairie.webp";
import vAssemblee from "@/assets/v2/inst-assemblee.webp";
import vElysee from "@/assets/v2/inst-elysee.webp";
import vPompiers from "@/assets/v2/cab-pompiers.webp";
import vTrain from "@/assets/v2/int-train.webp";
import vCaf from "@/assets/v2/desk-caf.webp";
import vManif from "@/assets/v2/manif.webp";
import vShop from "@/assets/v2/shop-mode.webp";
import cParis from "@/assets/v2/ville-paris.webp";
import cLyon from "@/assets/v2/ville-lyon.webp";
import cMarseille from "@/assets/v2/ville-marseille.webp";
import cBordeaux from "@/assets/v2/ville-bordeaux.webp";
import cLille from "@/assets/v2/ville-lille.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CIVITAS — Votre vie. Votre ville. Votre histoire." },
      { name: "description", content: "Étudiez, travaillez, entreprenez, entrez en politique : vivez une vie entière dans une France contemporaine vivante." },
      { property: "og:title", content: "CIVITAS — Votre vie. Votre ville. Votre histoire." },
      { property: "og:description", content: "Commence à 16 ans, finis à l'Élysée. Le jeu gratuit où tu vis une vie entière dans 5 vraies villes françaises." },
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

const MOMENTS = [
  { img: vTrain, t: "Prendre le train pour Lyon", s: "Sur la vraie carte de France" },
  { img: vPompiers, t: "Partir en intervention", s: "Pompier, policier, SAMU…" },
  { img: vCaf, t: "Faire ses démarches", s: "CAF, impôts, préfecture" },
  { img: vShop, t: "Faire les boutiques", s: "Plus de 10 000 produits" },
  { img: vManif, t: "Descendre dans la rue", s: "Manifester, pétitionner" },
  { img: vMairie, t: "Siéger au conseil", s: "Devenir maire de ta ville" },
];
const LADDER = [
  { icon: Briefcase, t: "Lycéen ou étudiant", s: "À 16 ans : cours, bourse, petits boulots." },
  { icon: Megaphone, t: "Citoyen engagé", s: "Association, syndicat, parti, manifestations." },
  { icon: Vote, t: "Élu", s: "Maire, puis député parmi 577 sièges." },
  { icon: Landmark, t: "Président", s: "Lois, décrets, référendums : la France change." },
];
const CITIES = [{ n: "Paris", i: cParis }, { n: "Lyon", i: cLyon }, { n: "Marseille", i: cMarseille }, { n: "Bordeaux", i: cBordeaux }, { n: "Lille", i: cLille }];
const FAQ = [
  { q: "C'est gratuit ?", a: "Oui. Tout le jeu se joue gratuitement, sur téléphone comme sur ordinateur." },
  { q: "À partir de quel âge ?", a: "Ton personnage commence entre 16 et 30 ans. Avant 18 ans, il est forcément étudiant." },
  { q: "C'est réaliste ?", a: "Les institutions, les impôts, les démarches et les élections s'inspirent du vrai fonctionnement de la France. Les personnes et les montants sont fictifs." },
  { q: "Je joue avec d'autres ?", a: "Oui. Tu croises de vrais joueurs, tu votes, tu débats et tu peux être élu contre eux." },
];

function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative isolate flex min-h-[88svh] flex-col overflow-hidden">
        <img
          src={cityHero}
          alt="Une ville française vivante au crépuscule, avec sa mairie, ses tramways et ses passants"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
          <Logo size={34} />
          <Link to="/auth" className="flex min-h-11 items-center px-2 text-sm font-semibold text-foreground/80 hover:text-foreground">Se connecter</Link>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-end px-5 pb-16 text-center sm:pb-24">
          <p className="mb-4 rounded-full border border-border glass px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary uppercase animate-rise">
            Simulation politique & sociale
          </p>
          <h1 className="font-display text-6xl font-extrabold tracking-normal sm:text-8xl animate-rise" style={{ animationDelay: "0.1s" }}>
            CIVITAS
          </h1>
          <p className="mt-4 text-xl text-foreground/90 sm:text-2xl animate-rise" style={{ animationDelay: "0.2s" }}>
            Votre vie. Votre ville. <span className="text-primary">Votre histoire.</span>
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

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Une vie entière</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-5xl">Un jour en intervention, le lendemain au conseil municipal.</h2>
        </div>
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:mx-auto sm:max-w-6xl">
          {MOMENTS.map((m, i) => <figure key={m.t} className="relative w-[78vw] max-w-sm shrink-0 snap-start overflow-hidden rounded-3xl border border-border animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
            <img src={m.img} alt={m.t} loading="lazy" width={1024} height={576} className="aspect-[4/5] w-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/70 to-transparent p-4 pt-16">
              <p className="font-display text-xl font-bold">{m.t}</p><p className="text-sm text-foreground/80">{m.s}</p>
            </figcaption>
          </figure>)}
        </div>
      </section>

      <section className="relative isolate overflow-hidden py-16 sm:py-24">
        <img src={vAssemblee} alt="L'hémicycle de l'Assemblée nationale" loading="lazy" width={1024} height={576} className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/80 to-background" />
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Du lycée à l'Élysée</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-5xl">Jusqu'où iras-tu ?</h2>
          <ol className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">{LADDER.map((l, i) => <li key={l.t} className="rounded-3xl border border-border glass p-4 sm:p-5">
            <span className="text-xs font-bold text-primary">Étape {i + 1}</span>
            <l.icon className="mt-3 h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-lg font-bold">{l.t}</p><p className="mt-1 text-sm text-muted-foreground">{l.s}</p>
          </li>)}</ol>
          <div className="mt-8 overflow-hidden rounded-3xl border border-border"><img src={vElysee} alt="Le bureau présidentiel" loading="lazy" width={1024} height={576} className="aspect-[21/9] w-full object-cover" /></div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">5 vraies villes. 1 vraie carte.</h2>
        <p className="mt-2 text-muted-foreground">Les vraies rues, les vraies gares, les vraies circonscriptions.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{CITIES.map((c, i) => <div key={c.n} className={`relative overflow-hidden rounded-2xl border border-border ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
          <img src={c.i} alt={c.n} loading="lazy" width={800} height={800} className="aspect-square w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full bg-background/85 px-3 py-1 text-sm font-semibold">{c.n}</span>
        </div>)}</div>
        <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["577", "sièges de député"], ["10 000+", "produits en boutique"], ["7", "métiers de secours"], ["100 %", "gratuit"]].map(([n, l]) => <div key={l} className="rounded-2xl border border-border bg-card p-4 text-center">
          <dt className="font-display text-3xl font-extrabold text-primary">{n}</dt><dd className="text-sm text-muted-foreground">{l}</dd></div>)}</dl>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">Jouer pour comprendre</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center font-display text-3xl font-bold sm:text-4xl">Ce que tu vis et apprends dans CIVITAS</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Une France vivante où chaque choix compte : études, argent, démarches, élections. Tout est fictif, mais tout s'inspire du vrai fonctionnement du pays.</p>
        <div className="mt-14"><LearnShowcase /></div>
        <div className="mt-16 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="hero" size="lg" className="w-full sm:w-auto"><Link to="/auth" search={{ mode: "signup" }}>Créer mon personnage</Link></Button>
          <Button asChild variant="glass" size="lg" className="w-full sm:w-auto"><Link to="/decouvrir">En savoir plus</Link></Button>
        </div>
      </section>
      <section className="mx-auto w-full max-w-3xl px-5 pb-16">
        <h2 className="font-display text-3xl font-bold">Questions fréquentes</h2>
        <div className="mt-6 space-y-3">{FAQ.map(f => <details key={f.q} className="group rounded-2xl border border-border bg-card p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold">{f.q}<span className="text-primary transition group-open:rotate-45">+</span></summary>
          <p className="mt-2 text-sm text-muted-foreground">{f.a}</p></details>)}</div>
      </section>

      <section className="relative isolate overflow-hidden px-5 py-20 text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-90" />
        <h2 className="font-display text-4xl font-extrabold sm:text-6xl">Ta vie commence maintenant.</h2>
        <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm">{["Création du personnage en 2 minutes", "Sans téléchargement, sur ton téléphone", "Gratuit"].map(x => <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>)}</ul>
        <Button asChild variant="hero" size="lg" className="mt-8 w-full max-w-md"><Link to="/auth" search={{ mode: "signup" }}>Créer mon personnage</Link></Button>
      </section>
      <SiteFooter />
    </div>
  );
}
