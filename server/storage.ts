import {
  type Room, type InsertRoom,
  type Question, type InsertQuestion,
  type Player, type InsertPlayer,
  rooms, questions, players,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { randomUUID } from "crypto";

export interface IStorage {
  createRoom(room: InsertRoom & { roomCode: string }): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  getRoomById(id: string): Promise<Room | undefined>;
  updateRoomStatus(id: string, status: "lobby" | "running" | "ended"): Promise<void>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  createQuestions(questionList: InsertQuestion[]): Promise<Question[]>;
  getQuestionsByRoomId(roomId: string): Promise<Question[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayersByRoomId(roomId: string): Promise<Player[]>;
  getPlayerById(id: string): Promise<Player | undefined>;
  removePlayer(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createRoom(room: InsertRoom & { roomCode: string }): Promise<Room> {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.roomCode, code));
    return room;
  }

  async getRoomById(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async updateRoomStatus(id: string, status: "lobby" | "running" | "ended"): Promise<void> {
    await db.update(rooms).set({ status }).where(eq(rooms.id, id));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [created] = await db.insert(questions).values(question).returning();
    return created;
  }

  async createQuestions(questionList: InsertQuestion[]): Promise<Question[]> {
    if (questionList.length === 0) return [];
    const created = await db.insert(questions).values(questionList).returning();
    return created;
  }

  async getQuestionsByRoomId(roomId: string): Promise<Question[]> {
    return db.select().from(questions).where(eq(questions.roomId, roomId));
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [created] = await db.insert(players).values(player).returning();
    return created;
  }

  async getPlayersByRoomId(roomId: string): Promise<Player[]> {
    return db.select().from(players).where(eq(players.roomId, roomId));
  }

  async getPlayerById(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async removePlayer(id: string): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }
}

export const storage = new DatabaseStorage();
