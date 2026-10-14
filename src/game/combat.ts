// =============================================================================
// Combat System
// Sticky Shadow Legends — Input Processing, Animation, Hit Resolution
// =============================================================================

import type {
  ActionState,
  AttackAction,
  CharacterState,
  InputCommand,
  PlayerId,
} from './types';
import {
  AIR_SPEED,
  ANIMATIONS,
  ATTACK_DATA,
  BLOCK_CHIP,
  BLOCK_PUSHBACK,
  BLOCK_STUN_MS,
  COMBO_DAMAGE_FLOOR,
  COMBO_DAMAGE_STEP,
  DASH_SPEED,
  ENERGY_PER_BLOCK,
  ENERGY_PER_DAMAGE_DEALT,
  ENERGY_PER_DAMAGE_TAKEN,
  JUMP_FORCE,
  MAX_ENERGY,
  SPECIAL_LUNGE_FRAMES,
  SPECIAL_LUNGE_SPEED,
  WALK_SPEED,
} from './constants';

/** Actions that must play out before new input is accepted. */
const LOCKED_ACTIONS: readonly ActionState[] = [
  'PUNCH',
  'KICK',
  'SWORD_SLASH',
  'SPECIAL',
  'DASH_ROLL',
  'HURT',
  'DEATH',
];

export function isAttackAction(action: ActionState): action is AttackAction {
  return (
    action === 'PUNCH' ||
    action === 'KICK' ||
    action === 'SWORD_SLASH' ||
    action === 'SPECIAL'
  );
}

/** Actions whose horizontal speed is scripted rather than slowed by friction. */
export function hasScriptedMovement(action: ActionState): boolean {
  return action === 'DASH_ROLL' || action === 'SPECIAL';
}

function addEnergy(energy: number, amount: number): number {
  return Math.min(MAX_ENERGY, energy + amount);
}

/** True while the character can't respond to input. */
export function isLocked(char: CharacterState): boolean {
  return LOCKED_ACTIONS.includes(char.action) || char.hitStunRemaining > 0;
}

function startAction(
  char: CharacterState,
  action: ActionState,
  overrides: Partial<CharacterState> = {},
): CharacterState {
  return {
    ...char,
    action,
    currentFrame: 0,
    frameTimer: 0,
    activeHitbox: null,
    hasHitCurrentAttack: false,
    ...overrides,
  };
}

// =============================================================================
// processInput
// =============================================================================

/**
 * Apply one input command and return the updated character state.
 *
 * Rules:
 * - Attacks, rolls, HURT, DEATH and hit stun lock out new input.
 * - Grounded characters always turn to face their opponent, so walking away
 *   is a back-walk rather than turning around.
 * - Movement in the air steers without leaving the JUMP state.
 * - Jump, attacks and dash can only start from the ground.
 * - Dash rolls in the direction the character is moving (back-roll when
 *   retreating), or forward when standing still.
 * - BLOCK holds a guard for as long as it is the input; anything else drops it.
 * - SPECIAL needs a full energy bar and spends all of it.
 * - NONE stops a walking character and lowers a guard.
 */
export function processInput(
  char: CharacterState,
  input: InputCommand,
  opponent: CharacterState,
): CharacterState {
  if (isLocked(char)) return char;

  const facing: 1 | -1 = char.isGrounded
    ? opponent.x >= char.x
      ? 1
      : -1
    : char.facing;
  const base = facing === char.facing ? char : { ...char, facing };

  switch (input) {
    case 'MOVE_LEFT':
    case 'MOVE_RIGHT': {
      const dir = input === 'MOVE_LEFT' ? -1 : 1;
      if (!base.isGrounded) return { ...base, vx: dir * AIR_SPEED };
      const walking = base.action === 'WALK' ? base : startAction(base, 'WALK');
      return { ...walking, vx: dir * WALK_SPEED };
    }

    case 'JUMP':
      if (!base.isGrounded) return base;
      return startAction(base, 'JUMP', { vy: JUMP_FORCE, isGrounded: false });

    case 'PUNCH':
    case 'KICK':
    case 'SWORD':
      if (!base.isGrounded) return base;
      return startAction(base, input === 'SWORD' ? 'SWORD_SLASH' : input, {
        vx: 0,
      });

    case 'DASH': {
      if (!base.isGrounded) return base;
      const dir = Math.abs(base.vx) > 0.5 ? Math.sign(base.vx) : base.facing;
      return startAction(base, 'DASH_ROLL', { vx: dir * DASH_SPEED });
    }

    case 'SPECIAL':
      if (!base.isGrounded || base.energy < MAX_ENERGY) return base;
      return startAction(base, 'SPECIAL', { vx: 0, energy: 0 });

    case 'BLOCK':
      if (!base.isGrounded || base.action === 'BLOCK') return base;
      return startAction(base, 'BLOCK', { vx: 0 });

    case 'NONE':
    default:
      if (base.isGrounded && (base.action === 'WALK' || base.action === 'BLOCK')) {
        return startAction(base, 'IDLE', { vx: 0 });
      }
      return base;
  }
}

// =============================================================================
// updateAnimation
// =============================================================================

/**
 * Advance the character's animation by `dt` milliseconds, then derive the
 * active hitbox and invincibility for the resulting frame.
 */
export function updateAnimation(
  char: CharacterState,
  dt: number,
): CharacterState {
  const anim = ANIMATIONS[char.action];
  let { currentFrame, frameTimer } = char;

  frameTimer += dt;
  while (frameTimer >= anim.frameDuration) {
    frameTimer -= anim.frameDuration;
    currentFrame += 1;

    if (currentFrame >= anim.frameCount) {
      if (anim.onEnd === 'loop') {
        currentFrame = 0;
      } else if (anim.onEnd === 'hold') {
        currentFrame = anim.frameCount - 1;
        frameTimer = 0;
        break;
      } else {
        return startAction(char, char.isGrounded ? 'IDLE' : 'JUMP', {
          invincible: false,
          vx: hasScriptedMovement(char.action) ? 0 : char.vx,
        });
      }
    }
  }

  const activeHitbox =
    isAttackAction(char.action) && anim.activeHitFrames?.includes(currentFrame)
      ? ATTACK_DATA[char.action].hitbox
      : null;
  const invincible = anim.invincibleFrames?.includes(currentFrame) ?? false;

  // The special lunges forward on its strike frames and is planted otherwise.
  const vx =
    char.action === 'SPECIAL'
      ? SPECIAL_LUNGE_FRAMES.includes(currentFrame)
        ? char.facing * SPECIAL_LUNGE_SPEED
        : 0
      : char.vx;

  return { ...char, currentFrame, frameTimer, activeHitbox, invincible, vx };
}

/** Age the combo popup clock (capped so it doesn't grow forever). */
export function updateComboTimer(char: CharacterState, dt: number): CharacterState {
  if (char.comboTimer >= 10_000) return char;
  return { ...char, comboTimer: char.comboTimer + dt };
}

// =============================================================================
// Landing & hit stun
// =============================================================================

/** End the jump state once the character is back on the ground. */
export function resolveLanding(char: CharacterState): CharacterState {
  if (char.action === 'JUMP' && char.isGrounded) {
    return startAction(char, 'IDLE');
  }
  return char;
}

/** Count down hit stun; HURT ends once it expires and the character has landed. */
export function updateHitStun(char: CharacterState, dt: number): CharacterState {
  const hitStunRemaining = Math.max(0, char.hitStunRemaining - dt);
  if (char.action === 'HURT' && hitStunRemaining === 0 && char.isGrounded) {
    return startAction(char, 'IDLE', { hitStunRemaining });
  }
  if (hitStunRemaining === char.hitStunRemaining) return char;
  return { ...char, hitStunRemaining };
}

// =============================================================================
// applyHit
// =============================================================================

/** How a confirmed hit resolves, computed from the pre-hit snapshot. */
export interface HitOutcome {
  attack: AttackAction;
  blocked: boolean;
  damage: number;
  /** The attacker's combo count including this hit. */
  combo: number;
}

/**
 * A guard stops everything except the special, as long as the attacker is in
 * front of the defender (a cross-up from behind still connects).
 */
export function isBlocking(defender: CharacterState, attacker: CharacterState): boolean {
  if (defender.action !== 'BLOCK' || attacker.action === 'SPECIAL') return false;
  return Math.sign(attacker.x - defender.x) !== -defender.facing;
}

/**
 * Work out damage for a hit (hitbox ∩ hurtbox already confirmed). Hits on a
 * defender who is still reeling extend the combo, and each extra hit is
 * scaled down so combos can't delete a full health bar.
 */
export function hitOutcome(
  attacker: CharacterState,
  defender: CharacterState,
): HitOutcome | null {
  if (!isAttackAction(attacker.action)) return null;
  const attack = attacker.action;
  const data = ATTACK_DATA[attack];

  if (isBlocking(defender, attacker)) {
    return {
      attack,
      blocked: true,
      damage: Math.round(data.damage * BLOCK_CHIP),
      combo: attacker.combo,
    };
  }

  const combo = defender.action === 'HURT' ? attacker.combo + 1 : 1;
  const scale = Math.max(COMBO_DAMAGE_FLOOR, 1 - COMBO_DAMAGE_STEP * (combo - 1));
  return {
    attack,
    blocked: false,
    damage: Math.max(1, Math.round(data.damage * scale)),
    combo,
  };
}

/**
 * Apply damage and knockback to the defender.
 * Blocked hits chip a little health (never fatal) and push back; clean hits
 * force HURT, or DEATH (with a bigger launch) if the hit is fatal.
 */
export function applyHit(
  attacker: CharacterState,
  defender: CharacterState,
  outcome: HitOutcome,
): CharacterState {
  const data = ATTACK_DATA[outcome.attack];

  if (outcome.blocked) {
    return {
      ...defender,
      health: Math.max(1, defender.health - outcome.damage),
      hitStunRemaining: BLOCK_STUN_MS,
      vx: data.knockback.x * BLOCK_PUSHBACK * attacker.facing,
      energy: addEnergy(defender.energy, ENERGY_PER_BLOCK),
    };
  }

  const health = Math.max(0, defender.health - outcome.damage);
  const isDead = health <= 0;
  const vy = isDead ? -6 : data.knockback.y;

  return startAction(defender, isDead ? 'DEATH' : 'HURT', {
    health,
    hitStunRemaining: isDead ? 0 : data.hitStun,
    vx: data.knockback.x * (isDead ? 1.5 : 1) * attacker.facing,
    vy,
    isGrounded: defender.isGrounded && vy >= 0,
    invincible: false,
    energy: addEnergy(defender.energy, outcome.damage * ENERGY_PER_DAMAGE_TAKEN),
  });
}

/** Credit the attacker: mark the attack as spent, grow the combo and energy. */
export function creditHit(attacker: CharacterState, outcome: HitOutcome): CharacterState {
  // The special just spent the bar, so it doesn't refund any.
  const energy =
    outcome.attack === 'SPECIAL'
      ? attacker.energy
      : addEnergy(attacker.energy, outcome.damage * ENERGY_PER_DAMAGE_DEALT);

  if (outcome.blocked) return { ...attacker, hasHitCurrentAttack: true, energy };
  return {
    ...attacker,
    hasHitCurrentAttack: true,
    energy,
    combo: outcome.combo,
    comboTimer: 0,
  };
}

// =============================================================================
// decideWinner
// =============================================================================

/**
 * Decide the round result: a KO wins outright, otherwise when time runs out
 * the healthier fighter wins. Returns null while the round is still on.
 */
export function decideWinner(
  players: [CharacterState, CharacterState],
  roundTimer: number,
): PlayerId | 'DRAW' | null {
  const [p1, p2] = players;
  const p1Out = p1.health <= 0;
  const p2Out = p2.health <= 0;

  if (p1Out && p2Out) return 'DRAW';
  if (p1Out) return p2.id;
  if (p2Out) return p1.id;
  if (roundTimer > 0) return null;
  if (p1.health === p2.health) return 'DRAW';
  return p1.health > p2.health ? p1.id : p2.id;
}
