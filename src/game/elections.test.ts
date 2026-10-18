import {describe,it,expect} from 'vitest';
import {votingHint,candidacyHints,type Election} from './elections';
const election={city_id:'lyon',voted:false,rules:{voting_age:18,candidate_age:18,civic_min:10,independent_civic_min:10,reputation_min:5,influence_min:0},vote_starts_at:'2026-10-22T00:00:00Z',vote_ends_at:'2026-10-23T00:00:00Z'} as Election;
describe('Municipal electoral hints (server validates)',()=>{
 it('requires the configured age',()=>{expect(votingHint(election,{age:17,city_id:'lyon',world_now:'2026-10-22T12:00:00Z'})).toBe(false);expect(votingHint(election,{age:18,city_id:'lyon',world_now:'2026-10-22T12:00:00Z'})).toBe(true);});
 it('requires the player city',()=>{expect(votingHint(election,{age:20,city_id:'lille',world_now:'2026-10-22T12:00:00Z'})).toBe(false);});
 it('allows only one ballot',()=>{expect(votingHint({...election,voted:true},{age:20,city_id:'lyon',world_now:'2026-10-22T12:00:00Z'})).toBe(false);});
 it('closes voting at the world deadline',()=>{expect(votingHint(election,{age:20,city_id:'lyon',world_now:'2026-10-23T00:00:00Z'})).toBe(false);});
 it('uses independent eligibility rather than supported thresholds',()=>{const hints=candidacyHints({...election,rules:{...election.rules,independent_civic_min:20}},{age:20,civic:15,stats:{reputation:5,influence:0}},true);expect(hints[1]?.minimum).toBe(20);expect(hints[1]?.value).toBe(15);});
});