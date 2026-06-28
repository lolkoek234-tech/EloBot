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
