import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundsEnabled, setSoundsEnabled, play } from '@/game/sfx';

export function SoundToggle({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundsEnabled()), []);
  return <button type="button" aria-pressed={on} aria-label={on ? 'Couper les sons' : 'Activer les sons'}
    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur ${className}`}
    onClick={() => { const n = !on; setSoundsEnabled(n); setOn(n); if (n) play('bip'); }}>
    {on ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
  </button>;
}
