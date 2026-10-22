import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { canPreviewRoom, productConfiguration, productSlug, resolveProductSlug } from './product-visuals';
describe('Correspondance des objets du catalogue', () => {
  it('couvre les familles et tous les anciens articles hors logement', () => {
    const available = readdirSync('src/assets/products').filter(p => p.endsWith('.webp')).map(p => p.replace('.webp', ''));
    const generator = readFileSync('vps/tools/generate_catalog_v1.py', 'utf8');
    const families = [...generator.matchAll(/\('([^']+)', '[^']+', \[/g)].map(m => m[1]).filter((v): v is string => !!v);
    for (const family of families) expect(resolveProductSlug(family, { family }, available), family).not.toBeNull();
    const seed = readFileSync('vps/migrations/0076_shop.sql', 'utf8');
    const names = [...seed.matchAll(/\('shop-[^']+','([^']+)','item'/g)].map(m => m[1]).filter((v): v is string => !!v);
    expect(names.length).toBe(28);
    for (const name of names) expect(resolveProductSlug(name, {}, available), name).not.toBeNull();
  });
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
