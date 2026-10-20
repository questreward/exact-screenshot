import { describe, expect, it } from 'vitest';
import { captionChunks } from './tv-playback';
describe('édition enregistrée', () => {
  it('conserve tous les mots dans leur ordre sans ajouter de faits', () => {
    const text = 'Le conseil municipal annonce ce matin une consultation sur les transports du quartier puis publie son calendrier';
    const chunks = captionChunks(text);
    expect(chunks).toHaveLength(2);
    expect(chunks.join(' ')).toBe(text);
  });
});