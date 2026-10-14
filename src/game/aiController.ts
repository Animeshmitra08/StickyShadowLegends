// =============================================================================
// AI Controller
// Sticky Shadow Legends — Simple AI for player 2
// =============================================================================

import type { ActionState, CharacterState, InputCommand } from './types';
import { isAttackAction } from './combat';
import { MAX_ENERGY } from './constants';
import type { Difficulty } from './settings';

export interface AIController {
  /** Command for this tick. Call exactly once per simulation step. */
  getInput(ai: CharacterState, opponent: CharacterState, dt: number): InputCommand;
  reset(): void;
}

interface AIProfile {
  /** Chance to respond to an incoming attack at all. */
  reactChance: number;
  /** Human-like delay before the response comes out (ms). */
  reactDelay: [number, number];
  /** Share of responses that are a block rather than a jump / roll. */
  blockShare: number;
  /** Multiplier on how long each decision is held (lower = busier). */
  tempo: number;
  /** Chance per decision to fire the special when it's ready and in range. */
  specialChance: number;
}

const PROFILES: Record<Difficulty, AIProfile> = {
  easy: { reactChance: 0.15, reactDelay: [280, 400], blockShare: 0.3, tempo: 1.5, specialChance: 0.25 },
  normal: { reactChance: 0.35, reactDelay: [170, 260], blockShare: 0.4, tempo: 1, specialChance: 0.6 },
  hard: { reactChance: 0.65, reactDelay: [100, 170], blockShare: 0.5, tempo: 0.7, specialChance: 0.95 },
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Create a stateful AI. Instead of re-rolling every tick it commits to a
 * decision for a few hundred ms and reacts to attacks after a human-like
 * delay, which makes it readable and beatable. Difficulty tunes reaction
 * speed and chance, how often it guards, and how busy it is.
 *
 * Decision layers:
 * 1. Incapacitated / round over → NONE
 * 2. Delayed defence → BLOCK / JUMP / DASH a beat after an attack starts
 * 3. Special ready   → Shadow Strike when close
 * 4. Far range       → close the gap
 * 5. Mid range       → approach, poke with the sword, or reposition
 * 6. Close range     → attack mix-ups and occasional retreat
 */
export function createAIController(difficulty: Difficulty = 'normal'): AIController {
  const profile = PROFILES[difficulty];
  let decisionTimer = 0;
  let held: InputCommand = 'NONE';
  let reaction: { command: InputCommand; delay: number } | null = null;
  let lastOpponentAction: ActionState = 'IDLE';

  function decide(ai: CharacterState, opponent: CharacterState): InputCommand {
    const dx = opponent.x - ai.x;
    const distance = Math.abs(dx);
    const toward: InputCommand = dx > 0 ? 'MOVE_RIGHT' : 'MOVE_LEFT';
    const away: InputCommand = dx > 0 ? 'MOVE_LEFT' : 'MOVE_RIGHT';
    const rand = Math.random();

    if (ai.energy >= MAX_ENERGY && distance < 70 && Math.random() < profile.specialChance) {
      return 'SPECIAL';
    }

    if (distance > 110) {
      if (rand < 0.75) return toward;
      if (rand < 0.85) return 'DASH';
      if (rand < 0.9) return 'JUMP';
      return 'NONE';
    }

    if (distance > 52) {
      if (rand < 0.45) return toward;
      if (rand < 0.6) return distance < 64 ? 'SWORD' : toward;
      if (rand < 0.72) return 'DASH';
      if (rand < 0.82) return away;
      return 'NONE';
    }

    if (rand < 0.25) return 'PUNCH';
    if (rand < 0.45) return 'KICK';
    if (rand < 0.6) return 'SWORD';
    if (rand < 0.75) return away;
    if (rand < 0.83) return 'JUMP';
    return 'NONE';
  }

  return {
    getInput(ai, opponent, dt) {
      const opponentStartedAttack =
        isAttackAction(opponent.action) && opponent.action !== lastOpponentAction;
      lastOpponentAction = opponent.action;

      if (ai.action === 'HURT' || ai.action === 'DEATH' || opponent.action === 'DEATH') {
        held = 'NONE';
        reaction = null;
        return 'NONE';
      }

      // Spot an incoming attack, but only respond after a reaction delay.
      if (
        opponentStartedAttack &&
        reaction === null &&
        Math.abs(opponent.x - ai.x) < 90 &&
        Math.random() < profile.reactChance
      ) {
        const roll = Math.random();
        reaction = {
          command:
            roll < profile.blockShare
              ? 'BLOCK'
              : roll < (1 + profile.blockShare) / 2
                ? 'JUMP'
                : 'DASH',
          delay: randomBetween(...profile.reactDelay),
        };
      }
      if (reaction) {
        reaction.delay -= dt;
        if (reaction.delay <= 0) {
          const { command } = reaction;
          reaction = null;
          // A guard is held for a moment; dodges fire once.
          held = command === 'BLOCK' ? 'BLOCK' : 'NONE';
          decisionTimer =
            command === 'BLOCK' ? randomBetween(320, 520) : randomBetween(150, 250);
          return command;
        }
      }

      decisionTimer -= dt;
      if (decisionTimer > 0) return held;

      const command = decide(ai, opponent);
      const isMovement = command === 'MOVE_LEFT' || command === 'MOVE_RIGHT';
      // Movement is held until the next decision; actions fire once.
      held = isMovement ? command : 'NONE';
      decisionTimer =
        (isMovement ? randomBetween(180, 360) : randomBetween(250, 450)) * profile.tempo;
      return command;
    },

    reset() {
      decisionTimer = 0;
      held = 'NONE';
      reaction = null;
      lastOpponentAction = 'IDLE';
    },
  };
}
