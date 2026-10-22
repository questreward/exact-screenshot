import { supabase } from '@/integrations/supabase/client';

export function isExpiredSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; message?: unknown };
  return value.code === 'PGRST301' && typeof value.message === 'string' && /jwt expired/i.test(value.message);
}

// Explicit recovery only: never retry a mutation or manufacture an identity.
export async function recoverExpiredSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.refreshSession();
  if (!error && data.session) return true;
  if (!error || error.status === 400 || error.status === 401 || error.status === 403) {
    await supabase.auth.signOut({ scope: 'local' });
    return false;
  }
  // A network outage must not discard a potentially recoverable session.
  throw error;
}