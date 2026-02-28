"use server";

import { createClient } from "@/lib/supabase/server";
import { buildRoomSnapshot } from "@/lib/room-snapshot";
import type { RoomSnapshot } from "@/types/room";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createRoom(
  mode: "accuracy_battle" | "speed_clash" | "parallel_tug" = "accuracy_battle",
  timeLimit = 10,
  questionSetId?: string | null
): Promise<{ ok: boolean; code?: string; snapshot?: RoomSnapshot; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Must be signed in to create a room" };

  let code: string;
  let attempts = 0;
  do {
    code = generateRoomCode();
    const { data: existing } = await supabase.from("rooms").select("id").eq("code", code).single();
    if (!existing) break;
    attempts++;
  } while (attempts < 10);
  if (attempts >= 10) return { ok: false, error: "Could not generate unique code" };

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .insert({
      code,
      teacher_id: user.id,
      mode,
      time_limit: timeLimit,
      question_set_id: questionSetId || null,
    })
    .select()
    .single();
  if (roomErr || !room) return { ok: false, error: roomErr?.message ?? "Failed to create room" };

  const { error: teamAErr } = await supabase.from("teams").insert({ room_id: room.id, name: "A" });
  const { error: teamBErr } = await supabase.from("teams").insert({ room_id: room.id, name: "B" });
  if (teamAErr || teamBErr) return { ok: false, error: teamAErr?.message ?? teamBErr?.message };

  const { data: teams } = await supabase.from("teams").select("*").eq("room_id", room.id);
  const { data: players } = await supabase.from("players").select("*").eq("room_id", room.id);
  const snapshot = buildRoomSnapshot(room, teams ?? [], players ?? []);
  return { ok: true, code, snapshot };
}

export async function getRoomSnapshot(code: string): Promise<{ ok: boolean; snapshot?: RoomSnapshot; error?: string }> {
  const supabase = await createClient();
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();
  if (roomErr || !room) return { ok: false, error: roomErr?.message ?? "Room not found" };

  const { data: teams } = await supabase.from("teams").select("*").eq("room_id", room.id);
  const { data: players } = await supabase.from("players").select("*").eq("room_id", room.id);
  let currentRound = null;
  let question = null;
  if (room.current_round > 0) {
    const { data: roundRow } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", room.id)
      .eq("idx", room.current_round)
      .single();
    currentRound = roundRow ?? null;
    const qId = currentRound?.question_id_A ?? currentRound?.question_id_B;
    if (qId) {
      const { data: qRow } = await supabase.from("questions").select("*").eq("id", qId).single();
      question = qRow ?? null;
    }
  }
  const snapshot = buildRoomSnapshot(
    room,
    teams ?? [],
    players ?? [],
    currentRound,
    question,
    room.state === "round_reveal" || room.state === "finished"
  );
  return { ok: true, snapshot };
}

export async function joinRoom(
  code: string,
  displayName: string
): Promise<{ ok: boolean; snapshot?: RoomSnapshot; playerId?: string; error?: string }> {
  const supabase = await createClient();
  const normalizedCode = code.toUpperCase().trim();
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalizedCode)
    .single();
  if (roomErr || !room) return { ok: false, error: "Room not found" };
  if (room.state !== "lobby" && room.state !== "countdown")
    return { ok: false, error: "Game already started" };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: teams } = await supabase.from("teams").select("*").eq("room_id", room.id);
  let existingPlayer: { id: string } | null = null;
  if (user?.id) {
    const r = await supabase.from("players").select("id").eq("room_id", room.id).eq("user_id", user.id).maybeSingle();
    existingPlayer = r.data;
  }
  if (!existingPlayer) {
    const r = await supabase.from("players").select("id").eq("room_id", room.id).eq("display_name", displayName).maybeSingle();
    existingPlayer = r.data;
  }

  let playerId: string;
  if (existingPlayer) {
    await supabase
      .from("players")
      .update({ display_name: displayName, last_seen: new Date().toISOString(), user_id: user?.id ?? null })
      .eq("id", existingPlayer.id);
    playerId = existingPlayer.id;
  } else {
    const { data: newPlayer, error: insertErr } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        role: "player",
        display_name: displayName,
        user_id: user?.id ?? null,
      })
      .select("id")
      .single();
    if (insertErr || !newPlayer) return { ok: false, error: insertErr?.message ?? "Failed to join" };
    playerId = newPlayer.id;
  }

  const { data: players } = await supabase.from("players").select("*").eq("room_id", room.id);
  const snapshot = buildRoomSnapshot(room, teams ?? [], players ?? []);
  return { ok: true, snapshot, playerId };
}

export async function setTeam(
  roomCode: string,
  playerId: string,
  teamId: string
): Promise<{ ok: boolean; snapshot?: RoomSnapshot; error?: string }> {
  const supabase = await createClient();
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode.toUpperCase()).single();
  if (!room) return { ok: false, error: "Room not found" };
  if (room.state !== "lobby") return { ok: false, error: "Cannot change team after game started" };

  const { data: team } = await supabase.from("teams").select("id").eq("room_id", room.id).eq("id", teamId).single();
  if (!team) return { ok: false, error: "Invalid team" };

  await supabase.from("players").update({ team_id: teamId }).eq("id", playerId).eq("room_id", room.id);
  return getRoomSnapshot(roomCode);
}

export async function setReady(
  roomCode: string,
  playerId: string,
  isReady: boolean
): Promise<{ ok: boolean; snapshot?: RoomSnapshot; error?: string }> {
  const supabase = await createClient();
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode.toUpperCase()).single();
  if (!room) return { ok: false, error: "Room not found" };

  await supabase.from("players").update({ is_ready: isReady, last_seen: new Date().toISOString() }).eq("id", playerId).eq("room_id", room.id);
  return getRoomSnapshot(roomCode);
}
