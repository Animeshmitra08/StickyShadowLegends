// =============================================================================
// Match Settings
// Sticky Shadow Legends — Options chosen on the home screen
// =============================================================================

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'APPRENTICE',
  normal: 'WARRIOR',
  hard: 'SHADOW MASTER',
};

/** Round wins needed to take the match, offered as best-of-1 / 3 / 5. */
export const ROUNDS_TO_WIN_OPTIONS: readonly number[] = [1, 2, 3];

export function bestOfLabel(roundsToWin: number): string {
  return roundsToWin === 1 ? 'SINGLE ROUND' : `BEST OF ${roundsToWin * 2 - 1}`;
}

/** Read route params defensively — anything unexpected falls back to defaults. */
export function parseDifficulty(value: unknown): Difficulty {
  return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : 'normal';
}

export function parseRoundsToWin(value: unknown): number {
  const n = Number(value);
  return ROUNDS_TO_WIN_OPTIONS.includes(n) ? n : 2;
}

/** Next item in a list, wrapping around — used by the tap-to-cycle menus. */
export function cycle<T>(options: readonly T[], current: T): T {
  return options[(options.indexOf(current) + 1) % options.length];
}
