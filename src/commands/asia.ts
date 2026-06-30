import { SlashCommandBuilder } from 'discord.js';
import { showLeaderboard } from './leaderboard';

export const asiaCommand = {
  data: new SlashCommandBuilder()
    .setName('asia')
    .setDescription('Show Asia leaderboard'),
  async execute(interaction: any) {
    await showLeaderboard(interaction, 'asia');
  },
};
