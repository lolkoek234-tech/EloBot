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

    const lines = players.map((p, i) =>
      `**#${i + 1}** **${p.roblox_id}**\n-# ELO: **${p.elo}** · ${p.wins}W-${p.losses}L-${p.draws}D`
    );

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(lines.join('\n\n'));

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
