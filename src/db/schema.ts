import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'elobot.db');

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initTables();
    migrate();
  }
  return db;
}

function migrate(): void {
  try { db.exec("ALTER TABLE players ADD COLUMN region TEXT NOT NULL DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE matches ADD COLUMN region TEXT NOT NULL DEFAULT ''"); } catch (e) {}
}

function initTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      discord_id TEXT PRIMARY KEY,
      roblox_id TEXT UNIQUE NOT NULL,
      elo INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      total_matches INTEGER NOT NULL DEFAULT 0,
      region TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      score1 INTEGER NOT NULL,
      score2 INTEGER NOT NULL,
      winner_id TEXT,
      elo_change1 INTEGER NOT NULL,
      elo_change2 INTEGER NOT NULL,
      region TEXT NOT NULL DEFAULT '',
      fought_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (player1_id) REFERENCES players(discord_id),
      FOREIGN KEY (player2_id) REFERENCES players(discord_id)
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      discord_id TEXT NOT NULL,
      fight_date TEXT NOT NULL,
      fight_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (discord_id, fight_date),
      FOREIGN KEY (discord_id) REFERENCES players(discord_id)
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      code TEXT PRIMARY KEY,
      discord_id TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS duel_history (
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      fight_date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (player1_id, player2_id, fight_date),
      FOREIGN KEY (player1_id) REFERENCES players(discord_id),
      FOREIGN KEY (player2_id) REFERENCES players(discord_id)
    );
  `);
}
