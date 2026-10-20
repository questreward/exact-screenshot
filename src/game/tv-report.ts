/** Each report shot quotes a passage of the stored edition, without generated facts. */
import { captionChunks } from './tv-playback';

export function reportPassages(text: string): string[] {
  const chunks = captionChunks(text);
  const passages: string[] = [];
  for (let index = 0; index < chunks.length; index += 3) passages.push(chunks.slice(index, index + 3).join(' '));
  return passages;
}