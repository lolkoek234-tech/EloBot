const WIN_CHANGE = 5;
const LOSS_CHANGE = -5;

export const DUCKING_PENALTY = -10;
export const FORFEIT_WIN = 5;
export const FORFEIT_LOSS = -10;

export function calculateElo(winner: 'player1' | 'player2' | 'draw'): { changeA: number; changeB: number } {
  if (winner === 'player1') return { changeA: WIN_CHANGE, changeB: LOSS_CHANGE };
  if (winner === 'player2') return { changeA: LOSS_CHANGE, changeB: WIN_CHANGE };
  return { changeA: 0, changeB: 0 };
}

export function determineWinner(score1: number, score2: number): 'player1' | 'player2' | 'draw' {
  if (score1 > score2) return 'player1';
  if (score2 > score1) return 'player2';
  return 'draw';
}
