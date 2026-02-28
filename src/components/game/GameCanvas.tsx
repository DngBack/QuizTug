"use client";

import { useEffect, useRef } from "react";
import { createGame } from "@/game";
import { EventBus } from "@/game/EventBus";
import type { RoomSnapshot } from "@/types/room";
import { submitAnswer } from "@/app/actions/answer";

interface GameCanvasProps {
  roomCode: string;
  playerId: string;
  snapshot: RoomSnapshot;
  onSnapshotUpdate: (snap: RoomSnapshot) => void;
}

export default function GameCanvas({ roomCode, playerId, snapshot, onSnapshotUpdate }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    (window as unknown as { __tugmindInit?: Record<string, unknown> }).__tugmindInit = {
      roomCode,
      playerId,
      snapshot,
      onSubmitAnswer: async (roundId: string, choice: string) => {
        const result = await submitAnswer(roomCode, roundId, playerId, choice, Date.now());
        if (result.ok && result.snapshot) onSnapshotUpdate(result.snapshot);
        if (result.ok && result.accepted && result.snapshot) {
          EventBus.emit("ROOM_SNAPSHOT", result.snapshot);
        }
        if (result.ok && result.accepted !== undefined) {
          EventBus.emit("ANSWER_ACK", { isCorrect: result.isCorrect ?? false });
        }
      },
      onSnapshotUpdate,
    };
    const game = createGame("game-container");
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [roomCode, playerId]);

  useEffect(() => {
    EventBus.emit("ROOM_SNAPSHOT", snapshot);
  }, [snapshot]);

  useEffect(() => {
    const unsub = EventBus.on("MATCH_END", (snap: unknown) => {
      if (snap) onSnapshotUpdate(snap as RoomSnapshot);
      const game = gameRef.current;
      if (game) game.scene.start("Result", { snapshot: snap });
    });
    return unsub;
  }, [onSnapshotUpdate]);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-zinc-900">
      <div id="game-container" ref={containerRef} className="max-h-full max-w-full" />
    </div>
  );
}
