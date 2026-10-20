// Presentation only; PostgreSQL SECURITY DEFINER functions enforce payments.
export const effectiveSalary = (salary: number, smic: number) => Math.max(salary, smic);
export const indexedPrice = (base: number, index: number) => Math.round(base * Math.min(130, Math.max(80, index)) / 100);
export const waiterTips = (salary: number, reputation: number) => Math.floor(salary * .15 * Math.min(100, Math.max(0, reputation)) / 100);
export const cardPurchaseAllowed = (blocked: boolean, spentCents: number, amountCents: number) => !blocked && amountCents >= 0 && spentCents >= 0 && spentCents + amountCents <= 150000;
