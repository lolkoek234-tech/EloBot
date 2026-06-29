import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getPlayerByDiscordId,
  getPlayerByRobloxId,
  createPlayer,
  getDailyStats,
  getTopPlayers,
  getRecentMatches,
  linkPlayer,
  processMatch,
  applyEloChange,
  checkChallengeProximity,
} from './queries';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'elobot.db');

beforeAll(() => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
});

beforeEach(() => {
  getPlayerByDiscordId('__init__');
});

describe('database queries', () => {
  it('creates a player and retrieves by discord_id', () => {
    createPlayer('discord1', 'roblox1');
    const player = getPlayerByDiscordId('discord1');
    expect(player?.discord_id).toBe('discord1');
    expect(player?.roblox_id).toBe('roblox1');
    expect(player?.elo).toBe(0);
  });

  it('retrieves by roblox_id', () => {
    expect(getPlayerByRobloxId('roblox1')?.discord_id).toBe('discord1');
  });

  it('processes a match and updates elo', () => {
    createPlayer('discord2', 'roblox2');
    const result = processMatch('discord1', 'discord2', 0, 0, 3, 1);
    expect(result.changeA).toBe(5);
    expect(result.changeB).toBe(-5);
    expect(result.newEloA).toBe(5);
    expect(result.newEloB).toBe(0);

    const p1 = getPlayerByDiscordId('discord1');
    expect(p1?.elo).toBe(5);
    expect(p1?.wins).toBe(1);
  });

  it('applies elo change directly', () => {
    applyEloChange('discord1', -10);
    const player = getPlayerByDiscordId('discord1');
    expect(player?.elo).toBe(0);
  });

  it('returns recent matches', () => {
    const matches = getRecentMatches('discord1');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('returns top players sorted by elo', () => {
    createPlayer('discord3', 'roblox3');
    createPlayer('discord4', 'roblox4');
    applyEloChange('discord3', 200);
    applyEloChange('discord4', 50);
    const top = getTopPlayers(3);
    expect(top[0].discord_id).toBe('discord3');
    expect(top[1].discord_id).toBe('discord4');
  });

  it('links a new player', () => {
    linkPlayer('discord_link', 'roblox_link');
    expect(getPlayerByDiscordId('discord_link')?.roblox_id).toBe('roblox_link');
  });

  it('links existing player (updates roblox_id)', () => {
    linkPlayer('discord1', 'roblox1_updated');
    expect(getPlayerByDiscordId('discord1')?.roblox_id).toBe('roblox1_updated');
  });

  it('checks proximity - within 20', () => {
    expect(checkChallengeProximity(1000, 1010).allowed).toBe(true);
    expect(checkChallengeProximity(1000, 1020).allowed).toBe(true);
  });

  it('checks proximity - over 20 fails', () => {
    expect(checkChallengeProximity(1000, 1025).allowed).toBe(false);
  });

  it('checks proximity - cross tier within 10', () => {
    expect(checkChallengeProximity(49, 55).allowed).toBe(true);
  });
});
