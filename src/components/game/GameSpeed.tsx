import { useQuery } from '@tanstack/react-query';
import { Gauge, Zap } from 'lucide-react';
import { gameSpeedQuery } from '@/services/game';

export function GameSpeed() {
  const { data } = useQuery(gameSpeedQuery);
  if (!data) return null;
  return <div aria-label="Vitesse du jeu" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3 text-xs text-muted-foreground">
    <span className="flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /><strong className="text-foreground">Temps ×{data.speed}</strong> · 1 min réelle = {data.speed} min de jeu</span>
    {data.travelFactor > 1 && <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span>Trajets VIP ×{data.travelFactor} · {data.vipActive ? 'actif' : 'réservé aux abonnés'} · minimum 5 min de jeu</span></span>}
  </div>;
}