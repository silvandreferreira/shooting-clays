import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScoresChart } from './Charts';

const series = {
  compak: [{ date: '2026-10-01', score: 16 }],
  fosso: [{ date: '2026-10-02', score: 10 }],
};

describe('ScoresChart discipline toggles', () => {
  it('shows every discipline by default; a tap hides it and another shows it again', async () => {
    const user = userEvent.setup();
    render(<ScoresChart series={series} />);
    const fosso = screen.getByRole('button', { name: 'Fosso' });
    const compak = screen.getByRole('button', { name: 'Compak Sporting' });
    expect(fosso).toHaveAttribute('aria-pressed', 'true');
    expect(compak).toHaveAttribute('aria-pressed', 'true');

    await user.click(fosso);
    expect(fosso).toHaveAttribute('aria-pressed', 'false');
    expect(fosso).toHaveClass('line-through');
    expect(compak).toHaveAttribute('aria-pressed', 'true');

    await user.click(fosso);
    expect(fosso).toHaveAttribute('aria-pressed', 'true');
  });

  it('with every discipline hidden, explains how to show one', async () => {
    const user = userEvent.setup();
    render(<ScoresChart series={series} />);
    await user.click(screen.getByRole('button', { name: 'Fosso' }));
    await user.click(screen.getByRole('button', { name: 'Compak Sporting' }));
    expect(screen.getByText(/All disciplines are hidden/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Scores over time' })).not.toBeInTheDocument();
  });

  it('has no toggles for a single discipline', () => {
    render(<ScoresChart series={{ compak: series.compak }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
