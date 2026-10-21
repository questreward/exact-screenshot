import { useState } from 'react';
import { Eye, House, PackageOpen, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { canPreviewRoom, productConfiguration, resolveProductSlug, type ProductVisualDetails } from '@/game/product-visuals';
import room from '@/assets/products/preview-room.jpg';
const images = import.meta.glob<string>('/src/assets/products/*.png', { eager: true, query: '?url', import: 'default' });
const photos = Object.fromEntries(Object.entries(images).map(([path, url]) => [path.split('/').pop()?.replace('.png', '') ?? '', url]));
export function ProductPhoto({ name, details = {}, fallback, className = '', animated = true }: { name: string; details?: ProductVisualDetails; fallback?: string; className?: string; animated?: boolean }) {
  const slug = resolveProductSlug(name, details, Object.keys(photos));
  const src = slug ? photos[slug] : fallback;
  return <div className={`product-stage relative overflow-hidden bg-muted ${className}`}>
    {src ? <img src={src} alt={name} loading="lazy" decoding="async" width={512} height={512} className={`h-full w-full object-contain p-3 ${animated ? 'product-turn' : ''}`} /> : <PackageOpen className="mx-auto h-full w-16 text-muted-foreground" />}
    {details.variant_value && <span className="absolute bottom-2 left-2 max-w-[90%] rounded-md bg-card/95 px-2 py-1 text-xs font-semibold">{details.variant_value}</span>}
  </div>;
}
export function ProductPreview({ name, section, details, fallback }: { name: string; section: string; details: ProductVisualDetails; fallback?: string }) {
  const [open, setOpen] = useState(false); const [inside, setInside] = useState(false); const [motion, setMotion] = useState(true);
  return <>
    <Button variant="outline" className="mb-2 min-h-11 w-full gap-2" onClick={() => setOpen(true)}><Eye className="h-4 w-4" />Regarder l'objet</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
      <DialogHeader><DialogTitle>{name}</DialogTitle><DialogDescription>Visuel illustratif de la famille d'objet ; les caractéristiques exactes sont indiquées ci-dessous.</DialogDescription></DialogHeader>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        {inside && <img src={room} alt="Pièce témoin" width={1024} height={768} className="absolute inset-0 h-full w-full object-cover" />}
        <ProductPhoto name={name} details={details} fallback={fallback} animated={motion} className={inside ? 'absolute bottom-[8%] left-1/4 h-1/2 w-1/2 !bg-transparent' : 'h-full w-full'} />
      </div>
      <ul className="space-y-1 text-sm">{productConfiguration(details).map(value => <li key={value}>{value}</li>)}</ul>
      <div className="flex flex-wrap gap-2"><Button variant="outline" aria-pressed={motion} className="min-h-11 gap-2" onClick={() => setMotion(!motion)}><RotateCw className="h-4 w-4" />{motion ? 'Arrêter' : 'Animer'}</Button>
      {canPreviewRoom(details, section) && <Button variant="outline" className="min-h-11 gap-2" aria-pressed={inside} onClick={() => setInside(!inside)}><House className="h-4 w-4" />{inside ? "Voir l'objet seul" : 'Dans une pièce'}</Button>}</div>
      {inside && <p className="text-xs text-muted-foreground">Pièce témoin, pas ton logement. Aucun objet n'est installé par cet aperçu.</p>}
    </DialogContent></Dialog>
  </>;
}
export function PurchaseUnboxing({ products }: { products: { name: string; details?: ProductVisualDetails }[] }) {
  const [opened, setOpened] = useState(false);
  if (!products.length) return null;
  return <section className="space-y-3 text-center"><Button variant="secondary" className="min-h-12 w-full gap-2" onClick={() => setOpened(!opened)}><PackageOpen className="h-5 w-5" />{opened ? 'Refermer mes achats' : 'Déballer mes achats'}</Button>
    {opened && <div className="grid grid-cols-2 gap-2">{products.map((p, i) => <div key={`${p.name}-${i}`} className="product-unbox"><ProductPhoto name={p.name} details={p.details} className="aspect-square rounded-lg" /><p className="mt-1 text-xs">{p.name}</p></div>)}</div>}
  </section>;
}
