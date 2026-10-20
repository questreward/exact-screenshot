import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTvPlayback } from './useTvPlayback';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('lecture autonome du JT', () => {
  it('continue sans voix et ne continue plus après pause', () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const { rerender } = renderHook(({ playing }) => useTvPlayback('Édition enregistrée', playing, true, advance), { initialProps: { playing: true } });
    act(() => vi.advanceTimersByTime(2800));
    expect(advance).toHaveBeenCalledTimes(1);
    rerender({ playing: false });
    act(() => vi.advanceTimersByTime(30000));
    expect(advance).toHaveBeenCalledTimes(1);
  });
  it('ne transmet aucun texte à une voix distante', () => {
    vi.useFakeTimers();
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { getVoices: () => [{ lang: 'fr-FR', localService: false }], speak, cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const { result } = renderHook(() => useTvPlayback('Actualité du jeu', true, true, vi.fn()));
    expect(result.current.voiceAvailable).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });
});