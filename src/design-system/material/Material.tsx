/**
 * Material — the Skia layer of the "Ledger" design language.
 *
 * One pass: a very wide, very low-opacity radial wash of warm light, placed
 * above and slightly off-centre. It establishes a consistent light source, so
 * surfaces have a reason to be lighter at the top. Without it the hairline edge
 * highlights on raised surfaces are decoration; with it they read as light
 * actually catching an edge.
 *
 * ── The film grain was removed, and why that is worth recording ───────────
 * This layer used to composite monochrome fractal noise over the whole app at
 * ~3.5%. The design plan called it "the largest single differentiator" and "the
 * highest impact-to-effort item" in the entire redesign. Both claims were
 * reasoned from how grain behaves in print and on large displays, and neither
 * was ever measured.
 *
 * On a real device it was imperceptible. Retuning it — nearly double the
 * amplitude, less than half the fineness — made it visible and confirmed the
 * verdict rather than overturning it: at phone size and arm's length it simply
 * did not earn its cost. What it cost was concrete:
 *
 *   A full-screen shader composited every frame. That is FILL RATE, the
 *   resource budget GPUs have least of, and it is spent whether or not the
 *   screen is doing anything.
 *
 *   A device-gating mechanism to keep it off low-memory phones, i.e. a whole
 *   safety apparatus existing only to make the effect survivable.
 *
 *   Two real bugs. Skia's <Group opacity> does not composite a shader-backed
 *   <Fill>, so the grain washed the near-black ground out to mid-grey; and
 *   <Canvas> does not forward pointerEvents to its native view, so the overlay
 *   silently swallowed every tap in the app.
 *
 * The lesson kept here deliberately: an effect nobody notices until they are
 * told it exists is not a differentiator, however good the argument for it.
 *
 * ── Performance ──────────────────────────────────────────────────────────
 * The remaining canvas is static — no shared values, no animation, no
 * re-render on scroll — so Skia rasterises the gradient once. Unlike the grain
 * it is drawn BEHIND content rather than over it, so it composites against the
 * ground alone and costs nothing per frame thereafter.
 */
import React from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { Canvas, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { colors, material } from '../tokens';

interface MaterialProps {
  readonly children: React.ReactNode;
  readonly style?: ViewStyle;
}

export function Material({ children, style }: MaterialProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();

  // Light source sits above the top edge and slightly left of centre. Placing
  // it off-screen keeps the falloff across the visible area gentle — a
  // gradient whose centre is on screen reads as a spotlight, not daylight.
  const lightCentre = vec(width * 0.35, -height * 0.1);
  const lightRadius = Math.min(width, height) * material.atmosphere.radius;

  return (
    <View style={[styles.root, style]}>
      {/* Wrapped in a `pointerEvents="none"` View rather than relying on the
          prop on <Canvas>, which Skia does not forward to its underlying
          native view. */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.base,
  },
});
