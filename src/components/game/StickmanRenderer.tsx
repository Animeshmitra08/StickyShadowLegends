import React from 'react';
import { BlurMask, Circle, Group, Line, vec } from '@shopify/react-native-skia';

import { ANIMATIONS, MAX_ENERGY } from '@/game/constants';
import type { CharacterState } from '@/game/types';

interface StickmanRendererProps {
  character: CharacterState;
  /** Body colour. */
  color: string;
  /** Headband colour — identifies the fighter. */
  accent: string;
}

type Point = { x: number; y: number };

/**
 * Joint positions relative to the feet, authored for a right-facing fighter
 * (positive x = forward, negative y = up). Mirrored by `facing` at draw time.
 */
interface Pose {
  head: Point;
  shoulder: Point;
  hip: Point;
  backHand: Point;
  frontHand: Point;
  backFoot: Point;
  frontFoot: Point;
  /** Sword tip offset from the front hand, when the blade is drawn. */
  blade?: Point;
}

const STANCE: Pose = {
  head: { x: 1, y: -47 },
  shoulder: { x: 0, y: -38 },
  hip: { x: -1, y: -20 },
  backHand: { x: 5, y: -30 },
  frontHand: { x: 12, y: -33 },
  backFoot: { x: -8, y: 0 },
  frontFoot: { x: 8, y: 0 },
};

const HURT_POSE: Pose = {
  head: { x: -7, y: -45 },
  shoulder: { x: -5, y: -36 },
  hip: { x: -1, y: -19 },
  backHand: { x: -16, y: -42 },
  frontHand: { x: 6, y: -44 },
  backFoot: { x: -9, y: 0 },
  frontFoot: { x: 6, y: 0 },
};

/** Low guard with both forearms up in front of the face. */
const BLOCK_POSE: Pose = {
  head: { x: 3, y: -43 },
  shoulder: { x: 2, y: -35 },
  hip: { x: -2, y: -18 },
  backHand: { x: 10, y: -42 },
  frontHand: { x: 13, y: -37 },
  backFoot: { x: -10, y: 0 },
  frontFoot: { x: 10, y: 0 },
};

/** Shadow Strike: coil back, lunge with the blade, follow through. */
const SPECIAL_WINDUP: Pose = {
  head: { x: -4, y: -42 },
  shoulder: { x: -3, y: -34 },
  hip: { x: -2, y: -17 },
  backHand: { x: -4, y: -30 },
  frontHand: { x: -10, y: -44 },
  backFoot: { x: -12, y: 0 },
  frontFoot: { x: 12, y: 0 },
  blade: { x: -16, y: -14 },
};

const SPECIAL_STRIKE: Pose = {
  head: { x: 8, y: -44 },
  shoulder: { x: 6, y: -36 },
  hip: { x: 0, y: -19 },
  backHand: { x: -10, y: -36 },
  frontHand: { x: 30, y: -34 },
  backFoot: { x: -14, y: 0 },
  frontFoot: { x: 16, y: 0 },
  blade: { x: 28, y: -2 },
};

const SPECIAL_FOLLOW: Pose = {
  head: { x: 6, y: -45 },
  shoulder: { x: 5, y: -36 },
  hip: { x: 0, y: -19 },
  backHand: { x: -6, y: -30 },
  frontHand: { x: 22, y: -18 },
  backFoot: { x: -12, y: 0 },
  frontFoot: { x: 14, y: 0 },
  blade: { x: 18, y: 18 },
};

const DOWN_POSE: Pose = {
  head: { x: -27, y: -5 },
  shoulder: { x: -19, y: -4 },
  hip: { x: -2, y: -3 },
  backHand: { x: -24, y: -12 },
  frontHand: { x: -12, y: -2 },
  backFoot: { x: 13, y: 0 },
  frontFoot: { x: 17, y: -3 },
};

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    head: lerpPoint(a.head, b.head, t),
    shoulder: lerpPoint(a.shoulder, b.shoulder, t),
    hip: lerpPoint(a.hip, b.hip, t),
    backHand: lerpPoint(a.backHand, b.backHand, t),
    frontHand: lerpPoint(a.frontHand, b.frontHand, t),
    backFoot: lerpPoint(a.backFoot, b.backFoot, t),
    frontFoot: lerpPoint(a.frontFoot, b.frontFoot, t),
  };
}

function rotatePose(pose: Pose, center: Point, angle: number): Pose {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rot = (p: Point): Point => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  };
  return {
    head: rot(pose.head),
    shoulder: rot(pose.shoulder),
    hip: rot(pose.hip),
    backHand: rot(pose.backHand),
    frontHand: rot(pose.frontHand),
    backFoot: rot(pose.backFoot),
    frontFoot: rot(pose.frontFoot),
  };
}

/** Pose for the current action, frame and progress through the animation. */
function getPose(char: CharacterState): Pose {
  const { action, currentFrame: frame } = char;
  const anim = ANIMATIONS[action];
  // 0 → 1 across the whole animation, including progress within the frame.
  const progress = Math.min(
    1,
    (frame + char.frameTimer / anim.frameDuration) / anim.frameCount,
  );

  switch (action) {
    case 'WALK': {
      const swing = Math.sin(progress * Math.PI * 2) * 7;
      return {
        ...STANCE,
        backFoot: { x: -7 + swing, y: 0 },
        frontFoot: { x: 7 - swing, y: 0 },
        head: { x: 1, y: -47 + Math.abs(swing) * 0.15 },
      };
    }
    case 'JUMP':
      return {
        ...STANCE,
        hip: { x: 0, y: -22 },
        backFoot: { x: -8, y: -9 },
        frontFoot: { x: 9, y: -7 },
        backHand: { x: -10, y: -42 },
        frontHand: { x: 14, y: -40 },
      };
    case 'DASH_ROLL': {
      const tucked: Pose = {
        head: { x: 6, y: -24 },
        shoulder: { x: 3, y: -20 },
        hip: { x: -3, y: -12 },
        backHand: { x: 9, y: -14 },
        frontHand: { x: 11, y: -18 },
        backFoot: { x: -8, y: -6 },
        frontFoot: { x: 2, y: -4 },
      };
      return rotatePose(tucked, { x: 0, y: -14 }, progress * Math.PI * 2);
    }
    case 'PUNCH': {
      const extended = frame === 3 || frame === 4;
      return {
        ...STANCE,
        head: { x: 3, y: -47 },
        shoulder: { x: 2, y: -38 },
        backHand: { x: 2, y: -30 },
        frontHand: extended
          ? { x: 30, y: -38 }
          : frame < 3
            ? { x: 4, y: -34 }
            : { x: 18, y: -36 },
      };
    }
    case 'KICK': {
      const frontFoot =
        frame === 3
          ? { x: 34, y: -24 }
          : frame < 3
            ? { x: 10, y: -14 }
            : { x: 14, y: -6 };
      return {
        ...STANCE,
        head: { x: -6, y: -46 },
        shoulder: { x: -4, y: -37 },
        hip: { x: -2, y: -21 },
        backFoot: { x: -6, y: 0 },
        frontFoot,
        backHand: { x: -12, y: -32 },
      };
    }
    case 'SWORD_SLASH': {
      if (frame < 4) {
        return {
          ...STANCE,
          frontHand: { x: 4, y: -52 },
          backHand: { x: 2, y: -40 },
          blade: { x: -14, y: -16 },
        };
      }
      if (frame < 6) {
        return {
          ...STANCE,
          head: { x: 5, y: -46 },
          shoulder: { x: 4, y: -37 },
          frontHand: { x: 26, y: -36 },
          backHand: { x: 6, y: -30 },
          blade: { x: 22, y: -8 },
        };
      }
      return {
        ...STANCE,
        head: { x: 4, y: -46 },
        shoulder: { x: 3, y: -37 },
        frontHand: { x: 20, y: -20 },
        backHand: { x: 4, y: -28 },
        blade: { x: 16, y: 14 },
      };
    }
    case 'SPECIAL':
      if (frame < 5) return SPECIAL_WINDUP;
      if (frame < 8) return SPECIAL_STRIKE;
      return SPECIAL_FOLLOW;
    case 'BLOCK':
      return BLOCK_POSE;
    case 'HURT':
      return HURT_POSE;
    case 'DEATH':
      return lerpPose(HURT_POSE, DOWN_POSE, Math.min(1, progress * 1.4));
    case 'IDLE':
    default: {
      const breathe = Math.sin(progress * Math.PI * 2);
      return {
        ...STANCE,
        head: { x: 1, y: -47 + breathe },
        shoulder: { x: 0, y: -38 + breathe * 0.8 },
        frontHand: { x: 12, y: -33 + breathe * 0.6 },
        backHand: { x: 5, y: -30 + breathe * 0.6 },
      };
    }
  }
}

const HEAD_RADIUS = 5.5;
const STROKE_WIDTH = 3;
const SWORD_COLOR = '#FFE08A';
const SHADOW_COLOR = '#A855F7';

interface BodyProps {
  pose: Pose;
  x: number;
  y: number;
  facing: 1 | -1;
  color: string;
  accent: string;
  opacity: number;
}

/** One stick figure; also used for the special's afterimages. */
function Body({ pose, x, y, facing, color, accent, opacity }: BodyProps) {
  const p = (pt: Point) => vec(x + pt.x * facing, y + pt.y);

  const limb = (a: Point, b: Point, key: string) => (
    <Line
      key={key}
      p1={p(a)}
      p2={p(b)}
      color={color}
      strokeWidth={STROKE_WIDTH}
      strokeCap="round"
    />
  );

  // Headband tail streams out behind the head.
  const tailBase = { x: pose.head.x - 4, y: pose.head.y - 1 };
  const tailTip = { x: tailBase.x - 9, y: tailBase.y + 3 };

  return (
    <Group opacity={opacity}>
      {limb(pose.shoulder, pose.backHand, 'backArm')}
      {limb(pose.hip, pose.backFoot, 'backLeg')}
      {limb(pose.shoulder, pose.hip, 'spine')}
      {limb(pose.head, pose.shoulder, 'neck')}
      {limb(pose.hip, pose.frontFoot, 'frontLeg')}
      {limb(pose.shoulder, pose.frontHand, 'frontArm')}

      {pose.blade && (
        <Line
          p1={p(pose.frontHand)}
          p2={p({
            x: pose.frontHand.x + pose.blade.x,
            y: pose.frontHand.y + pose.blade.y,
          })}
          color={SWORD_COLOR}
          strokeWidth={2.5}
          strokeCap="round"
        />
      )}

      <Circle c={p(pose.head)} r={HEAD_RADIUS} color={color} />
      <Line p1={p(tailBase)} p2={p(tailTip)} color={accent} strokeWidth={2} strokeCap="round" />
      <Line
        p1={p({ x: pose.head.x - 5, y: pose.head.y - 1 })}
        p2={p({ x: pose.head.x + 5, y: pose.head.y - 1 })}
        color={accent}
        strokeWidth={2}
      />
      {/* Glowing eye */}
      <Circle c={p({ x: pose.head.x + 2.5, y: pose.head.y + 1 })} r={1.1} color={accent} />
    </Group>
  );
}

/** Draws a fighter in world units — the parent Group applies screen scaling. */
export function StickmanRenderer({ character, color, accent }: StickmanRendererProps) {
  const { x, y, facing, action } = character;
  const pose = getPose(character);
  const chest = vec(x + pose.shoulder.x * facing, y + (pose.shoulder.y + pose.hip.y) / 2);

  // Flash white on the first frame of a hit; flicker during i-frames.
  const bodyColor = action === 'HURT' && character.currentFrame === 0 ? '#FFFFFF' : color;
  const opacity = character.invincible && action !== 'SPECIAL' ? 0.55 : 1;
  const isSpecial = action === 'SPECIAL';
  const charged = character.energy >= MAX_ENERGY;

  return (
    <Group>
      {(isSpecial || charged) && (
        <Circle c={chest} r={isSpecial ? 34 : 22} color={SHADOW_COLOR} opacity={isSpecial ? 0.45 : 0.2}>
          <BlurMask blur={isSpecial ? 14 : 9} style="normal" />
        </Circle>
      )}
      {/* Afterimages trail the lunge */}
      {isSpecial &&
        [2, 1].map((n) => (
          <Body
            key={n}
            pose={pose}
            x={x - facing * n * 9}
            y={y}
            facing={facing}
            color={SHADOW_COLOR}
            accent={SHADOW_COLOR}
            opacity={0.35 / n}
          />
        ))}
      <Body
        pose={pose}
        x={x}
        y={y}
        facing={facing}
        color={bodyColor}
        accent={accent}
        opacity={opacity}
      />
    </Group>
  );
}
