// Room and round state types for TugMind

export type RoomState =
  | "lobby"
  | "countdown"
  | "playing"
  | "round_reveal"
  | "paused"
  | "finished";

export type RoomMode = "accuracy_battle" | "speed_clash" | "parallel_tug";

export type RoundState =
  | "round_init"
  | "answering"
  | "locked"
  | "scored"
  | "revealed";

export interface QuestionPayload {
  id: string;
  prompt: string;
  choices: { a: string; b: string; c: string; d: string };
  correct?: string; // hidden until reveal
}

export interface TeamSnapshot {
  id: string;
  name: string;
  score: number;
  power: number;
}

export interface PlayerSnapshot {
  id: string;
  room_id: string;
  team_id: string | null;
  role: "teacher" | "player";
  display_name: string;
  is_ready: boolean;
  last_seen: string;
}

export interface RoundSnapshot {
  id: string;
  idx: number;
  state: RoundState;
  started_at: string | null;
  ended_at: string | null;
  question?: QuestionPayload;
}

export interface RoomSnapshot {
  id: string;
  code: string;
  state: RoomState;
  mode: RoomMode;
  rope_pos: number;
  current_round: number;
  time_limit: number;
  question_set_id: string | null;
  teams: TeamSnapshot[];
  players: PlayerSnapshot[];
  round?: RoundSnapshot | null;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  teamSize: number;
  correctCount: number;
  accuracy: number;
  speedBonus: number;
  power: number;
}
