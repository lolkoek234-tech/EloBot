import { getDb } from './schema';
import { Player, Match, DailyStats } from '../types';

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
