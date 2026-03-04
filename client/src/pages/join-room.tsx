import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import type { Room, Player } from "@shared/schema";

export default function JoinRoom() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [nickname, setNickname] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B" | null>(null);

  const roomQuery = useQuery<{ room: Room; players: Player[] }>({
    queryKey: ["/api/rooms", code],
    enabled: !!code,
  });

  const joinMutation = useMutation({
    mutationFn: async (data: { nickname: string; team: "A" | "B" }) => {
      const res = await apiRequest("POST", `/api/rooms/${code}/join`, data);
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/lobby/${code}?playerId=${data.playerId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleJoin = () => {
    if (!nickname.trim() || !selectedTeam) return;
    joinMutation.mutate({ nickname: nickname.trim(), team: selectedTeam });
  };

  const room = roomQuery.data?.room;
  const players = roomQuery.data?.players || [];
  const teamAPlayers = players.filter(p => p.team === "A");
  const teamBPlayers = players.filter(p => p.team === "B");

  if (roomQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Finding room...</p>
        </div>
      </div>
    );
  }

  if (roomQuery.isError || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold mb-2 text-foreground">Room Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The room code "{code}" doesn't exist or has expired.
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Badge variant="secondary" className="mb-3">
                  Room: {code}
                </Badge>
                <h1 className="text-2xl font-bold text-foreground mb-1">Join the Game</h1>
                <p className="text-sm text-muted-foreground">
                  Hosted by {room.hostName}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Your Nickname
                  </label>
                  <Input
                    data-testid="input-nickname"
                    placeholder="e.g. Cool Student"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Pick Your Team
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      data-testid="button-team-a"
                      onClick={() => setSelectedTeam("A")}
                      className={`relative p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                        selectedTeam === "A"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center mx-auto mb-2 text-white font-bold">
                        A
                      </div>
                      <p className="font-semibold text-sm text-foreground">Team A</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {teamAPlayers.length} player{teamAPlayers.length !== 1 ? "s" : ""}
                      </p>
                    </button>
                    <button
                      data-testid="button-team-b"
                      onClick={() => setSelectedTeam("B")}
                      className={`relative p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                        selectedTeam === "B"
                          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-rose-500 dark:bg-rose-400 flex items-center justify-center mx-auto mb-2 text-white font-bold">
                        B
                      </div>
                      <p className="font-semibold text-sm text-foreground">Team B</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {teamBPlayers.length} player{teamBPlayers.length !== 1 ? "s" : ""}
                      </p>
                    </button>
                  </div>
                </div>

                <Button
                  data-testid="button-join-game"
                  onClick={handleJoin}
                  className="w-full"
                  size="lg"
                  disabled={!nickname.trim() || !selectedTeam || joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Game"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
