import { describe, expect, it } from 'vitest';
import { importanceLevel, sceneKind } from './scenes';
describe('event presentation without gameplay changes', () => {
  it('preserves the existing important boundary at 65', () => {
    expect(importanceLevel(64)).toBe(3);
    expect(importanceLevel(65)).toBe(4);
  });
  it('maps the 0–100 scale into five display levels', () => {
    expect([0, 25, 50, 65, 85, 100].map(importanceLevel)).toEqual([1, 2, 3, 4, 5, 5]);
  });
  it('does not infer an election from vague political categories', () => {
    expect(sceneKind('Politique')).toBe('city');
    expect(sceneKind('Élections')).toBe('elections');
  });
  it('uses a generic illustration for unknown categories', () => {
    expect(sceneKind('Autre')).toBe('city');
    expect(sceneKind('Manifestation')).toBe('public-life');
    expect(sceneKind('Crise')).toBe('crisis');
  });
});