import React from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';

interface AmountDisplayProps {
  readonly amountKobo: bigint;
  readonly style?: TextStyle;
  readonly isHero?: boolean;
}

export function formatKoboToNaira(kobo: bigint): string {
  const isNegative = kobo < 0n;
  const absKobo = isNegative ? -kobo : kobo;
  const naira = absKobo / 100n;
  const remainingKobo = absKobo % 100n;
  
  // Custom format to ensure precision and avoid float errors
  const nairaFormatted = naira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const koboFormatted = remainingKobo.toString().padStart(2, '0');
  
  return `${isNegative ? '-' : ''}₦${nairaFormatted}.${koboFormatted}`;
}

export function AmountDisplay({ amountKobo, style, isHero = false }: AmountDisplayProps): React.JSX.Element {
  const { theme } = useTheme();
  const formattedString = formatKoboToNaira(amountKobo);
  
  // Spread the whole token, not just fontFamily: the size, leading, optical
  // tracking and tabular figures are all part of the style and are what keep
  // digit columns from shifting as values change.
  //
  // Deliberately NOT the `technical` (JetBrains Mono) token — that face is for
  // account numbers and reference IDs. Setting currency in a code font makes
  // money look like terminal output. See typography.ts.
  const styles = StyleSheet.create({
    amount: {
      color: theme.colors.text.primary,
      ...(isHero ? theme.typography.monument : theme.typography.amountRow),
    },
  });

  return (
    <Text
      style={[styles.amount, style]}
      allowFontScaling={!isHero} // Hero amounts do not scale to prevent overflow
      accessibilityLabel={`${amountKobo < 0n ? 'minus ' : ''}${formatKoboToNaira(amountKobo).replace('₦', '')} naira`}
    >
      {formattedString}
    </Text>
  );
}
