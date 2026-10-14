import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface EmberConfig {
  /** Horizontal start position, 0 – 1 of the screen width. */
  x: number;
  size: number;
  duration: number;
  delay: number;
  /** Sideways wander in px over the climb. */
  sway: number;
  color: string;
}

const COLORS = ['#FFB86B', '#FF7A59', '#C084FC'];

// Generated once at load so the embers keep their paths across renders.
const EMBERS: EmberConfig[] = Array.from({ length: 22 }, (_, i) => ({
  x: Math.random(),
  size: 2 + Math.random() * 3.5,
  duration: 5_000 + Math.random() * 6_000,
  delay: Math.random() * 6_000,
  sway: (Math.random() - 0.5) * 80,
  color: COLORS[i % COLORS.length],
}));

function Ember({ config, width, height }: { config: EmberConfig; width: number; height: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(
      withDelay(
        config.delay,
        withRepeat(withTiming(1, { duration: config.duration, easing: Easing.linear }), -1, false),
      ),
    );
  }, [t, config]);

  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: p < 0.1 ? p * 8 : (1 - p) * 0.9,
      transform: [
        { translateX: Math.sin(p * Math.PI * 2) * config.sway },
        { translateY: -p * (height + 40) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: config.x * width,
          top: height + 10,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          boxShadow: `0 0 ${config.size * 2}px ${config.color}`,
        },
        style,
      ]}
    />
  );
}

/** Glowing embers drifting up through the scene. */
export function Embers({ width, height }: { width: number; height: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {EMBERS.map((config, i) => (
        <Ember key={i} config={config} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ember: {
    position: 'absolute',
  },
});
