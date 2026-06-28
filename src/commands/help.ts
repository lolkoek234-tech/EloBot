import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  async execute(interaction: any) {
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('Elo Bot Commands')
      .setDescription('Your Roblox PVP Elo tracking companion.')
      .addFields(
        { name: '/link <roblox_username>', value: 'Link your Discord to your Roblox account' },
        { name: '/profile [@user]', value: 'View Elo, wins/losses/draws, daily fights' },
        { name: '/leaderboard', value: 'Top 10 players by Elo' },
        { name: '/matchlog [@user]', value: 'View recent match history' },
        { name: '/help', value: 'Show this message' },
      )
      .setFooter({ text: 'First to 3 wins • Best of 5' });

    await interaction.reply({ embeds: [embed] });
  },
};
