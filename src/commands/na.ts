import { SlashCommandBuilder } from 'discord.js';
import { showLeaderboard } from './leaderboard';

export const naCommand = {
  data: new SlashCommandBuilder()
    .setName('na')
    .setDescription('Show North America leaderboard'),
  async execute(interaction: any) {
    await showLeaderboard(interaction, 'na');
  },
};
