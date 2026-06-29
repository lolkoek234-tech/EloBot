import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPlayerByDiscordId } from '../db/queries';

export const verifyCommand = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Check your verification status'),
  async execute(interaction: any) {
    const player = getPlayerByDiscordId(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(player
        ? `Linked to **${player.roblox_id}**`
        : 'Not linked. Use /link to connect your Roblox account.');

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
