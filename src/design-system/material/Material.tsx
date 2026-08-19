/**
 * Material — the Skia layer of the "Ledger" design language.
 *
 * Wraps the whole app in two passes that flat React Native styling cannot
 * produce, and which together are the largest single reason the interface stops
 * reading as flat vector:
 *
 *   ATMOSPHERE (behind content) — a very wide, very low-opacity radial wash of
 *   warm light, placed above and slightly off-centre. It establishes a consistent
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
import * as Device from 'expo-device';
import {
  Canvas,
  ColorMatrix,
  Fill,
  FractalNoise,
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
 * (Rec. 709 weights), scaled by `intensity`.
 *
 * The intensity is baked into the matrix rather than applied with a wrapping
 * `<Group opacity>`. Group opacity does not composite a shader-backed `<Fill>`
 * the way it composites ordinary drawings — it left the grain at full strength,
 * which washed the entire near-black ground out to mid-grey. Folding the scalar
 * into the alpha row makes the result depend only on the shader itself.
 */
function grainMatrix(intensity: number): number[] {
  return [
    0, 0, 0, 0, 1,
    0, 0, 0, 0, 1,
    0, 0, 0, 0, 1,
    0.2126 * intensity, 0.7152 * intensity, 0.0722 * intensity, 0, 0,
  ];
}

const GRAIN_MATRIX = grainMatrix(material.grain.opacity);

/**
 * Devices at or below this get no grain.
 *
 * The grain is a full-screen fractal-noise shader composited over every frame,
 * so its cost is FILL RATE — the one thing budget GPUs have least of, and a
 * cost that does not shrink just because the screen is idle. On a ₦40,000
 * Android phone that is a texture tax on scrolling forever.
 *
 * Total RAM is a crude proxy for GPU class, but on Android it is a good one:
 * the SoCs paired with ≤3GB are exactly the ones without the fill rate to
 * spare. It is also the only signal available without a native module.
 *
 * `Device.totalMemory` is Android-only and null elsewhere, which is the right
 * default — every iPhone running this OS version has the headroom.
 *
 * This is a floor, not a substitute for profiling. Grain has still never been
 * measured on real low-end hardware; this makes shipping before that
 * measurement safe rather than making the measurement unnecessary.
 */
const LOW_MEMORY_BYTES = 3 * 1024 * 1024 * 1024;

const deviceCanAffordGrain =
  typeof Device.totalMemory !== 'number' || Device.totalMemory > LOW_MEMORY_BYTES;

interface MaterialProps {
  readonly children: React.ReactNode;
  /** Explicit override. Left undefined, grain follows the device check above. */
  readonly enableGrain?: boolean;
  readonly style?: ViewStyle;
}

export function Material({
  children,
  enableGrain,
  style,
}: MaterialProps): React.JSX.Element {
  const grainEnabled = enableGrain ?? deviceCanAffordGrain;
  const { width, height } = useWindowDimensions();

  // Light source sits above the top edge and slightly left of centre. Placing
  // it off-screen keeps the falloff across the visible area gentle — a
  // gradient whose centre is on screen reads as a spotlight, not daylight.
  const lightCentre = vec(width * 0.35, -height * 0.1);
  const lightRadius = Math.min(width, height) * material.atmosphere.radius;

  return (
    <View style={[styles.root, style]}>
      {/* Both canvases are wrapped in a `pointerEvents="none"` View rather than
          relying on the prop on <Canvas> itself, which Skia does not forward to
          its underlying native view — the grain canvas sits above the content
          and silently swallowed every tap in the app. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={lightCentre}
              r={lightRadius}
              // Fades to a fully transparent version of the SAME colour, not to
              // `transparent`.
              // Gradients interpolate unpremultiplied, so ending on
              // rgba(0,0,0,0) drags the midpoint toward black and rings the
              // wash with a dirty halo.
              colors={[colors.action.wash, 'rgba(240, 237, 230, 0)']}
            />
          </Rect>
        </Canvas>
      </View>

      {children}

      {grainEnabled && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill>
              <FractalNoise
                freqX={material.grain.frequency}
                freqY={material.grain.frequency}
                octaves={material.grain.octaves}
              />
              <ColorMatrix matrix={GRAIN_MATRIX} />
            </Fill>
          </Canvas>
        </View>
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
