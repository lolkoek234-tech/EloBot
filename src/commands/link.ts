import { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createOAuthState } from '../db/queries';
import crypto from 'crypto';

function buildAuthorizeUrl(state: string): string {
  const clientId = process.env.ROBLOX_OAUTH_CLIENT_ID || '';
  const redirectUri = process.env.REDIRECT_URI || 'https://elobot-x1h2.onrender.com/api/oauth/callback';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile',
    response_type: 'code',
    state,
  });
  return `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}`;
}

export const linkCommand = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Verify your Roblox account to link it to Discord'),
  async execute(interaction: any) {
    const state = crypto.randomBytes(32).toString('hex');
    createOAuthState(state, interaction.user.id);

    const url = buildAuthorizeUrl(state);

    const container = new ContainerBuilder()
      .setAccentColor(0x2B2D31)
      .addTextDisplayComponents(td => td.setContent(`# Link Your Account`))
      .addSeparatorComponents(sep => sep.setDivider(true))
      .addTextDisplayComponents(td => td.setContent('Roblox will ask you to confirm — click the button below and hit **Authorize**.'))
      .addTextDisplayComponents(td => td.setContent("You'll get a DM here when you're verified."))
      .addSeparatorComponents(sep => sep.setDivider(true))
      .addActionRowComponents(row => row.setComponents(
        new ButtonBuilder().setLabel('Verify with Roblox').setURL(url).setStyle(ButtonStyle.Link)
      ));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
  },
};
