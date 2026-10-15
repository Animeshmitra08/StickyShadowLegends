import React from 'react';
import { StyleSheet } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Rect,
  vec,
} from '@shopify/react-native-skia';

import { SHAKE_MS, SPARK_LIFE_MS } from '@/game/constants';
import type { CharacterState, GameState, HitSpark } from '@/game/types';
import { Scenery } from './Scenery';
import { StickmanRenderer } from './StickmanRenderer';

export const FIGHTER_COLORS = {
  P1: { body: '#0E1630', accent: '#38BDF8' },
  P2: { body: '#2A0A14', accent: '#F43F5E' },
} as const;

/** Extra sky drawn past the screen edges so shaking never shows a gap. */
const SHAKE_MARGIN = 12;

interface ArenaProps {
  state: GameState;
  width: number;
  height: number;
}

/** Ground shadow that shrinks as the fighter rises. */
function FighterShadow({ char, groundY }: { char: CharacterState; groundY: number }) {
  const lift = Math.min(1, (groundY - char.y) / 120);
  const w = 34 * (1 - lift * 0.5);
  return (
    <Oval
      x={char.x - w / 2}
      y={groundY - 3}
      width={w}
      height={6}
      color={`rgba(91,33,182,${0.35 - lift * 0.2})`}
    />
  );
}

const SPARK_STYLE: Record<HitSpark['kind'], { size: number; ring: string; core: number }> = {
  // Bright rings so sparks pop against the mid-tone sky.
  hit: { size: 13, ring: '#FFF3B0', core: 4 },
  heavy: { size: 20, ring: '#FFFFFF', core: 6 },
  block: { size: 10, ring: '#67E8F9', core: 0 },
  shadow: { size: 34, ring: '#F5D0FE', core: 9 },
};

function Spark({ spark }: { spark: HitSpark }) {
  const t = spark.age / SPARK_LIFE_MS;
  const { size, ring, core } = SPARK_STYLE[spark.kind];
  return (
    <Group opacity={1 - t}>
      {spark.kind === 'shadow' && (
        <Circle cx={spark.x} cy={spark.y} r={10 + t * 26} color="#A855F7" opacity={0.6}>
          <BlurMask blur={10} style="normal" />
        </Circle>
      )}
      <Circle cx={spark.x} cy={spark.y} r={3 + t * size} color={ring} style="stroke" strokeWidth={2} />
      {core > 0 && <Circle cx={spark.x} cy={spark.y} r={(1 - t) * core} color="#FFFFFF" />}
    </Group>
  );
}

/**
 * Renders the arena with Skia. The world is scaled uniformly to fit the
 * screen and anchored to the bottom so the floor always meets the screen edge.
 */
export function Arena({ state, width, height }: ArenaProps) {
  const { arena, players, sparks } = state;
  const scale = Math.min(width / arena.width, height / arena.height);
  const offsetX = (width - arena.width * scale) / 2;
  const offsetY = height - arena.height * scale;
  const groundScreenY = offsetY + arena.groundY * scale;

  // Decaying jitter on heavy hits.
  const amp = 5 * (state.shake / SHAKE_MS);
  const shakeX = Math.sin(state.shake * 0.35) * amp;
  const shakeY = Math.cos(state.shake * 0.5) * amp * 0.6;
  const world = [{ translateX: offsetX }, { translateY: offsetY }, { scale }];

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group transform={[{ translateX: shakeX }, { translateY: shakeY }]}>
        {/* Sky */}
        <Rect
          x={-SHAKE_MARGIN}
          y={-SHAKE_MARGIN}
          width={width + SHAKE_MARGIN * 2}
          height={height + SHAKE_MARGIN * 2}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, groundScreenY)}
            colors={['#818CF8', '#A78BFA', '#F472B6', '#FB923C']}
          />
        </Rect>

        <Group transform={world}>
          <Scenery sunX={arena.width / 2} groundY={arena.groundY} />
        </Group>

        {/* Ground spans the full screen width */}
        <Rect
          x={-SHAKE_MARGIN}
          y={groundScreenY}
          width={width + SHAKE_MARGIN * 2}
          height={height - groundScreenY + SHAKE_MARGIN}
          color="#F5A97F"
        />
        <Rect
          x={-SHAKE_MARGIN}
          y={groundScreenY}
          width={width + SHAKE_MARGIN * 2}
          height={Math.max(1, 1.5 * scale)}
          color="#FDE047"
        />

        <Group transform={world}>
          {players.map((p) => (
            <FighterShadow key={`shadow-${p.id}`} char={p} groundY={arena.groundY} />
          ))}
          {players.map((p) => (
            <StickmanRenderer
              key={p.id}
              character={p}
              color={FIGHTER_COLORS[p.id].body}
              accent={FIGHTER_COLORS[p.id].accent}
            />
          ))}
          {sparks.map((s, i) => (
            <Spark key={i} spark={s} />
          ))}
        </Group>
      </Group>
    </Canvas>
  );
}
