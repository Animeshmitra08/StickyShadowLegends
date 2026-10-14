import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { ControlButton } from '@/game/input';

/** Clockwise from east; screen y grows downward, so positive angles point down. */
const DIRECTIONS = [
  'RIGHT',
  'DOWN_RIGHT',
  'DOWN',
  'DOWN_LEFT',
  'LEFT',
  'UP_LEFT',
  'UP',
  'UP_RIGHT',
] as const;

export type StickDirection = (typeof DIRECTIONS)[number] | 'CENTER';

interface JoystickProps {
  onPress: (button: ControlButton) => void;
  onRelease: (button: ControlButton) => void;
  size?: number;
  color?: string;
}

const KNOB_RATIO = 0.44;
/** Fraction of full travel the knob must move before a direction registers. */
const DEAD_ZONE = 0.3;
const SPRING = { damping: 15, stiffness: 300 };

function toDirection(dx: number, dy: number, threshold: number): StickDirection {
  if (Math.hypot(dx, dy) < threshold) return 'CENTER';
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return DIRECTIONS[(sector + 8) % 8];
}

function horizontal(direction: StickDirection): 'LEFT' | 'RIGHT' | null {
  if (direction.endsWith('LEFT')) return 'LEFT';
  if (direction.endsWith('RIGHT')) return 'RIGHT';
  return null;
}

function isUp(direction: StickDirection): boolean {
  return direction.startsWith('UP');
}

function isDown(direction: StickDirection): boolean {
  return direction.startsWith('DOWN');
}

/**
 * An 8-way floating-knob joystick. The knob follows the finger (clamped to the
 * base) and snaps to one of eight directions:
 * - left / right (and their diagonals) hold LEFT / RIGHT,
 * - up, up-left and up-right tap JUMP once on entry, so a diagonal flick is a
 *   moving jump (the fighter steers in the air),
 * - down, down-left and down-right hold DOWN, which guards (block wins over
 *   walking).
 */
export function Joystick({ onPress, onRelease, size = 132, color = '#94A3B8' }: JoystickProps) {
  const knobSize = size * KNOB_RATIO;
  const maxTravel = (size - knobSize) / 2;

  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);
  const held = useSharedValue<StickDirection>('CENTER');
  const [direction, setDirection] = useState<StickDirection>('CENTER');

  const gesture = useMemo(() => {
    const changeDirection = (next: StickDirection) => {
      const prev = held.get();
      if (prev === next) return;

      const prevSide = horizontal(prev);
      const nextSide = horizontal(next);
      if (prevSide !== nextSide) {
        if (prevSide) onRelease(prevSide);
        if (nextSide) onPress(nextSide);
      }
      if (isUp(next) && !isUp(prev)) onPress('JUMP');
      if (isDown(next) !== isDown(prev)) {
        if (isDown(next)) onPress('DOWN');
        else onRelease('DOWN');
      }

      held.set(next);
      setDirection(next);
    };

    const track = (x: number, y: number) => {
      let dx = x - size / 2;
      let dy = y - size / 2;
      const distance = Math.hypot(dx, dy);
      if (distance > maxTravel) {
        dx = (dx / distance) * maxTravel;
        dy = (dy / distance) * maxTravel;
      }
      knobX.set(dx);
      knobY.set(dy);
      changeDirection(toDirection(dx, dy, maxTravel * DEAD_ZONE));
    };

    return Gesture.Pan()
      .minDistance(0)
      .runOnJS(true)
      .onBegin((e) => track(e.x, e.y))
      .onUpdate((e) => track(e.x, e.y))
      .onFinalize(() => {
        knobX.set(withSpring(0, SPRING));
        knobY.set(withSpring(0, SPRING));
        changeDirection('CENTER');
      });
  }, [size, maxTravel, knobX, knobY, held, onPress, onRelease]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.get() }, { translateY: knobY.get() }],
  }));

  const side = horizontal(direction);
  const lit = { color };

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.base,
          { width: size, height: size, borderRadius: size / 2, borderColor: color },
        ]}>
        <Text style={[styles.arrow, styles.arrowUp, isUp(direction) && lit]}>▲</Text>
        <Text style={[styles.arrow, styles.arrowDown, isDown(direction) && lit]}>▼</Text>
        <Text style={[styles.arrow, styles.arrowLeft, side === 'LEFT' && lit]}>◀</Text>
        <Text style={[styles.arrow, styles.arrowRight, side === 'RIGHT' && lit]}>▶</Text>
        <Animated.View
          style={[
            styles.knob,
            {
              width: knobSize,
              height: knobSize,
              borderRadius: knobSize / 2,
              borderColor: color,
              backgroundColor: direction === 'CENTER' ? 'rgba(148,163,184,0.35)' : color,
            },
            knobStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(10,6,20,0.45)',
  },
  knob: {
    borderWidth: 2,
  },
  arrow: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 16,
    fontWeight: '900',
  },
  arrowUp: {
    top: 6,
  },
  arrowDown: {
    bottom: 6,
  },
  arrowLeft: {
    left: 10,
  },
  arrowRight: {
    right: 10,
  },
});
