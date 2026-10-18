import { describe,it,expect } from 'vitest';
import { consultationOpen,consultationWinner,type ConsultationOption } from './civic';
describe('Consultations citoyennes',()=>{
 const c={status:'open',starts_at:'2026-09-01T10:00:00Z',ends_at:'2026-09-02T10:00:00Z'};
 it('refuse une participation avant le début',()=>expect(consultationOpen(c,'2026-09-01T09:59:59Z')).toBe(false));
 it('accepte une participation dans le créneau',()=>expect(consultationOpen(c,'2026-09-01T10:00:00Z')).toBe(true));
 it('refuse une participation exactement à expiration',()=>expect(consultationOpen(c,'2026-09-02T10:00:00Z')).toBe(false));
 it('refuse une consultation fermée',()=>expect(consultationOpen({...c,status:'closed'},'2026-09-01T11:00:00Z')).toBe(false));
 const option=(label:string,votes:number,sort_order:number):ConsultationOption=>({id:label,consultation_id:'test',label,consequence:'',sort_order,votes});
 it('retient le plus grand nombre de participations',()=>expect(consultationWinner([option('Parc',1,0),option('Sport',3,1)])?.label).toBe('Sport'));
 it('ne déclare pas de majorité sans participation',()=>expect(consultationWinner([option('Parc',0,0)])).toBe(null));
});