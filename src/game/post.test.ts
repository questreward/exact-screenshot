import { describe, it, expect } from 'vitest';
import { postageLabel, collectionExpired, POST } from './post';
describe('postal presentation', () => {
 it('shows validated prices', () => { expect(postageLabel(false)).toBe('1,39 €'); expect(postageLabel(true)).toBe('5,36 €'); });
 it('expires at exactly 15 game days', () => { expect(POST.collectionDays).toBe(15); expect(collectionExpired('2026-01-01T00:00:00Z','2026-01-15T23:59:59Z')).toBe(false); expect(collectionExpired('2026-01-01T00:00:00Z','2026-01-16T00:00:00Z')).toBe(true); });
});
