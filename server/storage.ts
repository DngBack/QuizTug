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
  constructor(private db: NonNullable<typeof db>) {}

  async createRoom(room: InsertRoom & { roomCode: string }): Promise<Room> {
    const [created] = await this.db.insert(rooms).values(room).returning();
    return created;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.roomCode, code));
    return room;
  }

  async getRoomById(id: string): Promise<Room | undefined> {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async updateRoomStatus(id: string, status: "lobby" | "running" | "ended"): Promise<void> {
    await this.db.update(rooms).set({ status }).where(eq(rooms.id, id));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [created] = await this.db.insert(questions).values(question).returning();
    return created;
  }

  async createQuestions(questionList: InsertQuestion[]): Promise<Question[]> {
    if (questionList.length === 0) return [];
    return this.db.insert(questions).values(questionList).returning();
  }

  async getQuestionsByRoomId(roomId: string): Promise<Question[]> {
    return this.db.select().from(questions).where(eq(questions.roomId, roomId));
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [created] = await this.db.insert(players).values(player).returning();
    return created;
  }

  async getPlayersByRoomId(roomId: string): Promise<Player[]> {
    return this.db.select().from(players).where(eq(players.roomId, roomId));
  }

  async getPlayerById(id: string): Promise<Player | undefined> {
    const [player] = await this.db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async removePlayer(id: string): Promise<void> {
    await this.db.delete(players).where(eq(players.id, id));
  }
}

/** In-memory storage khi không dùng PostgreSQL (không cần DATABASE_URL). Dữ liệu mất khi restart. */
export class InMemoryStorage implements IStorage {
  private rooms = new Map<string, Room>();
  private roomsByCode = new Map<string, string>();
  private questions = new Map<string, Question[]>();
  private players = new Map<string, Player>();

  private toRoom(row: InsertRoom & { roomCode: string }): Room {
    const id = randomUUID();
    const room: Room = {
      id,
      roomCode: row.roomCode,
      hostName: row.hostName,
      gameMode: row.gameMode ?? "T1",
      timeLimit: row.timeLimit ?? 300,
      answerWindow: row.answerWindow ?? 15,
      stunDuration: row.stunDuration ?? 1,
      correctPull: row.correctPull ?? 10,
      wrongPenalty: row.wrongPenalty ?? 5,
      shuffleQuestions: row.shuffleQuestions ?? false,
      status: "lobby",
      createdAt: new Date(),
    };
    return room;
  }

  private toQuestion(row: InsertQuestion, id: string): Question {
    return {
      id,
      roomId: row.roomId,
      questionText: row.questionText,
      type: row.type ?? "mcq",
      choiceA: row.choiceA ?? null,
      choiceB: row.choiceB ?? null,
      choiceC: row.choiceC ?? null,
      choiceD: row.choiceD ?? null,
      answer: row.answer,
      orderIndex: row.orderIndex ?? 0,
    };
  }

  private toPlayer(row: InsertPlayer, id: string): Player {
    return {
      id,
      roomId: row.roomId,
      nickname: row.nickname,
      team: row.team ?? null,
      isHost: row.isHost ?? false,
    };
  }

  async createRoom(room: InsertRoom & { roomCode: string }): Promise<Room> {
    const created = this.toRoom(room);
    this.rooms.set(created.id, created);
    this.roomsByCode.set(created.roomCode.toUpperCase(), created.id);
    return created;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const id = this.roomsByCode.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  async getRoomById(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async updateRoomStatus(id: string, status: "lobby" | "running" | "ended"): Promise<void> {
    const room = this.rooms.get(id);
    if (room) this.rooms.set(id, { ...room, status });
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const created = this.toQuestion(question, randomUUID());
    const list = this.questions.get(question.roomId) ?? [];
    list.push(created);
    this.questions.set(question.roomId, list);
    return created;
  }

  async createQuestions(questionList: InsertQuestion[]): Promise<Question[]> {
    if (questionList.length === 0) return [];
    const roomId = questionList[0].roomId;
    const list = this.questions.get(roomId) ?? [];
    const created: Question[] = [];
    for (const q of questionList) {
      const row = this.toQuestion(q, randomUUID());
      list.push(row);
      created.push(row);
    }
    this.questions.set(roomId, list);
    return created;
  }

  async getQuestionsByRoomId(roomId: string): Promise<Question[]> {
    const list = this.questions.get(roomId) ?? [];
    return [...list].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const created = this.toPlayer(player, randomUUID());
    const list = this.players.get(player.roomId) ?? [];
    list.push(created);
    this.players.set(player.roomId, list);
    return created;
  }

  async getPlayersByRoomId(roomId: string): Promise<Player[]> {
    return [...(this.players.get(roomId) ?? [])];
  }

  async getPlayerById(id: string): Promise<Player | undefined> {
    for (const list of this.players.values()) {
      const p = list.find((x) => x.id === id);
      if (p) return p;
    }
    return undefined;
  }

  async removePlayer(id: string): Promise<void> {
    for (const [roomId, list] of this.players) {
      const idx = list.findIndex((p) => p.id === id);
      if (idx >= 0) {
        list.splice(idx, 1);
        this.players.set(roomId, list);
        return;
      }
    }
  }
}

export const storage: IStorage =
  db !== undefined ? new DatabaseStorage(db) : new InMemoryStorage();