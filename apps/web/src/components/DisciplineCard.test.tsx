import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisciplineCard } from './DisciplineCard';

describe('DisciplineCard', () => {
  it('shows the statistics', () => {
    render(
      <DisciplineCard
        discipline="compak"
        stats={{ avg: 16, min: 8, max: 23, count: 34 }}
        points={[]}
      />,
    );
    const card = screen.getByRole('article', { name: 'Compak Sporting' });
    expect(within(card).getByTestId('avg')).toHaveTextContent('16');
    expect(within(card).getByTestId('min')).toHaveTextContent('8');
    expect(within(card).getByTestId('max')).toHaveTextContent('23');
    expect(within(card).getByTestId('count')).toHaveTextContent('34');
  });

  it('shows "—" when the period has no sessions', () => {
    render(
      <DisciplineCard
        discipline="fosso"
        stats={{ avg: null, min: null, max: null, count: 0 }}
        points={[]}
      />,
    );
    expect(screen.getByTestId('avg')).toHaveTextContent('—');
    expect(screen.getByTestId('min')).toHaveTextContent('—');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});
