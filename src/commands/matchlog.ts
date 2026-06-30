import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getRecentMatches, getPlayerByRobloxId } from '../db/queries';

export const matchlogCommand = {
  data: new SlashCommandBuilder()
    .setName('matchlog')
    .setDescription('Show recent match history for a Roblox player')
    .addStringOption(option =>
      option.setName('roblox_username')
        .setDescription('Roblox username to look up')
        .setRequired(true)
    ),
  async execute(interaction: any) {
    const robloxUsername = interaction.options.getString('roblox_username', true);
    const player = getPlayerByRobloxId(robloxUsername);

    if (!player) {
      await interaction.reply({ content: `**${robloxUsername}** has no record yet.`, ephemeral: true });
      return;
    }

    const matches = getRecentMatches(player.discord_id, 10);

    if (matches.length === 0) {
      await interaction.reply({ content: `No matches found for **${robloxUsername}**.`, ephemeral: true });
      return;
    }

    const lines = matches.map((m, i) => {
      const isPlayer1 = m.player1_id === player.discord_id;
      const myScore = isPlayer1 ? m.score1 : m.score2;
      const oppScore = isPlayer1 ? m.score2 : m.score1;
      const eloChange = isPlayer1 ? m.elo_change1 : m.elo_change2;
      const result = myScore > oppScore ? 'Win' : myScore < oppScore ? 'Loss' : 'Draw';
      const sign = eloChange > 0 ? '+' : '';
      return `**#${i + 1}** **${result}** ${myScore}-${oppScore}\n-# ${sign}${eloChange} ELO`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(lines.join('\n\n'));

    const button = new ButtonBuilder()
      .setCustomId('mystats')
      .setLabel('My Stats')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
