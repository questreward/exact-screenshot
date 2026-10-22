import { beforeEach, describe, expect, it, vi } from 'vitest';
const { refreshSession, signOut } = vi.hoisted(() => ({ refreshSession: vi.fn(), signOut: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { refreshSession, signOut } } }));
import { isExpiredSessionError, recoverExpiredSession } from './session-recovery';

describe('expired connection recovery', () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it('recognizes only the observed expiry, not other denied requests', () => {
    expect(isExpiredSessionError({ code: 'PGRST301', message: 'JWT expired' })).toBe(true);
    expect(isExpiredSessionError({ code: 'PGRST301', message: 'Invalid JWT' })).toBe(false);
    expect(isExpiredSessionError({ code: '42501', message: 'permission denied' })).toBe(false);
  });
  it('refreshes and retains a renewed session', async () => {
    refreshSession.mockResolvedValue({ data: { session: { user: { id: 'citizen' } } }, error: null });
    expect(await recoverExpiredSession()).toBe(true);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
  });
  it('clears only the local session when renewal is rejected', async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 400 } });
    expect(await recoverExpiredSession()).toBe(false);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('requires a fresh sign-in when the renewal server fails (500)', async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 500 } });
    expect(await recoverExpiredSession()).toBe(false);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('stops waiting after the timeout without discarding the session', async () => {
    refreshSession.mockReturnValue(new Promise(() => {}));
    await expect(recoverExpiredSession(20)).rejects.toMatchObject({ status: 0 });
    expect(signOut).not.toHaveBeenCalled();
  });
  it('preserves the session on network failure', async () => {
    const failure = { status: 0, message: 'Network unavailable' };
    refreshSession.mockResolvedValue({ data: { session: null }, error: failure });
    await expect(recoverExpiredSession()).rejects.toEqual(failure);
    expect(signOut).not.toHaveBeenCalled();
  });
});