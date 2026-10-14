import type { Box, CharacterState } from './types';
import { DEFAULT_HURTBOX } from './constants';

/**
 * AABB overlap test — returns true if two boxes intersect.
 * Both boxes use top-left origin (x, y) with positive width/height.
 */
export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Centre of the intersection of two overlapping boxes (where sparks spawn). */
export function overlapCenter(a: Box, b: Box): { x: number; y: number } {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

/** The character's hurtbox in world space. */
export function getWorldHurtbox(char: CharacterState): Box {
  return {
    x: char.x + DEFAULT_HURTBOX.x,
    y: char.y + DEFAULT_HURTBOX.y,
    width: DEFAULT_HURTBOX.width,
    height: DEFAULT_HURTBOX.height,
  };
}

/**
 * The attacker's active hitbox in world space, or null if no hitbox is
 * active this frame.
 *
 * The hitbox offset is authored for a right-facing character (facing === 1).
 * When facing left we mirror the x-offset so the hitbox appears on the
 * correct side: `mirroredX = -(offset.x + offset.width)`.
 */
export function getWorldHitbox(char: CharacterState): Box | null {
  const hb = char.activeHitbox;
  if (hb === null) return null;

  const offsetX = char.facing === 1 ? hb.x : -(hb.x + hb.width);
  return {
    x: char.x + offsetX,
    y: char.y + hb.y,
    width: hb.width,
    height: hb.height,
  };
}

/**
 * Returns true when the attacker's active hitbox overlaps the defender's
 * hurtbox this frame.
 */
export function checkHit(
  attacker: CharacterState,
  defender: CharacterState,
): boolean {
  if (
    defender.invincible ||
    defender.action === 'DEATH' ||
    attacker.hasHitCurrentAttack
  ) {
    return false;
  }

  const hitbox = getWorldHitbox(attacker);
  if (hitbox === null) return false;

  return boxesOverlap(hitbox, getWorldHurtbox(defender));
}
