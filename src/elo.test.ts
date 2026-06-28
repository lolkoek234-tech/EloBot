import { describe, it, expect } from 'vitest';
import { expectedScore, calculateElo, determineWinner } from './elo';

describe('expectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
  });

  it('gives higher chance to higher-rated player', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it('is symmetric: pA + pB = 1', () => {
    const a = expectedScore(1200, 1000);
    const b = expectedScore(1000, 1200);
    expect(a + b).toBeCloseTo(1);
  });

  it('produces known value for 400-point gap', () => {
    // 400 point gap => 10^(1) = 10 => 1/11 ≈ 0.909
    expect(expectedScore(1400, 1000)).toBeCloseTo(0.909, 2);
  });
});

describe('calculateElo', () => {
  it('higher-rated player loses elo on loss', () => {
    const result = calculateElo(1500, 1400, 0, 1);
    expect(result.changeA).toBeLessThan(0);
    expect(result.changeB).toBeGreaterThan(0);
    expect(result.newEloA).toBe(1500 + result.changeA);
    expect(result.newEloB).toBe(1400 + result.changeB);
  });

  it('underdog gains more elo on win', () => {
    const lowWin = calculateElo(1000, 1400, 1, 0);
    const highWin = calculateElo(1400, 1000, 1, 0);
    expect(lowWin.changeA).toBeGreaterThan(highWin.changeA);
  });

  it('draw causes smaller changes', () => {
    const win = calculateElo(1000, 1000, 1, 0);
    const draw = calculateElo(1000, 1000, 0, 0);
    expect(Math.abs(draw.changeA)).toBeLessThan(Math.abs(win.changeA));
  });

  it('total elo is conserved (sum of changes is 0)', () => {
    const result = calculateElo(1200, 1000, 1, 0);
    expect(result.changeA + result.changeB).toBe(0);
  });

  it('determines scoreA > scoreB as player1 win', () => {
    const result = calculateElo(1000, 1000, 5, 2);
    expect(result.changeA).toBeGreaterThan(0);
    expect(result.changeB).toBeLessThan(0);
  });

  it('determines scoreB > scoreA as player2 win', () => {
    const result = calculateElo(1000, 1000, 1, 3);
    expect(result.changeA).toBeLessThan(0);
    expect(result.changeB).toBeGreaterThan(0);
  });

  it('draw gives near-zero changes for equal ratings', () => {
    const result = calculateElo(1000, 1000, 2, 2);
    expect(result.changeA).toBe(0);
    expect(result.changeB).toBe(0);
  });

  it('max change per match is K_FACTOR', () => {
    // massive underdog winning
    const result = calculateElo(100, 2000, 1, 0);
    expect(Math.abs(result.changeA)).toBeLessThanOrEqual(32);
    expect(Math.abs(result.changeB)).toBeLessThanOrEqual(32);
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
