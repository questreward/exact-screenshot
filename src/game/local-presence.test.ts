import { describe, expect, it } from 'vitest';
import { localPeople } from './local-presence';

describe('présences locales enregistrées', () => {
  const a = { id: 'a', first_name: 'Alice', last_name: 'Martin', profession: 'Vendeuse', known: false };
  const b = { id: 'b', first_name: 'Zoé', last_name: 'Petit', profession: null, known: true };
  it('ne crée aucun habitant quand le lieu est vide', () => {
    expect(localPeople([])).toEqual([]);
  });
  it('conserve une seule identité et les données du dernier instantané', () => {
    expect(localPeople([a, { ...a, profession: 'Commerçante' }])).toEqual([{ ...a, profession: 'Commerçante' }]);
  });
  it('met les connaissances en premier sans modifier le relevé', () => {
    const source = [a, b];
    expect(localPeople(source).map(person => person.id)).toEqual(['b', 'a']);
    expect(source).toEqual([a, b]);
  });
});