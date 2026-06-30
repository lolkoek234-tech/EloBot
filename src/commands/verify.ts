import { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { getPlayerByDiscordId } from '../db/queries';

export const verifyCommand = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Check your verification status'),
  async execute(interaction: any) {
    const player = getPlayerByDiscordId(interaction.user.id);

    const container = new ContainerBuilder()
      .setAccentColor(0x2B2D31)
      .addTextDisplayComponents(td => td.setContent(
        player
          ? `Linked to **${player.roblox_id}**`
          : 'Not linked. Use /link to connect your Roblox account.'
      ));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
  },
};
