import { ContainerBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { getPlayerByDiscordId, getWinStreak, getHighestStreak, getPlayerRank, getDailyStats } from '../db/queries';
import { Player, getTier } from '../types';

export function buildProfileContainer(player: Player, discordId?: string): ContainerBuilder {
  const streak = getWinStreak(player.discord_id);
  const highestStreak = getHighestStreak(player.discord_id);
  const rank = getPlayerRank(player.discord_id);
  const today = new Date().toISOString().split('T')[0];
  const daily = getDailyStats(player.discord_id, today);
  const total = player.wins + player.losses;
  const wr = total > 0 ? (player.wins / total * 100).toFixed(1) : '0.0';
  const status = daily?.fight_count && daily.fight_count > 0 ? 'Active' : 'Idle';
  const mention = discordId ? `<@${discordId}>` : '';

  const container = new ContainerBuilder()
    .setAccentColor(0x2B2D31)
    .addTextDisplayComponents(td => td.setContent(
      `**${player.roblox_id}** — ${getTier(player.elo)}${mention ? `\n${mention}` : ''}`
    ))
    .addSeparatorComponents(sep => sep.setDivider(true))
    .addTextDisplayComponents(td => td.setContent(
      `ELO · ${player.elo}\nGlobal Rank · #${rank}\nRecord · ${player.wins}W / ${player.losses}L\nWin Rate · ${wr}%\nCurrent Streak · ${streak}\nHighest Streak · ${highestStreak}\nMatches Played · ${player.total_matches}\nStatus · ${status}`
    ));

  return container;
}

export const statsCommand = {
  data: {
    name: 'stats',
    description: 'Show your own Elo stats',
    toJSON() { return { name: this.name, description: this.description }; },
  },
  async execute(interaction: any) {
    const player = getPlayerByDiscordId(interaction.user.id);
    if (!player) {
      await interaction.reply({ content: 'You need to link your Roblox account first using `/link`.', ephemeral: true });
      return;
    }
    const container = buildProfileContainer(player, interaction.user.id);
    container.addActionRowComponents(row => row.setComponents(
      new ButtonBuilder().setCustomId('mystats').setLabel('My Stats').setStyle(ButtonStyle.Secondary)
    ));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
