import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { GameEngine } from "./game-engine";
import type { GameState, Question, WSMessage } from "@shared/schema";
import { log } from "./index";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(csvData: string): Array<{
  questionText: string;
  type: "mcq" | "true_false" | "short_answer";
  choiceA: string | null;
  choiceB: string | null;
  choiceC: string | null;
  choiceD: string | null;
  answer: string;
  orderIndex: number;
}> {
  const lines = csvData.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one question row");

  const questions: Array<any> = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 3) {
      errors.push(`Row ${i + 1}: too few columns (need at least id, question, type)`);
      continue;
    }

    const [_id, question, type, choiceA, choiceB, choiceC, choiceD, answer] = parts;
    if (!question) {
      errors.push(`Row ${i + 1}: missing question text`);
      continue;
    }
    if (!answer) {
      errors.push(`Row ${i + 1}: missing answer`);
      continue;
    }

    const qType = type === "true_false" ? "true_false" :
                  type === "short_answer" ? "short_answer" : "mcq";

    if (qType === "mcq" && (!choiceA || !choiceB)) {
      errors.push(`Row ${i + 1}: MCQ needs at least two choices`);
      continue;
    }

    questions.push({
      questionText: question,
      type: qType,
      choiceA: choiceA || null,
      choiceB: choiceB || null,
      choiceC: choiceC || null,
      choiceD: choiceD || null,
      answer: answer,
      orderIndex: i - 1,
    });
  }

  if (questions.length === 0) {
    const detail = errors.length > 0 ? `: ${errors.join("; ")}` : "";
    throw new Error(`No valid questions found in CSV${detail}`);
  }
  return questions;
}

interface RoomClients {
  [playerId: string]: WebSocket;
}

const roomConnections: Map<string, RoomClients> = new Map();
const activeGames: Map<string, GameEngine> = new Map();
const gameStates: Map<string, GameState> = new Map();

function broadcastToRoom(roomId: string, message: WSMessage, excludePlayerId?: string) {
  const clients = roomConnections.get(roomId);
  if (!clients) return;
  const data = JSON.stringify(message);
  for (const [pid, ws] of Object.entries(clients)) {
    if (pid !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendToPlayer(roomId: string, playerId: string, message: WSMessage) {
  const clients = roomConnections.get(roomId);
  if (!clients) return;
  const ws = clients[playerId];
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const roomId = url.searchParams.get("roomId");
    const playerId = url.searchParams.get("playerId");

    if (!roomId || !playerId) {
      ws.close(1008, "Missing roomId or playerId");
      return;
    }

    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, {});
    }
    roomConnections.get(roomId)![playerId] = ws;

    log(`Player ${playerId} connected to room ${roomId}`, "ws");

    broadcastToRoom(roomId, { type: "player_joined", payload: { playerId } });

    const currentState = gameStates.get(roomId);
    if (currentState) {
      ws.send(JSON.stringify({ type: "game_state", payload: currentState }));
    }

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;

        switch (message.type) {
          case "start_game": {
            const room = await storage.getRoomById(roomId);
            if (!room) break;

            const player = await storage.getPlayerById(playerId);
            if (!player?.isHost) break;

            const questions = await storage.getQuestionsByRoomId(roomId);
            if (questions.length === 0) break;

            await storage.updateRoomStatus(roomId, "running");

            const engine = new GameEngine(room, questions, {
              onStateChange: (state) => {
                gameStates.set(roomId, state);
                broadcastToRoom(roomId, { type: "game_state", payload: state });
              },
              onQuestion: (question) => {
                const { answer, ...safeQuestion } = question;
                broadcastToRoom(roomId, { type: "question", payload: safeQuestion });
              },
              onAnswerResult: (result) => {
                broadcastToRoom(roomId, { type: "answer_result", payload: result });
              },
              onGameEnd: async (state) => {
                gameStates.set(roomId, state);
                await storage.updateRoomStatus(roomId, "ended");
                broadcastToRoom(roomId, { type: "game_ended", payload: state });
                activeGames.delete(roomId);
              },
            });

            activeGames.set(roomId, engine);
            broadcastToRoom(roomId, { type: "game_started", payload: {} });

            setTimeout(() => engine.start(), 500);
            break;
          }

          case "submit_answer": {
            const engine = activeGames.get(roomId);
            if (!engine) {
              ws.send(JSON.stringify({ type: "error", payload: { message: "Game not active" } }));
              break;
            }

            const answeringPlayer = await storage.getPlayerById(playerId);
            if (!answeringPlayer?.team) {
              ws.send(JSON.stringify({ type: "error", payload: { message: "Not a team player" } }));
              break;
            }

            if (answeringPlayer.isHost) {
              ws.send(JSON.stringify({ type: "error", payload: { message: "Host cannot answer" } }));
              break;
            }

            const answer = message.payload?.answer;
            if (!answer || typeof answer !== "string") {
              ws.send(JSON.stringify({ type: "error", payload: { message: "Invalid answer" } }));
              break;
            }

            engine.submitAnswer(playerId, answeringPlayer.team, answer);
            break;
          }
        }
      } catch (err) {
        log(`WS message error: ${err}`, "ws");
      }
    });

    ws.on("close", () => {
      const clients = roomConnections.get(roomId);
      if (clients) {
        delete clients[playerId];
        if (Object.keys(clients).length === 0) {
          roomConnections.delete(roomId);
          const engine = activeGames.get(roomId);
          if (engine) {
            engine.stop();
            activeGames.delete(roomId);
          }
        }
      }
      broadcastToRoom(roomId, { type: "player_left", payload: { playerId } });
      log(`Player ${playerId} disconnected from room ${roomId}`, "ws");
    });
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const { hostName, timeLimit, answerWindow, stunDuration, correctPull, wrongPenalty, shuffleQuestions, csvData } = req.body;

      if (!hostName || !csvData) {
        return res.status(400).json({ message: "Host name and questions are required" });
      }

      const parsedQuestions = parseCSV(csvData);

      let roomCode = generateRoomCode();
      let existing = await storage.getRoomByCode(roomCode);
      while (existing) {
        roomCode = generateRoomCode();
        existing = await storage.getRoomByCode(roomCode);
      }

      const room = await storage.createRoom({
        hostName,
        gameMode: "T1",
        timeLimit: timeLimit || 300,
        answerWindow: answerWindow || 15,
        stunDuration: stunDuration || 1,
        correctPull: correctPull || 10,
        wrongPenalty: wrongPenalty || 5,
        shuffleQuestions: shuffleQuestions || false,
        roomCode,
      });

      await storage.createQuestions(
        parsedQuestions.map((q) => ({
          roomId: room.id,
          ...q,
        }))
      );

      const hostPlayer = await storage.createPlayer({
        roomId: room.id,
        nickname: hostName,
        team: null,
        isHost: true,
      });

      res.json({ roomCode: room.roomCode, roomId: room.id, hostPlayerId: hostPlayer.id });
    } catch (error: any) {
      log(`Create room error: ${error.message}`, "api");
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/rooms/:code", async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      const players = await storage.getPlayersByRoomId(room.id);
      res.json({ room, players });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms/:code/join", async (req, res) => {
    try {
      const { nickname, team } = req.body;
      if (!nickname || !team) {
        return res.status(400).json({ message: "Nickname and team are required" });
      }

      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (room.status !== "lobby") {
        return res.status(400).json({ message: "Game has already started" });
      }

      const player = await storage.createPlayer({
        roomId: room.id,
        nickname,
        team,
        isHost: false,
      });

      broadcastToRoom(room.id, {
        type: "player_joined",
        payload: { playerId: player.id, nickname, team },
      });

      res.json({ playerId: player.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/:code/results", async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const players = await storage.getPlayersByRoomId(room.id);
      const gameState = gameStates.get(room.id);

      if (!gameState) {
        return res.status(404).json({ message: "Game results not available" });
      }

      res.json({ room, players, gameState });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/:code/export", async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const players = await storage.getPlayersByRoomId(room.id);
      const gameState = gameStates.get(room.id);

      let csv = "Metric,Team A,Team B\n";
      csv += `Score,${gameState?.teamAScore || 0},${gameState?.teamBScore || 0}\n`;
      csv += `Correct Answers,${gameState?.teamACorrect || 0},${gameState?.teamBCorrect || 0}\n`;
      csv += `Rope Position,,${gameState?.ropePosition || 0}\n`;
      csv += `Winner,,${gameState?.winner || "N/A"}\n`;
      csv += `\nPlayers\n`;
      csv += `Nickname,Team\n`;
      players.filter(p => !p.isHost).forEach(p => {
        csv += `${p.nickname},Team ${p.team}\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="quiztug-results-${req.params.code}.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
