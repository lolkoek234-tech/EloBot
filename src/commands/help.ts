import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  async execute(interaction: any) {
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`/link <roblox_username> - Link your Discord to your Roblox account
/profile [@user] - View Elo, record, and daily fights
/leaderboard - Top 10 players by Elo
/matchlog [@user] - Recent match history
/verify - Check your linked Roblox account
/help - Show this message`);

    await interaction.reply({ embeds: [embed] });
  },
};
