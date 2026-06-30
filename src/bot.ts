import { Client, GatewayIntentBits, REST, Routes, MessageFlags } from 'discord.js';
import { linkCommand } from './commands/link';
import { profileCommand } from './commands/profile';
import { leaderboardCommand } from './commands/leaderboard_cmd';
import { matchlogCommand } from './commands/matchlog';
import { helpCommand } from './commands/help';
import { verifyCommand } from './commands/verify';
import { globalCommand } from './commands/global';
import { euCommand } from './commands/eu';
import { naCommand } from './commands/na';
import { asiaCommand } from './commands/asia';
import { rulesCommand } from './commands/rules';
import { statsCommand } from './commands/stats';
import { buildLeaderboardData, getTrackedMessages } from './commands/leaderboard';
import { getPlayerByDiscordId } from './db/queries';
import { buildProfileContainer } from './commands/stats';

const commands = [
  linkCommand,
  profileCommand,
  leaderboardCommand,
  matchlogCommand,
  helpCommand,
  verifyCommand,
  globalCommand,
  euCommand,
  naCommand,
  asiaCommand,
  rulesCommand,
  statsCommand,
];

export async function startBot(token: string, clientId: string, guildId: string): Promise<Client> {
  const rest = new REST().setToken(token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands.map(c => c.data.toJSON()) },
    );
    console.log('Slash commands registered');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

  client.on('interactionCreate', async (interaction: any) => {
    if (interaction.isChatInputCommand()) {
      const commandMap: Record<string, (interaction: any) => Promise<void>> = {
        'link': linkCommand.execute,
        'profile': profileCommand.execute,
        'leaderboard': leaderboardCommand.execute,
        'matchlog': matchlogCommand.execute,
        'help': helpCommand.execute,
        'verify': verifyCommand.execute,
        'global': globalCommand.execute,
        'eu': euCommand.execute,
        'na': naCommand.execute,
        'asia': asiaCommand.execute,
        'rules': rulesCommand.execute,
        'stats': statsCommand.execute,
      };

      const handler = commandMap[interaction.commandName];
      if (handler) {
        try {
          await handler(interaction);
        } catch (error) {
          console.error(`Command ${interaction.commandName} error:`, error);
          await interaction.reply({ content: 'An error occurred.', ephemeral: true });
        }
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === 'mystats') {
      try {
        const player = getPlayerByDiscordId(interaction.user.id);
        if (!player) {
          await interaction.reply({ content: 'You need to link your Roblox account first using `/link`.', ephemeral: true });
          return;
        }

        const container = buildProfileContainer(player, interaction.user.id);
        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
      } catch (error) {
        console.error('My Stats button error:', error);
        await interaction.reply({ content: 'An error occurred.', ephemeral: true });
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith('refresh')) {
      try {
        const region = interaction.customId.startsWith('refresh_') ? interaction.customId.slice(8) : undefined;
        const data = buildLeaderboardData(region);
        if (!data) {
          await interaction.reply({ content: 'No data to refresh.', ephemeral: true });
          return;
        }
        await interaction.update({ components: data.components, flags: data.flags });
      } catch (error) {
        console.error('Refresh button error:', error);
        await interaction.reply({ content: 'An error occurred.', ephemeral: true });
      }
    }
  });

  await client.login(token);
  console.log(`Logged in as ${client.user?.tag}`);

  // auto-refresh leaderboard every hour
  setInterval(async () => {
    const tracked = getTrackedMessages();
    for (const msg of tracked) {
      try {
        const data = buildLeaderboardData(msg.region);
        if (!data) continue;
        const channel = await client.channels.fetch(msg.channelId);
        if (!channel?.isTextBased()) continue;
        const message = await channel.messages.fetch(msg.messageId);
        if (message) {
          await message.edit({ components: data.components, flags: data.flags });
        }
      } catch {
        // message deleted or channel gone, skip
      }
    }
  }, 3600000);

  return client;
}
