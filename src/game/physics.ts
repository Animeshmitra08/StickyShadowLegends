import type { ArenaConfig, CharacterState } from './types';
import {
  AIR_FRICTION,
  GRAVITY,
  GROUND_FRICTION,
  MAX_FALL_SPEED,
  MIN_SEPARATION,
  PUSHBOX_HEIGHT,
} from './constants';
import { hasScriptedMovement } from './combat';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Per-step physics: gravity → movement → bounds/ground → friction.
 *
 * `dt` is the step multiplier (1.0 for one fixed 60 fps step). Gravity and
 * friction are scaled by it so behaviour stays consistent if it ever varies.
 *
 * Gravity is applied every step; standing characters are simply snapped back
 * to the ground, so `isGrounded` is always derived from position and anything
 * that launches a character upward (jumps, knockback) works without extra
 * bookkeeping.
 */
export function updatePhysics(
  char: CharacterState,
  arena: ArenaConfig,
  dt: number,
): CharacterState {
  let vy = Math.min(char.vy + GRAVITY * dt, MAX_FALL_SPEED);
  let vx = char.vx;
  let x = char.x + vx * dt;
  let y = char.y + vy * dt;

  if (x < arena.leftBound) {
    x = arena.leftBound;
    vx = 0;
  } else if (x > arena.rightBound) {
    x = arena.rightBound;
    vx = 0;
  }

  const isGrounded = y >= arena.groundY;
  if (isGrounded) {
    y = arena.groundY;
    vy = 0;
  }

  // Dash rolls and the special's lunge set their own speed each step.
  if (!hasScriptedMovement(char.action)) {
    vx *= Math.pow(isGrounded ? GROUND_FRICTION : AIR_FRICTION, dt);
    if (Math.abs(vx) < 0.05) vx = 0;
  }

  return { ...char, x, y, vx, vy, isGrounded };
}

/**
 * Keep fighters from walking through each other.
 * Skipped while either is rolling (rolls pass through) or when one is
 * high enough above the other to jump over.
 */
export function separateFighters(
  a: CharacterState,
  b: CharacterState,
  arena: ArenaConfig,
): [CharacterState, CharacterState] {
  if (a.action === 'DASH_ROLL' || b.action === 'DASH_ROLL') return [a, b];
  if (Math.abs(a.y - b.y) > PUSHBOX_HEIGHT) return [a, b];

  const dx = b.x - a.x;
  const overlap = MIN_SEPARATION - Math.abs(dx);
  if (overlap <= 0) return [a, b];

  // Direction from a to b; fall back to facing when perfectly stacked.
  const dir = dx !== 0 ? Math.sign(dx) : a.facing;
  const { leftBound, rightBound } = arena;
  const wantAx = a.x - (dir * overlap) / 2;
  let ax = clamp(wantAx, leftBound, rightBound);
  let bx = clamp(b.x + (dir * overlap) / 2, leftBound, rightBound);

  // Pinned against a wall: the free fighter takes the whole push.
  if (Math.abs(bx - ax) < MIN_SEPARATION) {
    if (ax !== wantAx) {
      bx = clamp(ax + dir * MIN_SEPARATION, leftBound, rightBound);
    } else {
      ax = clamp(bx - dir * MIN_SEPARATION, leftBound, rightBound);
    }
  }

  return [
    { ...a, x: ax },
    { ...b, x: bx },
  ];
}
