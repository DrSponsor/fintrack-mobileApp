/**
 * Alert capture — development inspector.
 *
 * The whole point of the spike: prove we can see notifications at all, and find
 * out what real bank alert text actually looks like before writing a parser
 * against imagined formats.
 *
 * Not a product screen. It is intentionally plain, it is only reachable in
 * __DEV__, and it will be deleted once the parser has a real corpus to test
 * against. It follows the design language enough to be legible and no further —
 * spending design effort on a throwaway tool is its own kind of waste.
 *
 * ── Two things it proves, independently ──────────────────────────────────
 * 1. THE PLUMBING. Any notification at all — WhatsApp, an email, anything —
 *    appearing in this list means the service is bound and reaching JS. No bank
 *    transaction and no money required.
 * 2. THE FORMATS. Once a real Opay or Access alert arrives, its exact text is
 *    here to read, and Share exports it.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import {
  addAlertListener,
  drain,
  hasAccess,
  isCaptureSupported,
  requestAccess,
  type CapturedAlert,
} from './notificationCapture';

/** Newest first, and de-duplicated on the tuple that identifies one posting.
 *  The live event and a drain can both deliver the same alert. */
function mergeAlerts(
  existing: readonly CapturedAlert[],
  incoming: readonly CapturedAlert[],
): CapturedAlert[] {
  const seen = new Set(existing.map((a) => `${a.packageName}|${a.postedAt}|${a.text}`));
  const fresh = incoming.filter(
    (a) => !seen.has(`${a.packageName}|${a.postedAt}|${a.text}`),
  );
  return [...fresh, ...existing].sort((a, b) => b.postedAt - a.postedAt);
}

export function CaptureDebugScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Seeded from lazy initialisers rather than a first-run effect. Both reads
  // are synchronous native calls, so doing them during the initial render is
  // both correct and cheaper — calling setState inside an effect body instead
  // would render once with empty state and immediately again with real state,
  // which is the cascading render `react-hooks/set-state-in-effect` flags.
  const [alerts, setAlerts] = useState<readonly CapturedAlert[]>(() => drain());
  const [granted, setGranted] = useState<boolean>(() => hasAccess());

  const pull = useCallback(() => {
    setGranted(hasAccess());
    const captured = drain();
    if (captured.length > 0) {
      setAlerts((prev) => mergeAlerts(prev, captured));
    }
  }, []);

  useEffect(() => {
    // Access is granted on a system screen, so the app is backgrounded when it
    // happens. Re-checking on resume is the only way to notice.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pull();
    });

    const removeAlertListener = addAlertListener((alert) => {
      setAlerts((prev) => mergeAlerts(prev, [alert]));
    });

    return () => {
      appStateSub.remove();
      removeAlertListener();
    };
  }, [pull]);

  const share = useCallback((): void => {
    const dump = alerts
      .map((a) =>
        [
          `package : ${a.packageName}`,
          `app     : ${a.appLabel}`,
          `title   : ${a.title}`,
          `text    : ${a.text}`,
          `subText : ${a.subText}`,
          `posted  : ${new Date(a.postedAt).toISOString()}`,
        ].join('\n'),
      )
      .join('\n\n---\n\n');
    void Share.share({ message: dump });
  }, [alerts]);

  if (!isCaptureSupported) {
    return (
      <View style={styles.screen}>
        <Text style={styles.headline}>Not supported</Text>
        <Text style={styles.body}>
          Notification capture is Android-only, and needs a build that includes the native
          module. iOS has no equivalent at any privilege level.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.headline}>Alert capture</Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>LISTENER ACCESS</Text>
        <Text style={[styles.statusValue, granted ? styles.ok : styles.off]}>
          {granted ? 'GRANTED' : 'NOT GRANTED'}
        </Text>
      </View>
      <View style={styles.rule} />

      {!granted && (
        <>
          <Text style={styles.body}>
            Access is granted on a system screen — there is no in-app permission dialog for
            this. Find FinTrack in the list and turn it on, then come back.
          </Text>
          <Pressable style={styles.button} onPress={requestAccess} accessibilityRole="button">
            <Text style={styles.buttonLabel}>Open notification access settings</Text>
          </Pressable>
        </>
      )}

      {granted && alerts.length === 0 && (
        <Text style={styles.body}>
          Listening. Trigger any notification at all — a message, an email, anything — and it
          should appear here. That alone proves the service is bound; a bank alert is not
          needed yet.
        </Text>
      )}

      {alerts.length > 0 && (
        <View style={styles.countRow}>
          <Text style={styles.statusLabel}>{alerts.length} CAPTURED</Text>
          <Pressable onPress={share} hitSlop={12} accessibilityRole="button">
            <Text style={styles.share}>SHARE ALL →</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {alerts.map((alert) => (
          <View key={`${alert.packageName}-${alert.postedAt}-${alert.text}`} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.entryApp}>{alert.appLabel}</Text>
              <Text style={styles.entryTime}>
                {new Date(alert.postedAt).toLocaleTimeString()}
              </Text>
            </View>
            {alert.title.length > 0 && <Text style={styles.entryTitle}>{alert.title}</Text>}
            {alert.text.length > 0 && <Text style={styles.entryText}>{alert.text}</Text>}
            <Text style={styles.entryPackage}>{alert.packageName}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingHorizontal: theme.spacing.gutter,
      paddingTop: theme.spacing.xxl,
    },
    headline: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.lg,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
    },

    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: theme.spacing.sm,
    },
    statusLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.4,
    },
    statusValue: {
      ...theme.typography.technicalSmall,
    },
    ok: { color: theme.colors.money.inbound },
    off: { color: theme.colors.money.outbound },

    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },

    button: {
      marginTop: theme.spacing.lg,
      height: 48,
      justifyContent: 'center',
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.action.base,
    },
    buttonLabel: {
      ...theme.typography.button,
      color: theme.colors.action.on,
      textAlign: 'center',
    },

    countRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    share: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.secondary,
    },

    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: theme.spacing.xxl,
    },
    entry: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    entryHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    entryApp: {
      ...theme.typography.micro,
      color: theme.colors.text.secondary,
    },
    entryTime: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
    },
    entryTitle: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    // Monospaced deliberately: this is the raw string a parser will consume, and
    // seeing it in a proportional face hides the spacing that formats hinge on.
    entryText: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    entryPackage: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
      marginTop: theme.spacing.xs,
    },
  });
}
