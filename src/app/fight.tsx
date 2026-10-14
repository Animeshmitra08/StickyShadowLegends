import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Arena } from '@/components/game/Arena';
import { Controls } from '@/components/game/Controls';
import { Hud } from '@/components/game/Hud';
import { parseDifficulty, parseRoundsToWin } from '@/game/settings';
import { useFightGame } from '@/hooks/use-fight-game';

export default function FightScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams<{ difficulty?: string; rounds?: string }>();
  const { state, press, release, pause, resume, restart } = useFightGame({
    difficulty: parseDifficulty(params.difficulty),
    roundsToWin: parseRoundsToWin(params.rounds),
  });

  const quit = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.root}>
      <Arena state={state} width={width} height={height} />
      <Controls onPress={press} onRelease={release} energy={state.players[0].energy} />
      {/* HUD sits on top so the pause / results menus cover the controls. */}
      <Hud state={state} onPause={pause} onResume={resume} onRestart={restart} onQuit={quit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#150C1F',
  },
});
