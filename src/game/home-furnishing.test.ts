import { describe, expect, it } from 'vitest';
import { canPlace, footprint, furnishingTarget, type Furniture, type Placement } from './home-furnishing';
const items: Furniture[]=[{asset_id:'sofa',name:'Canapé',visual:'sofa',width:3,height:1,placed_home:null},{asset_id:'bed',name:'Lit',visual:'bed',width:2,height:3,placed_home:null}];
const p:Placement={asset_id:'sofa',room:0,x:0,y:0,rotation:0};
describe('Aménagement : indications de placement',()=>{
 it('sauvegarde une location avec son bail et non le bien du propriétaire',()=>expect(furnishingTarget({id:'rental:lease',kind:'location',lease_id:'lease',name:'Location',rooms:1,version:0,room_names:[],placements:[]})).toEqual({rpc:'rental_furnishing_save',id:'lease',key:'_lease_id'}));
 it('conserve la sauvegarde des propriétés',()=>expect(furnishingTarget({id:'asset',name:'Maison',rooms:2,version:3,room_names:[],placements:[]})).toEqual({rpc:'home_furnishing_save',id:'asset',key:'_home_id'}));
 it('refuse une location sans identifiant de bail',()=>expect(()=>furnishingTarget({id:'rental:lease',kind:'location',name:'Location',rooms:1,version:0,room_names:[],placements:[]})).toThrow('Bail introuvable'));
 it('refuse un objet non possédé',()=>expect(canPlace({...p,asset_id:'missing'},[],items,1,8)).toBe(false));
 it('refuse la superposition de deux objets',()=>expect(canPlace({...p,asset_id:'bed'},[p],items,1,8)).toBe(false));
 it('refuse un emplacement hors de la pièce',()=>expect(canPlace({...p,x:7},[],items,1,8)).toBe(false));
 it('refuse une pièce inexistante',()=>expect(canPlace({...p,room:1},[],items,1,8)).toBe(false));
 it('tourne l’empreinte sans modifier l’objet possédé',()=>{const sofa=items.find(i=>i.asset_id==='sofa');if(!sofa)throw new Error('Canapé manquant');expect(footprint(sofa,90)).toEqual({width:1,height:3});expect(sofa.width).toBe(3);});
 it('déplace un objet sans collision avec son ancien emplacement',()=>expect(canPlace({...p,x:1},[p],items,1,8)).toBe(true));
 it('refuse une rotation non autorisée',()=>expect(canPlace({...p,rotation:45},[],items,1,8)).toBe(false));
 it('refuse les coordonnées fractionnaires',()=>expect(canPlace({...p,x:0.5},[],items,1,8)).toBe(false));
});
