import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createAIController } from '@/game/aiController';
import { MAX_STEPS_PER_FRAME, STEP_MS } from '@/game/constants';
import { createInitialGameState, gameTick } from '@/game/gameLoop';
import {
  type ControlButton,
  createPlayerInput,
  currentCommand,
  pressButton,
  releaseButton,
  settleInput,
} from '@/game/input';
import type { Difficulty } from '@/game/settings';
import type { GameState } from '@/game/types';

interface FightOptions {
  difficulty: Difficulty;
  roundsToWin: number;
}

/**
 * Runs the fight simulation on a fixed 60 Hz step driven by
 * requestAnimationFrame, and re-renders once per display frame.
 */
export function useFightGame({ difficulty, roundsToWin }: FightOptions) {
  const [state, setState] = useState<GameState>(() => createInitialGameState({ roundsToWin }));
  const stateRef = useRef(state);
  const inputRef = useRef(createPlayerInput());
  const aiRef = useRef(createAIController(difficulty));

  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let frameId = 0;
    let last: number | null = null;
    let accumulator = 0;

    const frame = (now: number) => {
      // Clamp long gaps (app backgrounded, debugger pause) to a few steps.
      const elapsed = last === null ? 0 : now - last;
      last = now;
      accumulator = Math.min(accumulator + elapsed, STEP_MS * MAX_STEPS_PER_FRAME);

      let next = stateRef.current;
      while (accumulator >= STEP_MS) {
        const [p1, p2] = next.players;
        const p1Command = currentCommand(inputRef.current);
        const p2Command = aiRef.current.getInput(p2, p1, STEP_MS);
        const after = gameTick(next, p1Command, p2Command, STEP_MS);
        settleInput(inputRef.current, p1, after.players[0], STEP_MS);
        if (after.round !== next.round) aiRef.current.reset();
        next = after;
        accumulator -= STEP_MS;
      }

      if (next !== stateRef.current) commit(next);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [commit]);

  const setPaused = useCallback(
    (isPaused: boolean) => {
      const current = stateRef.current;
      // Nothing to pause once the match is decided.
      if (current.isPaused === isPaused || current.phase === 'MATCH_OVER') return;
      commit({ ...current, isPaused });
    },
    [commit],
  );

  // Leaving the app mid-fight pauses it instead of letting the AI win.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') setPaused(true);
    });
    return () => sub.remove();
  }, [setPaused]);

  const press = useCallback((button: ControlButton) => {
    pressButton(inputRef.current, button);
  }, []);

  const release = useCallback((button: ControlButton) => {
    releaseButton(inputRef.current, button);
  }, []);

  const pause = useCallback(() => setPaused(true), [setPaused]);
  const resume = useCallback(() => setPaused(false), [setPaused]);

  const restart = useCallback(() => {
    inputRef.current = createPlayerInput();
    aiRef.current.reset();
    commit(createInitialGameState({ roundsToWin }));
  }, [commit, roundsToWin]);

  return { state, press, release, pause, resume, restart };
}
