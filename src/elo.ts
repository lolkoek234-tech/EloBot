const K_FACTOR = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export interface EloResult {
  newEloA: number;
  newEloB: number;
  changeA: number;
  changeB: number;
}

export function calculateElo(ratingA: number, ratingB: number, scoreA: number, scoreB: number): EloResult {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  let actualA: number;
  let actualB: number;

  if (scoreA > scoreB) {
    actualA = 1;
    actualB = 0;
  } else if (scoreB > scoreA) {
    actualA = 0;
    actualB = 1;
  } else {
    actualA = 0.5;
    actualB = 0.5;
  }

  const changeA = Math.round(K_FACTOR * (actualA - expectedA));
  const changeB = -changeA || 0;

  return {
    newEloA: ratingA + changeA,
    newEloB: ratingB + changeB,
    changeA,
    changeB,
  };
}

export function determineWinner(score1: number, score2: number): 'player1' | 'player2' | 'draw' {
  if (score1 > score2) return 'player1';
  if (score2 > score1) return 'player2';
  return 'draw';
}
