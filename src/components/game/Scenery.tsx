import React from 'react';
import { Circle, Path } from '@shopify/react-native-skia';

/**
 * Backdrop silhouettes in arena units (640 × 320, ground at 262). Paths run
 * well past both edges so wide screens never see where they end.
 */
const FAR_RIDGE =
  'M-400 262 L-400 170 L-300 140 L-200 175 L-120 130 L-40 165 L0 150 L60 150 L110 175 L170 120 ' +
  'L230 165 L280 140 L340 180 L400 130 L460 160 L520 115 L580 155 L640 135 L720 165 L800 125 ' +
  'L900 160 L1040 140 L1040 262 Z';

const NEAR_RIDGE =
  'M-400 262 L-400 215 L-300 228 L-200 206 L-100 224 L0 212 L50 205 L90 225 L150 200 L210 228 ' +
  'L260 212 L320 232 L380 208 L440 226 L500 204 L560 224 L640 210 L720 226 L820 204 L920 222 ' +
  'L1040 210 L1040 262 Z';

/** A two-tier pagoda on the near ridge. */
const PAGODA =
  'M89 176 h2 v10 h-2 Z ' +
  'M72 194 L90 184 L108 194 Z M80 194 h20 v10 h-20 Z ' +
  'M66 210 L90 198 L114 210 Z M76 210 h28 v18 h-28 Z';

/** Distant torii gate on the right. */
const TORII =
  'M520 196 h44 v4 h-44 Z M516 192 Q542 186 568 192 v3 Q542 189 516 195 Z ' +
  'M526 200 h4 v28 h-4 Z M554 200 h4 v28 h-4 Z M524 206 h36 v3 h-36 Z';

interface SceneryProps {
  sunX: number;
  groundY: number;
}

/**
 * Mid-tone palette — the fighters are drawn in near-black, so no backdrop
 * layer goes dark enough to swallow them, but it isn't washed out either.
 */
export function Scenery({ sunX, groundY }: SceneryProps) {
  return (
    <>
      <Circle cx={sunX} cy={groundY - 10} r={84} color="#FEF08A" opacity={0.4} />
      <Circle cx={sunX} cy={groundY - 10} r={64} color="#FDE047" opacity={0.95} />
      <Path path={FAR_RIDGE} color="#C084FC" opacity={0.85} />
      <Path path={TORII} color="#EC4899" />
      <Path path={NEAR_RIDGE} color="#A78BFA" />
      <Path path={PAGODA} color="#8B5CF6" />
    </>
  );
}
