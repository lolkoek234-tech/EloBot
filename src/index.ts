import dotenv from 'dotenv';
dotenv.config();

import { startBot } from './bot';
import { startApi } from './api/webhook';

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;
const webhookPort = parseInt(process.env.WEBHOOK_PORT || '3000', 10);

if (!token || !clientId || !guildId) {
  console.error('Missing required env vars: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, GUILD_ID');
  process.exit(1);
}

async function main() {
  const client = await startBot(token!, clientId!, guildId!);
  startApi(client, webhookPort);
}

main().catch(console.error);
