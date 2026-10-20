import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ShopProduct } from "@/services/game";
import { housingFacts, housingIllustrationKind } from "@/game/housing-visuals";
import { notaryFees, storePrice } from "@/game/shop";
import studioLiving from "@/assets/housing/studio-living.jpg";
import studioInterior from "@/assets/housing/studio-interior.jpg";
import apartmentLiving from "@/assets/housing/apartment-living.jpg";
import apartmentInterior from "@/assets/housing/apartment-interior.jpg";
import houseExterior from "@/assets/housing/house-exterior.jpg";
import houseLiving from "@/assets/housing/house-living.jpg";

const galleries = {
  studio: [{ src: studioLiving, label: "Espace de vie" }, { src: studioInterior, label: "Intérieur" }],
  apartment: [{ src: apartmentLiving, label: "Espace de vie" }, { src: apartmentInterior, label: "Intérieur" }],
  house: [{ src: houseExterior, label: "Extérieur" }, { src: houseLiving, label: "Espace de vie" }],
};
export function HousingPreview({ p }: { p: ShopProduct }) {
  const image = galleries[housingIllustrationKind(p)][0];
  return <figure className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-lg">
    <img src={image.src} alt={`Illustration de type de logement : ${p.name}`} width={1024} height={768} loading="lazy" className="aspect-[4/3] w-full object-cover" />
    <figcaption className="bg-muted px-3 py-1 text-xs text-muted-foreground">Illustration de type de logement · non contractuelle</figcaption>
  </figure>;
}
export function HousingVisit({ p, pct, onClose, onBuy }: { p: ShopProduct; pct: number; onClose: () => void; onBuy: () => void }) {
  const [index, setIndex] = useState(0);
  const gallery = galleries[housingIllustrationKind(p)];
  const image = gallery[index] ?? gallery[0];
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl gap-3 overflow-y-auto rounded-lg p-4 [&>button:last-child]:flex [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:bg-background [&>button:last-child]:opacity-100">
      <DialogTitle className="pr-12 font-heading leading-snug tracking-normal">{p.name}</DialogTitle>
      <DialogDescription>Illustrations de type de logement, non contractuelles. Agencement et mobilier représentés à titre d’ambiance uniquement.</DialogDescription>
      <figure>
        <img src={image.src} alt={`${image.label} — illustration non contractuelle`} width={1024} height={768} className="aspect-[4/3] w-full rounded-lg object-cover" />
        <figcaption className="mt-2 flex items-center justify-between gap-2">
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Vue précédente" onClick={() => setIndex((index + gallery.length - 1) % gallery.length)}><ChevronLeft /></Button>
          <span className="text-center text-sm">{image.label} · {index + 1}/{gallery.length}</span>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Vue suivante" onClick={() => setIndex((index + 1) % gallery.length)}><ChevronRight /></Button>
        </figcaption>
      </figure>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3">{housingFacts(p).map(f => <div key={f.label} className="min-w-0"><dt className="text-xs text-muted-foreground">{f.label}</dt><dd className="break-words text-sm font-semibold">{f.value}</dd></div>)}</dl>
      <div><p className="font-heading text-2xl font-bold">{storePrice(p.price, pct).toLocaleString("fr-FR")} €</p><p className="text-xs text-muted-foreground">+ {notaryFees(p.price).toLocaleString("fr-FR")} € de frais de notaire · comptant ou à crédit</p></div>
      <Button className="min-h-12" disabled={p.owned} onClick={onBuy}>{p.owned ? "Bien déjà possédé" : "Examiner l’achat"}</Button>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="min-h-11"><Link to="/logement">Locations et emménagement</Link></Button><Button asChild variant="outline" className="min-h-11"><Link to="/agence">Agence immobilière</Link></Button></div>
    </DialogContent>
  </Dialog>;
}
