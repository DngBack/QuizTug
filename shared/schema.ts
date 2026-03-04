import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const gameStatusEnum = pgEnum("game_status", ["lobby", "running", "ended"]);
export const questionTypeEnum = pgEnum("question_type", ["mcq", "true_false", "short_answer"]);
export const teamEnum = pgEnum("team", ["A", "B"]);

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomCode: varchar("room_code", { length: 6 }).notNull().unique(),
  hostName: text("host_name").notNull(),
  gameMode: varchar("game_mode", { length: 10 }).notNull().default("T1"),
  timeLimit: integer("time_limit").notNull().default(300),
  answerWindow: integer("answer_window").notNull().default(15),
  stunDuration: integer("stun_duration").notNull().default(1),
  correctPull: integer("correct_pull").notNull().default(10),
  wrongPenalty: integer("wrong_penalty").notNull().default(5),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
  status: gameStatusEnum("status").notNull().default("lobby"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  questionText: text("question_text").notNull(),
  type: questionTypeEnum("type").notNull().default("mcq"),
  choiceA: text("choice_a"),
  choiceB: text("choice_b"),
  choiceC: text("choice_c"),
  choiceD: text("choice_d"),
  answer: text("answer").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  nickname: text("nickname").notNull(),
  team: teamEnum("team"),
  isHost: boolean("is_host").notNull().default(false),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  roomCode: true,
  status: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export type GamePhase = "SHOW_QUESTION" | "ANSWERING" | "RESOLVE" | "STUN" | "NEXT_TURN";

export interface GameState {
  roomId: string;
  status: "lobby" | "running" | "ended";
  ropePosition: number;
  currentQuestionIndex: number;
  activeTeam: "A" | "B";
  phase: GamePhase;
  phaseTimer: number;
  teamAScore: number;
  teamBScore: number;
  teamACorrect: number;
  teamBCorrect: number;
  totalQuestions: number;
  lastAnswer?: {
    correct: boolean;
    team: "A" | "B";
    answer: string;
    correctAnswer: string;
  };
  timeRemaining: number;
  winner?: "A" | "B" | "tie";
  streakA: number;
  streakB: number;
}

export interface WSMessage {
  type: string;
  payload: any;
}
