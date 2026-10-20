import { describe, expect, it } from 'vitest';
import { effectiveSalary, indexedPrice, waiterTips, cardPurchaseAllowed } from './real-economy';
describe('économie réelle — présentation', () => {
 it('applique le plancher SMIC', () => { expect(effectiveSalary(1200, 1450)).toBe(1450); expect(effectiveSalary(2000,1450)).toBe(2000); });
 it('multiplie par un indice borné', () => { expect(indexedPrice(100,80)).toBe(80); expect(indexedPrice(100,130)).toBe(130); expect(indexedPrice(100,200)).toBe(130); });
 it('borne les pourboires entre 0 et 15 %', () => { expect(waiterTips(2000,-10)).toBe(0); expect(waiterTips(2000,50)).toBe(150); expect(waiterTips(2000,200)).toBe(300); });
 it('refuse une carte bloquée ou un dépassement de 1 500 €', () => { expect(cardPurchaseAllowed(false,149900,100)).toBe(true); expect(cardPurchaseAllowed(false,149900,101)).toBe(false); expect(cardPurchaseAllowed(true,0,100)).toBe(false); expect(cardPurchaseAllowed(false,0,-1)).toBe(false); });
});
