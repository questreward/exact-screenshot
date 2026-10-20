import publicLife from '@/assets/scenes/public-life.jpg';
import elections from '@/assets/scenes/elections.jpg';
import crisis from '@/assets/scenes/crisis.jpg';
import city from '@/assets/scenes/city.jpg';
import { sceneKind } from '@/game/scenes';
import { Crowd } from './Bonhomme';
import type { PersonMood } from '@/game/people';

const SCENE_PEOPLE: Record<string, { moods: PersonMood[]; signs?: string[] }> = {
  'public-life': { moods: ['cheer', 'walk', 'cheer', 'walk', 'cheer'], signs: ['NON !', '', 'OUI', '', 'VOTEZ'] },
  elections: { moods: ['talk', 'wave', 'idle', 'wave'] },
  crisis: { moods: ['walk', 'tired', 'walk', 'idle'] },
  city: { moods: ['walk', 'idle', 'talk', 'walk'] },
};

export const SCENE_IMAGES = { 'public-life': publicLife, elections, crisis, city };
export function EventSceneImage({ category, title }: { category: string; title: string }) {
  return <figure className="relative overflow-hidden rounded-md">
    <img src={SCENE_IMAGES[sceneKind(category)]} alt={`Illustration thématique : ${title}`} width={1280} height={720} loading="lazy" className="aspect-video w-full object-cover" />
    <Crowd seedBase={title} count={SCENE_PEOPLE[sceneKind(category)]!.moods.length} moods={SCENE_PEOPLE[sceneKind(category)]!.moods} signs={SCENE_PEOPLE[sceneKind(category)]!.signs} className="absolute inset-x-0 bottom-0 h-24 px-6" />
    <figcaption className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs text-foreground">Illustration · CIVITAS</figcaption>
  </figure>;
}