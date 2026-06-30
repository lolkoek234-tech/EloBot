import express from 'express';
import { Client, TextChannel, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import { getOrCreatePlayerByRobloxId, processMatch, getDailyStats, getWinStreak, getTopPlayers, getTopPlayersByRegion, consumeOAuthState, linkPlayer, getPlayerByRobloxId, upgradePlayerDiscordId } from '../db/queries';
import { normalizeId } from '../db/schema';
import { determineWinner } from '../elo';
import { MatchResultInput, Region, getTier } from '../types';

function getRegionChannels(): Record<string, string> {
  return {
    eu: process.env.CHANNEL_EU || '',
    na: process.env.CHANNEL_NA || '',
    asia: process.env.CHANNEL_ASIA || '',
    global: process.env.CHANNEL_GLOBAL || '',
  };
}

function regionFlag(region?: string): string {
  switch (region) {
    case 'eu': return '\u{1F1EA}\u{1F1FA}';
    case 'na': return '\u{1F30E}';
    case 'asia': return '\u{1F30F}';
    case 'global': return '\u{1F30D}';
    default: return '';
  }
}

const recentMatches = new Set<string>();

function matchKey(p1: string, p2: string, s1: number, s2: number): string {
  return `${p1}:${p2}:${s1}:${s2}`;
}

export function startApi(client: Client, port: number): void {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  setInterval(() => recentMatches.clear(), 10000);

  app.get('/api/leaderboard', (req, res) => {
    try {
      const region = req.query.region as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const players = region ? getTopPlayersByRegion(region, limit) : getTopPlayers(limit);
      res.json({
        players: players.map(p => ({
          roblox_id: p.roblox_id,
          elo: p.elo,
          wins: p.wins,
          losses: p.losses,
          total_matches: p.total_matches,
          region: p.region,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/match-result', async (req, res) => {
    try {
      const secret = process.env.WEBHOOK_SECRET || '';
      const auth = req.headers['authorization'];
      if (secret && auth !== `Bearer ${secret}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { score1, score2, region } = req.body as MatchResultInput;
      const player1_roblox = normalizeId(req.body.player1_roblox || '');
      const player2_roblox = normalizeId(req.body.player2_roblox || '');

      if (!player1_roblox || !player2_roblox || typeof score1 !== 'number' || typeof score2 !== 'number') {
        res.status(400).json({ error: 'Missing or invalid required fields' });
        return;
      }

      if (score1 < 0 || score2 < 0 || score1 > 5 || score2 > 5) {
        res.status(400).json({ error: 'Invalid scores (must be 0-5)' });
        return;
      }

      if (player1_roblox.toLowerCase() === player2_roblox.toLowerCase()) {
        res.status(400).json({ error: 'Players must have different names' });
        return;
      }

      const key = matchKey(player1_roblox.toLowerCase(), player2_roblox.toLowerCase(), score1, score2);
      if (recentMatches.has(key)) {
        res.json({ success: true, duplicate: true });
        return;
      }
      recentMatches.add(key);

      const player1 = getOrCreatePlayerByRobloxId(player1_roblox);
      const player2 = getOrCreatePlayerByRobloxId(player2_roblox);

      const result = processMatch(player1.discord_id, player2.discord_id, player1.elo, player2.elo, score1, score2, region || '');
      const winner = determineWinner(score1, score2);

      const p1 = getOrCreatePlayerByRobloxId(player1_roblox);
      const p2 = getOrCreatePlayerByRobloxId(player2_roblox);

      const channels = getRegionChannels();
      const channelId = channels[region as Region] || channels.global || '';
      if (channelId) {
        const guild = client.guilds.cache.get(process.env.GUILD_ID || '');
        const channel = guild?.channels.cache.get(channelId) || await guild?.channels.fetch(channelId).catch(() => null);
        if (channel instanceof TextChannel) {
          const today = new Date().toISOString().split('T')[0];
          const p1Daily = getDailyStats(p1.discord_id, today);
          const p2Daily = getDailyStats(p2.discord_id, today);

          const p1Total = p1.wins + p1.losses;
          const p2Total = p2.wins + p2.losses;
          const p1Wr = p1Total > 0 ? (p1.wins / p1Total * 100).toFixed(1) : '0.0';
          const p2Wr = p2Total > 0 ? (p2.wins / p2Total * 100).toFixed(1) : '0.0';
          const p1Streak = getWinStreak(p1.discord_id);
          const p2Streak = getWinStreak(p2.discord_id);

          const p1Label = winner === 'player1' ? 'WINNER' : winner === 'draw' ? 'DRAW' : 'LOSER';
          const p2Label = winner === 'player2' ? 'WINNER' : winner === 'draw' ? 'DRAW' : 'LOSER';

          const p1Tier = getTier(result.newEloA);
          const p2Tier = getTier(result.newEloB);

          const flag = regionFlag(region);

          const container = new ContainerBuilder()
            .setAccentColor(0x2B2D31)
            .addTextDisplayComponents(td => td.setContent(
              `${flag} **${p1.roblox_id}** ${p1Label}\n${result.newEloA} ELO | ${p1Tier} | ${p1.wins}W/${p1.losses}L | ${p1Wr}% WR | Streak ${p1Streak} | Fights Today: ${p1Daily?.fight_count || 1} | Scoreboard: ${score1}-${score2}\n-# Opponent: ${p2.roblox_id}`
            ))
            .addSeparatorComponents(sep => sep.setDivider(true))
            .addTextDisplayComponents(td => td.setContent(
              `${flag} **${p2.roblox_id}** ${p2Label}\n${result.newEloB} ELO | ${p2Tier} | ${p2.wins}W/${p2.losses}L | ${p2Wr}% WR | Streak ${p2Streak} | Fights Today: ${p2Daily?.fight_count || 1} | Scoreboard: ${score2}-${score1}\n-# Opponent: ${p1.roblox_id}`
            ));

          await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
        }
      }

      res.json({
        success: true,
        elo_change1: result.changeA,
        elo_change2: result.changeB,
        winner: result.winnerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Webhook error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/oauth/callback', async (req, res) => {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      if (!code || !state) {
        res.status(400).send(pageHtml('Error', 'Missing code or state parameter. Please run /link again.'));
        return;
      }

      const discordId = consumeOAuthState(state);
      if (!discordId) {
        res.status(400).send(pageHtml('Error', 'This link has expired. Please run /link again in Discord.'));
        return;
      }

      const clientId = process.env.ROBLOX_OAUTH_CLIENT_ID || '';
      const clientSecret = process.env.ROBLOX_OAUTH_CLIENT_SECRET || '';
      const redirectUri = process.env.REDIRECT_URI || `https://${req.get('host')}/api/oauth/callback`;

      const tokenBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch('https://apis.roblox.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Token exchange failed:', errText);
        res.status(500).send(pageHtml('Error', 'Failed to verify with Roblox. Please try running /link again.'));
        return;
      }
      const tokenData = await tokenRes.json() as { access_token: string };

      const userinfoRes = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!userinfoRes.ok) {
        const errText = await userinfoRes.text();
        console.error('Userinfo fetch failed:', errText);
        res.status(500).send(pageHtml('Error', 'Failed to get Roblox user info. Please try running /link again.'));
        return;
      }
      const userinfo = await userinfoRes.json() as { sub: string; preferred_username?: string; nickname?: string; name?: string };
      const roblox_id = normalizeId(userinfo.preferred_username || userinfo.nickname || userinfo.name || `User_${userinfo.sub}`);

      const robloxRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!robloxRegex.test(roblox_id)) {
        console.error(`Invalid roblox_id from OAuth: ${roblox_id}`);
        res.status(500).send(pageHtml('Error', 'Invalid Roblox profile. Please try running /link again.'));
        return;
      }

      const existingByRoblox = getPlayerByRobloxId(roblox_id);
      if (existingByRoblox && !existingByRoblox.discord_id.startsWith('rbx_') && existingByRoblox.discord_id !== discordId) {
        res.status(400).send(pageHtml('Error', 'This Roblox account is already linked to another Discord user.'));
        return;
      }

      if (existingByRoblox && existingByRoblox.discord_id === discordId) {
        res.send(successHtml(roblox_id));
        return;
      }

      if (existingByRoblox && existingByRoblox.discord_id.startsWith('rbx_')) {
        upgradePlayerDiscordId(existingByRoblox.discord_id, discordId, roblox_id);
      } else {
        linkPlayer(discordId, roblox_id);
      }

      const guildId = process.env.GUILD_ID;
      let isOwner = false;
      if (!guildId) {
        console.error('GUILD_ID not set, skipping role/nickname');
      } else {
        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch((e: any) => { console.error('Guild fetch failed:', e.message); return null; });
        if (guild) {
          try {
            const member = await guild.members.fetch(discordId);
            isOwner = member.id === guild.ownerId;

            // set nickname (skipped for server owner — Discord restriction)
            if (isOwner) {
              console.log(`Skipping nickname for server owner ${discordId}`);
            } else {
              await member.setNickname(roblox_id);
              console.log(`Nickname set to ${roblox_id} for ${discordId}`);
            }
          } catch (roleErr: any) {
            console.error('Nickname/role error:', roleErr.message);
          }
        }
      }

      try {
        const user = await client.users.fetch(discordId);
        const dmNote = isOwner ? '\n\n> **Note:** You are the server owner, so I cannot change your nickname automatically. Please set it manually to your Roblox username in Server Settings.' : '';
        const dmBody = `Your Discord has been linked to **${roblox_id}**.\n\nYou can go back to Discord now.${dmNote}`;
        const dmContainer = new ContainerBuilder()
          .setAccentColor(0x2B2D31)
          .addTextDisplayComponents(td => td.setContent(`# You're Verified!`))
          .addSeparatorComponents(sep => sep.setDivider(true))
          .addTextDisplayComponents(td => td.setContent(dmBody));
        await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      } catch {
        // DM fails if user has DMs closed, that's fine
      }

      res.send(successHtml(roblox_id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('OAuth callback error:', message);
      res.status(500).send(pageHtml('Error', message));
    }
  });

  function pageHtml(title: string, body: string, isSuccess?: boolean): string {
    const icon = isSuccess
      ? '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" style="margin-bottom:1.5rem;display:block;margin-left:auto;margin-right:auto"><circle cx="28" cy="28" r="28" fill="#23A55A"/><path d="M16 28.5l8 8L40 20" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '';
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*,:after,:before{box-sizing:border-box;margin:0;padding:0}body{background:#313338;color:#DBDEE1;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:1.5rem;line-height:1.5}.card{background:#2B2D31;border:1px solid #3F4147;border-radius:8px;padding:2rem 2.5rem;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3)}h1{font-size:1.35rem;font-weight:600;color:#F2F3F5;margin-bottom:.35rem}p{color:#9B9DA2;font-size:.9rem;margin-bottom:1.5rem}a{color:#00A8FC;text-decoration:none;font-size:.85rem}a:hover{text-decoration:underline}.legal{margin-top:.5rem;padding-top:1rem;border-top:1px solid #3F4147;display:flex;justify-content:center;gap:1.25rem}</style></head><body><div class="card">${icon}<h1>${title}</h1><p>${body}</p></div></body></html>`;
  }

  function successHtml(roblox_id: string): string {
    return pageHtml('Verified!', `Your Discord account is now linked to <strong>${roblox_id}</strong>.<br><br>You can close this tab and return to Discord.`, true);
  }

  app.get('/privacy', (_req, res) => res.send(pageHtml('Privacy Policy', 'Elo Bot stores only the data required for Discord and Roblox integration — match results, Elo ratings, and linked account IDs. No data is shared with third parties. You can request data deletion at any time.')));
  app.get('/terms', (_req, res) => res.send(pageHtml('Terms of Service', 'By using Elo Bot, you agree to use it only for its intended purpose of Elo-based PVP matchmaking. Abuse of the bot, its API, or the linked Roblox game may result in a permanent ban. This service is provided as-is without warranty.')));

  app.listen(port, () => {
    console.log(`Webhook API listening on port ${port}`);
  });
}
