// =============================================================================
// Game Engine Constants
// Sticky Shadow Legends — Physics, Combat, Animation & Arena Constants
// =============================================================================

import type {
  ActionState,
  AnimationDef,
  ArenaConfig,
  AttackAction,
  AttackData,
  Box,
  InputCommand,
} from './types';

// -----------------------------------------------------------------------------
// Simulation
// -----------------------------------------------------------------------------

/**
 * Fixed simulation step (ms). The loop runs as many fixed steps as real time
 * requires, so gameplay speed is identical on 60 Hz and 120 Hz displays.
 * Velocities below are expressed in pixels per step.
 */
export const STEP_MS = 1000 / 60;

/** Max steps simulated per rendered frame — avoids a spiral after a long stall. */
export const MAX_STEPS_PER_FRAME = 5;

// -----------------------------------------------------------------------------
// Physics
// -----------------------------------------------------------------------------

/** Downward acceleration (pixels / step²). */
export const GRAVITY = 0.8;

/** Horizontal velocity multiplier per step while grounded (< 1 = deceleration). */
export const GROUND_FRICTION = 0.8;

/** Horizontal velocity multiplier per step while airborne. */
export const AIR_FRICTION = 0.98;

/** Terminal fall speed cap (pixels / step). */
export const MAX_FALL_SPEED = 15;

/** Upward impulse applied on jump (negative = upward). */
export const JUMP_FORCE = -13;

/** Walk speed (pixels / step). */
export const WALK_SPEED = 3;

/** Horizontal speed when steering in the air (pixels / step). */
export const AIR_SPEED = 2.5;

/** Constant roll speed for the duration of a dash roll (pixels / step). */
export const DASH_SPEED = 6;

/** Closest two grounded fighters can stand to each other (pushbox width). */
export const MIN_SEPARATION = 26;

/** Vertical gap above which fighters don't push each other (jumping over). */
export const PUSHBOX_HEIGHT = 40;

// -----------------------------------------------------------------------------
// Combat
// -----------------------------------------------------------------------------

/** Starting and maximum health for each character. */
export const MAX_HEALTH = 100;

/** Total round time in milliseconds (99 seconds). */
export const ROUND_TIME_MS = 99_000;

/** Length of the "READY" lock before a round starts. */
export const INTRO_MS = 1_200;

/** How long both fighters freeze when a hit lands. */
export const HIT_STOP_MS = 70;

/** Lifetime of a hit spark effect. */
export const SPARK_LIFE_MS = 260;

/** How long a button press is remembered while the fighter is busy. */
export const INPUT_BUFFER_MS = 150;

/** Screen shake length for heavy hits and the special. */
export const SHAKE_MS = 220;

/** Round-over pause (KO banner + death animation) before the next round. */
export const ROUND_OUTRO_MS = 2_400;

/** Hard cap on rounds so repeated draws can't go on forever. */
export const MAX_ROUNDS = 5;

// Blocking ----------------------------------------------------------------------

/** Fraction of an attack's damage that still gets through a block. */
export const BLOCK_CHIP = 0.15;

/** Lock-out after blocking a hit (ms). */
export const BLOCK_STUN_MS = 160;

/** Knockback multiplier while blocking. */
export const BLOCK_PUSHBACK = 0.6;

// Combos ------------------------------------------------------------------------

/** Each extra hit in a combo deals this much less damage... */
export const COMBO_DAMAGE_STEP = 0.1;

/** ...down to this floor. */
export const COMBO_DAMAGE_FLOOR = 0.5;

/** How long the "n HITS" popup lingers after the last hit (ms). */
export const COMBO_DISPLAY_MS = 1_000;

// Shadow energy ------------------------------------------------------------------

/** Full energy bar; the special costs all of it. */
export const MAX_ENERGY = 100;

/** Energy gained per point of damage dealt / taken, and per blocked hit. */
export const ENERGY_PER_DAMAGE_DEALT = 1.6;
export const ENERGY_PER_DAMAGE_TAKEN = 1.0;
export const ENERGY_PER_BLOCK = 6;

/** Forward lunge speed during the special's strike frames (pixels / step). */
export const SPECIAL_LUNGE_SPEED = 6;

/** Special animation frames that lunge forward. */
export const SPECIAL_LUNGE_FRAMES = [3, 4, 5, 6];

/** Default hurtbox relative to the character's feet. */
export const DEFAULT_HURTBOX: Box = { x: -12, y: -52, width: 24, height: 52 };

/**
 * Per-attack data used by the combat system.
 * Reach from the attacker's centre = hitbox.x + hitbox.width; an attack lands
 * when the opponent's centre is within reach + half the hurtbox width (12).
 */
export const ATTACK_DATA: Record<AttackAction, AttackData> = {
  PUNCH: {
    damage: 8,
    hitStun: 220,
    knockback: { x: 4, y: 0 },
    hitbox: { x: 6, y: -44, width: 26, height: 16 }, // lands within ~44
  },
  KICK: {
    damage: 12,
    hitStun: 300,
    knockback: { x: 6, y: -2 },
    hitbox: { x: 8, y: -30, width: 30, height: 18 }, // lands within ~50
  },
  SWORD_SLASH: {
    damage: 18,
    hitStun: 380,
    knockback: { x: 8, y: -4 },
    hitbox: { x: 10, y: -58, width: 42, height: 46 }, // lands within ~64
  },
  // Shadow Strike — unblockable, costs a full energy bar.
  SPECIAL: {
    damage: 26,
    hitStun: 650,
    knockback: { x: 11, y: -7 },
    hitbox: { x: 0, y: -62, width: 56, height: 62 },
  },
};

/** Which action each input command starts (movement/NONE have none). */
export const COMMAND_ACTION: Partial<Record<InputCommand, ActionState>> = {
  JUMP: 'JUMP',
  PUNCH: 'PUNCH',
  KICK: 'KICK',
  SWORD: 'SWORD_SLASH',
  DASH: 'DASH_ROLL',
  SPECIAL: 'SPECIAL',
};

// -----------------------------------------------------------------------------
// Animation Definitions
// -----------------------------------------------------------------------------

/** One AnimationDef per ActionState. Frame timing also drives attack startup/recovery. */
export const ANIMATIONS: Record<ActionState, AnimationDef> = {
  IDLE: { frameCount: 4, frameDuration: 150, onEnd: 'loop' },
  WALK: { frameCount: 8, frameDuration: 90, onEnd: 'loop' },
  JUMP: { frameCount: 6, frameDuration: 90, onEnd: 'hold' },
  DASH_ROLL: {
    frameCount: 5,
    frameDuration: 60,
    onEnd: 'idle',
    invincibleFrames: [1, 2, 3],
  },
  PUNCH: {
    frameCount: 6,
    frameDuration: 50,
    onEnd: 'idle',
    activeHitFrames: [3, 4],
  },
  KICK: {
    frameCount: 6,
    frameDuration: 60,
    onEnd: 'idle',
    activeHitFrames: [3],
  },
  SWORD_SLASH: {
    frameCount: 8,
    frameDuration: 45,
    onEnd: 'idle',
    activeHitFrames: [4, 5],
  },
  SPECIAL: {
    frameCount: 10,
    frameDuration: 55,
    onEnd: 'idle',
    activeHitFrames: [5, 6, 7],
    // Wind-up is untouchable so the special can't be stuffed by a jab.
    invincibleFrames: [0, 1, 2, 3, 4],
  },
  // Held for as long as block is pressed.
  BLOCK: { frameCount: 1, frameDuration: 1000, onEnd: 'hold' },
  // HURT ends when hit stun runs out, not when the animation does.
  HURT: { frameCount: 3, frameDuration: 100, onEnd: 'hold' },
  DEATH: { frameCount: 4, frameDuration: 150, onEnd: 'hold' },
};

// -----------------------------------------------------------------------------
// Arena
// -----------------------------------------------------------------------------

/** Arena in game units — scaled to fit the device screen at render time. */
export const DEFAULT_ARENA: ArenaConfig = {
  width: 640,
  height: 320,
  groundY: 262,
  leftBound: 20,
  rightBound: 620,
};
