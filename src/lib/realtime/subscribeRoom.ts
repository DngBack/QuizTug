"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BroadcastPayload } from "@/types/events";
import type { RoomSnapshot } from "@/types/room";
import { createClient } from "@/lib/supabase/client";

const ROOM_CHANNEL_PREFIX = "room:";

export function getRoomChannelName(code: string): string {
  return `${ROOM_CHANNEL_PREFIX}${code}`;
}

export type RoomSubscriptionCallbacks = {
  onRoomState?: (snapshot: RoomSnapshot) => void;
  onBroadcast?: (payload: BroadcastPayload) => void;
  onPresenceSync?: () => void;
};

export interface PresenceState {
  playerId: string;
  displayName: string;
  teamId: string | null;
  isReady: boolean;
  lastSeen: number;
}

export function subscribeRoom(
  code: string,
  callbacks: RoomSubscriptionCallbacks
): () => void {
  const supabase = createClient();
  const channelName = getRoomChannelName(code);
  const channel = supabase.channel(channelName);

  channel.on("broadcast", { event: "payload" }, ({ payload }) => {
    callbacks.onBroadcast?.(payload as BroadcastPayload);
  });

  const unsub = () => {
    supabase.removeChannel(channel);
  };

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      callbacks.onPresenceSync?.();
    }
  });

  return unsub;
}

export function broadcastToRoom(
  channel: RealtimeChannel,
  payload: BroadcastPayload
): void {
  channel.send({
    type: "broadcast",
    event: "payload",
    payload,
  });
}
