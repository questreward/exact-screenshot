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
  if (!inside || closed) return <div className="space-y-3"><Button className="min-h-12 w-full" disabled={!here || closed} onClick={() => setInside(true)}>
    <DoorOpen />{closed ? "Magasin fermé" : here ? "Entrer dans le magasin" : "Rends-toi sur place pour entrer"}</Button><Button asChild variant="outline" className="min-h-12 w-full"><Link to="/boutique" search={{ rayon: section, magasin: name }}>Consulter le catalogue CIVITAS</Link></Button></div>;
  return <div className="space-y-2">
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <img src={IMG[section]} alt={`Intérieur · ${name}`} width={1024} height={576} className="aspect-video w-full object-cover" />
      {aisles.map(a => <Link key={a.label} to="/boutique" search={a.q ? { rayon: section, q: a.q, magasin: name } : { rayon: section, magasin: name }}
        className="absolute flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-card/95 px-3 text-xs font-semibold shadow-elegant hotspot"
        style={{ left: `${a.x}%`, top: `${a.y}%` }}><ShoppingBag className="h-4 w-4 text-primary" />{a.label}</Link>)}
    </div>
    <div className="flex gap-2">
      <Button asChild className="min-h-12 flex-1"><Link to="/boutique" search={{ rayon: section, magasin: name }}><ShoppingBag />Tout le rayon {SECTIONS[section] ?? ""}</Link></Button>
      <Button variant="outline" className="min-h-12" onClick={() => setInside(false)}>Sortir</Button>
    </div>
  </div>;
}
