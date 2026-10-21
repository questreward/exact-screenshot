export type ProductVisualDetails = { family?: string; variant_attribute?: string; variant_value?: string; construction?: string; equipment?: string; price_group?: string };
export const productSlug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function resolveProductSlug(name: string, details: ProductVisualDetails, available: string[]) {
  const family = details.family ? productSlug(details.family) : '';
  if (available.includes(family)) return family;
  const normalized = productSlug(name);
  if (/telephone|smartphone|mobile/.test(normalized)) return 'telephone';
  return [...available].sort((a, b) => b.length - a.length).find(slug => normalized === slug || normalized.startsWith(`${slug}-`)) ?? null;
}
export function productConfiguration(details: ProductVisualDetails) {
  return [details.variant_value && `${details.variant_attribute ?? 'Version'} : ${details.variant_value}`, details.construction, details.equipment].filter((value): value is string => !!value);
}
export function canPreviewRoom(details: ProductVisualDetails, section: string) {
  return details.price_group === 'mobilier' || section === 'electromenager';
}
