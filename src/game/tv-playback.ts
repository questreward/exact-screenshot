/** Captions quote the stored edition; playback never generates facts. */
export function captionChunks(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 14) chunks.push(words.slice(i, i + 14).join(' '));
  return chunks;
}

export function captionDuration(text: string): number {
  return Math.max(2800, text.split(/\s+/).filter(Boolean).length * 420);
}