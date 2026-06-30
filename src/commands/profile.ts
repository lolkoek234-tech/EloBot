import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPlayerByRobloxId, getDailyStats, getWinStreak } from '../db/queries';
import { getTier } from '../types';

const divider = '⎯'.repeat(28);

export const profileCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show a player stats by Roblox username')
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

    const streak = getWinStreak(player.discord_id);
    const total = player.wins + player.losses;
    const wr = total > 0 ? (player.wins / total * 100).toFixed(1) : '0.0';
    const unix = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`**${player.roblox_id}** | ${getTier(player.elo)}
${divider}
${player.elo} ELO | ${player.wins}W/${player.losses}L | ${wr}% WR | Streak ${streak} | ${player.total_matches} Matches
${divider}
Updated: <t:${unix}:R>`);

    await interaction.reply({ embeds: [embed] });
  },
};
