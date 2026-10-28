import type { SessionInput } from '@shooting-clays/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionForm } from './SessionForm';

const defaults = {
  date: '2026-10-23',
  clubId: 'ccm',
  discipline: 'compak' as const,
  fieldId: '',
  score: 15,
  hardestTargets: [],
  notes: '',
};

function setup(
  onSubmit = vi.fn().mockResolvedValue(undefined),
  {
    values = {},
    allowNoPlace = false,
  }: { values?: Partial<SessionInput>; allowNoPlace?: boolean } = {},
) {
  render(
    <SessionForm
      title="Add session"
      defaultValues={{ ...defaults, ...values }}
      onSubmit={onSubmit}
      allowNoPlace={allowNoPlace}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const fieldNames = () =>
  within(screen.getByRole('group', { name: 'Field' }))
    .queryAllByRole('radio')
    .map((r) => r.closest('label')?.textContent);
const disciplineNames = () =>
  within(screen.getByRole('group', { name: 'Discipline' }))
    .getAllByRole('radio')
    .map((r) => r.closest('label')?.textContent);

describe('SessionForm', () => {
  it('submits the parsed session', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Field 3' }));
    await user.click(screen.getByRole('checkbox', { name: 'E' }));
    await user.click(screen.getByRole('checkbox', { name: 'B' }));
    await user.click(screen.getByRole('button', { name: 'Increase score' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({
      ...defaults,
      fieldId: '3',
      score: 16,
      hardestTargets: ['B', 'E'],
      notes: null,
    });
  });

  // R49 (unit level): club → discipline → field.
  it("offers the club's disciplines, then only the fields that have the chosen one", async () => {
    const { user } = setup();
    expect(disciplineNames()).toEqual(['Compak Sporting', 'Fosso', 'Helice']);
    expect(fieldNames()).toEqual(['Field 1', 'Field 2', 'Field 3', 'Field 4']);

    await user.click(screen.getByRole('radio', { name: 'Field 3' }));
    await user.click(screen.getByRole('radio', { name: 'Fosso' }));
    expect(fieldNames()).toEqual(['Field 1', 'Field 2']);
    // Field 3 has no Fosso: nothing chosen any more.
    expect(screen.getByRole('radio', { name: 'Field 1' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Field 2' })).not.toBeChecked();

    // Only Field 1 has Helice: chosen at once.
    await user.click(screen.getByRole('radio', { name: 'Helice' }));
    expect(fieldNames()).toEqual(['Field 1']);
    expect(screen.getByRole('radio', { name: 'Field 1' })).toBeChecked();
  });

  it('a new session needs a field', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose the field.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('when editing, "No field" and "No club" can be chosen and every discipline is offered without a club', async () => {
    const { onSubmit, user } = setup(undefined, {
      values: { discipline: 'trap', fieldId: '' },
      allowNoPlace: true,
    });
    // An older Trap series at CCM: kept, though no field there has Trap.
    expect(disciplineNames()).toEqual(['Compak Sporting', 'Fosso', 'Trap', 'Helice']);
    expect(fieldNames()).toEqual(['No field']);
    expect(screen.getByText('No field at this club has Trap.')).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Club'), 'No club');
    expect(screen.queryByRole('group', { name: 'Field' })).toBeNull();
    expect(disciplineNames()).toEqual(['Compak Sporting', 'Sporting', 'Fosso', 'Trap', 'Helice']);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: null, fieldId: null, discipline: 'trap' }),
    );
  });

  it('A–F only for Compak Sporting, cleared when switching discipline', async () => {
    const { onSubmit, user } = setup(undefined, { values: { clubId: '' }, allowNoPlace: true });
    await user.click(screen.getByRole('checkbox', { name: 'A' }));
    for (const name of ['Sporting', 'Fosso', 'Trap', 'Helice']) {
      await user.click(screen.getByRole('radio', { name }));
      expect(screen.queryByRole('group', { name: 'Hardest targets' })).toBeNull();
    }
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
    await user.click(screen.getByRole('radio', { name: 'Field 1' }));
    await user.type(screen.getByLabelText('Notes'), 'Windy');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByLabelText('Notes')).toHaveValue('Windy');
    expect(screen.getByRole('radio', { name: 'Field 1' })).toBeChecked();
  });
});
