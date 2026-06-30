import { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { getPlayerByDiscordId, getPlayerByRobloxId } from '../db/queries';
import { buildProfileContainer } from './stats';

export const profileCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show a player\'s stats by Discord user or Roblox username')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Discord user to look up')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('roblox_username')
        .setDescription('Roblox username to look up')
        .setRequired(false)),
  async execute(interaction: any) {
    const targetUser = interaction.options.getUser('user');
    const robloxUsername = interaction.options.getString('roblox_username');

    let player;
    let displayId: string | undefined;

    if (targetUser) {
      player = getPlayerByDiscordId(targetUser.id);
      displayId = targetUser.id;
    } else if (robloxUsername) {
      player = getPlayerByRobloxId(robloxUsername);
    } else {
      player = getPlayerByDiscordId(interaction.user.id);
      displayId = interaction.user.id;
    }

    if (!player) {
      const label = targetUser ? 'That user' : robloxUsername ? `**${robloxUsername}**` : 'You';
      await interaction.reply({ content: `${label} has no record yet.`, ephemeral: true });
      return;
    }

    const container = buildProfileContainer(player, displayId);
    container.addActionRowComponents(row => row.setComponents(
      new ButtonBuilder().setCustomId('mystats').setLabel('My Stats').setStyle(ButtonStyle.Secondary)
    ));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
