import type { Tables } from '@/integrations/supabase/types';
export function isRentPaid(date: string, lastPaidDate: string | null, operations: Pick<Tables<'economy_operations'>, 'operation_key' | 'status'>[]) {
  const key = `rent:${date}`;
  const relevant = operations.filter(o => o.operation_key === key || o.operation_key === `${key}:retry`);
  return relevant.some(o => o.status === 'done') || (lastPaidDate === date && !relevant.some(o => o.operation_key === key && o.status === 'failed'));
}