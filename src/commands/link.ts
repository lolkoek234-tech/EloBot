import { SlashCommandBuilder } from 'discord.js';
import { linkPlayer } from '../db/queries';

export const linkCommand = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your Roblox username')
    .addStringOption(option =>
      option.setName('roblox_username')
        .setDescription('Your Roblox username')
        .setRequired(true)
    ),
  async execute(interaction: any) {
    const robloxUsername = interaction.options.getString('roblox_username', true);
    const discordId = interaction.user.id;

    const robloxRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!robloxRegex.test(robloxUsername)) {
      await interaction.reply({ content: 'Invalid Roblox username. Must be 3-20 alphanumeric characters or underscores.', ephemeral: true });
      return;
    }

    linkPlayer(discordId, robloxUsername);
    await interaction.reply({ content: `Linked <@${discordId}> to Roblox user **${robloxUsername}**`, ephemeral: true });
  },
};
