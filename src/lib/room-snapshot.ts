import type { RoomSnapshot, TeamSnapshot, PlayerSnapshot, RoundSnapshot, QuestionPayload } from "@/types/room";

interface DbRoom {
  id: string;
  code: string;
  teacher_id: string | null;
  mode: string;
  state: string;
  rope_pos: number;
  current_round: number;
  time_limit: number;
  question_set_id: string | null;
}
interface DbTeam {
  id: string;
  room_id: string;
  name: string;
  score: number;
  power: number;
}
interface DbPlayer {
  id: string;
  room_id: string;
  team_id: string | null;
  role: string;
  display_name: string;
  is_ready: boolean;
  last_seen: string;
}
interface DbQuestion {
  id: string;
  prompt: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct: string;
  explanation: string | null;
}
interface DbRound {
  id: string;
  room_id: string;
  idx: number;
  question_id_A: string | null;
  question_id_B: string | null;
  started_at: string | null;
  ended_at: string | null;
  state: string;
}

export function buildRoomSnapshot(
  room: DbRoom,
  teams: DbTeam[],
  players: DbPlayer[],
  currentRound?: DbRound | null,
  question?: DbQuestion | null,
  includeCorrect = false
): RoomSnapshot {
  const teamSnapshots: TeamSnapshot[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    score: t.score,
    power: Number(t.power),
  }));
  const playerSnapshots: PlayerSnapshot[] = players.map((p) => ({
    id: p.id,
    room_id: p.room_id,
    team_id: p.team_id,
    role: p.role as "teacher" | "player",
    display_name: p.display_name,
    is_ready: p.is_ready,
    last_seen: p.last_seen,
  }));
  let roundSnapshot: RoundSnapshot | null = null;
  if (currentRound) {
    const qPayload: QuestionPayload | undefined = question
      ? {
          id: question.id,
          prompt: question.prompt,
          choices: { a: question.a, b: question.b, c: question.c, d: question.d },
          ...(includeCorrect ? { correct: question.correct } : {}),
        }
      : undefined;
    roundSnapshot = {
      id: currentRound.id,
      idx: currentRound.idx,
      state: currentRound.state as RoundSnapshot["state"],
      started_at: currentRound.started_at,
      ended_at: currentRound.ended_at,
      question: qPayload,
    };
  }
  return {
    id: room.id,
    code: room.code,
    state: room.state as RoomSnapshot["state"],
    mode: room.mode as RoomSnapshot["mode"],
    rope_pos: room.rope_pos,
    current_round: room.current_round,
    time_limit: room.time_limit,
    question_set_id: room.question_set_id,
    teams: teamSnapshots,
    players: playerSnapshots,
    round: roundSnapshot ?? undefined,
  };
}
