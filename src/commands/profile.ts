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
