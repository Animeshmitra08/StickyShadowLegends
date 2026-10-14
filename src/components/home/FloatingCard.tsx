import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface FloatingCardProps {
  /** Position in the stack — staggers the entrance and the bob. */
  index: number;
  title: string;
  subtitle?: string;
  /** Small label on the right, e.g. "TAP TO CHANGE". */
  hint?: string;
  accent: string;
  /** Bigger, filled card for the main action. */
  primary?: boolean;
  onPress: () => void;
}

/**
 * A menu card that drifts up and down on its own rhythm and sways slightly,
 * like a banner hanging in the wind. Pressing squashes it with a spring.
 */
export function FloatingCard({
  index,
  title,
  subtitle,
  hint,
  accent,
  primary = false,
  onPress,
}: FloatingCardProps) {
  const drift = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    drift.set(
      withDelay(
        index * 260,
        withRepeat(
          withTiming(1, { duration: 1800 + index * 240, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      ),
    );
  }, [drift, index]);

  const floatStyle = useAnimatedStyle(() => {
    const d = drift.get();
    return {
      transform: [
        { translateY: (d - 0.5) * 10 },
        { rotate: `${(d - 0.5) * (index % 2 === 0 ? 1.6 : -1.6)}deg` },
        { scale: press.get() },
      ],
    };
  });

  return (
    <Animated.View entering={FadeInRight.delay(200 + index * 110).springify().damping(14)}>
      <Animated.View style={floatStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => press.set(withSpring(0.94, { damping: 12, stiffness: 400 }))}
          onPressOut={() => press.set(withSpring(1, { damping: 10, stiffness: 300 }))}
          style={[
            styles.card,
            primary ? styles.primary : styles.secondary,
            { borderColor: accent, boxShadow: `0 0 ${primary ? 22 : 10}px rgba(0,0,0,0.6)` },
            primary && { backgroundColor: accent },
          ]}>
          <View style={[styles.stripe, { backgroundColor: primary ? '#FFFFFF' : accent }]} />
          <View style={styles.body}>
            <Text style={[styles.title, primary && styles.titlePrimary]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: primary ? '#FFE4E6' : accent }]}>
                {subtitle}
              </Text>
            )}
          </View>
          {hint && <Text style={styles.hint}>{hint}</Text>}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
    paddingRight: 14,
  },
  primary: {
    paddingVertical: 14,
  },
  secondary: {
    paddingVertical: 9,
    backgroundColor: 'rgba(12,6,24,0.78)',
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 12,
    opacity: 0.9,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  titlePrimary: {
    fontSize: 24,
    fontStyle: 'italic',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
