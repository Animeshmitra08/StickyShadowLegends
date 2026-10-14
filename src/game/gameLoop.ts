// =============================================================================
// Game Loop
// Sticky Shadow Legends — Core tick function and initial state factory
// =============================================================================

import type {
  CharacterState,
  GameState,
  HitSpark,
  InputCommand,
  PlayerId,
  RoundResult,
} from './types';
import {
  DEFAULT_ARENA,
  HIT_STOP_MS,
  INTRO_MS,
  MAX_HEALTH,
  MAX_ROUNDS,
  ROUND_OUTRO_MS,
  ROUND_TIME_MS,
  SHAKE_MS,
  SPARK_LIFE_MS,
  STEP_MS,
} from './constants';
import { updatePhysics, separateFighters } from './physics';
import {
  checkHit,
  getWorldHitbox,
  getWorldHurtbox,
  overlapCenter,
} from './collision';
import {
  type HitOutcome,
  applyHit,
  creditHit,
  decideWinner,
  hitOutcome,
  processInput,
  resolveLanding,
  updateAnimation,
  updateComboTimer,
  updateHitStun,
} from './combat';

export function createCharacter(
  id: PlayerId,
  x: number,
  facing: 1 | -1,
  energy = 0,
): CharacterState {
  const char: CharacterState = {
    id,
    x,
    y: DEFAULT_ARENA.groundY,
    vx: 0,
    vy: 0,
    isGrounded: true,
    facing,
    action: 'IDLE',
    currentFrame: 0,
    frameTimer: 0,
    hurtbox: { x: 0, y: 0, width: 0, height: 0 },
    activeHitbox: null,
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    hitStunRemaining: 0,
    invincible: false,
    hasHitCurrentAttack: false,
    energy,
    combo: 0,
    comboTimer: Infinity,
  };
  return { ...char, hurtbox: getWorldHurtbox(char) };
}

function spawnSpark(
  attacker: CharacterState,
  defender: CharacterState,
  outcome: HitOutcome,
): HitSpark {
  const hitbox = getWorldHitbox(attacker) ?? defender.hurtbox;
  const center = overlapCenter(hitbox, getWorldHurtbox(defender));
  const kind: HitSpark['kind'] = outcome.blocked
    ? 'block'
    : outcome.attack === 'SPECIAL'
      ? 'shadow'
      : outcome.attack === 'SWORD_SLASH'
        ? 'heavy'
        : 'hit';
  return { ...center, age: 0, kind };
}

function ageSparks(sparks: HitSpark[], dt: number): HitSpark[] {
  if (sparks.length === 0) return sparks;
  return sparks
    .map((s) => ({ ...s, age: s.age + dt }))
    .filter((s) => s.age < SPARK_LIFE_MS);
}

/** Freeze length for a hit: short on a block, long for the special. */
function hitStopFor(outcome: HitOutcome): number {
  if (outcome.blocked) return HIT_STOP_MS * 0.5;
  if (outcome.attack === 'SPECIAL') return HIT_STOP_MS * 2.5;
  return HIT_STOP_MS;
}

function shakesScreen(outcome: HitOutcome, defender: CharacterState): boolean {
  if (outcome.blocked) return false;
  return (
    outcome.attack === 'SPECIAL' ||
    outcome.attack === 'SWORD_SLASH' ||
    defender.action === 'DEATH'
  );
}

/** Fresh fighters at their start marks. Shadow energy carries over between rounds. */
function startRound(state: GameState, round: number): GameState {
  const [p1, p2] = state.players;
  return {
    ...state,
    players: [
      createCharacter('P1', DEFAULT_ARENA.width * 0.3, 1, p1.energy),
      createCharacter('P2', DEFAULT_ARENA.width * 0.7, -1, p2.energy),
    ],
    phase: 'INTRO',
    introTimer: INTRO_MS,
    winner: null,
    roundTimer: ROUND_TIME_MS,
    outroTimer: 0,
    round,
    hitStop: 0,
    shake: 0,
    sparks: [],
  };
}

/** After the round-over pause: end the match or start the next round. */
function advanceRound(state: GameState): GameState {
  const { wins, roundsToWin, round } = state;
  const champion: PlayerId | null =
    wins.P1 >= roundsToWin ? 'P1' : wins.P2 >= roundsToWin ? 'P2' : null;

  if (champion || round >= MAX_ROUNDS) {
    const matchWinner: RoundResult =
      champion ?? (wins.P1 === wins.P2 ? 'DRAW' : wins.P1 > wins.P2 ? 'P1' : 'P2');
    return { ...state, phase: 'MATCH_OVER', matchWinner };
  }
  return startRound(state, round + 1);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface MatchOptions {
  /** Round wins needed to take the match (1 = single round, 2 = best of 3…). */
  roundsToWin?: number;
}

/** Create the initial game state with two characters facing each other. */
export function createInitialGameState({ roundsToWin = 2 }: MatchOptions = {}): GameState {
  return {
    players: [
      createCharacter('P1', DEFAULT_ARENA.width * 0.3, 1),
      createCharacter('P2', DEFAULT_ARENA.width * 0.7, -1),
    ],
    arena: { ...DEFAULT_ARENA },
    phase: 'INTRO',
    introTimer: INTRO_MS,
    isPaused: false,
    winner: null,
    roundTimer: ROUND_TIME_MS,
    outroTimer: 0,
    round: 1,
    roundsToWin,
    wins: { P1: 0, P2: 0 },
    matchWinner: null,
    hitStop: 0,
    shake: 0,
    sparks: [],
  };
}

/**
 * Advance game state by one fixed step.
 * @param state    Current game state
 * @param p1Input  Player 1 input command
 * @param p2Input  Player 2 (AI) input command
 * @param dt       Step length in milliseconds (normally STEP_MS)
 * @returns        Next game state
 */
export function gameTick(
  state: GameState,
  p1Input: InputCommand,
  p2Input: InputCommand,
  dt: number,
): GameState {
  if (state.isPaused) return state;

  const sparks = ageSparks(state.sparks, dt);
  let shake = Math.max(0, state.shake - dt);

  // Hit-stop: everything except effects freezes for a few frames on impact.
  if (state.hitStop > 0) {
    return { ...state, hitStop: Math.max(0, state.hitStop - dt), shake, sparks };
  }

  let { phase, introTimer, roundTimer, winner, outroTimer, wins } = state;
  if (phase === 'INTRO') {
    introTimer = Math.max(0, introTimer - dt);
    if (introTimer === 0) phase = 'FIGHT';
  }
  const fighting = phase === 'FIGHT';

  const [prev1, prev2] = state.players;

  // 1. Input (both read the opponent's pre-tick position)
  let p1 = processInput(prev1, fighting ? p1Input : 'NONE', prev2);
  let p2 = processInput(prev2, fighting ? p2Input : 'NONE', prev1);

  // 2. Animation timers
  p1 = updateAnimation(p1, dt);
  p2 = updateAnimation(p2, dt);

  // 3. Physics, pushboxes, landing
  const stepDt = dt / STEP_MS;
  p1 = updatePhysics(p1, state.arena, stepDt);
  p2 = updatePhysics(p2, state.arena, stepDt);
  [p1, p2] = separateFighters(p1, p2, state.arena);
  p1 = resolveLanding(p1);
  p2 = resolveLanding(p2);

  // 4. Hurtboxes
  p1 = { ...p1, hurtbox: getWorldHurtbox(p1) };
  p2 = { ...p2, hurtbox: getWorldHurtbox(p2) };

  // 5. Combat — both checks use the same snapshot so trades are symmetric.
  let hitStop = 0;
  const newSparks: HitSpark[] = [];
  if (fighting) {
    const [a1, a2] = [p1, p2];
    const o1 = checkHit(a1, a2) ? hitOutcome(a1, a2) : null;
    const o2 = checkHit(a2, a1) ? hitOutcome(a2, a1) : null;
    if (o1) {
      newSparks.push(spawnSpark(a1, a2, o1));
      p1 = creditHit(p1, o1);
      p2 = applyHit(a1, p2, o1);
      hitStop = Math.max(hitStop, hitStopFor(o1));
      if (shakesScreen(o1, p2)) shake = SHAKE_MS;
    }
    if (o2) {
      newSparks.push(spawnSpark(a2, a1, o2));
      p2 = creditHit(p2, o2);
      p1 = applyHit(a2, p1, o2);
      hitStop = Math.max(hitStop, hitStopFor(o2));
      if (shakesScreen(o2, p1)) shake = SHAKE_MS;
    }
  }

  // 6. Hit stun & combo clocks
  p1 = updateComboTimer(updateHitStun(p1, dt), dt);
  p2 = updateComboTimer(updateHitStun(p2, dt), dt);

  // 7. Round timer & win conditions
  if (fighting) {
    roundTimer = Math.max(0, roundTimer - dt);
    winner = decideWinner([p1, p2], roundTimer);
    if (winner !== null) {
      phase = 'ROUND_OVER';
      outroTimer = ROUND_OUTRO_MS;
      if (winner !== 'DRAW') wins = { ...wins, [winner]: wins[winner] + 1 };
    }
  } else if (phase === 'ROUND_OVER') {
    outroTimer = Math.max(0, outroTimer - dt);
  }

  const next: GameState = {
    ...state,
    players: [p1, p2],
    phase,
    introTimer,
    winner,
    roundTimer,
    outroTimer,
    wins,
    hitStop,
    shake,
    sparks: newSparks.length > 0 ? [...sparks, ...newSparks] : sparks,
  };

  return phase === 'ROUND_OVER' && outroTimer === 0 ? advanceRound(next) : next;
}
