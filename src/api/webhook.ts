import express from 'express';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getOrCreatePlayerByRobloxId, processMatch, getDailyStats } from '../db/queries';
import { determineWinner } from '../elo';
import { MatchResultInput, Region, getTier } from '../types';

function getRegionChannels(): Record<string, string> {
  return {
    eu: process.env.CHANNEL_EU || '',
    na: process.env.CHANNEL_NA || '',
    asia: process.env.CHANNEL_ASIA || '',
    global: process.env.CHANNEL_GLOBAL || '',
  };
}

function regionFlag(region?: string): string {
  switch (region) {
    case 'eu': return '\u{1F1EA}\u{1F1FA}';
    case 'na': return '\u{1F30E}';
    case 'asia': return '\u{1F30F}';
    case 'global': return '\u{1F30D}';
    default: return '';
  }
}

const recentMatches = new Set<string>();

function matchKey(p1: string, p2: string, s1: number, s2: number): string {
  return `${p1}:${p2}:${s1}:${s2}`;
}

export function startApi(client: Client, port: number): void {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  setInterval(() => recentMatches.clear(), 10000);

  app.post('/api/match-result', async (req, res) => {
    try {
      const secret = process.env.WEBHOOK_SECRET || '';
      const auth = req.headers['authorization'];
      if (secret && auth !== `Bearer ${secret}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { player1_roblox, player2_roblox, score1, score2, region } = req.body as MatchResultInput;

      if (!player1_roblox || !player2_roblox || typeof score1 !== 'number' || typeof score2 !== 'number') {
        res.status(400).json({ error: 'Missing or invalid required fields' });
        return;
      }

      if (score1 < 0 || score2 < 0 || score1 > 5 || score2 > 5) {
        res.status(400).json({ error: 'Invalid scores (must be 0-5)' });
        return;
      }

      if (player1_roblox.toLowerCase() === player2_roblox.toLowerCase()) {
        res.status(400).json({ error: 'Players must have different names' });
        return;
      }

      const key = matchKey(player1_roblox.toLowerCase(), player2_roblox.toLowerCase(), score1, score2);
      if (recentMatches.has(key)) {
        res.json({ success: true, duplicate: true });
        return;
      }
      recentMatches.add(key);

      const player1 = getOrCreatePlayerByRobloxId(player1_roblox);
      const player2 = getOrCreatePlayerByRobloxId(player2_roblox);

      const result = processMatch(player1.discord_id, player2.discord_id, player1.elo, player2.elo, score1, score2, region || '');
      const winner = determineWinner(score1, score2);

      const p1 = getOrCreatePlayerByRobloxId(player1_roblox);
      const p2 = getOrCreatePlayerByRobloxId(player2_roblox);

      const channels = getRegionChannels();
      const channelId = channels[region as Region] || channels.global || '';
      if (channelId) {
        const guild = client.guilds.cache.get(process.env.GUILD_ID || '');
        const channel = guild?.channels.cache.get(channelId) || await guild?.channels.fetch(channelId).catch(() => null);
        if (channel instanceof TextChannel) {
          const today = new Date().toISOString().split('T')[0];
          const p1Daily = getDailyStats(p1.discord_id, today);
          const p2Daily = getDailyStats(p2.discord_id, today);

          const p1Record = `${p1.wins}W/${p1.losses}L`;
          const p2Record = `${p2.wins}W/${p2.losses}L`;

          const p1Label = winner === 'player1' ? 'WINNER' : winner === 'draw' ? 'DRAW' : 'LOSER';
          const p2Label = winner === 'player2' ? 'WINNER' : winner === 'draw' ? 'DRAW' : 'LOSER';

          const p1Tier = getTier(result.newEloA);
          const p2Tier = getTier(result.newEloB);

          const flag = regionFlag(region);

          const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setDescription(`${flag} **${p1.roblox_id}** ${p1Label}
-# ELO: **${result.newEloA}** | ${p1Tier} | Record: ${p1Record} | Fights Today: **${p1Daily?.fight_count || 1}** | Scoreboard: **${score1}-${score2}**
-# Opponent: ${p2.roblox_id}

\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}

${flag} **${p2.roblox_id}** ${p2Label}
-# ELO: **${result.newEloB}** | ${p2Tier} | Record: ${p2Record} | Fights Today: **${p2Daily?.fight_count || 1}** | Scoreboard: **${score2}-${score1}**
-# Opponent: ${p1.roblox_id}`);

          await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
        }
      }

      res.json({
        success: true,
        elo_change1: result.changeA,
        elo_change2: result.changeB,
        winner: result.winnerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Webhook error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.listen(port, () => {
    console.log(`Webhook API listening on port ${port}`);
  });
}
