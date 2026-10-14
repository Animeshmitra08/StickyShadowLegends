import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useFocusEffect } from 'expo-router';

import { FIGHTER_COLORS } from '@/components/game/Arena';
import { Scenery } from '@/components/game/Scenery';
import { StickmanRenderer } from '@/components/game/StickmanRenderer';
import { ANIMATIONS, DEFAULT_ARENA, MAX_ENERGY } from '@/game/constants';
import { createCharacter } from '@/game/gameLoop';
import type { CharacterState } from '@/game/types';

const IDLE = ANIMATIONS.IDLE;
const FIGHTER_SCALE = 2.1;

/** A fighter breathing in their idle stance at time `t`. */
function idleAt(base: CharacterState, t: number): CharacterState {
  const cycle = IDLE.frameCount * IDLE.frameDuration;
  const local = t % cycle;
  return {
    ...base,
    currentFrame: Math.floor(local / IDLE.frameDuration),
    frameTimer: local % IDLE.frameDuration,
  };
}

const HERO = createCharacter('P1', 150, 1);
// The shadow is fully charged so it carries its purple aura on the menu.
const SHADOW = createCharacter('P2', 250, -1, MAX_ENERGY);

/**
 * Menu backdrop: dusk sky, the arena's ridges and pagoda, and the two
 * fighters squaring off as giant silhouettes. The idle loop only runs while
 * the screen is focused, so it doesn't compete with a fight in progress.
 */
export function HomeBackdrop({ width, height }: { width: number; height: number }) {
  const [time, setTime] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let frameId = 0;
      const start = performance.now();
      const frame = (now: number) => {
        setTime(now - start);
        frameId = requestAnimationFrame(frame);
      };
      frameId = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(frameId);
    }, []),
  );

  const arena = DEFAULT_ARENA;
  const scale = Math.max(width / arena.width, height / arena.height);
  const offsetX = (width - arena.width * scale) / 2;
  const offsetY = height - arena.height * scale;
  const groundScreenY = offsetY + arena.groundY * scale;
  const ground = arena.groundY;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, groundScreenY)}
          colors={['#07040F', '#1B0F33', '#4A1F4F', '#B4514F']}
        />
      </Rect>

      <Group transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}>
        <Scenery sunX={200} groundY={ground} />
      </Group>

      <Rect x={0} y={groundScreenY} width={width} height={height - groundScreenY} color="#0B0614" />

      <Group transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}>
        {[
          { char: HERO, phase: 0 },
          { char: SHADOW, phase: 300 },
        ].map(({ char, phase }) => (
          <Group
            key={char.id}
            origin={vec(char.x, ground)}
            transform={[{ scale: FIGHTER_SCALE }]}>
            <StickmanRenderer
              character={idleAt(char, time + phase)}
              color="#05030A"
              accent={FIGHTER_COLORS[char.id].accent}
            />
          </Group>
        ))}
      </Group>
    </Canvas>
  );
}
