import type { GameState, Question, Room } from "@shared/schema";

export class GameEngine {
  private state: GameState;
  private questions: Question[];
  private room: Room;
  private gameTimer: ReturnType<typeof setInterval> | null = null;
  private phaseTimeout: ReturnType<typeof setTimeout> | null = null;
  private answerCountdown: ReturnType<typeof setInterval> | null = null;
  private onStateChange: (state: GameState) => void;
  private onQuestion: (question: Question) => void;
  private onAnswerResult: (result: { correct: boolean; team: string; correctAnswer: string }) => void;
  private onGameEnd: (state: GameState) => void;
  private answeredThisTurn = false;
  private stopped = false;

  constructor(
    room: Room,
    questions: Question[],
    callbacks: {
      onStateChange: (state: GameState) => void;
      onQuestion: (question: Question) => void;
      onAnswerResult: (result: { correct: boolean; team: string; correctAnswer: string }) => void;
      onGameEnd: (state: GameState) => void;
    }
  ) {
    this.room = room;
    this.questions = room.shuffleQuestions ? this.shuffle([...questions]) : [...questions];
    this.onStateChange = callbacks.onStateChange;
    this.onQuestion = callbacks.onQuestion;
    this.onAnswerResult = callbacks.onAnswerResult;
    this.onGameEnd = callbacks.onGameEnd;

    this.state = {
      roomId: room.id,
      status: "running",
      ropePosition: 0,
      currentQuestionIndex: 0,
      activeTeam: "A",
      phase: "SHOW_QUESTION",
      phaseTimer: 0,
      teamAScore: 0,
      teamBScore: 0,
      teamACorrect: 0,
      teamBCorrect: 0,
      totalQuestions: questions.length,
      timeRemaining: room.timeLimit,
      streakA: 0,
      streakB: 0,
    };
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getState(): GameState {
    return { ...this.state };
  }

  start() {
    this.stopped = false;
    this.gameTimer = setInterval(() => {
      if (this.stopped) return;
      this.state.timeRemaining--;
      if (this.state.timeRemaining <= 0) {
        this.endGame();
        return;
      }
      this.onStateChange(this.getState());
    }, 1000);

    this.showQuestion();
  }

  stop() {
    this.stopped = true;
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.phaseTimeout) {
      clearTimeout(this.phaseTimeout);
      this.phaseTimeout = null;
    }
    if (this.answerCountdown) {
      clearInterval(this.answerCountdown);
      this.answerCountdown = null;
    }
  }

  private clearPhaseTimers() {
    if (this.phaseTimeout) {
      clearTimeout(this.phaseTimeout);
      this.phaseTimeout = null;
    }
    if (this.answerCountdown) {
      clearInterval(this.answerCountdown);
      this.answerCountdown = null;
    }
  }

  private showQuestion() {
    if (this.stopped) return;
    if (this.state.currentQuestionIndex >= this.questions.length) {
      this.endGame();
      return;
    }

    this.clearPhaseTimers();
    this.answeredThisTurn = false;
    this.state.phase = "SHOW_QUESTION";
    this.onStateChange(this.getState());

    const question = this.questions[this.state.currentQuestionIndex];
    this.onQuestion(question);

    this.phaseTimeout = setTimeout(() => {
      if (!this.stopped) this.startAnswering();
    }, 1500);
  }

  private startAnswering() {
    if (this.stopped) return;
    this.clearPhaseTimers();

    this.state.phase = "ANSWERING";
    this.state.phaseTimer = this.room.answerWindow;
    this.onStateChange(this.getState());

    this.answerCountdown = setInterval(() => {
      if (this.stopped || this.state.phase !== "ANSWERING") {
        if (this.answerCountdown) {
          clearInterval(this.answerCountdown);
          this.answerCountdown = null;
        }
        return;
      }
      this.state.phaseTimer--;
      this.onStateChange(this.getState());
      if (this.state.phaseTimer <= 0) {
        if (this.answerCountdown) {
          clearInterval(this.answerCountdown);
          this.answerCountdown = null;
        }
        this.handleTimeout();
      }
    }, 1000);
  }

  private handleTimeout() {
    if (this.stopped) return;
    if (this.answeredThisTurn) return;
    this.answeredThisTurn = true;

    this.clearPhaseTimers();

    const question = this.questions[this.state.currentQuestionIndex];
    this.state.lastAnswer = {
      correct: false,
      team: this.state.activeTeam,
      answer: "",
      correctAnswer: question.answer,
    };

    if (this.state.activeTeam === "A") {
      this.state.streakA = 0;
    } else {
      this.state.streakB = 0;
    }

    this.state.phase = "RESOLVE";
    this.onStateChange(this.getState());
    this.onAnswerResult({ correct: false, team: this.state.activeTeam, correctAnswer: question.answer });

    this.phaseTimeout = setTimeout(() => {
      if (!this.stopped) this.applyStun();
    }, 1500);
  }

  submitAnswer(playerId: string, team: "A" | "B", answer: string): boolean {
    if (this.stopped) return false;
    if (this.state.phase !== "ANSWERING") return false;
    if (this.answeredThisTurn) return false;
    if (team !== this.state.activeTeam) return false;

    this.answeredThisTurn = true;
    this.clearPhaseTimers();

    const question = this.questions[this.state.currentQuestionIndex];
    const isCorrect = answer.trim().toUpperCase() === question.answer.trim().toUpperCase();

    this.state.lastAnswer = {
      correct: isCorrect,
      team,
      answer,
      correctAnswer: question.answer,
    };

    if (isCorrect) {
      const streakMultiplier = team === "A"
        ? Math.min(this.state.streakA + 1, 3)
        : Math.min(this.state.streakB + 1, 3);

      const pull = this.room.correctPull * (streakMultiplier > 2 ? 1.5 : 1);

      if (team === "A") {
        this.state.ropePosition = Math.max(-100, this.state.ropePosition - pull);
        this.state.teamAScore += this.room.correctPull;
        this.state.teamACorrect++;
        this.state.streakA++;
        this.state.streakB = 0;
      } else {
        this.state.ropePosition = Math.min(100, this.state.ropePosition + pull);
        this.state.teamBScore += this.room.correctPull;
        this.state.teamBCorrect++;
        this.state.streakB++;
        this.state.streakA = 0;
      }

      if (this.state.ropePosition <= -100 || this.state.ropePosition >= 100) {
        this.state.phase = "RESOLVE";
        this.onStateChange(this.getState());
        this.onAnswerResult({ correct: true, team, correctAnswer: question.answer });
        this.phaseTimeout = setTimeout(() => this.endGame(), 2000);
        return true;
      }
    } else {
      const penalty = this.room.wrongPenalty;
      if (team === "A") {
        this.state.ropePosition = Math.min(100, this.state.ropePosition + penalty);
        this.state.streakA = 0;
      } else {
        this.state.ropePosition = Math.max(-100, this.state.ropePosition - penalty);
        this.state.streakB = 0;
      }
    }

    this.state.phase = "RESOLVE";
    this.onStateChange(this.getState());
    this.onAnswerResult({ correct: isCorrect, team, correctAnswer: question.answer });

    this.phaseTimeout = setTimeout(() => {
      if (this.stopped) return;
      if (isCorrect) {
        this.nextTurn();
      } else {
        this.applyStun();
      }
    }, 1500);

    return true;
  }

  private applyStun() {
    if (this.stopped) return;
    this.clearPhaseTimers();
    this.state.phase = "STUN";
    this.onStateChange(this.getState());

    this.phaseTimeout = setTimeout(() => {
      if (!this.stopped) this.nextTurn();
    }, this.room.stunDuration * 1000);
  }

  private nextTurn() {
    if (this.stopped) return;
    this.clearPhaseTimers();
    this.state.phase = "NEXT_TURN";
    this.state.activeTeam = this.state.activeTeam === "A" ? "B" : "A";
    this.state.currentQuestionIndex++;
    this.onStateChange(this.getState());

    this.phaseTimeout = setTimeout(() => {
      if (!this.stopped) this.showQuestion();
    }, 500);
  }

  private endGame() {
    this.stop();
    this.state.status = "ended";

    if (this.state.ropePosition < 0) {
      this.state.winner = "A";
    } else if (this.state.ropePosition > 0) {
      this.state.winner = "B";
    } else {
      this.state.winner = "tie";
    }

    this.state.ropePosition = Math.max(-100, Math.min(100, this.state.ropePosition));

    this.onGameEnd(this.getState());
  }
}
