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

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  return total > 0 ? (wins / total * 100).toFixed(1) : '0.0';
}

export async function showLeaderboard(interaction: any, filterRegion?: string): Promise<void> {
  const players = filterRegion
    ? getTopPlayersByRegion(filterRegion, 10)
    : getTopPlayers(10);

  if (players.length === 0) {
    await interaction.reply({ content: 'No players registered yet.', ephemeral: true });
    return;
  }

  const unix = Math.floor(Date.now() / 1000);

  const title = filterRegion ? `${regionLabel(filterRegion)} Leaderboard` : 'Global Leaderboard';
  const scope = filterRegion ? `Elo Bot | ${regionLabel(filterRegion)} | Top 10` : 'Elo Bot | All Regions | Top 10';

  const lines = players.map((p, i) => {
    const streak = getWinStreak(p.discord_id);
    const wr = winRate(p.wins, p.losses);
    if (filterRegion || p.region) {
      const flag = regionFlag(p.region || filterRegion || '');
      const code = regionCode(p.region || filterRegion || '');
      return `**#${i + 1}** ${flag} **${p.roblox_id}** | ${code}\n${p.elo} ELO | ${p.wins}W/${p.losses}L | ${wr}% WR | Streak ${streak} | ${p.total_matches} Matches`;
    }
    return `**#${i + 1}** **${p.roblox_id}**\n${p.elo} ELO | ${p.wins}W/${p.losses}L | ${wr}% WR | Streak ${streak} | ${p.total_matches} Matches`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setDescription(`# ${title}\n${scope}\n___\n\n${lines.join('\n\n')}\n\nUpdated: <t:${unix}:R>`);

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
