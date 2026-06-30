import { EmbedBuilder } from 'discord.js';
import { getTopPlayers, getTopPlayersByRegion, getWinStreak } from '../db/queries';

function regionFlag(region: string): string {
  switch (region) {
    case 'eu': return '\u{1F1EA}\u{1F1FA}';
    case 'na': return '\u{1F30E}';
    case 'asia': return '\u{1F30F}';
    case 'global': return '\u{1F30D}';
    default: return '\u{1F30D}';
  }
}

function regionLabel(region: string): string {
  switch (region) {
    case 'eu': return 'Europe';
    case 'na': return 'North America';
    case 'asia': return 'Asia';
    case 'global': return 'Global';
    default: return 'Global';
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

export async function showLeaderboard(interaction: any, filterRegion?: string): Promise<void> {
  const players = filterRegion
    ? getTopPlayersByRegion(filterRegion, 10)
    : getTopPlayers(10);

  if (players.length === 0) {
    await interaction.reply({ content: 'No players registered yet.', ephemeral: true });
    return;
  }

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const title = filterRegion ? `${regionLabel(filterRegion)} Leaderboard` : 'Global Leaderboard';
  const scope = filterRegion ? `Elo Bot | ${regionLabel(filterRegion)} | Top 10` : 'Elo Bot | All Regions | Top 10';

  const lines = players.map((p, i) => {
    const streak = getWinStreak(p.discord_id);
    if (filterRegion || p.region) {
      const flag = regionFlag(p.region || filterRegion || '');
      const code = regionCode(p.region || filterRegion || '');
      return `**#${i + 1}** ${flag} **${p.roblox_id}** | ${code}\nELO: **${p.elo}** | ${p.wins}W/${p.losses}L | Streak: ${streak}`;
    }
    return `**#${i + 1}** **${p.roblox_id}**\nELO: **${p.elo}** | ${p.wins}W/${p.losses}L | Streak: ${streak}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setDescription(`# ${title}\n${scope}\n___\n\n${lines.join('\n\n')}\n\nLast updated: ${formattedDate} at ${formattedTime}`);

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
