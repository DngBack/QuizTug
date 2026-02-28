// Realtime event payloads (server → clients and client → server)

import type { QuestionPayload, RoomSnapshot, TeamStats } from "./room";

// Server → Clients (broadcast)
export interface RoomStatePayload {
  type: "ROOM_STATE";
  state: RoomSnapshot;
}

export interface PlayerListPayload {
  type: "PLAYER_LIST";
  players: RoomSnapshot["players"];
}

export interface RoundStartPayload {
  type: "ROUND_START";
  roundId: string;
  questionPayload: QuestionPayload;
  timeLimit: number;
  serverStartTs: number;
}

export interface AnswerAckPayload {
  type: "ANSWER_ACK";
  roundId: string;
  playerId: string;
  accepted: boolean;
  reason?: string;
}

export interface RoundLockPayload {
  type: "ROUND_LOCK";
  roundId: string;
}

export interface RoundResultPayload {
  type: "ROUND_RESULT";
  roundId: string;
  teamStats: TeamStats[];
  ropeDelta: number;
  ropePos: number;
}

export interface MatchEndPayload {
  type: "MATCH_END";
  winnerTeam: string | null;
  finalStats: { teams: TeamStats[]; ropePos: number };
}

export type BroadcastPayload =
  | RoomStatePayload
  | PlayerListPayload
  | RoundStartPayload
  | AnswerAckPayload
  | RoundLockPayload
  | RoundResultPayload
  | MatchEndPayload;

// Client → Server (via Server Actions, not broadcast)
export interface JoinRoomInput {
  code: string;
  displayName: string;
}

export interface SetTeamInput {
  roomCode: string;
  playerId: string;
  teamId: string;
}

export interface SubmitAnswerInput {
  roomCode: string;
  roundId: string;
  playerId: string;
  choice: string;
  clientTs: number;
}
