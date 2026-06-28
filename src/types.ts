export interface Player {
  discord_id: string;
  roblox_id: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
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
  fought_at: string;
}

export interface DailyStats {
  discord_id: string;
  fight_date: string;
  fight_count: number;
}

export interface MatchResultInput {
  player1_roblox: string;
  player2_roblox: string;
  score1: number;
  score2: number;
}
