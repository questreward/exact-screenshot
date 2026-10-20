import { describe, expect, it } from 'vitest';
import { reportPassages } from './tv-report';
describe('reportages fidèles à l’édition', () => {
  it('ne retire ni ne rajoute de faits dans les passages successifs', () => {
    const source = Array.from({ length: 95 }, (_, index) => `fait${index}`).join(' ');
    const passages = reportPassages(source);
    expect(passages).toHaveLength(3);
    expect(passages.join(' ')).toBe(source);
  });
  it('ne fabrique pas de reportage pour une édition vide', () => {
    expect(reportPassages('')).toEqual([]);
  });
});