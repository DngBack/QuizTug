import { motion } from "framer-motion";

interface TugRopeProps {
  ropePosition: number;
  teamAName?: string;
  teamBName?: string;
  isAnimating?: boolean;
}

export function TugRope({ ropePosition, teamAName = "Team A", teamBName = "Team B", isAnimating }: TugRopeProps) {
  const normalizedPosition = (ropePosition + 100) / 200;
  const markerPercent = normalizedPosition * 100;

  const teamAWinning = ropePosition < 0;
  const teamBWinning = ropePosition > 0;

  return (
    <div className="w-full px-4" data-testid="tug-rope-container">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={`flex items-center gap-2 transition-all duration-300 ${teamAWinning ? "scale-110" : "scale-100"}`}>
          <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-sm text-foreground">{teamAName}</span>
        </div>
        <div className={`flex items-center gap-2 transition-all duration-300 ${teamBWinning ? "scale-110" : "scale-100"}`}>
          <span className="font-semibold text-sm text-foreground">{teamBName}</span>
          <div className="w-10 h-10 rounded-full bg-rose-500 dark:bg-rose-400 flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
        </div>
      </div>

      <div className="relative h-16 flex items-center">
        <div className="absolute inset-x-0 h-4 rounded-full bg-muted border border-border flex items-center">
          <div
            className="absolute left-0 h-full rounded-l-full bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-400 dark:to-blue-300 transition-all duration-500 ease-out"
            style={{ width: `${markerPercent}%` }}
          />
          <div
            className="absolute right-0 h-full rounded-r-full bg-gradient-to-l from-rose-500 to-rose-400 dark:from-rose-400 dark:to-rose-300 transition-all duration-500 ease-out"
            style={{ width: `${100 - markerPercent}%` }}
          />
        </div>

        <div className="absolute inset-x-0 h-2 top-1/2 -translate-y-1/2">
          <div className="absolute left-[10%] right-[10%] h-1 top-1/2 -translate-y-1/2 flex items-center justify-between">
            {[...Array(21)].map((_, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full ${i === 10 ? "h-4 bg-foreground/40" : "h-2 bg-foreground/20"}`}
              />
            ))}
          </div>
        </div>

        <motion.div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          animate={{
            left: `calc(${markerPercent}% - 16px)`,
          }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 20,
          }}
          data-testid="rope-marker"
        >
          <div className={`w-8 h-8 rounded-full bg-amber-400 dark:bg-amber-300 border-4 border-amber-600 dark:border-amber-500 shadow-lg flex items-center justify-center ${isAnimating ? "animate-rope-pull" : ""}`}>
            <div className="w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-600" />
          </div>
        </motion.div>

        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2"
          animate={{
            x: teamAWinning ? [0, -3, 0] : 0,
          }}
          transition={{ repeat: teamAWinning ? Infinity : 0, duration: 0.5 }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" className="drop-shadow-md">
            <circle cx="16" cy="10" r="6" className="fill-blue-500 dark:fill-blue-400" />
            <line x1="16" y1="16" x2="16" y2="26" stroke="currentColor" strokeWidth="2" className="text-blue-500 dark:text-blue-400" />
            <line x1="16" y1="20" x2="22" y2="18" stroke="currentColor" strokeWidth="2" className="text-blue-500 dark:text-blue-400" />
            <line x1="16" y1="20" x2="10" y2="22" stroke="currentColor" strokeWidth="2" className="text-blue-500 dark:text-blue-400" />
            <line x1="16" y1="26" x2="12" y2="32" stroke="currentColor" strokeWidth="2" className="text-blue-500 dark:text-blue-400" />
            <line x1="16" y1="26" x2="20" y2="32" stroke="currentColor" strokeWidth="2" className="text-blue-500 dark:text-blue-400" />
          </svg>
        </motion.div>

        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          animate={{
            x: teamBWinning ? [0, 3, 0] : 0,
          }}
          transition={{ repeat: teamBWinning ? Infinity : 0, duration: 0.5 }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" className="drop-shadow-md">
            <circle cx="16" cy="10" r="6" className="fill-rose-500 dark:fill-rose-400" />
            <line x1="16" y1="16" x2="16" y2="26" stroke="currentColor" strokeWidth="2" className="text-rose-500 dark:text-rose-400" />
            <line x1="16" y1="20" x2="10" y2="18" stroke="currentColor" strokeWidth="2" className="text-rose-500 dark:text-rose-400" />
            <line x1="16" y1="20" x2="22" y2="22" stroke="currentColor" strokeWidth="2" className="text-rose-500 dark:text-rose-400" />
            <line x1="16" y1="26" x2="12" y2="32" stroke="currentColor" strokeWidth="2" className="text-rose-500 dark:text-rose-400" />
            <line x1="16" y1="26" x2="20" y2="32" stroke="currentColor" strokeWidth="2" className="text-rose-500 dark:text-rose-400" />
          </svg>
        </motion.div>
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>-100</span>
        <span className="font-medium">{ropePosition > 0 ? "+" : ""}{ropePosition}</span>
        <span>+100</span>
      </div>
    </div>
  );
}
