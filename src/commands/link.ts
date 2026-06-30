import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`# Link Your Account
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

Click the link below to verify with Roblox:

${url}

Roblox will ask you to confirm — just click **Authorize**.

You'll get a DM here when you're verified.`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
