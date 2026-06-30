import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getTopPlayers, getWinStreak } from '../db/queries';

function regionFlag(region: string): string {
  switch (region) {
    case 'eu': return '\u{1F1EA}\u{1F1FA}';
    case 'na': return '\u{1F30E}';
    case 'asia': return '\u{1F30F}';
    case 'global': return '\u{1F30D}';
    default: return '\u{1F30D}';
  }
}

function regionCode(region: string): string {
  switch (region) {
    case 'eu': return 'EU';
    case 'na': return 'NA';
    case 'asia': return 'ASIA';
    case 'global': return 'GLOBAL';
    default: return '';
  }
}

export const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show top players by Elo'),
  async execute(interaction: any) {
    const players = getTopPlayers(10);

    if (players.length === 0) {
      await interaction.reply({ content: 'No players registered yet.', ephemeral: true });
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const lines = players.map((p, i) => {
      const streak = getWinStreak(p.discord_id);
      const flag = regionFlag(p.region);
      const code = regionCode(p.region);
      const regionPart = code ? ` ${flag} **${p.roblox_id}** · ${code}` : ` **${p.roblox_id}**`;
      return `**#${i + 1}**${regionPart}\nELO: **${p.elo}** · ${p.wins}W/${p.losses}L · Streak: ${streak}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`# 🏆 Elo Bot Leaderboard\nElo Bot · All Regions · Top 10\n___\n\n${lines.join('\n\n')}\n\nLast updated: ${formattedDate} at ${formattedTime}`);

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
