import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COMBO_DISPLAY_MS, MAX_ENERGY, ROUND_TIME_MS } from '@/game/constants';
import type { CharacterState, GameState } from '@/game/types';
import { FIGHTER_COLORS } from './Arena';

/** How long "FIGHT!" stays on screen after the intro. */
const FIGHT_BANNER_MS = 600;

const SHADOW_PURPLE = '#A855F7';

/** Keeps light HUD text readable against the bright arena sky. */
const TEXT_OUTLINE = {
  textShadowColor: 'rgba(20,10,40,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

// -----------------------------------------------------------------------------
// Fighter status (health, energy, round wins)
// -----------------------------------------------------------------------------

interface FighterStatusProps {
  fighter: CharacterState;
  label: string;
  align: 'left' | 'right';
  wins: number;
  roundsToWin: number;
}

function FighterStatus({ fighter, label, align, wins, roundsToWin }: FighterStatusProps) {
  const ratio = fighter.health / fighter.maxHealth;
  const { accent } = FIGHTER_COLORS[fighter.id];
  const anchor = align === 'left' ? styles.anchorLeft : styles.anchorRight;
  const energyRatio = fighter.energy / MAX_ENERGY;
  const charged = fighter.energy >= MAX_ENERGY;

  // The white "damage trail" lingers, then drains down to the real health.
  const trail = useSharedValue(ratio);
  useEffect(() => {
    if (ratio < trail.get()) {
      trail.set(withDelay(350, withTiming(ratio, { duration: 450 })));
    } else {
      trail.set(ratio);
    }
  }, [ratio, trail]);
  const trailStyle = useAnimatedStyle(() => ({ width: `${trail.get() * 100}%` }));

  return (
    <View style={styles.statusBlock}>
      <View style={[styles.nameRow, align === 'right' && styles.reverse]}>
        <Text style={[styles.barLabel, { color: accent }]}>{label}</Text>
        <View style={[styles.pips, align === 'right' && styles.reverse]}>
          {Array.from({ length: roundsToWin }, (_, i) => (
            <View
              key={i}
              style={[styles.pip, i < wins && { backgroundColor: accent, borderColor: accent }]}
            />
          ))}
        </View>
      </View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barLayer, anchor, styles.trail, trailStyle]} />
        <View
          style={[
            styles.barLayer,
            anchor,
            { width: `${ratio * 100}%`, backgroundColor: ratio > 0.3 ? accent : '#FACC15' },
          ]}
        />
      </View>

      <View style={[styles.energyRow, align === 'right' && styles.reverse]}>
        <View style={styles.energyTrack}>
          <View
            style={[
              styles.barLayer,
              anchor,
              {
                width: `${energyRatio * 100}%`,
                backgroundColor: SHADOW_PURPLE,
                opacity: charged ? 1 : 0.7,
              },
            ]}
          />
        </View>
        {charged && <Text style={styles.energyReady}>SHADOW</Text>}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Combo popup
// -----------------------------------------------------------------------------

function ComboPopup({ fighter, align }: { fighter: CharacterState; align: 'left' | 'right' }) {
  if (fighter.combo < 2 || fighter.comboTimer > COMBO_DISPLAY_MS) return null;
  return (
    <Animated.View
      // Re-keying on every hit re-plays the pop.
      key={fighter.combo}
      entering={ZoomIn.duration(160)}
      pointerEvents="none"
      style={[styles.combo, align === 'left' ? styles.comboLeft : styles.comboRight]}>
      <Text style={[styles.comboCount, { color: FIGHTER_COLORS[fighter.id].accent }]}>
        {fighter.combo}
      </Text>
      <Text style={styles.comboLabel}>HITS</Text>
    </Animated.View>
  );
}

// -----------------------------------------------------------------------------
// Banners & menus
// -----------------------------------------------------------------------------

function introBanner(state: GameState): string {
  const { wins, roundsToWin, round } = state;
  const final = roundsToWin > 1 && wins.P1 === roundsToWin - 1 && wins.P2 === roundsToWin - 1;
  return final ? 'FINAL ROUND' : `ROUND ${round}`;
}

function roundResult(state: GameState): { title: string; subtitle: string } {
  const [p1, p2] = state.players;
  const doubleKO = p1.health <= 0 && p2.health <= 0;
  const knockout = p1.health <= 0 || p2.health <= 0;
  const title = doubleKO ? 'DOUBLE K.O.' : knockout ? 'K.O.' : 'TIME';
  if (state.winner === 'DRAW') return { title, subtitle: 'DRAW' };
  const champ = state.winner === 'P1' ? p1 : p2;
  const perfect = champ.health === champ.maxHealth;
  const subtitle = state.winner === 'P1' ? 'YOU TAKE THE ROUND' : 'SHADOW TAKES THE ROUND';
  return { title: perfect ? 'PERFECT' : title, subtitle };
}

function MenuButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuButton,
        primary && styles.menuButtonPrimary,
        pressed && styles.menuButtonPressed,
      ]}>
      <Text style={styles.menuButtonText}>{label}</Text>
    </Pressable>
  );
}

interface HudProps {
  state: GameState;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function Hud({ state, onPause, onResume, onRestart, onQuit }: HudProps) {
  const insets = useSafeAreaInsets();
  const [p1, p2] = state.players;
  const seconds = Math.ceil(state.roundTimer / 1000);
  const lowTime = state.phase === 'FIGHT' && seconds <= 10;

  let banner: string | null = null;
  let subtitle: string | null = null;
  if (state.phase === 'INTRO') banner = introBanner(state);
  else if (state.phase === 'FIGHT' && ROUND_TIME_MS - state.roundTimer < FIGHT_BANNER_MS) {
    banner = 'FIGHT!';
  } else if (state.phase === 'ROUND_OVER') {
    ({ title: banner, subtitle } = roundResult(state));
  }

  const matchOver = state.phase === 'MATCH_OVER';
  const matchTitle =
    state.matchWinner === 'P1' ? 'VICTORY' : state.matchWinner === 'P2' ? 'DEFEAT' : 'DRAW';

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        {
          paddingTop: Math.max(insets.top, 10),
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
        },
      ]}>
      <View style={styles.topRow}>
        <FighterStatus
          fighter={p1}
          label="YOU"
          align="left"
          wins={state.wins.P1}
          roundsToWin={state.roundsToWin}
        />
        <View style={styles.centerColumn}>
          <Text style={[styles.timer, lowTime && styles.timerLow]}>{seconds}</Text>
          {!matchOver && (
            <Pressable onPress={onPause} hitSlop={12} style={styles.pauseButton}>
              <Text style={styles.pauseIcon}>II</Text>
            </Pressable>
          )}
        </View>
        <FighterStatus
          fighter={p2}
          label="SHADOW"
          align="right"
          wins={state.wins.P2}
          roundsToWin={state.roundsToWin}
        />
      </View>

      <ComboPopup fighter={p1} align="left" />
      <ComboPopup fighter={p2} align="right" />

      {banner && !state.isPaused && (
        <View pointerEvents="none" style={styles.center}>
          <Animated.Text key={banner} entering={ZoomIn.duration(220)} style={styles.banner}>
            {banner}
          </Animated.Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {matchOver && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
          <Text style={[styles.banner, state.matchWinner === 'P1' && styles.victory]}>
            {matchTitle}
          </Text>
          <Text style={styles.subtitle}>
            {state.wins.P1} – {state.wins.P2}
          </Text>
          <View style={styles.menuRow}>
            <MenuButton label="REMATCH" onPress={onRestart} primary />
            <MenuButton label="MAIN MENU" onPress={onQuit} />
          </View>
        </Animated.View>
      )}

      {state.isPaused && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.overlay}>
          <Text style={styles.banner}>PAUSED</Text>
          <View style={styles.menuColumn}>
            <MenuButton label="RESUME" onPress={onResume} primary />
            <MenuButton label="RESTART" onPress={onRestart} />
            <MenuButton label="MAIN MENU" onPress={onQuit} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  statusBlock: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reverse: {
    flexDirection: 'row-reverse',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    ...TEXT_OUTLINE,
  },
  pips: {
    flexDirection: 'row',
    gap: 4,
  },
  pip: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  barTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  barLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  anchorLeft: {
    left: 0,
  },
  anchorRight: {
    right: 0,
  },
  trail: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  energyTrack: {
    width: '60%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
    overflow: 'hidden',
  },
  energyReady: {
    color: '#D8B4FE',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    ...TEXT_OUTLINE,
  },
  centerColumn: {
    alignItems: 'center',
    gap: 2,
  },
  timer: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'center',
    ...TEXT_OUTLINE,
  },
  timerLow: {
    color: '#F87171',
  },
  pauseButton: {
    width: 30,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pauseIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  combo: {
    position: 'absolute',
    top: '30%',
    alignItems: 'center',
  },
  comboLeft: {
    left: 40,
  },
  comboRight: {
    right: 40,
  },
  comboCount: {
    fontSize: 40,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  comboLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: -6,
    ...TEXT_OUTLINE,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(8,4,16,0.72)',
  },
  banner: {
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  victory: {
    color: '#FFE08A',
  },
  subtitle: {
    color: '#FFE08A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },
  menuColumn: {
    gap: 10,
    marginTop: 8,
    minWidth: 200,
  },
  menuButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  menuButtonPrimary: {
    backgroundColor: '#F43F5E',
    borderColor: '#F43F5E',
  },
  menuButtonPressed: {
    opacity: 0.75,
  },
  menuButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
