// =============================================================================
// Player Input
// Sticky Shadow Legends — Turns held/tapped buttons into one command per tick
// =============================================================================

import type { CharacterState, InputCommand } from './types';
import { COMMAND_ACTION, INPUT_BUFFER_MS } from './constants';

export type ControlButton =
  | 'LEFT'
  | 'RIGHT'
  | 'DOWN'
  | 'JUMP'
  | 'PUNCH'
  | 'KICK'
  | 'SWORD'
  | 'DASH'
  | 'SPECIAL';

/**
 * Mutable input state, owned by the game loop.
 * Directions are held; actions are taps buffered for INPUT_BUFFER_MS so a
 * press during recovery still comes out as soon as the fighter is free.
 */
export interface PlayerInput {
  left: boolean;
  right: boolean;
  down: boolean;
  pending: InputCommand | null;
  pendingAge: number;
}

export function createPlayerInput(): PlayerInput {
  return { left: false, right: false, down: false, pending: null, pendingAge: 0 };
}

export function pressButton(input: PlayerInput, button: ControlButton): void {
  if (button === 'LEFT') input.left = true;
  else if (button === 'RIGHT') input.right = true;
  else if (button === 'DOWN') input.down = true;
  else {
    input.pending = button;
    input.pendingAge = 0;
  }
}

export function releaseButton(input: PlayerInput, button: ControlButton): void {
  if (button === 'LEFT') input.left = false;
  else if (button === 'RIGHT') input.right = false;
  else if (button === 'DOWN') input.down = false;
}

/**
 * The command to feed into this tick: a buffered action wins, then holding
 * down guards (down-left / down-right still block), then movement.
 */
export function currentCommand(input: PlayerInput): InputCommand {
  if (input.pending) return input.pending;
  if (input.down) return 'BLOCK';
  if (input.left && !input.right) return 'MOVE_LEFT';
  if (input.right && !input.left) return 'MOVE_RIGHT';
  return 'NONE';
}

/** Clear the buffered action once it starts, or once it expires. */
export function settleInput(
  input: PlayerInput,
  before: CharacterState,
  after: CharacterState,
  dt: number,
): void {
  if (!input.pending) return;
  const expected = COMMAND_ACTION[input.pending];
  const started = after.action === expected && before.action !== expected;
  input.pendingAge += dt;
  if (started || input.pendingAge > INPUT_BUFFER_MS) {
    input.pending = null;
    input.pendingAge = 0;
  }
}
