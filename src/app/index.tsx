import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Embers } from '@/components/home/Embers';
import { FloatingCard } from '@/components/home/FloatingCard';
import { HomeBackdrop } from '@/components/home/HomeBackdrop';
import { HowToPlay } from '@/components/home/HowToPlay';
import {
  bestOfLabel,
  cycle,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type Difficulty,
  ROUNDS_TO_WIN_OPTIONS,
} from '@/game/settings';

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: '#4ADE80',
  normal: '#FACC15',
  hard: '#F43F5E',
};

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [roundsToWin, setRoundsToWin] = useState(2);
  const [showHelp, setShowHelp] = useState(false);

  const startFight = () =>
    router.push({ pathname: '/fight', params: { difficulty, rounds: String(roundsToWin) } });

  return (
    <View style={styles.root}>
      <HomeBackdrop width={width} height={height} />
      <Embers width={width} height={height} />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 18),
            paddingBottom: Math.max(insets.bottom, 18),
            paddingLeft: Math.max(insets.left, 28),
            paddingRight: Math.max(insets.right, 28),
          },
        ]}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.titleBlock}>
          <Text style={styles.kicker}>STICKY</Text>
          <Text style={styles.title}>SHADOW</Text>
          <Text style={styles.subtitle}>L E G E N D S</Text>
        </Animated.View>

        <View style={styles.menu}>
          <FloatingCard
            index={0}
            primary
            title="FIGHT"
            subtitle={`VS SHADOW · ${DIFFICULTY_LABEL[difficulty]}`}
            accent="#F43F5E"
            onPress={startFight}
          />
          <FloatingCard
            index={1}
            title="DIFFICULTY"
            subtitle={DIFFICULTY_LABEL[difficulty]}
            hint="TAP ▸"
            accent={DIFFICULTY_COLOR[difficulty]}
            onPress={() => setDifficulty(cycle(DIFFICULTIES, difficulty))}
          />
          <FloatingCard
            index={2}
            title="ROUNDS"
            subtitle={bestOfLabel(roundsToWin)}
            hint="TAP ▸"
            accent="#38BDF8"
            onPress={() => setRoundsToWin(cycle(ROUNDS_TO_WIN_OPTIONS, roundsToWin))}
          />
          <FloatingCard
            index={3}
            title="HOW TO PLAY"
            subtitle="MOVES · BLOCK · SHADOW STRIKE"
            accent="#A855F7"
            onPress={() => setShowHelp(true)}
          />
        </View>
      </View>

      <Animated.Text
        entering={FadeIn.delay(900).duration(800)}
        style={[styles.footer, { bottom: Math.max(insets.bottom, 10) }]}>
        Master the shadow within.
      </Animated.Text>

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0614',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleBlock: {
    alignSelf: 'flex-start',
  },
  kicker: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 8,
    marginLeft: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 4,
    marginTop: -6,
    textShadowColor: 'rgba(168,85,247,0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    color: '#F28C4F',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: -4,
    marginLeft: 4,
  },
  menu: {
    width: 260,
    justifyContent: 'center',
    gap: 12,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontStyle: 'italic',
    letterSpacing: 2,
  },
});
