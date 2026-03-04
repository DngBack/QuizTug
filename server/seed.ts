import { storage } from "./storage";
import { log } from "./index";

export async function seedDemoRoom() {
  try {
    const existing = await storage.getRoomByCode("DEMO01");
    if (existing) {
      log("Demo room already exists, skipping seed", "seed");
      return;
    }

    const room = await storage.createRoom({
      hostName: "Ms. Johnson",
      gameMode: "T1",
      timeLimit: 300,
      answerWindow: 15,
      stunDuration: 1,
      correctPull: 10,
      wrongPenalty: 5,
      shuffleQuestions: false,
      roomCode: "DEMO01",
    });

    await storage.createQuestions([
      {
        roomId: room.id,
        questionText: "What is the capital of France?",
        type: "mcq",
        choiceA: "London",
        choiceB: "Paris",
        choiceC: "Berlin",
        choiceD: "Madrid",
        answer: "B",
        orderIndex: 0,
      },
      {
        roomId: room.id,
        questionText: "What is 7 x 8?",
        type: "mcq",
        choiceA: "54",
        choiceB: "48",
        choiceC: "56",
        choiceD: "64",
        answer: "C",
        orderIndex: 1,
      },
      {
        roomId: room.id,
        questionText: "The Earth revolves around the Sun",
        type: "true_false",
        choiceA: "True",
        choiceB: "False",
        choiceC: null,
        choiceD: null,
        answer: "A",
        orderIndex: 2,
      },
      {
        roomId: room.id,
        questionText: "Which planet is known as the Red Planet?",
        type: "mcq",
        choiceA: "Venus",
        choiceB: "Jupiter",
        choiceC: "Mars",
        choiceD: "Saturn",
        answer: "C",
        orderIndex: 3,
      },
      {
        roomId: room.id,
        questionText: "Water boils at 100 degrees Celsius at sea level",
        type: "true_false",
        choiceA: "True",
        choiceB: "False",
        choiceC: null,
        choiceD: null,
        answer: "A",
        orderIndex: 4,
      },
      {
        roomId: room.id,
        questionText: "What is the largest ocean on Earth?",
        type: "mcq",
        choiceA: "Atlantic",
        choiceB: "Indian",
        choiceC: "Arctic",
        choiceD: "Pacific",
        answer: "D",
        orderIndex: 5,
      },
      {
        roomId: room.id,
        questionText: "How many continents are there?",
        type: "mcq",
        choiceA: "5",
        choiceB: "6",
        choiceC: "7",
        choiceD: "8",
        answer: "C",
        orderIndex: 6,
      },
      {
        roomId: room.id,
        questionText: "Which element has the symbol 'O'?",
        type: "mcq",
        choiceA: "Gold",
        choiceB: "Oxygen",
        choiceC: "Osmium",
        choiceD: "Oganesson",
        answer: "B",
        orderIndex: 7,
      },
    ]);

    await storage.createPlayer({
      roomId: room.id,
      nickname: "Ms. Johnson",
      team: null,
      isHost: true,
    });

    log("Demo room DEMO01 seeded successfully", "seed");
  } catch (error: any) {
    log(`Seed error: ${error.message}`, "seed");
  }
}
