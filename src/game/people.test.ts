import { describe, expect, it } from 'vitest';
import { crowdSize, personLook } from './people';

describe('people', () => {
  it('same seed gives same look', () => { expect(personLook('npc-1')).toEqual(personLook('npc-1')); });
  it('night has 1 passer-by', () => { expect(crowdSize('nuit')).toBe(1); });
  it('day crowd is capped by max', () => { expect(crowdSize('midi', 3)).toBe(3); });
});
