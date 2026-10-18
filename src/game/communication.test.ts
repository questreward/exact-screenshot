import { describe, expect, it } from 'vitest';
import { canPost, postsLeft, badgeLabel } from './communication';

describe('Civi : 3 publications par jour', () => {
  it('autorise jusqu’à la 3e publication', () => {
    expect(postsLeft({ posts_today: 2, daily_post_limit: 3 })).toBe(1);
    expect(canPost({ posts_today: 2, daily_post_limit: 3, enabled: true })).toBe(true);
  });
  it('bloque après 3 publications', () => {
    expect(canPost({ posts_today: 3, daily_post_limit: 3, enabled: true })).toBe(false);
    expect(postsLeft({ posts_today: 5, daily_post_limit: 3 })).toBe(0);
  });
  it('bloque si Civi est désactivé', () => {
    expect(canPost({ posts_today: 0, daily_post_limit: 3, enabled: false })).toBe(false);
  });
  it('pastille plafonnée à 99+', () => { expect(badgeLabel(120)).toBe('99+'); });
});
