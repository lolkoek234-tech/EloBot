# Roblox PVP Elo Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Discord bot that receives match results from a Roblox PVP game (first-to-3-wins, best-of-5), calculates Elo, and displays player stats.

**Architecture:** Single Node.js/TypeScript process running discord.js for Discord interaction and Express for a Roblox webhook. SQLite via better-sqlite3 for persistence. Players link Discord to Roblox via `/link` command.

**Tech Stack:** TypeScript, discord.js v14, Express, better-sqlite3, tsx (dev runner)

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "roblox-elo-bot",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "discord.js": "^14.18.0",
    "express": "^4.21.0",
    "better-sqlite3": "^11.7.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create .env.example**

```
DISCORD_BOT_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
WEBHOOK_PORT=3000
WEBHOOK_SECRET=your_secret_here
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: packages installed, no errors

- [ ] **Step 5: Create src directory structure**

Run: `mkdir -p src/commands src/api src/db`
Expected: directories created

- [ ] **Step 6: Commit**

```
git init
git add -A
git commit -m "chore: scaffold project structure"
```

---

### Task 2: Database Schema

**Files:**
- Create: `src/types.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/queries.ts`

- [ ] **Step 1: Create src/types.ts**

```typescript
export interface Player {
  discord_id: string;
  roblox_id: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  created_at: string;
}

export interface Match {
  id: number;
  player1_id: string;
  player2_id: string;
  score1: number;
  score2: number;
  winner_id: string | null;
  elo_change1: number;
  elo_change2: number;
  fought_at: string;
}

export interface DailyStats {
  discord_id: string;
  fight_date: string;
  fight_count: number;
}

export interface MatchResultInput {
  player1_roblox: string;
  player2_roblox: string;
  score1: number;
  score2: number;
}
```

- [ ] **Step 2: Create src/db/schema.ts**

```typescript
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
```

- [ ] **Step 3: Create src/db/queries.ts**

```typescript
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
```

- [ ] **Step 4: Commit**

```
git add src/
git commit -m "feat: add database schema and queries"
```

---

### Task 3: Elo Calculation

**Files:**
- Create: `src/elo.ts`

- [ ] **Step 1: Create src/elo.ts**

```typescript
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
  const changeB = Math.round(K_FACTOR * (actualB - expectedB));

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
```

- [ ] **Step 2: Commit**

```
git add src/elo.ts
git commit -m "feat: add Elo calculation logic"
```

---

### Task 4: Discord Bot Client Setup

**Files:**
- Create: `src/bot.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Create src/bot.ts**

```typescript
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { linkCommand } from './commands/link';
import { profileCommand } from './commands/profile';
import { leaderboardCommand } from './commands/leaderboard';
import { matchlogCommand } from './commands/matchlog';
import { helpCommand } from './commands/help';

const commands = [
  linkCommand,
  profileCommand,
  leaderboardCommand,
  matchlogCommand,
  helpCommand,
];

export async function startBot(token: string, clientId: string, guildId: string): Promise<Client> {
  const rest = new REST().setToken(token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands.map(c => c.data.toJSON()) },
    );
    console.log('Slash commands registered');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const commandMap: Record<string, (interaction: any) => Promise<void>> = {
      'link': linkCommand.execute,
      'profile': profileCommand.execute,
      'leaderboard': leaderboardCommand.execute,
      'matchlog': matchlogCommand.execute,
      'help': helpCommand.execute,
    };

    const handler = commandMap[interaction.commandName];
    if (handler) {
      try {
        await handler(interaction);
      } catch (error) {
        console.error(`Command ${interaction.commandName} error:`, error);
        await interaction.reply({ content: 'An error occurred.', ephemeral: true });
      }
    }
  });

  await client.login(token);
  console.log(`Logged in as ${client.user?.tag}`);
  return client;
}
```

- [ ] **Step 2: Create src/index.ts**

```typescript
import dotenv from 'dotenv';
dotenv.config();

import { startBot } from './bot';
import { startApi } from './api/webhook';

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;
const webhookPort = parseInt(process.env.WEBHOOK_PORT || '3000', 10);

if (!token || !clientId || !guildId) {
  console.error('Missing required env vars: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, GUILD_ID');
  process.exit(1);
}

async function main() {
  const client = await startBot(token, clientId, guildId);
  startApi(client, webhookPort);
}

main().catch(console.error);
```

- [ ] **Step 3: Add dotenv dependency**

Add `"dotenv": "^16.4.0"` to package.json dependencies.

- [ ] **Step 4: Install**

Run: `npm install`
Expected: dotenv installed

- [ ] **Step 5: Commit**

```
git add src/index.ts src/bot.ts package.json
git commit -m "feat: add discord bot client and entry point"
```

---

### Task 5: Discord Slash Commands

**Files:**
- Create: `src/commands/link.ts`
- Create: `src/commands/profile.ts`
- Create: `src/commands/leaderboard.ts`
- Create: `src/commands/matchlog.ts`
- Create: `src/commands/help.ts`

- [ ] **Step 1: Create src/commands/link.ts**

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { linkPlayer } from '../db/queries';

export const linkCommand = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your Roblox username')
    .addStringOption(option =>
      option.setName('roblox_username')
        .setDescription('Your Roblox username')
        .setRequired(true)
    ),
  async execute(interaction: any) {
    const robloxUsername = interaction.options.getString('roblox_username', true);
    const discordId = interaction.user.id;

    const robloxRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!robloxRegex.test(robloxUsername)) {
      await interaction.reply({ content: 'Invalid Roblox username. Must be 3-20 alphanumeric characters or underscores.', ephemeral: true });
      return;
    }

    linkPlayer(discordId, robloxUsername);
    await interaction.reply({ content: `Linked <@${discordId}> to Roblox user **${robloxUsername}**`, ephemeral: true });
  },
};
```

- [ ] **Step 2: Create src/commands/profile.ts**

```typescript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPlayerByDiscordId, getDailyStats } from '../db/queries';

export const profileCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show player stats')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)
    ),
  async execute(interaction: any) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const player = getPlayerByDiscordId(targetUser.id);

    if (!player) {
      await interaction.reply({ content: `${targetUser.id === interaction.user.id ? 'You have' : 'That user has'} not linked a Roblox account yet. Use \`/link\` to set one up.`, ephemeral: true });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyStats = getDailyStats(targetUser.id, today);
    const fightsToday = dailyStats?.fight_count || 0;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${targetUser.username}'s Profile`)
      .addFields(
        { name: 'Roblox', value: player.roblox_id, inline: true },
        { name: 'Elo', value: player.elo.toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Wins', value: player.wins.toString(), inline: true },
        { name: 'Losses', value: player.losses.toString(), inline: true },
        { name: 'Draws', value: player.draws.toString(), inline: true },
        { name: 'Total Matches', value: player.total_matches.toString(), inline: true },
        { name: 'Fights Today', value: fightsToday.toString(), inline: true },
      )
      .setFooter({ text: 'First to 3 wins • Best of 5' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
```

- [ ] **Step 3: Create src/commands/leaderboard.ts**

```typescript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTopPlayers } from '../db/queries';

export const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show top players by Elo'),
  async execute(interaction: any) {
    const players = getTopPlayers(10);

    if (players.length === 0) {
      await interaction.reply({ content: 'No players registered yet.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('🏆 Elo Leaderboard')
      .setDescription(
        players.map((p, i) =>
          `**${i + 1}.** <@${p.discord_id}> — ${p.elo} Elo (${p.wins}W / ${p.losses}L / ${p.draws}D)`
        ).join('\n')
      )
      .setFooter({ text: 'Top 10 by Elo rating' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
```

- [ ] **Step 4: Create src/commands/matchlog.ts**

```typescript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getRecentMatches, getPlayerByDiscordId } from '../db/queries';

export const matchlogCommand = {
  data: new SlashCommandBuilder()
    .setName('matchlog')
    .setDescription('Show recent match history')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (defaults to yourself)')
        .setRequired(false)
    ),
  async execute(interaction: any) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const matches = getRecentMatches(targetUser.id, 10);

    if (matches.length === 0) {
      await interaction.reply({ content: 'No matches found for this user.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${targetUser.username}'s Recent Matches`)
      .setDescription(
        matches.slice(0, 10).map((m, i) => {
          const isPlayer1 = m.player1_id === targetUser.id;
          const myScore = isPlayer1 ? m.score1 : m.score2;
          const oppScore = isPlayer1 ? m.score2 : m.score1;
          const eloChange = isPlayer1 ? m.elo_change1 : m.elo_change2;
          const result = myScore > oppScore ? '✅ Win' : myScore < oppScore ? '❌ Loss' : '➖ Draw';
          return `**#${i + 1}** ${result} ${myScore}-${oppScore} (${eloChange > 0 ? '+' : ''}${eloChange} Elo)`;
        }).join('\n')
      )
      .setFooter({ text: 'Last 10 matches' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
```

- [ ] **Step 5: Create src/commands/help.ts**

```typescript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  async execute(interaction: any) {
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('Elo Bot Commands')
      .setDescription('Your Roblox PVP Elo tracking companion.')
      .addFields(
        { name: '/link <roblox_username>', value: 'Link your Discord to your Roblox account' },
        { name: '/profile [@user]', value: 'View Elo, wins/losses/draws, daily fights' },
        { name: '/leaderboard', value: 'Top 10 players by Elo' },
        { name: '/matchlog [@user]', value: 'View recent match history' },
        { name: '/help', value: 'Show this message' },
      )
      .setFooter({ text: 'First to 3 wins • Best of 5' });

    await interaction.reply({ embeds: [embed] });
  },
};
```

- [ ] **Step 6: Commit**

```
git add src/commands/
git commit -m "feat: add all discord slash commands"
```

---

### Task 6: Roblox Webhook API

**Files:**
- Create: `src/api/webhook.ts`

- [ ] **Step 1: Create src/api/webhook.ts**

```typescript
import express from 'express';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getPlayerByRobloxId, updatePlayerElo, insertMatch, incrementDailyStats } from '../db/queries';
import { calculateElo, determineWinner } from '../elo';
import { MatchResultInput } from '../types';

const MATCH_RESULT_CHANNEL_ID = process.env.MATCH_RESULT_CHANNEL_ID || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

export function startApi(client: Client, port: number): void {
  const app = express();
  app.use(express.json());

  app.post('/api/match-result', async (req, res) => {
    const auth = req.headers['authorization'];
    if (WEBHOOK_SECRET && auth !== `Bearer ${WEBHOOK_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { player1_roblox, player2_roblox, score1, score2 } = req.body as MatchResultInput;

    if (!player1_roblox || !player2_roblox || score1 === undefined || score2 === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const player1 = getPlayerByRobloxId(player1_roblox);
    const player2 = getPlayerByRobloxId(player2_roblox);

    if (!player1 || !player2) {
      res.status(404).json({ error: 'One or both players not linked' });
      return;
    }

    const eloResult = calculateElo(player1.elo, player2.elo, score1, score2);
    const winner = determineWinner(score1, score2);

    const winnerId = winner === 'player1' ? player1.discord_id : winner === 'player2' ? player2.discord_id : null;
    const p1Wins = player1.wins + (winner === 'player1' ? 1 : 0);
    const p1Losses = player1.losses + (winner === 'player2' ? 1 : 0);
    const p1Draws = player1.draws + (winner === 'draw' ? 1 : 0);
    const p2Wins = player2.wins + (winner === 'player2' ? 1 : 0);
    const p2Losses = player2.losses + (winner === 'player1' ? 1 : 0);
    const p2Draws = player2.draws + (winner === 'draw' ? 1 : 0);

    updatePlayerElo(player1.discord_id, eloResult.newEloA, p1Wins, p1Losses, p1Draws);
    updatePlayerElo(player2.discord_id, eloResult.newEloB, p2Wins, p2Losses, p2Draws);

    insertMatch({
      player1_id: player1.discord_id,
      player2_id: player2.discord_id,
      score1, score2,
      winner_id: winnerId,
      elo_change1: eloResult.changeA,
      elo_change2: eloResult.changeB,
    });

    const today = new Date().toISOString().split('T')[0];
    incrementDailyStats(player1.discord_id, today);
    incrementDailyStats(player2.discord_id, today);

    if (MATCH_RESULT_CHANNEL_ID) {
      const channel = client.channels.cache.get(MATCH_RESULT_CHANNEL_ID) as TextChannel;
      if (channel) {
        const resultText = winner === 'draw' ? 'Draw!' : `<@${winnerId}> wins!`;
        const embed = new EmbedBuilder()
          .setColor(winner === 'draw' ? 0x95A5A6 : 0x00FF00)
          .setTitle('Match Result')
          .setDescription(
            `<@${player1.discord_id}> **${score1}** - **${score2}** <@${player2.discord_id}>
            ${resultText}
            ${eloResult.changeA > 0 ? '+' : ''}${eloResult.changeA} Elo • ${eloResult.changeB > 0 ? '+' : ''}${eloResult.changeB} Elo`
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      }
    }

    res.json({
      success: true,
      elo_change1: eloResult.changeA,
      elo_change2: eloResult.changeB,
      winner: winnerId,
    });
  });

  app.listen(port, () => {
    console.log(`Webhook API listening on port ${port}`);
  });
}
```

- [ ] **Step 2: Add MATCH_RESULT_CHANNEL_ID to .env.example**

Append to `.env.example`:
```
MATCH_RESULT_CHANNEL_ID=your_channel_id_here
```

- [ ] **Step 3: Commit**

```
git add src/api/webhook.ts .env.example
git commit -m "feat: add roblox webhook api endpoint"
```

---

### Task 7: Create data directory and .gitignore

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
data/
.env
```

- [ ] **Step 2: Create data directory**

Run: `mkdir -p data`
Expected: data/ directory created

- [ ] **Step 3: Copy .env.example to .env**

Run: `copy .env.example .env`
Expected: .env file created

- [ ] **Step 4: Commit**

```
git add .gitignore
git commit -m "chore: add gitignore and data directory"
```

---

### Task 8: Verify build

- [ ] **Step 1: Run TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 2: Final commit**

```
git add -A
git commit -m "chore: finalize initial build"
```
