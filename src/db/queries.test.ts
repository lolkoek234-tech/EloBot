import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getPlayerByDiscordId,
  getPlayerByRobloxId,
  createPlayer,
  updatePlayerElo,
  insertMatch,
  getDailyStats,
  incrementDailyStats,
  getTopPlayers,
  getRecentMatches,
  linkPlayer,
} from './queries';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'elobot.db');

beforeAll(() => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
});

beforeEach(() => {
  // ensure DB is initialized by calling a query
  getPlayerByDiscordId('__init__');
});

describe('database queries', () => {
  it('creates a player and retrieves by discord_id', () => {
    createPlayer('discord1', 'roblox1');
    const player = getPlayerByDiscordId('discord1');
    expect(player).toBeDefined();
    expect(player!.discord_id).toBe('discord1');
    expect(player!.roblox_id).toBe('roblox1');
    expect(player!.elo).toBe(1000);
    expect(player!.wins).toBe(0);
    expect(player!.losses).toBe(0);
    expect(player!.draws).toBe(0);
    expect(player!.total_matches).toBe(0);
  });

  it('retrieves a player by roblox_id', () => {
    const player = getPlayerByRobloxId('roblox1');
    expect(player).toBeDefined();
    expect(player!.discord_id).toBe('discord1');
  });

  it('returns undefined for nonexistent players', () => {
    expect(getPlayerByDiscordId('nonexistent')).toBeUndefined();
    expect(getPlayerByRobloxId('nonexistent')).toBeUndefined();
  });

  it('updates player elo and stats', () => {
    updatePlayerElo('discord1', 1050, 1, 0, 0);
    const player = getPlayerByDiscordId('discord1');
    expect(player!.elo).toBe(1050);
    expect(player!.wins).toBe(1);
    expect(player!.losses).toBe(0);
    expect(player!.draws).toBe(0);
    expect(player!.total_matches).toBe(1);
  });

  it('inserts a match and retrieves recent matches', () => {
    createPlayer('discord2', 'roblox2');
    insertMatch({
      player1_id: 'discord1',
      player2_id: 'discord2',
      score1: 3,
      score2: 1,
      winner_id: 'discord1',
      elo_change1: 10,
      elo_change2: -10,
    });
    const matches = getRecentMatches('discord1');
    expect(matches).toHaveLength(1);
    expect(matches[0].score1).toBe(3);
    expect(matches[0].score2).toBe(1);
    expect(matches[0].winner_id).toBe('discord1');
    expect(matches[0].elo_change1).toBe(10);
    expect(matches[0].elo_change2).toBe(-10);
  });

  it('increments daily stats', () => {
    const date = '2026-06-28';
    incrementDailyStats('discord1', date);
    let stats = getDailyStats('discord1', date);
    expect(stats).toBeDefined();
    expect(stats!.fight_count).toBe(1);

    incrementDailyStats('discord1', date);
    stats = getDailyStats('discord1', date);
    expect(stats!.fight_count).toBe(2);
  });

  it('returns top players sorted by elo', () => {
    createPlayer('discord3', 'roblox3');
    createPlayer('discord4', 'roblox4');
    updatePlayerElo('discord1', 1100, 2, 0, 0);
    updatePlayerElo('discord2', 900, 0, 1, 0);
    updatePlayerElo('discord3', 1200, 3, 0, 0);
    updatePlayerElo('discord4', 950, 1, 0, 0);
    const top = getTopPlayers(3);
    expect(top).toHaveLength(3);
    expect(top[0].discord_id).toBe('discord3');
    expect(top[1].discord_id).toBe('discord1');
    expect(top[2].discord_id).toBe('discord4');
  });

  it('links a new player', () => {
    const newPlayer = getPlayerByDiscordId('discord_new');
    expect(newPlayer).toBeUndefined();
    linkPlayer('discord_new', 'roblox_new');
    const player = getPlayerByDiscordId('discord_new');
    expect(player).toBeDefined();
    expect(player!.roblox_id).toBe('roblox_new');
  });

  it('links an existing player (updates roblox_id)', () => {
    linkPlayer('discord1', 'roblox1_updated');
    const player = getPlayerByDiscordId('discord1');
    expect(player!.roblox_id).toBe('roblox1_updated');
  });
});
