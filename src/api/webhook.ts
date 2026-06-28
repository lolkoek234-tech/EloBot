import express from 'express';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getPlayerByRobloxId, processMatch } from '../db/queries';
import { determineWinner } from '../elo';
import { MatchResultInput } from '../types';

const MATCH_RESULT_CHANNEL_ID = process.env.MATCH_RESULT_CHANNEL_ID || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

export function startApi(client: Client, port: number): void {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.post('/api/match-result', async (req, res) => {
    try {
      const auth = req.headers['authorization'];
      if (WEBHOOK_SECRET && auth !== `Bearer ${WEBHOOK_SECRET}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { player1_roblox, player2_roblox, score1, score2 } = req.body as MatchResultInput;

      if (!player1_roblox || !player2_roblox || typeof score1 !== 'number' || typeof score2 !== 'number') {
        res.status(400).json({ error: 'Missing or invalid required fields' });
        return;
      }

      if (score1 < 0 || score2 < 0 || score1 > 5 || score2 > 5) {
        res.status(400).json({ error: 'Invalid scores (must be 0-5)' });
        return;
      }

      const player1 = getPlayerByRobloxId(player1_roblox);
      const player2 = getPlayerByRobloxId(player2_roblox);

      if (!player1 || !player2) {
        res.status(404).json({ error: 'One or both players not linked' });
        return;
      }

      const result = processMatch(player1.discord_id, player2.discord_id, player1.elo, player2.elo, score1, score2);
      const winner = determineWinner(score1, score2);

      if (MATCH_RESULT_CHANNEL_ID) {
        const channel = client.channels.cache.get(MATCH_RESULT_CHANNEL_ID);
        if (channel instanceof TextChannel) {
          const resultText = winner === 'draw' ? 'Draw!' : `<@${result.winnerId}> wins!`;
          const embed = new EmbedBuilder()
            .setColor(winner === 'draw' ? 0x95A5A6 : 0x00FF00)
            .setTitle('Match Result')
            .setDescription(
              `<@${player1.discord_id}> **${score1}** - **${score2}** <@${player2.discord_id}>
              ${resultText}
              ${result.changeA > 0 ? '+' : ''}${result.changeA} Elo • ${result.changeB > 0 ? '+' : ''}${result.changeB} Elo`
            )
            .setTimestamp();
          await channel.send({ embeds: [embed] });
        }
      }

      res.json({
        success: true,
        elo_change1: result.changeA,
        elo_change2: result.changeB,
        winner: result.winnerId,
      });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(port, () => {
    console.log(`Webhook API listening on port ${port}`);
  });
}
