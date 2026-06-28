import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'elobot.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      discord_id TEXT PRIMARY KEY,
      roblox_id TEXT UNIQUE NOT NULL,
      elo INTEGER NOT NULL DEFAULT 1000,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      total_matches INTEGER NOT NULL DEFAULT 0,
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
  `);
}
