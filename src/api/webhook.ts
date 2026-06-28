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
