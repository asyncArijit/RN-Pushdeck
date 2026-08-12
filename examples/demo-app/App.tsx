import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  configure,
  checkForUpdate,
  type UpdateContext,
} from '@asyncarijit/rn-pushdeck';

// Replace with your own project key from https://rn-pushdeck.vercel.app
const PROJECT_KEY =
  process.env.EXPO_PUBLIC_PUSHDECK_PROJECT_KEY ?? 'psh_3euqoretxjpfvp';

const BUILD_VERSION = '1.0.7';
const SHIPPED_AT = '2026-05-11 — shipped via OTA, no Play Store';

type Status =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'up-to-date' }
  | { type: 'available'; ctx: UpdateContext }
  | { type: 'applying' }
  | { type: 'error'; message: string };

let pendingCtx: UpdateContext | null = null;

configure({
  projectKey: PROJECT_KEY,
  channel: 'production',
  onUpdateAvailable: (ctx) => {
    pendingCtx = ctx;
  },
  onError: (err) => {
    console.warn('[rn-pushdeck]', err);
  },
});

export default function App() {
  const [status, setStatus] = useState<Status>({ type: 'idle' });

  async function runCheck() {
    setStatus({ type: 'checking' });
    pendingCtx = null;
    try {
      await checkForUpdate();
      if (pendingCtx) {
        setStatus({ type: 'available', ctx: pendingCtx });
      } else {
        setStatus({ type: 'up-to-date' });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function applyUpdate(ctx: UpdateContext) {
    setStatus({ type: 'applying' });
    try {
      await ctx.apply();
      // SDK v0.2.0: autoRestart defaults to true, so ctx.apply() restarts the app.
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.badge}>rn-pushdeck demo</Text>
                <Text style={styles.badge}>Arijit 1.0.7</Text>
        <Text style={styles.title}>v{BUILD_VERSION}</Text>
        <Text style={styles.subtitle}>{SHIPPED_AT}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Project key</Text>
          <Text style={styles.mono}>{PROJECT_KEY}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Update status</Text>
          <StatusView status={status} onApply={applyUpdate} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={runCheck}
          disabled={status.type === 'checking' || status.type === 'applying'}
        >
          <Text style={styles.buttonText}>
            {status.type === 'checking' ? 'Checking…' : 'Check for updates'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatusView({
  status,
  onApply,
}: {
  status: Status;
  onApply: (ctx: UpdateContext) => void;
}) {
  if (status.type === 'idle' || status.type === 'checking') {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color="#a1a1aa" />
        <Text style={styles.mutedText}>Checking…</Text>
      </View>
    );
  }
  if (status.type === 'up-to-date') {
    return <Text style={styles.successText}>✓ You&apos;re on the latest version.</Text>;
  }
  if (status.type === 'available') {
    return (
      <View>
        <Text style={styles.availableText}>
          Update available: v{status.ctx.version}
        </Text>
        {status.ctx.releaseNotes ? (
          <Text style={styles.notes}>{status.ctx.releaseNotes}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.applyButton, pressed && styles.buttonPressed]}
          onPress={() => onApply(status.ctx)}
        >
          <Text style={styles.buttonText}>Download &amp; restart</Text>
        </Pressable>
      </View>
    );
  }
  if (status.type === 'applying') {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color="#a1a1aa" />
        <Text style={styles.mutedText}>Downloading bundle…</Text>
      </View>
    );
  }
  return <Text style={styles.errorText}>Error: {status.message}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: {
    padding: 24,
    paddingTop: 80,
    gap: 16,
  },
  badge: {
    color: '#a1a1aa',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { color: '#22c55e', fontSize: 48, fontWeight: '700' },
  subtitle: { color: '#71717a', fontSize: 13, marginBottom: 16 },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardLabel: {
    color: '#a1a1aa',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mono: { color: '#fafafa', fontFamily: 'Courier', fontSize: 13 },
  mutedText: { color: '#a1a1aa', fontSize: 13 },
  successText: { color: '#22c55e', fontSize: 14 },
  availableText: { color: '#fafafa', fontSize: 15, fontWeight: '600' },
  notes: { color: '#a1a1aa', fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  errorText: { color: '#ef4444', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: {
    backgroundColor: '#fafafa',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#0a0a0a', fontWeight: '600', fontSize: 14 },
});
