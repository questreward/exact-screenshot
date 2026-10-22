import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { DoorOpen, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AISLES } from "@/game/shop-aisles";
import { SECTIONS } from "@/game/shop";
import tech from "@/assets/v2/shop-tech.webp";
import mode from "@/assets/v2/shop-mode.webp";
import maison from "@/assets/v2/shop-maison.webp";
import electromenager from "@/assets/v2/shop-electromenager.webp";
import loisirs from "@/assets/v2/shop-loisirs.webp";
import auto from "@/assets/v2/shop-auto.webp";

const IMG: Record<string, string> = { tech, mode, maison, electromenager, loisirs, auto };

/** Intérieur d'un magasin : rayons tactiles qui ouvrent la Boutique filtrée. Achats inchangés (Boutique). */
export function ShopInterior({ section, name, here, closed = false }: { section: string; name: string; here: boolean; closed?: boolean }) {
  const [inside, setInside] = useState(false);
  const aisles = AISLES[section] ?? [];
  if (!inside || closed || !here) return <div className="space-y-3"><Button className="min-h-12 w-full" disabled={!here || closed} onClick={() => setInside(true)}>
    <DoorOpen />{closed ? "Magasin fermé" : here ? "Explorer les rayons" : "Rejoignez le magasin pour explorer ses rayons"}</Button><Button asChild variant="outline" className="min-h-12 w-full"><Link to="/boutique" search={{ rayon: section, magasin: name }}>Consulter le catalogue CIVITAS</Link></Button></div>;
  return <div className="space-y-2">
    <div className="relative overflow-hidden rounded-lg border border-border">
      <img src={IMG[section]} alt={`Intérieur illustré · ${name}`} loading="lazy" width={1024} height={576} className="aspect-video w-full object-cover" />
      {aisles.map(a => <Link key={a.label} to="/boutique" search={a.q ? { rayon: section, q: a.q, magasin: name } : { rayon: section, magasin: name }}
        className="absolute hidden min-h-11 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg bg-card/95 px-3 text-xs font-semibold shadow-elegant hotspot lg:flex"
        style={{ left: `${a.x}%`, top: `${a.y}%` }}><ShoppingBag className="h-4 w-4 text-primary" />{a.label}</Link>)}
    </div>
    <nav aria-label="Rayons du magasin" className="grid grid-cols-2 gap-2 lg:hidden">{aisles.map(aisle => <Button key={aisle.label} asChild variant="outline" className="h-auto min-h-14 justify-start whitespace-normal px-3 py-2 text-left text-xs"><Link to="/boutique" search={{ rayon: section, q: aisle.q || undefined, magasin: name }}><ShoppingBag className="shrink-0 text-primary" />{aisle.label}</Link></Button>)}</nav>
    <div className="flex gap-2">
      <Button asChild className="h-auto min-h-12 flex-1 whitespace-normal"><Link to="/boutique" search={{ rayon: section, magasin: name }}><ShoppingBag />Tout le rayon {SECTIONS[section] ?? ""}</Link></Button>
      <Button variant="outline" className="min-h-12" onClick={() => setInside(false)}>Retour</Button>
    </div>
  </div>;
}
