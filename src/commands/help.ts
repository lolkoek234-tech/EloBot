import { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  async execute(interaction: any) {
    const container = new ContainerBuilder()
      .setAccentColor(0x2B2D31)
      .addTextDisplayComponents(td => td.setContent(
        '**/link** - Verify your Roblox account in-game to link it to Discord\n' +
        '**/profile** <roblox_username> - View Elo, record, and daily fights\n' +
        '**/leaderboard** - Global top 10\n' +
        '**/global** - Global leaderboard\n' +
        '**/eu** - Europe leaderboard\n' +
        '**/na** - North America leaderboard\n' +
        '**/asia** - Asia leaderboard\n' +
        '**/matchlog** <roblox_username> - Recent match history\n' +
        '**/rules** - Match rules and penalties\n' +
        '**/verify** - Check your linked Roblox account\n' +
        '**/help** - Show this message'
      ));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
