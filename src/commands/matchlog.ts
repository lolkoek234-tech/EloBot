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
