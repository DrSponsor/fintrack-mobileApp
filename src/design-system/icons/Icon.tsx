/**
 * FinTrack icon set — hand-drawn, seven icons, one file.
 *
 * ── Why this replaced phosphor-react-native ──────────────────────────────
 * That package ships 10,586 source files (1,512 icons × 7 weights). The app
 * imported seven of them, but through a barrel export — `import { House } from
 * 'phosphor-react-native'` — which pulls the entire library into the module
 * graph. Of the app's 13,060 Metro modules, ~10,586 were unused icons. That is
 * what exhausted Windows' file-handle limit (`EMFILE`) on every cold bundle and
 * pushed build times past four minutes.
 *
 * ── Why hand-drawn rather than a smaller icon package ────────────────────
 * A stock icon set is one of the clearest tells that an interface was assembled
 * rather than designed — every app using it shares the same silhouettes. These
 * are drawn to this design language instead:
 *
 *   - 24×24 grid, 1.75px strokes, round caps and joins. Slightly lighter than
 *     the 2px most sets use, to sit correctly beside Plus Jakarta Sans rather
 *     than out-weighing it.
 *   - Open rather than closed forms — no filled counters — so they read as
 *     ruled marks, matching the hairline ledger rules used throughout.
 *   - Geometric construction on a consistent optical size, so the set looks
 *     like one hand.
 *
 * Stroke-based icons also inherit `color` correctly for the active/inactive tab
 * states without needing a second filled variant per icon.
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export interface IconProps {
  readonly size?: number;
  readonly color?: string;
  /** Stroke weight. Raised slightly for the active tab rather than swapping to
   *  a filled icon, which is a heavier, cruder state change. */
  readonly weight?: number;
}

const DEFAULTS = { size: 24, color: 'currentColor', weight: 1.75 } as const;

interface FrameProps extends IconProps {
  readonly children: React.ReactNode;
}

function Frame({
  size = DEFAULTS.size,
  color = DEFAULTS.color,
  weight = DEFAULTS.weight,
  children,
}: FrameProps): React.JSX.Element {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

/** Dashboard. A roof over an open ledger line rather than a solid house — the
 *  base line is the same rule that separates ledger rows. */
export function IconHome(props: IconProps): React.JSX.Element {
  return (
    <Frame {...props}>
      <Path d="M3.5 10.2 12 3.5l8.5 6.7" />
      <Path d="M5.5 9.2V20h13V9.2" />
      <Path d="M9.5 20v-5.5h5V20" />
    </Frame>
  );
}

/** Transactions. A receipt with a torn lower edge and two entry lines — the
 *  ledger motif at icon scale. */
export function IconLedger(props: IconProps): React.JSX.Element {
  return (
    <Frame {...props}>
      <Path d="M5.5 3.5h13v17l-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5-2.1-1.5-2.2 1.5z" />
      <Path d="M9 8.5h6" />
      <Path d="M9 12.5h6" />
    </Frame>
  );
}

/** Analysis. Ascending bars on a baseline — deliberately uneven heights, since
 *  a symmetric chart icon reads as decoration rather than data. */
export function IconAnalysis(props: IconProps): React.JSX.Element {
  return (
    <Frame {...props}>
      <Path d="M4 20h16" />
      <Path d="M7.5 20v-5" />
      <Path d="M12 20V8.5" />
      <Path d="M16.5 20v-8" />
    </Frame>
  );
}

/** Budgets. A wallet whose clasp is a single ruled mark. */
export function IconBudget(props: IconProps): React.JSX.Element {
  return (
    <Frame {...props}>
      <Path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <Path d="M3.5 8.5 16 4.2" />
      <Path d="M16.5 13h1.5" />
    </Frame>
  );
}

/** Settings. A dial with a single indicator, rather than the usual toothed
 *  cog — fewer, cleaner strokes at 24px, and it does not turn to mush when the
 *  tab bar renders it at 22. */
export function IconSettings(props: IconProps): React.JSX.Element {
  return (
    <Frame {...props}>
      <Circle cx="12" cy="12" r="8.2" />
      <Path d="M12 3.8v3.4" />
      <Circle cx="12" cy="12" r="2.6" />
    </Frame>
  );
}

/** Confirmation. */
export function IconCheck(props: IconProps): React.JSX.Element {
  return (
    <Frame {...props}>
      <Path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </Frame>
  );
}

/** Dismiss, and the failed state of a validation rule. */
export function IconClose(props: IconProps): React.JSX.Element {
  return (
    <Frame {...props}>
      <Path d="M6 6l12 12" />
      <Path d="M18 6 6 18" />
    </Frame>
  );
}
