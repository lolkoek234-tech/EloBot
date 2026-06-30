import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { generateVerificationCode } from '../db/queries';

export const linkCommand = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Verify your Roblox account to link it to Discord'),
  async execute(interaction: any) {
    const code = generateVerificationCode(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`# Link Your Account
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

**Step 1:** Join the Elo Bot Roblox game
**Step 2:** Open the Verification panel and enter this code:

# \`${code}\`

**Step 3:** Type your Roblox username and press Verify

Your Discord account will be automatically linked and you will receive a role with your Roblox name.

-# Code expires in 5 minutes`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
