import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionForm } from './SessionForm';

const defaults = {
  date: '2026-10-23',
  discipline: 'compak' as const,
  score: 15,
  hardestTargets: [],
  notes: '',
};

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<SessionForm title="Add session" defaultValues={defaults} onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
}

describe('SessionForm', () => {
  it('submits the parsed session', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('checkbox', { name: 'E' }));
    await user.click(screen.getByRole('checkbox', { name: 'B' }));
    await user.click(screen.getByRole('button', { name: 'Increase score' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({
      ...defaults,
      score: 16,
      hardestTargets: ['B', 'E'],
      notes: null,
    });
  });

  it('hides A–F for disciplines without target letters and clears them', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('checkbox', { name: 'A' }));
    await user.click(screen.getByRole('radio', { name: 'Fosso' }));
    expect(screen.queryByRole('group', { name: 'Hardest targets' })).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Compak Sporting' }));
    expect(screen.getByRole('checkbox', { name: 'A' })).not.toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Trap' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: 'trap', hardestTargets: [] }),
    );
  });

  it('clamps the stepper to 0–25', async () => {
    const { user } = setup();
    const score = screen.getByLabelText('Score (out of 25)');
    await user.clear(score);
    await user.type(score, '25');
    await user.click(screen.getByRole('button', { name: 'Increase score' }));
    expect(score).toHaveValue(25);
  });

  it('keeps the values and shows an error when saving fails', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new Error('Unexpected error')));
    await user.type(screen.getByLabelText('Notes'), 'Windy');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByLabelText('Notes')).toHaveValue('Windy');
  });
});
