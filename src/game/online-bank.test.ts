import { describe, it, expect } from 'vitest';
import { ONLINE_BANK_CEILING, ONLINE_BANK_MONTHLY_FEE, isFictionalBankIban, cardRemaining, statementText } from './online-bank';
describe('fictional online bank presentation', () => {
 it('shows the validated ceiling and fee', () => { expect(ONLINE_BANK_CEILING).toBe(1500); expect(ONLINE_BANK_MONTHLY_FEE).toBe(2); expect(cardRemaining(1600)).toBe(0); expect(cardRemaining(100)).toBe(1400); });
 it('recognizes only the fictional FR76 format', () => { expect(isFictionalBankIban('FR7600000000000000000000100')).toBe(true); expect(isFictionalBankIban('FR751234')).toBe(false); });
 it('exports opening and closing balances', () => { expect(statementText({ month: '2026-01-01', opening: 10, closing: 8, movements: [] })).toContain('Clôture : 8 €'); });
});
