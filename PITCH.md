# Elo Bot — Pitch

## The Problem
Most competitive Roblox groups rely on manual Elo tracking or bots with **no real security**. Anyone can claim someone else's account. Match results can be faked. Leaderboards don't mean anything if the data isn't trusted.

## The Solution
**Elo Bot** — a Discord + Roblox integrated Elo system built on proper authentication.

### Key Features

**🔐 OAuth 2.0 Verification (Bloxlink-style)**
Users click a button in Discord → authorize via Roblox's official OAuth → automatically linked. No codes, no manual entry, no impersonation. **Only the actual Roblox account owner can claim their account.**

**⚔️ Match System**
- Best-of-5 format (first to 3 wins)
- Flat +5/-5 Elo
- Challenge proximity (20 Elo within tier, 10 across tiers)
- Rematch cooldown (once per day per opponent)
- Ducking/forfeit penalties

**🏆 Complete Player Ecosystem**
- Tier system: Aniki (50+), Kyōdai (25-49), Shatei (0-24)
- Win streaks, highest streak tracking
- Per-region leaderboards (EU/NA/Asia/Global) with auto-refresh
- Win rate %, daily fight counts
- Match history per player

**🤖 Discord Commands**
`/link` — OAuth verification | `/profile` — View any player's stats | `/leaderboard` — Top 10 | `/global` `/eu` `/na` `/asia` — Region leaderboards | `/matchlog` — Match history | `/rules` — Match rules | `/verify` — Check link status | `/help` — Command list

**🔄 Real-time Integration**
Match results from your Roblox game → webhook → Discord channel announcements with Elo changes, tier, streak, and region flags.

**🧪 Test/Simulation Panel**
Built-in Roblox test panel to run matches without real players — perfect for development and balance testing.

## Security Comparison

| Feature | Elo Bot | Typical Bots |
|---------|---------|--------------|
| Account linking | Roblox OAuth 2.0 | Manual code entry |
| Impersonation | Impossible | Anyone can claim |
| Match verification | Auth webhook | None |
| Auto-create players | Tracked via rbx_ prefix | N/A |

## Technical
- Hosted on Render (always online)
- Built with discord.js + Express
- Node:sqlite (no external deps)
- Public GitHub repo: https://github.com/lolkoek234-tech/EloBot
- Testing game: https://www.roblox.com/games/111407063201418/Unofficial-Gakuran-Competitive-Test

## Contact
https://discord.gg/pSm335EYJ
