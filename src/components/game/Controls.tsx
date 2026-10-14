import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_ENERGY } from '@/game/constants';
import type { ControlButton } from '@/game/input';

import { Joystick } from './Joystick';

interface Handlers {
  onPress: (button: ControlButton) => void;
  onRelease: (button: ControlButton) => void;
}

interface ControlsProps extends Handlers {
  /** Player's shadow energy, shown as the fill of the SHADOW button. */
  energy: number;
}

interface HoldButtonProps extends Handlers {
  button: ControlButton;
  label: string;
  color: string;
  size?: number;
  /** 0 – 1 charge level drawn as a liquid fill from the bottom. */
  fill?: number;
}

/**
 * A button that reports touch-down and touch-up. Each button is its own
 * gesture, so several can be held at once (e.g. walk + punch).
 */
function HoldButton({ button, label, color, size = 58, fill, onPress, onRelease }: HoldButtonProps) {
  const [pressed, setPressed] = useState(false);

  const gesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(0)
        .maxDistance(10_000)
        .shouldCancelWhenOutside(false)
        .runOnJS(true)
        .onBegin(() => {
          setPressed(true);
          onPress(button);
        })
        .onFinalize(() => {
          setPressed(false);
          onRelease(button);
        }),
    [button, onPress, onRelease],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            backgroundColor: pressed ? color : 'rgba(10,6,20,0.45)',
          },
        ]}>
        {fill !== undefined && (
          <View
            style={[styles.fill, { height: `${fill * 100}%`, backgroundColor: color }]}
          />
        )}
        <Text style={styles.label}>{label}</Text>
      </View>
    </GestureDetector>
  );
}

/** SHADOW special: fills with energy and pulses once it's ready. */
function ShadowButton({ energy, ...handlers }: Handlers & { energy: number }) {
  const ready = energy >= MAX_ENERGY;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (ready) {
      pulse.set(withRepeat(withTiming(1.12, { duration: 450 }), -1, true));
    } else {
      cancelAnimation(pulse);
      pulse.set(withTiming(1, { duration: 150 }));
    }
  }, [ready, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  return (
    <Animated.View style={[ready && styles.glow, pulseStyle]}>
      <HoldButton
        button="SPECIAL"
        label={ready ? 'SHADOW' : `${Math.floor(energy)}%`}
        color="#A855F7"
        size={64}
        fill={ready ? undefined : energy / MAX_ENERGY}
        {...handlers}
      />
    </Animated.View>
  );
}

export function Controls({ onPress, onRelease, energy }: ControlsProps) {
  const insets = useSafeAreaInsets();
  const handlers = { onPress, onRelease };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingLeft: Math.max(insets.left, 20),
          paddingRight: Math.max(insets.right, 20),
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}>
      <Joystick {...handlers} />

      <View style={styles.actions}>
        <View style={styles.actionRow}>
          <ShadowButton energy={energy} {...handlers} />
          <HoldButton button="KICK" label="KICK" color="#FB923C" {...handlers} />
          <HoldButton button="SWORD" label="SWORD" color="#FACC15" {...handlers} />
        </View>
        <View style={styles.actionRow}>
          <HoldButton button="DASH" label="DASH" color="#A78BFA" {...handlers} />
          <HoldButton button="PUNCH" label="PUNCH" color="#F43F5E" {...handlers} />
          <HoldButton button="JUMP" label="JUMP" color="#38BDF8" {...handlers} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  actions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.45,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  glow: {
    borderRadius: 32,
    boxShadow: '0 0 16px 4px rgba(168,85,247,0.75)',
  },
});
