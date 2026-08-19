import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useUIStore } from '@/core/store/ui.store';
import { ProgressRule } from '@/features/onboarding/ProgressRule';
import { CaptureStage } from '@/features/onboarding/stages/CaptureStage';
import { SortStage } from '@/features/onboarding/stages/SortStage';
import { InsightStage } from '@/features/onboarding/stages/InsightStage';
import { PrivacyStage } from '@/features/onboarding/stages/PrivacyStage';

type StageKind = 'capture' | 'sort' | 'insight' | 'privacy';

interface Slide {
  readonly kind: StageKind;
  readonly headline: readonly [string, string];
  /** The closing clause — the payoff the slide turns on. Separated both because
   *  it is authored as its own beat and because it carries the tonal ramp. */
  readonly accent: string;
  readonly body: string;
}

const SLIDES: readonly Slide[] = [
  {
    kind: 'capture',
    headline: ['Your bank already', 'tells you.'],
    accent: 'We just listen.',
    body: 'FinTrack reads the transaction alerts your bank already sends, and writes them into a ledger. Nothing to type. Nothing to photograph.',
  },
  {
    kind: 'sort',
    headline: ['Sorted before', 'you look.'],
    accent: 'Every single time.',
    body: 'Every entry lands in the right category on its own — and when you correct one, it remembers that merchant for good.',
  },
  {
    kind: 'insight',
    headline: ['You will see it', 'coming.'],
    accent: 'Well before it lands.',
    body: 'Budgets that warn you early rather than after the fact, plus a weekly read on what actually changed and why.',
  },
  {
    kind: 'privacy',
    headline: ['Read-only.', 'Always.'],
    accent: 'No exceptions.',
    body: 'FinTrack can read transaction alerts and nothing else. It cannot move your money, and it never sees your banking password.',
  },
];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const setOnboardingComplete = useUIStore((state) => state.setOnboardingComplete);

  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Derive the settled page on the UI thread and hand only the *changes* back
  // to JS. Reading scroll position into React state every frame would re-render
  // all four stages sixty times a second.
  useAnimatedReaction(
    () => (width > 0 ? Math.round(scrollX.value / width) : 0),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setActiveIndex)(current);
      }
    },
    [width],
  );

  const finish = useCallback(() => {
    setOnboardingComplete();
    // Reached from welcome's "How it works" rather than on first launch, so
    // return the user where they were instead of stacking a second welcome.
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/welcome');
  }, [setOnboardingComplete, router]);

  const isLast = activeIndex >= SLIDES.length - 1;

  const advance = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
  }, [isLast, finish, activeIndex, width]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={finish}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide, index) => (
          <SlideView
            key={slide.kind}
            slide={slide}
            index={index}
            isActive={activeIndex === index}
            scrollX={scrollX}
            pageWidth={width}
            styles={styles}
            theme={theme}
          />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <ProgressRule count={SLIDES.length} scrollX={scrollX} pageWidth={width} />

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={advance}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next'}
        >
          <Text style={styles.buttonText}>{isLast ? 'Get started' : 'Continue'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Tonal ramp ────────────────────────────────────────────────────────────

/**
 * Walks a colour across a run of text, character by character.
 *
 * ── Why not an actual gradient ───────────────────────────────────────────
 * React Native cannot fill text with a shader. The three usual answers all
 * fail here for the same underlying reason — they stop being text:
 *
 *   MASKED VIEW would work, but @react-native-masked-view is not installed and
 *   is a native module, so it costs a full dev-client rebuild.
 *
 *   SKIA or SVG TEXT can take a gradient shader, but neither wraps. The accent
 *   clause runs on from the second headline line and breaks across two lines at
 *   this size, so both would need hand-broken lines at fixed widths — which
 *   breaks on the first device with a different screen or font scale, and takes
 *   OS text scaling and screen-reader access down with it.
 *
 * ── What this does instead ───────────────────────────────────────────────
 * One <Text> per character, each a step along the interpolation. Nested Text
 * collapses to a single SpannableString on Android and one NSAttributedString
 * on iOS, and line breaking on both runs off the text content rather than the
 * span boundaries — so wrapping still happens at spaces, not mid-word.
 *
 * At 38px across ~21 characters the steps are around 1.5% of the colour
 * distance each, which reads as continuous. It stays real text: it wraps, it
 * scales, and a screen reader gets the whole clause.
 */
/** Parses #RRGGBB only. Returns null for anything else — several palette
 *  entries are `rgba(...)` strings, and parsing one of those with parseInt
 *  yields NaN, which formats to the string "#NaNNaNNaN" and fails silently as
 *  an invalid colour rather than throwing. */
function hexToRgb(hex: string): readonly [number, number, number] | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const value = hex.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  // Degrade to a flat clause rather than an invalid colour: a headline that
  // loses its ramp is a small loss, one that fails to render is not.
  if (a === null || b === null) return from;

  const channel = (start: number, end: number): string =>
    Math.round(start + (end - start) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(a[0], b[0])}${channel(a[1], b[1])}${channel(a[2], b[2])}`;
}

interface RampedTextProps {
  readonly text: string;
  readonly from: string;
  readonly to: string;
}

function RampedText({ text, from, to }: RampedTextProps): React.JSX.Element {
  const characters = useMemo(() => {
    const chars = Array.from(text);
    const last = Math.max(1, chars.length - 1);
    return chars.map((character, index) => ({
      character,
      color: mixHex(from, to, index / last),
    }));
  }, [text, from, to]);

  return (
    <>
      {characters.map((item, index) => (
        <Text key={`${item.character}-${index}`} style={{ color: item.color }}>
          {item.character}
        </Text>
      ))}
    </>
  );
}

// ── Slide ─────────────────────────────────────────────────────────────────

interface SlideViewProps {
  readonly slide: Slide;
  readonly index: number;
  readonly isActive: boolean;
  readonly scrollX: SharedValue<number>;
  readonly pageWidth: number;
  readonly styles: ReturnType<typeof createStyles>;
  readonly theme: AppTheme;
}

function SlideView({
  slide,
  index,
  isActive,
  scrollX,
  pageWidth,
  styles,
  theme,
}: SlideViewProps): React.JSX.Element {
  // Both ends stay inside the indigo text family, so the clause deepens as it
  // is read rather than changing hue. tertiary is 3.77:1 — below AA for body
  // copy, but this is 38px display type, where AA asks 3:1.
  const rampFrom = theme.colors.text.secondary;
  const rampTo = theme.colors.text.tertiary;

  // Two parallax rates. The stage is the nearer plane so it is allowed to
  // travel almost at page speed; the text lags further behind, which is what
  // separates them into layers instead of one flat card sliding by.
  const stageStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * pageWidth;
    const distance = pageWidth > 0 ? Math.abs(offset / pageWidth) : 0;
    return {
      opacity: Math.max(0, 1 - distance * 1.6),
      transform: [{ translateX: offset * 0.14 }, { scale: 1 - distance * 0.06 }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * pageWidth;
    const distance = pageWidth > 0 ? Math.abs(offset / pageWidth) : 0;
    return {
      opacity: Math.max(0, 1 - distance * 1.9),
      transform: [{ translateX: offset * 0.34 }],
    };
  });

  return (
    <View style={[styles.slide, { width: pageWidth }]}>
      <Animated.View style={[styles.stageArea, stageStyle]}>
        <Stage kind={slide.kind} isActive={isActive} />
      </Animated.View>

      <Animated.View style={[styles.textArea, textStyle]}>
        {/* The label is set explicitly: the accent clause is built from one
            span per character, and spelling it out here means a screen reader
            never has to reassemble it. */}
        <Text
          style={styles.headline}
          accessibilityLabel={`${slide.headline[0]} ${slide.headline[1]} ${slide.accent}`}
        >
          {slide.headline[0]}
          {'\n'}
          {slide.headline[1]}{' '}
          <RampedText
            text={slide.accent}
            from={rampFrom}
            to={rampTo}
          />
        </Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
}

function Stage({
  kind,
  isActive,
}: {
  readonly kind: StageKind;
  readonly isActive: boolean;
}): React.JSX.Element {
  switch (kind) {
    case 'capture':
      return <CaptureStage isActive={isActive} />;
    case 'sort':
      return <SortStage isActive={isActive} />;
    case 'insight':
      return <InsightStage isActive={isActive} />;
    case 'privacy':
      return <PrivacyStage isActive={isActive} />;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // The root Material layer owns the ground, atmosphere and grain.
      backgroundColor: 'transparent',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.sm,
    },
    // text.secondary, not tertiary. Tertiary is 3.77:1, which tokens.ts itself
    // restricts to large text and "non-essential metadata" — and Skip is the
    // only way out of a mandatory flow, so it is neither. secondary is 6.21:1
    // and clears AA at this size.
    skip: {
      ...theme.typography.micro,
      color: theme.colors.text.secondary,
    },

    pager: {
      flex: 1,
    },
    slide: {
      flex: 1,
      paddingHorizontal: theme.spacing.xl,
    },
    // Centred. This was briefly anchored to the bottom to close a gap between
    // the illustration and the headline, which turned out to be a bad trade:
    // it moved the slack to the top and left the illustration, headline, body,
    // progress rule and button all stacked into the lower half. One void
    // swapped for a void plus a crowd.
    //
    // The gap it was trying to fix is better solved at the source — the stages
    // size themselves against the viewport (see InsightStage) so they fill the
    // area rather than floating in it.
    stageArea: {
      flex: 1,
      justifyContent: 'center',
    },
    // Fixed height so the headline baseline sits in exactly the same place on
    // every slide — text that shifts between pages is the fastest way to make
    // a carousel feel unconsidered.
    textArea: {
      minHeight: 188,
      paddingTop: theme.spacing.lg,
    },
    headline: {
      ...theme.typography.display,
      color: theme.colors.text.primary,
    },
    // A TONAL RAMP, and the step is doing real work.
    //
    // This was briefly flattened to a single tone on the argument that the
    // closing clause is the payoff, so setting it dimmer meant the emphasis ran
    // backwards. That argument was wrong, and it is worth recording why rather
    // than silently reverting: it assumed emphasis is the same thing as
    // brightness. It is not. What draws the eye is DIFFERENCE — a tonal step
    // marks the clause as a separate beat, a turn into another register, and
    // the boundary itself is what makes a reader look at it.
    //
    // It also breaks up the block. Three lines of 38px ExtraBold in one tone is
    // a slab; the step gives the headline a rhythm.
    //
    // The objection worth keeping is narrower than the one that was made: a
    // closing clause tinted in a BRAND HUE is the generated-looking move. A
    // greyscale step is ordinary editorial typography, and it stays inside the
    // rule that colour is reserved for money.
    //
    // The clause is no longer one flat tone: it walks secondary -> tertiary
    // across its characters, so it deepens as it is read. See RampedText. The
    // colour therefore lives at the call site rather than in a style here.
    body: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
      maxWidth: 330,
    },

    footer: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    button: {
      backgroundColor: theme.colors.action.base,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
    buttonText: {
      ...theme.typography.button,
      color: theme.colors.text.inverse,
    },
  });
}
