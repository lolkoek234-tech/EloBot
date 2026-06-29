import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { linkPlayer, getPlayerByRobloxId } from '../db/queries';

export const linkCommand = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Roblox account to Discord')
    .addStringOption(option =>
      option.setName('roblox_username')
        .setDescription('Your Roblox username')
        .setRequired(true)
    ),
  async execute(interaction: any) {
    const robloxUsername = interaction.options.getString('roblox_username', true);

    const robloxRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!robloxRegex.test(robloxUsername)) {
      await interaction.reply({ content: 'Invalid Roblox username.', ephemeral: true });
      return;
    }

    const existing = getPlayerByRobloxId(robloxUsername);
    if (existing) {
      if (existing.discord_id === interaction.user.id) {
        await interaction.reply({ content: 'Already linked to your Discord.', ephemeral: true });
      } else if (!existing.discord_id.startsWith('rbx_')) {
        await interaction.reply({ content: 'Already linked to another Discord user.', ephemeral: true });
      }
      return;
    }

    linkPlayer(interaction.user.id, robloxUsername);

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`Linked to **${robloxUsername}**`);

    await interaction.reply({ embeds: [embed] });
  },
};
