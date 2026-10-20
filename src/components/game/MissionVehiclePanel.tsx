import { useState } from 'react';
import { Truck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { missionVehicle } from '@/game/mission-vehicle';
import { VehicleInterior } from './VehicleInterior';

export function MissionVehiclePanel({ job, title }: { job: string; title: string }) {
  const [inside, setInside] = useState(false);
  const kind = missionVehicle(job);
  if (!kind) return null;
  return <div className="space-y-3">
    <Button variant="outline" className="min-h-12 w-full" aria-expanded={inside} onClick={() => setInside(value => !value)}>
      {inside ? <MapPin /> : <Truck />}{inside ? 'Revenir à l’intervention' : 'Entrer dans le véhicule'}
    </Button>
    {inside && <VehicleInterior kind={kind} label={`Véhicule d’intervention · ${title} · vue illustrative, aucun trajet engagé`} />}
  </div>;
}