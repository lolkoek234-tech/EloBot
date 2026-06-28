import { getDb } from './schema';
import { Player, Match, DailyStats, MatchResultInput } from '../types';
import { calculateElo, determineWinner } from '../elo';

export function getPlayerByDiscordId(discordId: string): Player | undefined {
  return getDb().prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId) as Player | undefined;
}

export function getPlayerByRobloxId(robloxId: string): Player | undefined {
  return getDb().prepare('SELECT * FROM players WHERE roblox_id = ?').get(robloxId) as Player | undefined;
}

export function createPlayer(discordId: string, robloxId: string): void {
  getDb().prepare(
    'INSERT INTO players (discord_id, roblox_id) VALUES (?, ?)'
  ).run(discordId, robloxId);
}

export function updatePlayerElo(discordId: string, elo: number, wins: number, losses: number, draws: number): void {
  getDb().prepare(
    'UPDATE players SET elo = ?, wins = ?, losses = ?, draws = ?, total_matches = total_matches + 1 WHERE discord_id = ?'
  ).run(elo, wins, losses, draws, discordId);
}

export function insertMatch(match: Omit<Match, 'id' | 'fought_at'>): void {
  getDb().prepare(
    'INSERT INTO matches (player1_id, player2_id, score1, score2, winner_id, elo_change1, elo_change2) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(match.player1_id, match.player2_id, match.score1, match.score2, match.winner_id, match.elo_change1, match.elo_change2);
}

export function getDailyStats(discordId: string, date: string): DailyStats | undefined {
  return getDb().prepare(
    'SELECT * FROM daily_stats WHERE discord_id = ? AND fight_date = ?'
  ).get(discordId, date) as DailyStats | undefined;
}

export function incrementDailyStats(discordId: string, date: string): void {
  const existing = getDailyStats(discordId, date);
  if (existing) {
    getDb().prepare(
      'UPDATE daily_stats SET fight_count = fight_count + 1 WHERE discord_id = ? AND fight_date = ?'
    ).run(discordId, date);
  } else {
    getDb().prepare(
      'INSERT INTO daily_stats (discord_id, fight_date) VALUES (?, ?)'
    ).run(discordId, date);
  }
}

export function getTopPlayers(limit: number = 10): Player[] {
  return getDb().prepare(
    'SELECT * FROM players ORDER BY elo DESC LIMIT ?'
  ).all(limit) as Player[];
}

export function getRecentMatches(discordId: string, limit: number = 10): Match[] {
  return getDb().prepare(
    'SELECT * FROM matches WHERE player1_id = ? OR player2_id = ? ORDER BY fought_at DESC LIMIT ?'
  ).all(discordId, discordId, limit) as Match[];
}

export function linkPlayer(discordId: string, robloxId: string): void {
  const existing = getPlayerByDiscordId(discordId);
  if (existing) {
    getDb().prepare('UPDATE players SET roblox_id = ? WHERE discord_id = ?').run(robloxId, discordId);
  } else {
    createPlayer(discordId, robloxId);
  }
}

export interface ProcessedMatch {
  winnerId: string | null;
  changeA: number;
  changeB: number;
  newEloA: number;
  newEloB: number;
}

export function processMatch(player1DiscordId: string, player2DiscordId: string, eloA: number, eloB: number, score1: number, score2: number): ProcessedMatch {
  const db = getDb();
  const transaction = db.transaction(() => {
    const eloResult = calculateElo(eloA, eloB, score1, score2);
    const winner = determineWinner(score1, score2);

    const winnerId = winner === 'player1' ? player1DiscordId : winner === 'player2' ? player2DiscordId : null;
    const p1Wins = winner === 'player1' ? 1 : 0;
    const p1Losses = winner === 'player2' ? 1 : 0;
    const p1Draws = winner === 'draw' ? 1 : 0;
    const p2Wins = winner === 'player2' ? 1 : 0;
    const p2Losses = winner === 'player1' ? 1 : 0;
    const p2Draws = winner === 'draw' ? 1 : 0;

    db.prepare(
      'UPDATE players SET elo = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?, total_matches = total_matches + 1 WHERE discord_id = ?'
    ).run(eloResult.newEloA, p1Wins, p1Losses, p1Draws, player1DiscordId);
    db.prepare(
      'UPDATE players SET elo = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?, total_matches = total_matches + 1 WHERE discord_id = ?'
    ).run(eloResult.newEloB, p2Wins, p2Losses, p2Draws, player2DiscordId);

    db.prepare(
      'INSERT INTO matches (player1_id, player2_id, score1, score2, winner_id, elo_change1, elo_change2) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(player1DiscordId, player2DiscordId, score1, score2, winnerId, eloResult.changeA, eloResult.changeB);

    const today = new Date().toISOString().split('T')[0];
    for (const id of [player1DiscordId, player2DiscordId]) {
      const existing = db.prepare('SELECT * FROM daily_stats WHERE discord_id = ? AND fight_date = ?').get(id, today) as DailyStats | undefined;
      if (existing) {
        db.prepare('UPDATE daily_stats SET fight_count = fight_count + 1 WHERE discord_id = ? AND fight_date = ?').run(id, today);
      } else {
        db.prepare('INSERT INTO daily_stats (discord_id, fight_date) VALUES (?, ?)').run(id, today);
      }
    }

    return { winnerId, changeA: eloResult.changeA, changeB: eloResult.changeB, newEloA: eloResult.newEloA, newEloB: eloResult.newEloB };
  });

  return transaction() as ProcessedMatch;
}
