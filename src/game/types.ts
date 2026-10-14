// =============================================================================
// Game Engine Type Definitions
// Sticky Shadow Legends — Fighting Game Types
// =============================================================================

/**
 * Axis-aligned bounding box used for hitboxes and hurtboxes.
 * Top-left origin, y grows downward (screen convention).
 */
export type Box = { x: number; y: number; width: number; height: number };

export type PlayerId = 'P1' | 'P2';

/**
 * All possible action states a character can be in.
 * Determines which animation plays and what physics/combat rules apply.
 */
export type ActionState =
  | 'IDLE'
  | 'WALK'
  | 'JUMP'
  | 'DASH_ROLL'
  | 'PUNCH'
  | 'KICK'
  | 'SWORD_SLASH'
  | 'SPECIAL'
  | 'BLOCK'
  | 'HURT'
  | 'DEATH';

/** The subset of action states that can deal damage. */
export type AttackAction = 'PUNCH' | 'KICK' | 'SWORD_SLASH' | 'SPECIAL';

/** Static data describing how an attack connects. */
export interface AttackData {
  /** Damage dealt on hit. */
  damage: number;
  /** Duration the opponent is stunned on hit (ms). */
  hitStun: number;
  /** Velocity impulse applied to the opponent on hit (x is flipped by facing). */
  knockback: { x: number; y: number };
  /**
   * Hitbox relative to the attacker's feet, authored for a right-facing
   * character. Negative y is above the feet.
   */
  hitbox: Box;
}

/** Full state for a single character during gameplay. */
export interface CharacterState {
  id: PlayerId;
  /** World-space position of the character's feet. */
  x: number;
  y: number;
  /** Velocity components (pixels per 60 fps frame). */
  vx: number;
  vy: number;
  /** True when the character is standing on the ground. */
  isGrounded: boolean;
  /** Horizontal facing direction: 1 = right, -1 = left. */
  facing: 1 | -1;
  /** Current action / animation state. */
  action: ActionState;
  /** Current frame index within the active animation. */
  currentFrame: number;
  /** Milliseconds accumulated toward the next frame advance. */
  frameTimer: number;
  /** World-space hurtbox (where the character can be hit). */
  hurtbox: Box;
  /** Active hitbox relative to the feet (right-facing), or null when not attacking. */
  activeHitbox: Box | null;
  /** Current health points. */
  health: number;
  /** Maximum health points. */
  maxHealth: number;
  /** Remaining hit-stun duration (ms). 0 = not stunned. */
  hitStunRemaining: number;
  /** When true the character cannot be hit (e.g. during dash i-frames). */
  invincible: boolean;
  /** Prevents a single attack from connecting more than once. */
  hasHitCurrentAttack: boolean;
  /** Shadow energy (0 – MAX_ENERGY). Full energy unlocks the special. */
  energy: number;
  /** Hits landed in this fighter's current combo. */
  combo: number;
  /** Milliseconds since this fighter last landed a hit (drives the combo popup). */
  comboTimer: number;
}

/** Timing definition for a single animation. */
export interface AnimationDef {
  /** Total number of frames in this animation. */
  frameCount: number;
  /** Duration of each frame in milliseconds. */
  frameDuration: number;
  /**
   * What happens after the last frame:
   * - `loop`: wrap back to frame 0
   * - `hold`: stay on the last frame until something else changes the action
   * - `idle`: return to IDLE (the action is complete)
   */
  onEnd: 'loop' | 'hold' | 'idle';
  /** Frame indices that have an active hitbox (attack animations only). */
  activeHitFrames?: number[];
  /** Frame indices that grant invincibility (e.g. dash roll). */
  invincibleFrames?: number[];
}

/**
 * Discrete input commands a fighter can issue in one tick.
 * Mapped from on-screen controls or the AI.
 */
export type InputCommand =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'JUMP'
  | 'PUNCH'
  | 'KICK'
  | 'SWORD'
  | 'DASH'
  | 'SPECIAL'
  | 'BLOCK'
  | 'NONE';

/** Describes the fighting arena boundaries. */
export interface ArenaConfig {
  /** Total arena width in game units. */
  width: number;
  /** Total arena height in game units. */
  height: number;
  /** Y coordinate of the ground plane. */
  groundY: number;
  /** Left movement boundary. */
  leftBound: number;
  /** Right movement boundary. */
  rightBound: number;
}

/** Short-lived visual effect spawned where a hit lands. */
export interface HitSpark {
  x: number;
  y: number;
  /** Milliseconds since the spark spawned. */
  age: number;
  /** `heavy` for sword hits, `block` for guarded hits, `shadow` for the special. */
  kind: 'hit' | 'heavy' | 'block' | 'shadow';
}

/**
 * Round phase:
 * - `INTRO`: fighters are locked while the "ROUND n" banner shows
 * - `FIGHT`: normal play
 * - `ROUND_OVER`: a round winner (or draw) is decided; the simulation keeps
 *   running so knockback and the death animation play out, but inputs are
 *   ignored. After `outroTimer` the next round starts or the match ends.
 * - `MATCH_OVER`: one fighter has won enough rounds
 */
export type RoundPhase = 'INTRO' | 'FIGHT' | 'ROUND_OVER' | 'MATCH_OVER';

export type RoundResult = PlayerId | 'DRAW';

/** Top-level game state containing everything needed to render a frame. */
export interface GameState {
  /** The two fighting characters (player 1 and player 2 / AI). */
  players: [CharacterState, CharacterState];
  /** Current arena configuration. */
  arena: ArenaConfig;
  phase: RoundPhase;
  /** Milliseconds remaining in the INTRO phase. */
  introTimer: number;
  /** Whether the game is paused. */
  isPaused: boolean;
  /** Winner of the current round, 'DRAW', or null while the round is ongoing. */
  winner: RoundResult | null;
  /** Milliseconds remaining in the current round. */
  roundTimer: number;
  /** Milliseconds left on the round-over screen before moving on. */
  outroTimer: number;
  /** 1-based round number. */
  round: number;
  /** Round wins needed to take the match. */
  roundsToWin: number;
  /** Rounds won so far by each fighter. */
  wins: Record<PlayerId, number>;
  /** Match winner once phase is MATCH_OVER. */
  matchWinner: RoundResult | null;
  /** Remaining hit-stop freeze (ms) — the brief pause that sells an impact. */
  hitStop: number;
  /** Remaining screen-shake time (ms). */
  shake: number;
  sparks: HitSpark[];
}
