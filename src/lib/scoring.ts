// Mode A (Team Accuracy Battle): team_power, rope_delta

const K = 20;
const MAX_STEP = 12;
const ROPE_MIN = -100;
const ROPE_MAX = 100;

export interface AnswerForScoring {
  is_correct: boolean;
  rt_ms: number;
}

export function computeTeamPower(
  answers: AnswerForScoring[],
  teamSize: number,
  timeLimitMs: number
): number {
  if (teamSize <= 0) return 0;
  const correctAnswers = answers.filter((a) => a.is_correct);
  const acc = correctAnswers.length / teamSize;
  if (correctAnswers.length === 0) return 0.8 * acc; // speed_bonus = 0
  const speedBonus =
    correctAnswers.reduce(
      (sum, a) => sum + Math.max(0, 1 - a.rt_ms / timeLimitMs),
      0
    ) / correctAnswers.length;
  return 0.8 * acc + 0.2 * speedBonus;
}

export function computeRopeDelta(
  powerA: number,
  powerB: number,
  k: number = K,
  maxStep: number = MAX_STEP
): number {
  const raw = (powerA - powerB) * k;
  return Math.max(-maxStep, Math.min(maxStep, raw));
}

export function clampRopePos(ropePos: number): number {
  return Math.max(ROPE_MIN, Math.min(ROPE_MAX, ropePos));
}

export function isMatchOver(ropePos: number): boolean {
  return Math.abs(ropePos) >= 100;
}
