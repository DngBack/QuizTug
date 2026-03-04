# QuizTug - Classroom Tug-of-War Quiz Game

## Overview
QuizTug is a real-time classroom quiz game platform where two teams compete in a tug-of-war match. Students answer questions and correct answers pull the rope toward their team.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Wouter routing
- **Backend**: Express.js, WebSockets (ws), PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket for live game state synchronization

## Architecture
- `shared/schema.ts` - Database schemas (rooms, questions, players) and game state types
- `server/routes.ts` - REST API + WebSocket game server
- `server/game-engine.ts` - Turn-based game logic engine
- `server/storage.ts` - Database CRUD operations via Drizzle
- `server/db.ts` - PostgreSQL connection pool
- `server/seed.ts` - Demo room seeder

## Frontend Pages
- `/` - Home page (create/join game)
- `/create` - Teacher room creation with CSV upload
- `/join/:code` - Student join flow (pick name + team)
- `/lobby/:code` - Pre-game waiting room
- `/game/:code` - Live gameplay with tug-of-war animation
- `/results/:code` - Post-game results + CSV export

## Key Features
- Mode T1: Alternating turns gameplay
- Real-time rope animation (position from -100 to +100)
- CSV question upload (MCQ, True/False, Short Answer)
- Answer streak multiplier
- Stun mechanic on wrong answers
- Results export to CSV

## Game Flow
1. Teacher creates room with questions (CSV)
2. Students join via 6-character room code
3. Host starts game from lobby
4. Teams alternate answering questions
5. Correct answers pull rope, wrong answers cause stun
6. Game ends when rope hits ±100 or timer runs out

## Database
- PostgreSQL via Drizzle ORM
- Tables: rooms, questions, players
- Game state managed in-memory via WebSocket

## WebSocket Architecture
- Hook uses callback-based `addMessageHandler` pattern (not `lastMessage` state) to prevent message loss during rapid state updates
- Each message is dispatched synchronously to all registered handlers
- Handlers are registered via `addMessageHandler()` which returns a cleanup function
- Reconnection with proper cleanup of old connections and mounted guard

## Game Engine
- Server-side game engine tracks all timers (gameTimer, phaseTimeout, answerCountdown) with proper cleanup
- `stopped` flag prevents callbacks from firing after game ends
- `clearPhaseTimers()` called before every phase transition to prevent duplicate timers
- Game state stored in-memory `gameStates` Map, persists until server restart

## Environment
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
