import { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';

export const rulesCommand = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Show match rules'),
  async execute(interaction: any) {
    const container = new ContainerBuilder()
      .setAccentColor(0x2B2D31)
      .addTextDisplayComponents(td => td.setContent('# Rules\nElo Bot'))
      .addSeparatorComponents(sep => sep.setDivider(true))
      .addTextDisplayComponents(td => td.setContent('**Match Format**\nBest-of-5 | First to 3 wins'))
      .addSeparatorComponents(sep => sep.setDivider(true))
      .addTextDisplayComponents(td => td.setContent('**Elo Changes**\nWin: **+5** ELO | Loss: **-5** ELO | Draw: **0** ELO'))
      .addSeparatorComponents(sep => sep.setDivider(true))
      .addTextDisplayComponents(td => td.setContent('**Tiers**\nAniki: **50+** ELO | Kyōdai: **25-49** ELO | Shatei: **0-24** ELO'))
      .addSeparatorComponents(sep => sep.setDivider(true))
      .addTextDisplayComponents(td => td.setContent('**Matchmaking**\nSame tier: within **20** ELO | Cross tier: within **10** ELO\nRematch: **once per day** per opponent'))
      .addSeparatorComponents(sep => sep.setDivider(true))
      .addTextDisplayComponents(td => td.setContent('**Penalties**\nDucking: **-10** ELO | Forfeit: **+5** winner, **-10** loser'));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
