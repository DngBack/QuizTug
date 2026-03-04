import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Gamepad2, Users, Zap, Trophy, ArrowRight } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState("");

  const handleJoin = () => {
    if (roomCode.trim().length >= 4) {
      setLocation(`/join/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground">
              Quiz<span className="text-primary">Tug</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            The classroom tug-of-war quiz game. Two teams. One rope. Who will win?
          </p>
        </motion.div>

        <div className="w-full max-w-lg space-y-6">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Card data-testid="card-join-room">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-1 text-foreground">Join a Game</h2>
                <p className="text-sm text-muted-foreground mb-4">Enter the room code from your teacher</p>
                <div className="flex gap-3">
                  <Input
                    data-testid="input-room-code"
                    placeholder="e.g. ABC123"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-widest uppercase"
                  />
                  <Button
                    data-testid="button-join-room"
                    onClick={handleJoin}
                    disabled={roomCode.trim().length < 4}
                  >
                    Join
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card data-testid="card-create-room">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-1 text-foreground">Create a Game</h2>
                <p className="text-sm text-muted-foreground mb-4">Set up a quiz room for your class</p>
                <Button
                  data-testid="button-create-room"
                  onClick={() => setLocation("/create")}
                  variant="secondary"
                  className="w-full"
                >
                  Create Room
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full"
        >
          {[
            { icon: Users, label: "Team Play", desc: "Compete in teams" },
            { icon: Zap, label: "Real-time", desc: "Live tug action" },
            { icon: Trophy, label: "Win Together", desc: "Pull to victory" },
            { icon: Gamepad2, label: "Fun Learning", desc: "Engaging quizzes" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="text-center p-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-sm text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <footer className="text-center py-4 text-xs text-muted-foreground">
        QuizTug - Making learning fun, one pull at a time
      </footer>
    </div>
  );
}
