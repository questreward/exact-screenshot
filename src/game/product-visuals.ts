export type ProductVisualDetails = { family?: string; variant_attribute?: string; variant_value?: string; construction?: string; equipment?: string; price_group?: string };
export const productSlug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function resolveProductSlug(name: string, details: ProductVisualDetails, available: string[]) {
  const family = details.family ? productSlug(details.family) : '';
  if (available.includes(family)) return family;
  const normalized = productSlug(name);
  const aliases: [RegExp, string][] = [
    [/telephone|smartphone|iphone|galaxy|redmi/, 'telephone'], [/macbook|ideapad/, 'ordinateur-portable'],
    [/playstation/, 'console'], [/switch/, 'console-portable'], [/airpods/, 'ecouteurs'], [/^tv-/, 'televiseur'],
    [/machine-a-cafe/, 'cafetiere'], [/cookeo/, 'multicuiseur'], [/air-force|stan-smith/, 'baskets'],
    [/vtt|rockrider/, 'velo'], [/kindle/, 'liseuse'], [/3008|duster/, 'suv'],
    [/clio|208|sandero|yaris|model-3|megane|golf|twingo|^c3|polo-2018|zoe|auris/, 'voiture'],
  ];
  const alias = aliases.find(([pattern]) => pattern.test(normalized));
  if (alias && available.includes(alias[1])) return alias[1];
  return [...available].sort((a, b) => b.length - a.length).find(slug => normalized === slug || normalized.startsWith(`${slug}-`)) ?? null;
}
export function productConfiguration(details: ProductVisualDetails) {
  return [details.variant_value && `${details.variant_attribute ?? 'Version'} : ${details.variant_value}`, details.construction, details.equipment].filter((value): value is string => !!value);
}
export function canPreviewRoom(details: ProductVisualDetails, section: string) {
  return details.price_group === 'mobilier' || section === 'electromenager';
}
