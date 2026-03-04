import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/use-websocket";
import { TugRope } from "@/components/tug-rope";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Timer, Zap, CheckCircle2, XCircle, Pause, Wifi, WifiOff } from "lucide-react";
import type { GameState, Question, Room, Player, WSMessage } from "@shared/schema";

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const playerId = searchParams.get("playerId");
  const isHost = searchParams.get("host") === "true";

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [shortAnswer, setShortAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [myTeam, setMyTeam] = useState<"A" | "B" | null>(null);
  const redirectedRef = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const roomQuery = useQuery<{ room: Room; players: Player[] }>({
    queryKey: ["/api/rooms", code],
    enabled: !!code,
  });

  const { isConnected, sendMessage, addMessageHandler } = useWebSocket(
    roomQuery.data?.room?.id || null,
    playerId
  );

  useEffect(() => {
    if (roomQuery.data?.players && playerId) {
      const me = roomQuery.data.players.find(p => p.id === playerId);
      if (me?.team) setMyTeam(me.team);
    }
  }, [roomQuery.data, playerId]);

  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case "game_state":
        setGameState(msg.payload);
        break;
      case "question":
        setCurrentQuestion(msg.payload);
        setSelectedAnswer(null);
        setHasAnswered(false);
        setShortAnswer("");
        setShowResult(false);
        break;
      case "answer_result":
        setShowResult(true);
        break;
      case "game_ended":
        setGameState(msg.payload);
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          redirectTimeoutRef.current = setTimeout(() => {
            setLocation(`/results/${code}?playerId=${playerId}${isHost ? "&host=true" : ""}`);
          }, 3000);
        }
        break;
    }
  }, [code, setLocation, playerId, isHost]);

  useEffect(() => {
    const cleanup = addMessageHandler(handleMessage);
    return () => {
      cleanup();
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [addMessageHandler, handleMessage]);

  const handleAnswer = useCallback((answer: string) => {
    if (hasAnswered || !currentQuestion) return;
    setSelectedAnswer(answer);
    setHasAnswered(true);
    sendMessage({
      type: "submit_answer",
      payload: { questionId: currentQuestion.id, answer },
    });
  }, [hasAnswered, currentQuestion, sendMessage]);

  const isMyTurn = gameState?.activeTeam === myTeam;
  const isAnsweringPhase = gameState?.phase === "ANSWERING";
  const canAnswer = isMyTurn && isAnsweringPhase && !hasAnswered && !isHost;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (gameState.status === "ended") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl font-bold mb-4 animate-bounce-in text-foreground">
            Game Over!
          </div>
          <p className="text-xl text-muted-foreground mb-2">
            {gameState.winner === "tie"
              ? "It's a Tie!"
              : `Team ${gameState.winner} Wins!`}
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to results...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "secondary" : "destructive"} className="gap-1">
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? "Live" : "..."}
            </Badge>
            {isHost && (
              <Badge variant="outline" data-testid="badge-host">Host</Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono font-semibold text-foreground" data-testid="text-timer">
                {formatTime(gameState.timeRemaining)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground" data-testid="text-question-count">
              Q{gameState.currentQuestionIndex + 1}/{gameState.totalQuestions}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-blue-500 dark:text-blue-400 font-semibold" data-testid="text-score-a">{gameState.teamAScore}</span>
            <span className="text-muted-foreground">vs</span>
            <span className="text-rose-500 dark:text-rose-400 font-semibold" data-testid="text-score-b">{gameState.teamBScore}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-4"
        >
          <TugRope
            ropePosition={gameState.ropePosition}
            isAnimating={gameState.phase === "RESOLVE"}
          />
        </motion.div>

        <div className="text-center mb-4">
          <AnimatePresence mode="wait">
            {gameState.phase === "SHOW_QUESTION" && (
              <motion.div
                key="show"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Badge variant="secondary" className="animate-pulse-soft">
                  Get Ready...
                </Badge>
              </motion.div>
            )}
            {gameState.phase === "ANSWERING" && (
              <motion.div
                key="answering"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                <Badge
                  variant="secondary"
                  className={gameState.activeTeam === "A"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                  }
                >
                  Team {gameState.activeTeam}'s Turn
                </Badge>
                <div className="mt-2">
                  <Progress
                    value={(gameState.phaseTimer / (roomQuery.data?.room?.answerWindow || 15)) * 100}
                    className="h-1.5 max-w-[200px] mx-auto"
                    data-testid="progress-timer"
                  />
                </div>
              </motion.div>
            )}
            {gameState.phase === "RESOLVE" && gameState.lastAnswer && (
              <motion.div
                key="resolve"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {gameState.lastAnswer.correct ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-semibold text-lg">Correct! +{roomQuery.data?.room?.correctPull || 10} pull</span>
                  </div>
                ) : (
                  <div className={`flex items-center justify-center gap-2 text-destructive ${showResult ? "animate-shake" : ""}`}>
                    <XCircle className="w-6 h-6" />
                    <span className="font-semibold text-lg">Wrong!</span>
                  </div>
                )}
              </motion.div>
            )}
            {gameState.phase === "STUN" && (
              <motion.div
                key="stun"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-amber-500 dark:text-amber-400"
              >
                <Pause className="w-5 h-5" />
                <span className="font-medium animate-pulse-soft">Stunned...</span>
              </motion.div>
            )}
            {gameState.phase === "NEXT_TURN" && (
              <motion.div
                key="next"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Badge variant="secondary" className="animate-pulse-soft">
                  Next Turn...
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            <Card className="mb-4">
              <CardContent className="p-5">
                <p className="text-lg font-semibold text-center text-foreground leading-relaxed" data-testid="text-question">
                  {currentQuestion.questionText}
                </p>
              </CardContent>
            </Card>

            {currentQuestion.type === "short_answer" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    data-testid="input-short-answer"
                    placeholder="Type your answer..."
                    value={shortAnswer}
                    onChange={(e) => setShortAnswer(e.target.value)}
                    disabled={!canAnswer}
                    onKeyDown={(e) => e.key === "Enter" && shortAnswer.trim() && handleAnswer(shortAnswer.trim())}
                  />
                  <Button
                    data-testid="button-submit-answer"
                    onClick={() => handleAnswer(shortAnswer.trim())}
                    disabled={!canAnswer || !shortAnswer.trim()}
                  >
                    Submit
                  </Button>
                </div>
                {!isMyTurn && !isHost && isAnsweringPhase && (
                  <p className="text-sm text-center text-muted-foreground">
                    Wait for your turn...
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "A", value: currentQuestion.choiceA, color: "blue" },
                  { key: "B", value: currentQuestion.choiceB, color: "rose" },
                  { key: "C", value: currentQuestion.choiceC, color: "amber" },
                  { key: "D", value: currentQuestion.choiceD, color: "emerald" },
                ].filter(c => c.value).map((choice) => {
                  const isSelected = selectedAnswer === choice.key;
                  const isCorrectAnswer = showResult && gameState?.lastAnswer?.correctAnswer === choice.key;
                  const isWrongSelected = showResult && isSelected && !gameState?.lastAnswer?.correct;

                  let borderColor = "border-border";
                  let bgColor = "bg-card";
                  if (isCorrectAnswer) {
                    borderColor = "border-emerald-500";
                    bgColor = "bg-emerald-50 dark:bg-emerald-950/20";
                  } else if (isWrongSelected) {
                    borderColor = "border-destructive";
                    bgColor = "bg-destructive/5";
                  } else if (isSelected) {
                    borderColor = "border-primary";
                    bgColor = "bg-primary/5";
                  }

                  return (
                    <motion.button
                      key={choice.key}
                      data-testid={`button-choice-${choice.key.toLowerCase()}`}
                      onClick={() => handleAnswer(choice.key)}
                      disabled={!canAnswer}
                      whileTap={canAnswer ? { scale: 0.98 } : undefined}
                      className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${borderColor} ${bgColor} ${
                        canAnswer ? "cursor-pointer" : "cursor-default opacity-70"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isSelected || isCorrectAnswer
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {choice.key}
                        </span>
                        <span className="text-sm font-medium text-foreground leading-relaxed">
                          {choice.value}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {!isMyTurn && !isHost && isAnsweringPhase && currentQuestion.type !== "short_answer" && (
              <p className="text-sm text-center text-muted-foreground mt-4">
                It's Team {gameState.activeTeam}'s turn. Watch and wait...
              </p>
            )}

            {hasAnswered && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-center text-primary mt-4 font-medium"
              >
                Answer submitted! Waiting for result...
              </motion.p>
            )}

            {isHost && isAnsweringPhase && (
              <p className="text-sm text-center text-muted-foreground mt-4">
                Watching as host. Team {gameState.activeTeam} is answering...
              </p>
            )}
          </motion.div>
        )}

        {gameState.streakA > 1 && (
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="fixed left-4 bottom-4"
          >
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Team A Streak: {gameState.streakA}x
            </Badge>
          </motion.div>
        )}
        {gameState.streakB > 1 && (
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="fixed right-4 bottom-4"
          >
            <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              Team B Streak: {gameState.streakB}x
            </Badge>
          </motion.div>
        )}
      </div>
    </div>
  );
}
