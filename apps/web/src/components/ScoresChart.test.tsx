import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScoresChart } from './Charts';

const REF = '2026-10-23';

const series = {
  compak: [{ date: '2026-10-01', score: 16 }],
  fosso: [{ date: '2026-10-02', score: 10 }],
};

describe('ScoresChart discipline toggles', () => {
  it('shows every discipline by default; a tap hides it and another shows it again', async () => {
    const user = userEvent.setup();
    render(<ScoresChart series={series} referenceDate={REF} />);
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
    render(<ScoresChart series={series} referenceDate={REF} />);
    await user.click(screen.getByRole('button', { name: 'Fosso' }));
    await user.click(screen.getByRole('button', { name: 'Compak Sporting' }));
    expect(screen.getByText(/All disciplines are hidden/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Scores over time' })).not.toBeInTheDocument();
  });

  it('has no toggles for a single discipline', () => {
    render(<ScoresChart series={{ compak: series.compak }} referenceDate={REF} />);
    expect(
      screen.queryByRole('group', { name: 'Disciplines shown in the chart' }),
    ).not.toBeInTheDocument();
  });
});

describe('ScoresChart time range', () => {
  const spread = {
    compak: [
      { date: '2025-11-01', score: 12 },
      { date: '2026-10-01', score: 16 },
    ],
    fosso: [{ date: '2026-03-02', score: 10 }],
  };

  it('starts at 3 months: only disciplines with series in the range get a toggle', () => {
    render(<ScoresChart series={spread} referenceDate={REF} />);
    expect(screen.getByRole('button', { name: '3 months' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'Fosso' })).not.toBeInTheDocument();
  });

  it('a longer range brings older series back', async () => {
    const user = userEvent.setup();
    render(<ScoresChart series={spread} referenceDate={REF} />);
    await user.click(screen.getByRole('button', { name: '1 year' }));
    expect(screen.getByRole('button', { name: '1 year' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fosso' })).toBeInTheDocument();
  });

  it('says so when the range has no series, and keeps the range buttons', async () => {
    render(<ScoresChart series={{ fosso: spread.fosso }} referenceDate={REF} />);
    expect(screen.getByText('No series in this period.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All time' })).toBeInTheDocument();
  });
});
