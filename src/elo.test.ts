import { describe, it, expect } from 'vitest';
import { calculateElo, determineWinner } from './elo';

describe('calculateElo', () => {
  it('winner gets +5, loser gets -5', () => {
    const result = calculateElo('player1');
    expect(result.changeA).toBe(5);
    expect(result.changeB).toBe(-5);
  });

  it('player2 win gives player2 +5', () => {
    const result = calculateElo('player2');
    expect(result.changeA).toBe(-5);
    expect(result.changeB).toBe(5);
  });

  it('draw gives 0 change to both', () => {
    const result = calculateElo('draw');
    expect(result.changeA).toBe(0);
    expect(result.changeB).toBe(0);
  });
});

describe('determineWinner', () => {
  it('returns player1 when score1 > score2', () => {
    expect(determineWinner(3, 1)).toBe('player1');
  });

  it('returns player2 when score2 > score1', () => {
    expect(determineWinner(1, 3)).toBe('player2');
  });

  it('returns draw for equal scores', () => {
    expect(determineWinner(2, 2)).toBe('draw');
  });

  it('returns draw for zero-zero', () => {
    expect(determineWinner(0, 0)).toBe('draw');
  });
});
