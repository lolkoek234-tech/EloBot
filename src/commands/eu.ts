import { SlashCommandBuilder } from 'discord.js';
import { showLeaderboard } from './leaderboard';

export const euCommand = {
  data: new SlashCommandBuilder()
    .setName('eu')
    .setDescription('Show Europe leaderboard'),
  async execute(interaction: any) {
    await showLeaderboard(interaction, 'eu');
  },
};
