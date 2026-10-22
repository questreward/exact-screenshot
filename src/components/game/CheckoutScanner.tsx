import { useRef, useState } from 'react';
import { ScanBarcode, Check, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ShopProduct } from '@/services/game';
import { play } from '@/game/sfx';
import counter from '@/assets/v4/checkout-counter.jpg';
import { ProductPhoto } from './ProductPhoto';

export function CheckoutScanner({ items, price, onComplete, onBack }: { items: ShopProduct[]; price: (p: ShopProduct) => number; onComplete: () => void; onBack: () => void }) {
  const [count, setCount] = useState(0);
  const index = useRef(0);
  const current = items[count];
  const total = items.slice(0, count).reduce((sum, item) => sum + price(item), 0);
  const eur = (value: number) => `${value.toLocaleString('fr-FR')} €`;
  const scan = () => {
    if (index.current >= items.length) return;
    index.current += 1;
    setCount(index.current);
    try { play('bip'); } catch { /* Sound must never block scanning. */ }
  };
  return <section className="mt-4 space-y-4" aria-label="Scanner de caisse">
    <figure className="relative overflow-hidden rounded-lg">
      <img src={counter} alt="Comptoir, tapis et scanner de la caisse CIVITAS" loading="lazy" width={1536} height={1024} className="aspect-[3/2] w-full object-cover" />
      <figcaption className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-overlay p-3 text-sm font-semibold text-foreground"><span>{count} / {items.length} articles scannés</span><span className="shrink-0 tabular-nums">{eur(total)}</span></figcaption>
    </figure>
    <div aria-live="polite" className="min-h-24">
      {current ? <div className="flex items-center gap-3"><ProductPhoto name={current.name} details={current.details} className="h-20 w-20 shrink-0 rounded-lg" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Sur le tapis</p><h3 className="break-words font-semibold">{current.brand} {current.name}</h3><p className="tabular-nums">{eur(price(current))}</p></div></div> : <p className="flex min-h-24 items-center justify-center gap-2 font-semibold text-success"><Check />Tous les articles sont scannés</p>}
    </div>
    {current ? <Button className="min-h-14 w-full whitespace-normal" onClick={scan}><ScanBarcode />Scanner {current.name}</Button> : <Button className="min-h-14 w-full" onClick={onComplete}><ShoppingBag />Vérifier le total</Button>}
    <ul className="divide-y divide-border">{items.slice(0, count).map(item => <li key={item.id} className="flex justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words">{item.name}</span><span className="shrink-0 tabular-nums">{eur(price(item))}</span></li>)}</ul>
    <Button variant="outline" className="min-h-12 w-full" onClick={onBack}>Retour au panier</Button>
  </section>;
}