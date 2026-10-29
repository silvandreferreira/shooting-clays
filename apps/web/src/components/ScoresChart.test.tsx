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
    expect(
      screen.queryByRole('group', { name: 'Disciplines shown in the chart' }),
    ).not.toBeInTheDocument();
  });
});

describe('ScoresChart period', () => {
  it('has no range buttons of its own: it follows the Dashboard period (R29)', () => {
    render(<ScoresChart series={series} />);
    expect(screen.queryByRole('group', { name: /Time range/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3 months' })).not.toBeInTheDocument();
  });

  it('says so when the period has no series', () => {
    render(<ScoresChart series={{ fosso: [] }} />);
    expect(screen.getByText('No series in this period.')).toBeInTheDocument();
  });
});

describe('ScoresChart with fields considered', () => {
  const withFields = {
    compak: [
      { date: '2026-10-01', score: 16, fieldId: '3' },
      { date: '2026-10-03', score: 14, fieldId: '4' },
    ],
    fosso: [{ date: '2026-10-02', score: 10, fieldId: '1' }],
  };

  it('lists the shape of each field in the chart, in field order', () => {
    render(<ScoresChart series={withFields} fieldIds={['1', '2', '3', '4']} />);
    const legend = screen.getByRole('list', { name: 'Fields' });
    expect(Array.from(legend.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Field 1',
      'Field 3',
      'Field 4',
    ]);
  });

  it('a hidden discipline takes its fields out of the legend', async () => {
    const user = userEvent.setup();
    render(<ScoresChart series={withFields} fieldIds={['1', '2', '3', '4']} />);
    await user.click(screen.getByRole('button', { name: 'Fosso' }));
    expect(
      Array.from(screen.getByRole('list', { name: 'Fields' }).querySelectorAll('li')).map(
        (li) => li.textContent,
      ),
    ).toEqual(['Field 3', 'Field 4']);
  });

  it('has no shapes legend without fields', () => {
    render(<ScoresChart series={withFields} />);
    expect(screen.queryByRole('list', { name: 'Fields' })).not.toBeInTheDocument();
  });
});
