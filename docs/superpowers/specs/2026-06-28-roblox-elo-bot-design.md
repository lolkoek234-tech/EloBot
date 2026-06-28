# Roblox PVP Elo Discord Bot — Design Spec

## Overview
A Discord bot that receives match results from a Roblox PVP game (first-to-3-wins, best-of-5 format), calculates Elo ratings, and displays player stats in Discord.

## Architecture

```
Roblox Game (Luau — HttpService:PostAsync)
    │ HTTP POST /api/match-result
    ▼
Discord Bot (Node.js + TypeScript)
    ├── Express server — receives Roblox webhook
    ├── discord.js — slash commands & messaging
    └── SQLite (better-sqlite3) — local DB
```

Single-process bot. Express server built into the same process. No external DB or separate API server.

## Data Model

### players
| Column | Type | Notes |
|---|---|---|
| discord_id | TEXT PK | Discord user ID |
| roblox_id | TEXT UNIQUE | Roblox username (set via `/link`) |
| elo | INTEGER DEFAULT 1000 | Current Elo |
| wins | INTEGER DEFAULT 0 | Career wins |
| losses | INTEGER DEFAULT 0 | Career losses |
| draws | INTEGER DEFAULT 0 | Career draws |
| total_matches | INTEGER DEFAULT 0 | Career total |
| created_at | DATETIME | |

### matches
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTO | |
| player1_id | TEXT | Discord ID |
| player2_id | TEXT | Discord ID |
| score1 | INTEGER | Player1 round wins (e.g. 3) |
| score2 | INTEGER | Player2 round wins (e.g. 0) |
| winner_id | TEXT NULL | Discord ID, NULL if draw |
| elo_change1 | INTEGER | |
| elo_change2 | INTEGER | |
| fought_at | DATETIME | |

### daily_stats
| Column | Type | Notes |
|---|---|---|
| discord_id | TEXT | |
| fight_date | TEXT | YYYY-MM-DD |
| fight_count | INTEGER | |

## Elo Calculation

- K-factor: 32
- Expected score: `Ea = 1 / (1 + 10^((Rb - Ra) / 400))`
- Winner: `newElo = oldElo + K * (1 - expected)`
- Loser: `newElo = oldElo + K * (0 - expected)` (i.e. loses K * expected)
- Draw: both gain `K * (0.5 - expected)`

## API Endpoint

### POST /api/match-result
Receives match data from Roblox.
```json
{
  "player1_roblox": "Username1",
  "player2_roblox": "Username2",
  "score1": 3,
  "score2": 0
}
```
Response: `200 OK` on success.
The bot announces the result in a configured Discord channel.

## Discord Slash Commands

| Command | Description |
|---|---|
| `/link <roblox_username>` | Link Discord account to Roblox |
| `/profile [@user]` | Show Elo, W/L/D, daily fights |
| `/leaderboard` | Top players by Elo |
| `/matchlog [@user]` | Recent match history |
| `/help` | List commands |

## Player Linking Flow
1. User runs `/link RblxUsername` in Discord
2. Bot stores `discord_id → roblox_username` in `players` table
3. Roblox game sends match with `roblox_username` values
4. Bot resolves to Discord IDs for @mentions and display

## Files
```
src/
  index.ts          — Entry point, bot + server startup
  bot.ts            — Discord client, command registration
  commands/
    link.ts
    profile.ts
    leaderboard.ts
    matchlog.ts
    help.ts
  api/
    webhook.ts      — Express route for /api/match-result
  elo.ts            — Elo calculation logic
  db/
    schema.ts       — Table creation
    queries.ts      — All DB queries
  types.ts          — Shared types
```
