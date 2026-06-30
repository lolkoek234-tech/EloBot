import { SlashCommandBuilder } from 'discord.js';
import { showLeaderboard } from './leaderboard';

export const globalCommand = {
  data: new SlashCommandBuilder()
    .setName('global')
    .setDescription('Show global leaderboard'),
  async execute(interaction: any) {
    await showLeaderboard(interaction, 'global');
  },
};
