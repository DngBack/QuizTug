"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRoomSnapshot } from "@/app/actions/room";
import { setTeam, setReady } from "@/app/actions/room";
import { createClient } from "@/lib/supabase/client";
import { getRoomChannelName } from "@/lib/realtime/subscribeRoom";
import type { RoomSnapshot } from "@/types/room";
import type { BroadcastPayload } from "@/types/events";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), { ssr: false });

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = (params.code as string)?.toUpperCase() ?? "";
  const playerId = searchParams.get("playerId") ?? "";
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const refresh = useCallback(async () => {
    if (!code) return;
    const result = await getRoomSnapshot(code);
    if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!code || !playerId) return;
    const supabase = createClient();
    const channelName = getRoomChannelName(code);
    const channel = supabase.channel(channelName);
    channelRef.current = channel;
    channel.on("broadcast", { event: "payload" }, ({ payload }: { payload: BroadcastPayload }) => {
      if (payload.type === "ROOM_STATE" && "state" in payload && payload.state) setSnapshot(payload.state);
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, playerId]);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  async function handleSetTeam(teamId: string) {
    setError("");
    setActionLoading(true);
    const result = await setTeam(code, playerId, teamId);
    setActionLoading(false);
    if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    else setError(result.error ?? "Failed");
  }

  async function handleSetReady(isReady: boolean) {
    setError("");
    setActionLoading(true);
    const result = await setReady(code, playerId, isReady);
    setActionLoading(false);
    if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    else setError(result.error ?? "Failed");
  }

  function broadcastSnapshot(snap: RoomSnapshot) {
    const ch = channelRef.current;
    if (ch) ch.send({ type: "broadcast", event: "payload", payload: { type: "ROOM_STATE", state: snap } });
  }

  const me = snapshot?.players.find((p) => p.id === playerId);
  const isPlaying = snapshot?.state === "playing" || snapshot?.state === "countdown" || snapshot?.state === "round_reveal";
  const isFinished = snapshot?.state === "finished";

  if (loading && !snapshot) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (!snapshot) return <div className="flex min-h-screen items-center justify-center">Room not found.</div>;
  if (!playerId) return <div className="flex min-h-screen items-center justify-center">Missing playerId. Join from the home page.</div>;

  if (isFinished) {
    const winner = Math.abs(snapshot.rope_pos) >= 100 ? (snapshot.rope_pos >= 100 ? "A" : "B") : null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Match over</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium">Winner: Team {winner ?? "—"}</p>
            <p className="text-zinc-600 dark:text-zinc-400">Final rope position: {snapshot.rope_pos}</p>
            <div className="rounded border p-2 space-y-1">
              <p className="font-medium">Breakdown</p>
              {snapshot.teams.map((t) => (
                <p key={t.id} className="text-sm">Team {t.name}: score {t.score}, power {(Number(t.power) * 100).toFixed(0)}%</p>
              ))}
            </div>
            <Button asChild><a href="/">Back to home</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPlaying) {
    return (
      <div className="relative h-screen w-full">
        <GameCanvas
          roomCode={code}
          playerId={playerId}
          snapshot={snapshot}
          onSnapshotUpdate={(snap) => {
            setSnapshot(snap);
            broadcastSnapshot(snap);
          }}
        />
      </div>
    );
  }

  const teamA = snapshot.teams.find((t) => t.name === "A");
  const teamB = snapshot.teams.find((t) => t.name === "B");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-900">
      <main className="w-full max-w-lg space-y-4">
        <h1 className="text-center text-xl font-bold">Room {code}</h1>
        {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Card>
          <CardHeader>
            <CardTitle>Lobby</CardTitle>
            <CardContent className="pt-2">
              <p className="text-zinc-600 dark:text-zinc-400">Choose your team and press Ready.</p>
            </CardContent>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {teamA && (
                <Button
                  variant={me?.team_id === teamA.id ? "default" : "outline"}
                  onClick={() => handleSetTeam(teamA.id)}
                  disabled={actionLoading}
                >
                  Team A
                </Button>
              )}
              {teamB && (
                <Button
                  variant={me?.team_id === teamB.id ? "default" : "outline"}
                  onClick={() => handleSetTeam(teamB.id)}
                  disabled={actionLoading}
                >
                  Team B
                </Button>
              )}
            </div>
            <Button
              variant={me?.is_ready ? "secondary" : "default"}
              onClick={() => handleSetReady(!me?.is_ready)}
              disabled={actionLoading}
            >
              {me?.is_ready ? "Unready" : "Ready"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Players ({snapshot.players.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {snapshot.players.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{p.display_name} {p.id === playerId ? "(you)" : ""}</span>
                  <span>{p.team_id ? snapshot.teams.find((t) => t.id === p.team_id)?.name : "—"} {p.is_ready ? "✓" : ""}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
