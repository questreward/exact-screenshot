import { supabase } from '@/integrations/supabase/client';

export const RECOVERY_TIMEOUT_MS = 12_000;

export function isExpiredSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; message?: unknown };
  return value.code === 'PGRST301' && typeof value.message === 'string' && /jwt expired/i.test(value.message);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject({ status: 0, message: 'Renewal timed out' }), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

/** Clears only this browser's identity and cache path; never replays a mutation. */
export async function forgetLocalSession(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

// Explicit recovery only: never retry a mutation or manufacture an identity.
export async function recoverExpiredSession(timeoutMs = RECOVERY_TIMEOUT_MS): Promise<boolean> {
  const { data, error } = await withTimeout(supabase.auth.refreshSession(), timeoutMs);
  if (!error && data.session) return true;
  const status = typeof error?.status === 'number' ? error.status : 0;
  // Rejected (4xx) or broken (5xx) renewal: the stored token cannot be renewed, a fresh sign-in is required.
  if (!error || status >= 400) {
    await forgetLocalSession();
    return false;
  }
  // A network outage must not discard a potentially recoverable session.
  throw error;
}
