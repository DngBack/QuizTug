# QuizTug (TugMind)

A real-time tug-of-war web game: answer correctly to pull the rope toward your team; wrong answers stun you. Built with Next.js, Supabase, and Phaser 3.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind + shadcn/ui
- **Phaser 3** for 2D game (rope bar, timer, question panel, character placeholders, tweens)
- **Supabase** (Auth, Postgres, Realtime)
- **Vercel** (deploy)

## Setup

1. Clone and install: `npm install`
2. Create a [Supabase](https://supabase.com) project. In SQL Editor, run the migration in `supabase/migrations/20250228000001_initial_schema.sql`.
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional; used if you add server-side admin logic)
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`) for magic link redirect
4. In Supabase Dashboard: Authentication → URL Configuration, add `http://localhost:3000/auth/callback` (and your production URL) as redirect URLs.
5. Run: `npm run dev` (requires Node 20+ for Next.js 16)

## Flow

- **Landing:** Students enter room code + name to join. Teachers click "Teacher: Create room" and sign in with magic link, then create a room.
- **Teacher dashboard** (`/teacher/room/[code]`): Upload CSV questions (header: `prompt,a,b,c,d,correct,explanation`), then Start match. Use End round → Next round to advance. Live stats and player list.
- **Student lobby** (`/room/[code]`): Pick team A/B, Ready. When the teacher starts, the game (Phaser) loads: rope bar, timer, question and choices. Submit an answer; correct = pull + feedback, wrong = red overlay + 2s stun.
- **Result:** When the rope reaches ±100 or the match ends, the winner and breakdown are shown.

## MVP mode

Mode A (Team Accuracy Battle) is implemented: shared question, one shot per player, team power = 0.8×accuracy + 0.2×speed bonus, rope delta from power difference (K=20, maxStep=12).
