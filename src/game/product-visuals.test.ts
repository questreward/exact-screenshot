import { describe, expect, it } from 'vitest';
import { canPreviewRoom, productConfiguration, productSlug, resolveProductSlug } from './product-visuals';
describe('Correspondance des objets du catalogue', () => {
  it('retrouve une famille accentuée sans confondre table et tablette', () => {
    expect(productSlug('Boîte hermétique')).toBe('boite-hermetique');
    expect(resolveProductSlug('Tablette 128 Go', {}, ['table', 'tablette'])).toBe('tablette');
    expect(resolveProductSlug('Lit 160×200 cm', { family: 'Lit' }, ['lit'])).toBe('lit');
  });
  it('conserve les caractéristiques enregistrées plutôt que des couleurs inventées', () => {
    expect(productConfiguration({ variant_attribute: 'dimensions', variant_value: '160×200 cm', construction: 'pin massif', equipment: 'avec rangement' })).toEqual(['dimensions : 160×200 cm', 'pin massif', 'avec rangement']);
  });
  it('ne propose une pièce témoin que pour les objets adaptés', () => {
    expect(canPreviewRoom({ price_group: 'mobilier' }, 'maison')).toBe(true);
    expect(canPreviewRoom({ price_group: 'mode' }, 'mode')).toBe(false);
  });
});
