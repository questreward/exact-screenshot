import { describe,it,expect } from 'vitest';
import { relationLevel,nextEventDate } from './social';
describe('Social presentation rules',()=>{
 for(const [score,label] of [[0,'Inconnu'],[5,'Connaissance'],[25,'Relation amicale'],[50,'Ami'],[80,'Proche']] as const)it(`relation threshold ${score}`,()=>{expect(relationLevel(score)).toBe(label);if(score>0)expect(relationLevel(score-1)).not.toBe(label);});
 it('next daily meeting rolls over after 18h',()=>{expect(nextEventDate('2026-10-18T18:01:00Z',18)).toBe('2026-10-19T18:00:00.000Z');});
});
