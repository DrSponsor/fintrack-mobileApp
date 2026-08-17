/**
 * Material — the Skia layer of the "Ledger" design language.
 *
 * Wraps the whole app in two passes that flat React Native styling cannot
 * produce, and which together are the largest single reason the interface stops
 * reading as flat vector:
 *
 *   ATMOSPHERE (behind content) — a very wide, very low-opacity radial wash of
 *   brass, placed above and slightly off-centre. It establishes a consistent
 *   light source, so surfaces have a reason to be lighter at the top. Without
 *   it the hairline edge highlights on raised surfaces are decoration; with it
 *   they read as light actually catching an edge.
 *
 *   GRAIN (over content) — monochrome fractal noise at ~3.5%. Real materials
 *   have tooth. Absolutely uniform fills are the single most synthetic thing a
 *   screen can do, and a few percent of noise is what separates "rendered" from
 *   "printed".
 *
 * ── Why grain is an overlay and not part of the background ────────────────
 * Skia blend modes only compose within a single canvas, so grain drawn behind
 * the content would be hidden everywhere a surface or card sits on top — which
 * is most of the screen. Overlaying it means it lands on everything. The cost
 * is that it alpha-blends rather than soft-lights, so it can only lighten; at
 * this opacity that reads correctly as film grain on a dark ground.
 *
 * ── Performance ──────────────────────────────────────────────────────────
 * Both canvases are static: no shared values, no animation, no re-render on
 * scroll. Skia rasterises each once. `enableGrain` exists so it can be switched
 * off wholesale if profiling on a low-end device says the compositing cost is
 * real — see the performance gate in the plan.
 */
import React from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import {
  Canvas,
  ColorMatrix,
  Fill,
  FractalNoise,
  Group,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { colors, material } from '../tokens';

/**
 * Turns the noise shader into white pixels whose *alpha* carries the noise,
 * rather than coloured pixels with noisy alpha.
 *
 * FractalNoise emits independent noise in all four channels, which on its own
 * looks like coloured television static. Rows 1-3 clamp RGB to white via the
 * constant column; row 4 sets alpha to the luminance of the original noise
 * (Rec. 709 weights). The result is monochrome grain.
 */
const GRAIN_MATRIX = [
  0, 0, 0, 0, 1,
  0, 0, 0, 0, 1,
  0, 0, 0, 0, 1,
  0.2126, 0.7152, 0.0722, 0, 0,
];

interface MaterialProps {
  readonly children: React.ReactNode;
  readonly enableGrain?: boolean;
  readonly style?: ViewStyle;
}

export function Material({
  children,
  enableGrain = true,
  style,
}: MaterialProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();

  // Light source sits above the top edge and slightly left of centre. Placing
  // it off-screen keeps the falloff across the visible area gentle — a
  // gradient whose centre is on screen reads as a spotlight, not daylight.
  const lightCentre = vec(width * 0.35, -height * 0.1);
  const lightRadius = Math.min(width, height) * material.atmosphere.radius;

  return (
    <View style={[styles.root, style]}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={lightCentre}
            r={lightRadius}
            colors={[colors.brass.wash, 'transparent']}
          />
        </Rect>
      </Canvas>

      {children}

      {enableGrain && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Group opacity={material.grain.opacity}>
            <Fill>
              <FractalNoise
                freqX={material.grain.frequency}
                freqY={material.grain.frequency}
                octaves={material.grain.octaves}
              />
              <ColorMatrix matrix={GRAIN_MATRIX} />
            </Fill>
          </Group>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.base,
  },
});
