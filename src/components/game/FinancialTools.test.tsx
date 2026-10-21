import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QuickAmounts, GoalDatePicker } from './FinancialTools';
import { GameSelect } from './GameSelect';
afterEach(cleanup);
it('les raccourcis renseignent 10, 50 et 100 sans soumettre le paiement', () => {
  const change = vi.fn(); const submit = vi.fn();
  render(<form onSubmit={submit}><QuickAmounts value="" onChange={change} /></form>);
  for (const amount of [10, 50, 100]) fireEvent.click(screen.getByRole('button', { name: `${amount} €` }));
  expect(change.mock.calls).toEqual([['10'], ['50'], ['100']]);
  expect(submit).not.toHaveBeenCalled();
});
it('la frise transmet la date de jeu choisie et permet une date personnalisée', () => {
  const change = vi.fn();
  render(<GoalDatePicker anchor={new Date('2026-10-22T00:00:00Z')} value="" onChange={change} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dans 7 jours' }));
  expect(change).toHaveBeenLastCalledWith('2026-10-29');
  fireEvent.change(screen.getByLabelText('Date cible personnalisée'), { target: { value: '2026-12-01' } });
  expect(change).toHaveBeenLastCalledWith('2026-12-01');
});
it('le choix de lieu transmet son identifiant et non le libellé au signalement', () => {
  const change = vi.fn();
  render(<GameSelect aria-label="Lieu du signalement" value="" onChange={change}><option value="">Choisir un lieu</option><option value="park-id">Parc municipal</option><option value="town-id">Mairie</option></GameSelect>);
  fireEvent.click(screen.getByRole('radio', { name: 'Parc municipal' }));
  expect(change).toHaveBeenCalledWith({ target: { value: 'park-id' }, currentTarget: { value: 'park-id' } });
});