import { getDb } from './schema';
import { Player, Match, DailyStats, VerificationCode } from '../types';
import { getTier } from '../types';
import { calculateElo, determineWinner } from '../elo';
import crypto from 'crypto';

export function getPlayerByDiscordId(discordId: string): Player | undefined {
  return getDb().prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId) as unknown as Player | undefined;
}

export function getPlayerByRobloxId(robloxId: string): Player | undefined {
  return getDb().prepare('SELECT * FROM players WHERE roblox_id = ?').get(robloxId) as unknown as Player | undefined;
}

export function getOrCreatePlayerByRobloxId(robloxId: string): Player {
  const existing = getPlayerByRobloxId(robloxId);
  if (existing) return existing;

  const syntheticId = 'rbx_' + robloxId;
  createPlayer(syntheticId, robloxId);
  return getPlayerByRobloxId(robloxId)!;
}

export function createPlayer(discordId: string, robloxId: string): void {
  getDb().prepare('INSERT INTO players (discord_id, roblox_id) VALUES (?, ?)').run(discordId, robloxId);
}

export function linkPlayer(discordId: string, robloxId: string): void {
  const existing = getPlayerByDiscordId(discordId);
  if (existing) {
    getDb().prepare('UPDATE players SET roblox_id = ? WHERE discord_id = ?').run(robloxId, discordId);
  } else {
    createPlayer(discordId, robloxId);
  }
}

export function getTopPlayers(limit: number = 10): Player[] {
  return getDb().prepare('SELECT * FROM players ORDER BY elo DESC LIMIT ?').all(limit) as unknown as Player[];
}

export function getTopPlayersByRegion(region: string, limit: number = 10): Player[] {
  return getDb().prepare(
    'SELECT * FROM players WHERE region = ? ORDER BY elo DESC LIMIT ?'
  ).all(region, limit) as unknown as Player[];
}

export function getPlayerCountByRegion(region: string): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM players WHERE region = ?').get(region) as { count: number };
  return row.count;
}

export function getWinStreak(discordId: string): number {
  const rows = getDb().prepare(
    'SELECT score1, score2, player1_id FROM matches WHERE player1_id = ? OR player2_id = ? ORDER BY fought_at DESC LIMIT 20'
  ).all(discordId, discordId) as { score1: number; score2: number; player1_id: string }[];
  if (rows.length === 0) return 0;
  let streak = 0;
  for (const row of rows) {
    const isP1 = row.player1_id === discordId;
    const myScore = isP1 ? row.score1 : row.score2;
    const oppScore = isP1 ? row.score2 : row.score1;
    if (myScore > oppScore) {
      if (streak >= 0) streak++;
      else break;
    } else if (myScore < oppScore) {
      if (streak <= 0) streak--;
      else break;
    } else {
      break;
    }
  }
  return streak;
}

export function getPlayerRank(discordId: string): number {
  const row = getDb().prepare(
    'SELECT COUNT(*) as rank FROM players WHERE elo > (SELECT elo FROM players WHERE discord_id = ?)'
  ).get(discordId) as { rank: number };
  return row.rank + 1;
}

export function getHighestStreak(discordId: string): number {
  const rows = getDb().prepare(
    'SELECT score1, score2, player1_id FROM matches WHERE player1_id = ? OR player2_id = ? ORDER BY fought_at ASC'
  ).all(discordId, discordId) as { score1: number; score2: number; player1_id: string }[];
  let maxStreak = 0;
  let current = 0;
  for (const row of rows) {
    const isP1 = row.player1_id === discordId;
    const myScore = isP1 ? row.score1 : row.score2;
    const oppScore = isP1 ? row.score2 : row.score1;
    if (myScore > oppScore) {
      current++;
      maxStreak = Math.max(maxStreak, current);
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

export function getRecentMatches(discordId: string, limit: number = 10): Match[] {
  return getDb().prepare(
    'SELECT * FROM matches WHERE player1_id = ? OR player2_id = ? ORDER BY fought_at DESC LIMIT ?'
  ).all(discordId, discordId, limit) as unknown as Match[];
}

export function upgradePlayerDiscordId(oldId: string, newId: string, robloxId: string): void {
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE players SET discord_id = ?, roblox_id = ? WHERE discord_id = ?').run(newId, robloxId, oldId);
    db.prepare('UPDATE matches SET player1_id = ? WHERE player1_id = ?').run(newId, oldId);
    db.prepare('UPDATE matches SET player2_id = ? WHERE player2_id = ?').run(newId, oldId);
    db.prepare('UPDATE matches SET winner_id = ? WHERE winner_id = ?').run(newId, oldId);
    db.prepare('UPDATE daily_stats SET discord_id = ? WHERE discord_id = ?').run(newId, oldId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function generateVerificationCode(discordId: string): string {
  cleanupExpiredCodes();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  getDb().prepare('INSERT OR REPLACE INTO verification_codes (code, discord_id, expires_at) VALUES (?, ?, ?)').run(code, discordId, expiresAt);
  return code;
}

export function consumeVerificationCode(code: string): string | null {
  const row = getDb().prepare(
    'SELECT discord_id FROM verification_codes WHERE code = ? AND expires_at > datetime(\'now\')'
  ).get(code) as { discord_id: string } | undefined;
  if (!row) return null;
  getDb().prepare('DELETE FROM verification_codes WHERE code = ?').run(code);
  return row.discord_id;
}

function cleanupExpiredCodes(): void {
  getDb().prepare("DELETE FROM verification_codes WHERE expires_at <= datetime('now')").run();
}

export function getDailyStats(discordId: string, date: string): DailyStats | undefined {
  return getDb().prepare(
    'SELECT * FROM daily_stats WHERE discord_id = ? AND fight_date = ?'
  ).get(discordId, date) as unknown as DailyStats | undefined;
}

export interface ProximityCheck {
  allowed: boolean;
  reason?: string;
}

export function checkChallengeProximity(p1Elo: number, p2Elo: number): ProximityCheck {
  const diff = Math.abs(p1Elo - p2Elo);
  if (diff <= 20) return { allowed: true };

  const tier1 = getTier(p1Elo);
  const tier2 = getTier(p2Elo);
  if (tier1 !== tier2 && diff <= 10) return { allowed: true };

  return { allowed: false, reason: `Elo difference of ${diff} exceeds the limit (20 within tier, 10 across tiers)` };
}

export function getDailyDuelCount(playerA: string, playerB: string, date: string): number {
  const [p1, p2] = playerA < playerB ? [playerA, playerB] : [playerB, playerA];
  const row = getDb().prepare(
    'SELECT count FROM duel_history WHERE player1_id = ? AND player2_id = ? AND fight_date = ?'
  ).get(p1, p2, date) as { count: number } | undefined;
  return row?.count || 0;
}

export function incrementDuelCount(playerA: string, playerB: string, date: string): void {
  const [p1, p2] = playerA < playerB ? [playerA, playerB] : [playerB, playerA];
  const existing = getDb().prepare(
    'SELECT count FROM duel_history WHERE player1_id = ? AND player2_id = ? AND fight_date = ?'
  ).get(p1, p2, date) as { count: number } | undefined;
  if (existing) {
    getDb().prepare('UPDATE duel_history SET count = count + 1 WHERE player1_id = ? AND player2_id = ? AND fight_date = ?').run(p1, p2, date);
  } else {
    getDb().prepare('INSERT INTO duel_history (player1_id, player2_id, fight_date) VALUES (?, ?, ?)').run(p1, p2, date);
  }
}

export function applyEloChange(discordId: string, change: number): void {
  const newElo = Math.max(0, (getPlayerByDiscordId(discordId)?.elo || 0) + change);
  getDb().prepare('UPDATE players SET elo = ? WHERE discord_id = ?').run(newElo, discordId);
}

export interface ProcessedMatch {
  winnerId: string | null;
  changeA: number;
  changeB: number;
  newEloA: number;
  newEloB: number;
}

export function processMatch(player1DiscordId: string, player2DiscordId: string, eloA: number, eloB: number, score1: number, score2: number, region: string = ''): ProcessedMatch {
  const db = getDb();
  const winner = determineWinner(score1, score2);
  const eloResult = calculateElo(winner);
  const winnerId = winner === 'player1' ? player1DiscordId : winner === 'player2' ? player2DiscordId : null;

  const newEloA = Math.max(0, eloA + eloResult.changeA);
  const newEloB = Math.max(0, eloB + eloResult.changeB);

  const p1Wins = winner === 'player1' ? 1 : 0;
  const p1Losses = winner === 'player2' ? 1 : 0;
  const p1Draws = winner === 'draw' ? 1 : 0;
  const p2Wins = winner === 'player2' ? 1 : 0;
  const p2Losses = winner === 'player1' ? 1 : 0;
  const p2Draws = winner === 'draw' ? 1 : 0;

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE players SET elo = ?, region = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?, total_matches = total_matches + 1 WHERE discord_id = ?')
      .run(newEloA, region, p1Wins, p1Losses, p1Draws, player1DiscordId);
    db.prepare('UPDATE players SET elo = ?, region = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?, total_matches = total_matches + 1 WHERE discord_id = ?')
      .run(newEloB, region, p2Wins, p2Losses, p2Draws, player2DiscordId);

    db.prepare('INSERT INTO matches (player1_id, player2_id, score1, score2, winner_id, elo_change1, elo_change2, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(player1DiscordId, player2DiscordId, score1, score2, winnerId, eloResult.changeA, eloResult.changeB, region);

    const today = new Date().toISOString().split('T')[0];
    for (const id of [player1DiscordId, player2DiscordId]) {
      const existing = db.prepare('SELECT * FROM daily_stats WHERE discord_id = ? AND fight_date = ?').get(id, today) as unknown as DailyStats | undefined;
      if (existing) {
        db.prepare('UPDATE daily_stats SET fight_count = fight_count + 1 WHERE discord_id = ? AND fight_date = ?').run(id, today);
      } else {
        db.prepare('INSERT INTO daily_stats (discord_id, fight_date) VALUES (?, ?)').run(id, today);
      }
    }

    incrementDuelCount(player1DiscordId, player2DiscordId, today);

    db.exec('COMMIT');
    return { winnerId, changeA: eloResult.changeA, changeB: eloResult.changeB, newEloA, newEloB };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
