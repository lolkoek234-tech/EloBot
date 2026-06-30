export interface Player {
  discord_id: string;
  roblox_id: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  region: string;
  created_at: string;
}

export interface Match {
  id: number;
  player1_id: string;
  player2_id: string;
  score1: number;
  score2: number;
  winner_id: string | null;
  elo_change1: number;
  elo_change2: number;
  region: string;
  fought_at: string;
}

export interface DailyStats {
  discord_id: string;
  fight_date: string;
  fight_count: number;
}

export type Tier = 'Aniki' | 'Kyōdai' | 'Shatei';

export const TIER_BOUNDARIES = [
  { name: 'Aniki' as Tier, min: 50 },
  { name: 'Kyōdai' as Tier, min: 25 },
  { name: 'Shatei' as Tier, min: 0 },
];

export function getTier(elo: number): Tier {
  for (const t of TIER_BOUNDARIES) {
    if (elo >= t.min) return t.name;
  }
  return 'Shatei';
}

export type Region = 'eu' | 'na' | 'asia' | 'global';

export interface MatchResultInput {
  player1_roblox: string;
  player2_roblox: string;
  score1: number;
  score2: number;
  region?: Region;
}
