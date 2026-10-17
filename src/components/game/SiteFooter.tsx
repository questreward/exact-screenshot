import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { COMING_SOON } from "@/game/navigation";

export function SiteFooter() {
  const soon = (label: string) => () => toast(label, { description: COMING_SOON });
  const item = "rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer className="border-t border-border">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-1 px-5 py-5">
        <button className={item} onClick={soon("Actualités")}>Actualités</button>
        <button className={item} onClick={soon("Communauté")}>Communauté</button>
        <button className={item} onClick={soon("Réseaux sociaux")}>Réseaux sociaux</button>
        <Link className={item} to="/parametres">Paramètres</Link>
        <Link className={item} to="/mentions-legales">Mentions légales</Link>
        <Link className={item} to="/confidentialite">Confidentialité</Link>
      </nav>
      <p className="pb-6 text-center text-xs text-muted-foreground">© CIVITAS — Votre vie. Votre pouvoir.</p>
    </footer>
  );
}
