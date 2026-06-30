import { SlashCommandBuilder } from 'discord.js';
import { showLeaderboard } from './leaderboard';

export const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show global leaderboard'),
  async execute(interaction: any) {
    await showLeaderboard(interaction);
  },
};
