"use server";

import { createClient } from "@/lib/supabase/server";
import { computeTeamPower, computeRopeDelta, clampRopePos, isMatchOver } from "@/lib/scoring";
import type { RoomSnapshot } from "@/types/room";
import type { TeamStats } from "@/types/room";

export async function startMatch(
  roomCode: string
): Promise<{ ok: boolean; snapshot?: RoomSnapshot; serverStartTs?: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode.toUpperCase()).single();
  if (!room) return { ok: false, error: "Room not found" };
  if (room.teacher_id !== user?.id) return { ok: false, error: "Only teacher can start" };
  if (room.state !== "lobby") return { ok: false, error: "Invalid state" };

  await supabase.from("rooms").update({ state: "countdown" }).eq("id", room.id);
  await supabase.from("rooms").update({ state: "playing" }).eq("id", room.id);

  const { data: questionSet } = await supabase
    .from("question_sets")
    .select("id")
    .eq("id", room.question_set_id)
    .single();
  const firstQuestionId = questionSet
    ? (await supabase.from("questions").select("id").eq("question_set_id", questionSet.id).order("order").limit(1).single()).data?.id
    : null;
  if (!firstQuestionId) return { ok: false, error: "No questions in set" };

  const { data: newRound } = await supabase
    .from("rounds")
    .insert({
      room_id: room.id,
      idx: 1,
      question_id_A: firstQuestionId,
      question_id_B: null,
      state: "answering",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (!newRound) return { ok: false, error: "Failed to create round" };

  await supabase.from("rooms").update({ current_round: 1 }).eq("id", room.id);
  const { getRoomSnapshot } = await import("@/app/actions/room");
  const result = await getRoomSnapshot(roomCode);
  return { ok: true, snapshot: result.snapshot, serverStartTs: Date.now() };
}

export async function endRound(
  roomCode: string
): Promise<{ ok: boolean; snapshot?: RoomSnapshot; ropeDelta?: number; ropePos?: number; teamStats?: TeamStats[]; matchOver?: boolean; winnerTeam?: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode.toUpperCase()).single();
  if (!room) return { ok: false, error: "Room not found" };
  if (room.teacher_id !== user?.id) return { ok: false, error: "Only teacher can end round" };
  if (room.state !== "playing") return { ok: false, error: "Invalid state" };

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", room.id)
    .eq("idx", room.current_round)
    .single();
  if (!round || round.state !== "answering") return { ok: false, error: "No active round" };

  await supabase.from("rounds").update({ state: "locked", ended_at: new Date().toISOString() }).eq("id", round.id);

  const { data: answers } = await supabase.from("answers").select("team_id, is_correct, rt_ms").eq("round_id", round.id);
  const { data: players } = await supabase.from("players").select("id, team_id").eq("room_id", room.id);
  const { data: teams } = await supabase.from("teams").select("*").eq("room_id", room.id);
  const timeLimitMs = room.time_limit * 1000;

  const teamIds = (teams ?? []).map((t) => t.id);
  const teamSizes: Record<string, number> = {};
  teamIds.forEach((id) => {
    teamSizes[id] = (players ?? []).filter((p) => p.team_id === id).length;
  });

  const stats: TeamStats[] = [];
  let powerA = 0,
    powerB = 0;
  for (const t of teams ?? []) {
    const teamAnswers = (answers ?? []).filter((a) => a.team_id === t.id).map((a) => ({ is_correct: a.is_correct, rt_ms: a.rt_ms }));
    const size = teamSizes[t.id] ?? 0;
    const power = computeTeamPower(teamAnswers, size, timeLimitMs);
    if (t.name === "A") powerA = power;
    else powerB = power;
    const correctCount = teamAnswers.filter((a) => a.is_correct).length;
    const correctAnswers = teamAnswers.filter((a) => a.is_correct);
    const speedBonus =
      correctAnswers.length > 0
        ? correctAnswers.reduce((s, a) => s + Math.max(0, 1 - a.rt_ms / timeLimitMs), 0) / correctAnswers.length
        : 0;
    stats.push({
      teamId: t.id,
      teamName: t.name,
      teamSize: size,
      correctCount,
      accuracy: size > 0 ? correctCount / size : 0,
      speedBonus,
      power,
    });
  }

  const ropeDelta = computeRopeDelta(powerA, powerB);
  const newRopePos = clampRopePos(room.rope_pos + ropeDelta);
  await supabase.from("rooms").update({ rope_pos: newRopePos }).eq("id", room.id);
  for (const s of stats) {
    await supabase.from("teams").update({ power: s.power }).eq("id", s.teamId);
  }
  await supabase.from("rounds").update({ state: "scored" }).eq("id", round.id);
  await supabase.from("rounds").update({ state: "revealed" }).eq("id", round.id);

  let matchOver = false;
  let winnerTeam: string | null = null;
  if (isMatchOver(newRopePos)) {
    matchOver = true;
    winnerTeam = newRopePos >= 100 ? (teams?.find((t) => t.name === "A")?.id ?? null) : (teams?.find((t) => t.name === "B")?.id ?? null);
    await supabase.from("rooms").update({ state: "finished" }).eq("id", room.id);
  } else {
    await supabase.from("rooms").update({ state: "round_reveal" }).eq("id", room.id);
  }

  const { getRoomSnapshot } = await import("@/app/actions/room");
  const snapshotResult = await getRoomSnapshot(roomCode);
  return {
    ok: true,
    snapshot: snapshotResult.snapshot,
    ropeDelta,
    ropePos: newRopePos,
    teamStats: stats,
    matchOver,
    winnerTeam,
  };
}

export async function nextRound(
  roomCode: string
): Promise<{ ok: boolean; snapshot?: RoomSnapshot; serverStartTs?: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode.toUpperCase()).single();
  if (!room) return { ok: false, error: "Room not found" };
  if (room.teacher_id !== user?.id) return { ok: false, error: "Only teacher" };
  if (room.state !== "round_reveal") return { ok: false, error: "Invalid state" };

  const nextIdx = room.current_round + 1;
  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("question_set_id", room.question_set_id!)
    .order("order")
    .range((nextIdx - 1) * 1, nextIdx * 1 - 1);
  const nextQ = questions?.[0];
  if (!nextQ) return { ok: false, error: "No more questions" };

  const { data: newRound } = await supabase
    .from("rounds")
    .insert({
      room_id: room.id,
      idx: nextIdx,
      question_id_A: nextQ.id,
      question_id_B: null,
      state: "answering",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (!newRound) return { ok: false, error: "Failed to create round" };

  await supabase.from("rooms").update({ current_round: nextIdx, state: "playing" }).eq("id", room.id);
  const { getRoomSnapshot } = await import("@/app/actions/room");
  const result = await getRoomSnapshot(roomCode);
  return { ok: true, snapshot: result.snapshot, serverStartTs: Date.now() };
}
