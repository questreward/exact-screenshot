import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ReceiptText, MapPin } from 'lucide-react';
import { shopQuery, formatMoney } from '@/services/game';
import { Button } from '@/components/ui/button';
import { ShopReceipt, type ShopOrder } from './ShopReceipt';

export function PhonePurchases() {
  const { data } = useSuspenseQuery(shopQuery);
  const [ticket, setTicket] = useState<ShopOrder | null>(null);
  if (ticket) return <div className="space-y-4"><Button variant="outline" className="min-h-12 w-full" onClick={() => setTicket(null)}>Retour aux achats</Button><ShopReceipt orders={[ticket]} /></div>;
  return <div className="space-y-4">
    <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><ReceiptText />Mes achats</h2>
    <p className="text-sm text-muted-foreground">{data.orders.length} achat{data.orders.length !== 1 ? 's' : ''} enregistré{data.orders.length !== 1 ? 's' : ''}</p>
    {!data.orders.length && <p className="py-6 text-sm text-muted-foreground">Aucun achat enregistré pour le moment.</p>}
    <ul className="divide-y divide-border">{data.orders.map(order => <li key={order.reference} className="space-y-2 py-4">
      <div className="flex flex-wrap justify-between gap-2"><p className="min-w-0 flex-1 break-words font-semibold">1 × {order.brand} {order.name}</p><b className="tabular-nums">{formatMoney(order.price)}</b></div>
      <time className="text-xs text-muted-foreground">{new Date(order.at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} · heure du jeu</time>
      <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{order.location_name ?? 'Lieu non enregistré'}</p>
      <Button variant="outline" className="min-h-12 w-full" onClick={() => setTicket(order)}>Voir le ticket</Button>
    </li>)}</ul>
    <Button asChild variant="outline" className="min-h-12 w-full"><Link to="/patrimoine">Mes objets et biens</Link></Button>
  </div>;
}
