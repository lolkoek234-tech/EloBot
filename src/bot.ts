import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
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

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

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
  });

  await client.login(token);
  console.log(`Logged in as ${client.user?.tag}`);
  return client;
}
