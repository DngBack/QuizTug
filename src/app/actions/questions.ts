"use server";

import { createClient } from "@/lib/supabase/server";

export async function createQuestionSet(
  title: string,
  questions: { prompt: string; a: string; b: string; c: string; d: string; correct: string; explanation?: string }[]
): Promise<{ ok: boolean; questionSetId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: set, error: setErr } = await supabase
    .from("question_sets")
    .insert({ owner_id: user.id, title })
    .select("id")
    .single();
  if (setErr || !set) return { ok: false, error: setErr?.message ?? "Failed to create set" };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { error: qErr } = await supabase.from("questions").insert({
      question_set_id: set.id,
      prompt: q.prompt,
      a: q.a,
      b: q.b,
      c: q.c,
      d: q.d,
      correct: q.correct,
      explanation: q.explanation ?? null,
      order: i,
    });
    if (qErr) return { ok: false, error: qErr.message };
  }
  return { ok: true, questionSetId: set.id };
}

export async function linkRoomToQuestionSet(
  roomCode: string,
  questionSetId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: room } = await supabase.from("rooms").select("id").eq("code", roomCode.toUpperCase()).single();
  if (!room) return { ok: false, error: "Room not found" };
  const { error } = await supabase.from("rooms").update({ question_set_id: questionSetId }).eq("id", room.id);
  return { ok: !error, error: error?.message };
}
