import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  async execute(interaction: any) {
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`**/link** <roblox_username> - Link your Discord to your Roblox account
**/profile** <roblox_username> - View Elo, record, and daily fights
**/leaderboard** - Global top 10
**/global** - Global leaderboard
**/eu** - Europe leaderboard
**/na** - North America leaderboard
**/asia** - Asia leaderboard
**/matchlog** <roblox_username> - Recent match history
**/rules** - Match rules and penalties
**/verify** - Check your linked Roblox account
**/help** - Show this message`);

    await interaction.reply({ embeds: [embed] });
  },
};
