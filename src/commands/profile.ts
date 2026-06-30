import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPlayerByRobloxId, getDailyStats } from '../db/queries';
import { getTier } from '../types';

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

    const today = new Date().toISOString().split('T')[0];
    const dailyStats = getDailyStats(player.discord_id, today);
    const fightsToday = dailyStats?.fight_count || 0;
    const tier = getTier(player.elo);

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`**${player.roblox_id}**
-# Tier: **${tier}** · ELO: **${player.elo}** · Record: **${player.wins}W-${player.losses}L-${player.draws}D** · Fights Today: **${fightsToday}**`);

    await interaction.reply({ embeds: [embed] });
  },
};
