"use server";

import { createClient } from "@/lib/supabase/server";
import type { RoomSnapshot } from "@/types/room";

export async function submitAnswer(
  roomCode: string,
  roundId: string,
  playerId: string,
  choice: string,
  _clientTs: number
): Promise<{ ok: boolean; snapshot?: RoomSnapshot; accepted?: boolean; reason?: string; isCorrect?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode.toUpperCase()).single();
  if (!room) return { ok: false, error: "Room not found" };
  if (room.state !== "playing") return { ok: false, accepted: false, reason: "Game not in progress" };

  const { data: round } = await supabase.from("rounds").select("*").eq("id", roundId).eq("room_id", room.id).single();
  if (!round) return { ok: false, accepted: false, reason: "Round not found" };
  if (round.state !== "answering") return { ok: false, accepted: false, reason: "Round locked" };

  const { data: existing } = await supabase.from("answers").select("id").eq("round_id", roundId).eq("player_id", playerId).maybeSingle();
  if (existing) return { ok: false, accepted: false, reason: "Already answered" };

  const questionId = round.question_id_A ?? round.question_id_B;
  if (!questionId) return { ok: false, accepted: false, reason: "No question" };
  const { data: question } = await supabase.from("questions").select("correct").eq("id", questionId).single();
  if (!question) return { ok: false, accepted: false, reason: "Question not found" };

  const isCorrect = choice === question.correct;
  const startedAt = round.started_at ? new Date(round.started_at).getTime() : Date.now();
  const rtMs = Math.max(0, Date.now() - startedAt);

  const { data: player } = await supabase.from("players").select("team_id").eq("id", playerId).single();
  if (!player?.team_id) return { ok: false, accepted: false, reason: "Not in a team" };

  const { error: insertErr } = await supabase.from("answers").insert({
    round_id: roundId,
    player_id: playerId,
    team_id: player.team_id,
    choice,
    is_correct: isCorrect,
    rt_ms: rtMs,
  });
  if (insertErr) return { ok: false, accepted: false, reason: insertErr.message };

  const { getRoomSnapshot } = await import("@/app/actions/room");
  const snap = await getRoomSnapshot(roomCode);
  return { ok: true, accepted: true, isCorrect, snapshot: snap.snapshot };
}
