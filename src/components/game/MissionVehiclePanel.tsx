import { useState } from 'react';
import { Truck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cabForJob } from '@/game/v2-scenes';
import { InteractiveCab } from './InteractiveCab';

export function MissionVehiclePanel({ job, title }: { job: string; title: string }) {
  const [inside, setInside] = useState(false);
  const kind = cabForJob(job);
  if (!kind) return null;
  return <div className="space-y-3">
    <Button variant="outline" className="min-h-12 w-full" aria-expanded={inside} onClick={() => setInside(value => !value)}>
      {inside ? <MapPin /> : <Truck />}{inside ? 'Revenir à l’intervention' : 'Entrer dans le véhicule'}
    </Button>
    {inside && <InteractiveCab kind={kind} title={title} />}
  </div>;
}
