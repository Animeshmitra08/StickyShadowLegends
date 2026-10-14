import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

const MOVES: { keys: string; color: string; text: string }[] = [
  { keys: '◀  ▶', color: '#94A3B8', text: 'Joystick sideways to walk. You always face your opponent.' },
  { keys: '▲', color: '#38BDF8', text: 'Push up to jump — up-left / up-right jumps while moving.' },
  { keys: '▼', color: '#7DD3FC', text: 'Hold down to block. Guards everything but Shadow Strike; a little chip damage gets through.' },
  { keys: 'PUNCH · KICK · SWORD', color: '#F43F5E', text: 'Fast, mid and heavy attacks. Hit again while the enemy reels to build a combo.' },
  { keys: 'DASH', color: '#A78BFA', text: 'Roll through attacks — you are untouchable mid-roll.' },
  { keys: 'SHADOW', color: '#A855F7', text: 'Fighting, getting hit and blocking fill your energy. When full, unleash an unblockable Shadow Strike.' },
];

/** Full-screen panel listing the controls and mechanics. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View entering={ZoomIn.duration(220)} style={styles.panel}>
        <Text style={styles.heading}>HOW TO PLAY</Text>
        <ScrollView contentContainerStyle={styles.list}>
          {MOVES.map((move) => (
            <View key={move.keys} style={styles.row}>
              <Text style={[styles.keys, { color: move.color, borderColor: move.color }]}>
                {move.keys}
              </Text>
              <Text style={styles.text}>{move.text}</Text>
            </View>
          ))}
          <Text style={styles.footnote}>
            Win the required rounds to take the match. Each extra hit in a combo deals a little less
            damage, so mix in blocks and rolls.
          </Text>
        </ScrollView>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
          <Text style={styles.closeText}>GOT IT</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,2,10,0.75)',
  },
  panel: {
    width: '70%',
    maxWidth: 560,
    maxHeight: '88%',
    padding: 18,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.6)',
    backgroundColor: '#120A22',
    boxShadow: '0 0 30px rgba(168,85,247,0.35)',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 4,
    textAlign: 'center',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  keys: {
    minWidth: 130,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  text: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 16,
  },
  footnote: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
    marginTop: 4,
  },
  close: {
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#A855F7',
  },
  closePressed: {
    opacity: 0.75,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
