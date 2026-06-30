import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const divider = '___';

export const rulesCommand = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Show match rules'),
  async execute(interaction: any) {
    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`# Rules
Elo Bot
___

**Match Format**
Best-of-5 | First to 3 wins
${divider}

**Elo Changes**
Win: **+5** ELO | Loss: **-5** ELO | Draw: **0** ELO
${divider}

**Tiers**
Aniki: **50+** ELO | Kyōdai: **25-49** ELO | Shatei: **0-24** ELO
${divider}

**Matchmaking**
Same tier: within **20** ELO | Cross tier: within **10** ELO
Rematch: **once per day** per opponent
${divider}

**Penalties**
Ducking: **-10** ELO | Forfeit: **+5** winner, **-10** loser`);

    await interaction.reply({ embeds: [embed] });
  },
};
