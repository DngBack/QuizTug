import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TugRope } from "@/components/tug-rope";
import { Trophy, Download, Home, BarChart3, Target, Zap, Users, Loader2 } from "lucide-react";
import type { Room, Player } from "@shared/schema";
import type { GameState } from "@shared/schema";

interface ResultsData {
  room: Room;
  players: Player[];
  gameState: GameState;
}

export default function Results() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const isHost = params.get("host") === "true";

  const resultsQuery = useQuery<ResultsData>({
    queryKey: ["/api/rooms", code, "results"],
    retry: 5,
    retryDelay: 1000,
    staleTime: 0,
    refetchOnMount: true,
  });

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/rooms/${code}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quiztug-results-${code}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  if (resultsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const data = resultsQuery.data;
  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Results not available yet.</p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { gameState, players } = data;
  const teamA = players.filter(p => p.team === "A" && !p.isHost);
  const teamB = players.filter(p => p.team === "B" && !p.isHost);
  const totalAnswered = gameState.teamACorrect + gameState.teamBCorrect;

  const teamAAccuracy = gameState.teamAScore > 0
    ? Math.round((gameState.teamACorrect / Math.max(1, Math.ceil(gameState.totalQuestions / 2))) * 100)
    : 0;
  const teamBAccuracy = gameState.teamBScore > 0
    ? Math.round((gameState.teamBCorrect / Math.max(1, Math.ceil(gameState.totalQuestions / 2))) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-foreground mb-2"
          >
            {gameState.winner === "tie" ? "It's a Tie!" : `Team ${gameState.winner} Wins!`}
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground"
          >
            Final rope position: {gameState.ropePosition > 0 ? "+" : ""}{gameState.ropePosition}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <TugRope ropePosition={gameState.ropePosition} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <Card className={gameState.winner === "A" ? "ring-2 ring-blue-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white text-xs font-bold">A</div>
                Team A
                {gameState.winner === "A" && <Badge variant="secondary">Winner</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Score</span>
                <span className="font-bold text-foreground" data-testid="text-result-score-a">{gameState.teamAScore}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Correct</span>
                <span className="font-semibold text-foreground">{gameState.teamACorrect}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Accuracy</span>
                <span className="font-semibold text-foreground">{teamAAccuracy}%</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Players</span>
                <span className="font-semibold text-foreground">{teamA.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={gameState.winner === "B" ? "ring-2 ring-rose-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-6 h-6 rounded-full bg-rose-500 dark:bg-rose-400 flex items-center justify-center text-white text-xs font-bold">B</div>
                Team B
                {gameState.winner === "B" && <Badge variant="secondary">Winner</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Score</span>
                <span className="font-bold text-foreground" data-testid="text-result-score-b">{gameState.teamBScore}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Correct</span>
                <span className="font-semibold text-foreground">{gameState.teamBCorrect}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Accuracy</span>
                <span className="font-semibold text-foreground">{teamBAccuracy}%</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Players</span>
                <span className="font-semibold text-foreground">{teamB.length}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={() => setLocation("/")}
            variant="secondary"
            data-testid="button-home"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          {isHost && (
            <Button onClick={handleExport} data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export Results (CSV)
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
