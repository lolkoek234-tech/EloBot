import { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { getRecentMatches, getPlayerByRobloxId } from '../db/queries';
import { normalizeId } from '../db/schema';

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
    const player = getPlayerByRobloxId(normalizeId(robloxUsername));

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

    const container = new ContainerBuilder()
      .setAccentColor(0x2B2D31)
      .addTextDisplayComponents(td => td.setContent(lines.join('\n\n')))
      .addActionRowComponents(row => row.setComponents(
        new ButtonBuilder().setCustomId('mystats').setLabel('My Stats').setStyle(ButtonStyle.Secondary)
      ));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
