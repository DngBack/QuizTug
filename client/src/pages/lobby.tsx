import { useEffect, useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, Play, Loader2, Check, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Room, Player, WSMessage } from "@shared/schema";

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isHost = params.get("host") === "true";
  const playerId = params.get("playerId");

  const roomQuery = useQuery<{ room: Room; players: Player[] }>({
    queryKey: ["/api/rooms", code],
    enabled: !!code,
    refetchInterval: 3000,
  });

  const { isConnected, sendMessage, addMessageHandler } = useWebSocket(
    roomQuery.data?.room?.id || null,
    playerId
  );

  const handleMessage = useCallback((msg: WSMessage) => {
    if (msg.type === "game_started") {
      setLocation(`/game/${code}?playerId=${playerId}${isHost ? "&host=true" : ""}`);
    }
    if (msg.type === "player_joined" || msg.type === "player_left") {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", code] });
    }
  }, [code, setLocation, playerId, isHost]);

  useEffect(() => {
    const cleanup = addMessageHandler(handleMessage);
    return cleanup;
  }, [addMessageHandler, handleMessage]);

  const handleCopyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Room code copied!" });
  };

  const handleStart = () => {
    sendMessage({ type: "start_game", payload: {} });
  };

  const room = roomQuery.data?.room;
  const players = roomQuery.data?.players || [];
  const teamA = players.filter(p => p.team === "A" && !p.isHost);
  const teamB = players.filter(p => p.team === "B" && !p.isHost);

  if (roomQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            {isConnected ? (
              <Badge variant="secondary" className="gap-1">
                <Wifi className="w-3 h-3" /> Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="w-3 h-3" /> Reconnecting...
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Game Lobby</h1>
          <p className="text-muted-foreground mb-4">
            Hosted by {room?.hostName}
          </p>

          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-3">
            <span className="text-sm text-muted-foreground">Room Code:</span>
            <span className="text-2xl font-mono font-bold tracking-widest text-foreground" data-testid="text-room-code">
              {code}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopyCode}
              data-testid="button-copy-code"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white font-bold text-xs">
                    A
                  </div>
                  <h2 className="font-semibold text-foreground">Team A</h2>
                  <Badge variant="secondary" className="ml-auto">{teamA.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  <AnimatePresence>
                    {teamA.map((player) => (
                      <motion.div
                        key={player.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="flex items-center gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/20"
                        data-testid={`player-a-${player.id}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-200">
                          {player.nickname.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{player.nickname}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {teamA.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Waiting for players...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-rose-500 dark:bg-rose-400 flex items-center justify-center text-white font-bold text-xs">
                    B
                  </div>
                  <h2 className="font-semibold text-foreground">Team B</h2>
                  <Badge variant="secondary" className="ml-auto">{teamB.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  <AnimatePresence>
                    {teamB.map((player) => (
                      <motion.div
                        key={player.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        className="flex items-center gap-2 p-2 rounded-md bg-rose-50 dark:bg-rose-950/20"
                        data-testid={`player-b-${player.id}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center text-xs font-bold text-rose-700 dark:text-rose-200">
                          {player.nickname.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{player.nickname}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {teamB.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Waiting for players...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {teamA.length + teamB.length} player{teamA.length + teamB.length !== 1 ? "s" : ""} connected
          </span>
        </motion.div>

        {isHost && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Button
              data-testid="button-start-game"
              size="lg"
              onClick={handleStart}
              disabled={teamA.length === 0 || teamB.length === 0}
              className="min-w-[200px]"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
            {(teamA.length === 0 || teamB.length === 0) && (
              <p className="text-xs text-muted-foreground mt-2">
                Need at least 1 player on each team to start
              </p>
            )}
          </motion.div>
        )}

        {!isHost && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 text-muted-foreground animate-pulse-soft">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Waiting for the host to start...</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
