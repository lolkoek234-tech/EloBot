import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
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

export function buildLeaderboardData(filterRegion?: string): { components: any[]; flags: number } | null {
  const players = filterRegion
    ? getTopPlayersByRegion(filterRegion, 10)
    : getTopPlayers(10);

  if (players.length === 0) return null;

  const unix = Math.floor(Date.now() / 1000);

  const title = filterRegion ? `${regionLabel(filterRegion)} Leaderboard` : 'Global Leaderboard';
  const scope = filterRegion ? `Elo Bot | ${regionLabel(filterRegion)} | Top 10` : 'Elo Bot | All Regions | Top 10';

  const lines = players.map((p, i) => {
    const streak = getWinStreak(p.discord_id);
    const wr = winRate(p.wins, p.losses);
    const flag = regionFlag(p.region || filterRegion || '');
    const code = regionCode(p.region || filterRegion || '');
    const regionPart = code ? ` ${flag} **${p.roblox_id}** | ${code}` : ` **${p.roblox_id}**`;
    return `**#${i + 1}**${regionPart}\n${p.elo} ELO | ${p.wins}W/${p.losses}L | ${wr}% WR | Streak ${streak} | ${p.total_matches} Matches`;
  });

  const refreshId = filterRegion ? `refresh_${filterRegion}` : 'refresh';

  const container = new ContainerBuilder()
    .setAccentColor(0x2B2D31)
    .addTextDisplayComponents(td => td.setContent(`# ${title}\n${scope}`))
    .addSeparatorComponents(sep => sep.setDivider(true))
    .addTextDisplayComponents(td => td.setContent(lines.join('\n\n')))
    .addTextDisplayComponents(td => td.setContent(`-# Updated: <t:${unix}:R>`))
    .addSeparatorComponents(sep => sep.setDivider(true))
    .addActionRowComponents(row => row.setComponents(
      new ButtonBuilder().setCustomId('mystats').setLabel('My Stats').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(refreshId).setLabel('Refresh').setStyle(ButtonStyle.Secondary)
    ));

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export async function showLeaderboard(interaction: any, filterRegion?: string): Promise<void> {
  const data = buildLeaderboardData(filterRegion);
  if (!data) {
    await interaction.reply({ content: 'No players registered yet.', ephemeral: true });
    return;
  }

  const reply = await interaction.reply({
    components: data.components,
    flags: data.flags,
    fetchReply: true,
  });

  trackMessage(reply.channelId, reply.id, filterRegion);
}

interface TrackedMessage {
  channelId: string;
  messageId: string;
  region?: string;
}

const trackedMessages: TrackedMessage[] = [];

function trackMessage(channelId: string, messageId: string, region?: string): void {
  const existing = trackedMessages.findIndex(m => m.channelId === channelId && m.region === region);
  if (existing >= 0) {
    trackedMessages[existing].messageId = messageId;
  } else {
    trackedMessages.push({ channelId, messageId, region });
  }
}

export function getTrackedMessages(): TrackedMessage[] {
  return trackedMessages;
}

export { TrackedMessage };
