import publicLife from '@/assets/scenes/public-life.jpg';
import elections from '@/assets/scenes/elections.jpg';
import crisis from '@/assets/scenes/crisis.jpg';
import city from '@/assets/scenes/city.jpg';
import { sceneKind } from '@/game/scenes';

export const SCENE_IMAGES = { 'public-life': publicLife, elections, crisis, city };
export function EventSceneImage({ category, title }: { category: string; title: string }) {
  return <figure className="relative overflow-hidden rounded-md">
    <img src={SCENE_IMAGES[sceneKind(category)]} alt={`Illustration thématique : ${title}`} width={1280} height={720} loading="lazy" className="aspect-video w-full object-cover" />
    <figcaption className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-xs text-foreground">Illustration · CIVITAS</figcaption>
  </figure>;
}