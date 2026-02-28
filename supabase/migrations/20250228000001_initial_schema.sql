-- TugMind MVP: rooms, teams, players, question_sets, questions, rounds, answers
-- Enums
CREATE TYPE room_state AS ENUM (
  'lobby', 'countdown', 'playing', 'round_reveal', 'paused', 'finished'
);
CREATE TYPE room_mode AS ENUM (
  'accuracy_battle', 'speed_clash', 'parallel_tug'
);
CREATE TYPE round_state AS ENUM (
  'round_init', 'answering', 'locked', 'scored', 'revealed'
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mode room_mode NOT NULL DEFAULT 'accuracy_battle',
  state room_state NOT NULL DEFAULT 'lobby',
  rope_pos INTEGER NOT NULL DEFAULT 0 CHECK (rope_pos >= -100 AND rope_pos <= 100),
  current_round INTEGER NOT NULL DEFAULT 0,
  time_limit INTEGER NOT NULL DEFAULT 10,
  question_set_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  power NUMERIC(5,4) NOT NULL DEFAULT 0,
  UNIQUE(room_id, name)
);
CREATE INDEX idx_teams_room_id ON teams(room_id);

-- Question sets
CREATE TABLE question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rooms ADD CONSTRAINT fk_rooms_question_set
  FOREIGN KEY (question_set_id) REFERENCES question_sets(id) ON DELETE SET NULL;

-- Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  c TEXT NOT NULL,
  d TEXT NOT NULL,
  correct TEXT NOT NULL,
  explanation TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_set ON questions(question_set_id);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('teacher', 'player')),
  display_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_ready BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_team_id ON players(team_id);

-- Rounds
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  question_id_A UUID REFERENCES questions(id) ON DELETE SET NULL,
  question_id_B UUID REFERENCES questions(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  state round_state NOT NULL DEFAULT 'round_init',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rounds_room_id ON rounds(room_id);

-- Answers
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  choice TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  rt_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);
CREATE INDEX idx_answers_round_id ON answers(round_id);

-- RLS (allow anon for MVP; tighten later with auth)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all question_sets" ON question_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all questions" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all rounds" ON rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all answers" ON answers FOR ALL USING (true) WITH CHECK (true);
