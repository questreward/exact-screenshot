/** Presentation previews only: authoritative indices and prices come from SQL. */
export const BASE_SMIC = 1400;
export const boundPriceIndex = (index: number) => Math.min(130, Math.max(80, index));
export const previewRent = (index: number, populationGrowth: number) => boundPriceIndex(index * (1 + Math.min(.03, Math.max(0, populationGrowth))));
export const previewFuel = (index: number, shock: number) => boundPriceIndex(index * (1 + Math.min(.15, Math.max(.05, shock))));
export const economyPercent = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
