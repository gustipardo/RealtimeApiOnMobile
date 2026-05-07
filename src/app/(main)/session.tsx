import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '../../stores/useConnectionStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useCardCacheStore } from '../../stores/useCardCacheStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAudioLevelStore } from '../../stores/useAudioLevelStore';
import { sessionManager } from '../../services/sessionManager';
import { palette, dark as themeColors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Pulsing mic indicator component
// ---------------------------------------------------------------------------
function PulsingIndicator({ active, color }: { active: boolean; color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [active]);

  const colorHexMap: Record<string, string> = {
    blue: palette.amber[500],
    green: palette.sage[500],
    amber: palette.amber[300],
    red: palette.terracota[500],
    gray: palette.navy[300],
  };

  const bgMap: Record<string, string> = {
    blue: 'bg-accent',
    green: 'bg-success',
    amber: 'bg-amber-300',
    red: 'bg-error',
    gray: 'bg-navy-400',
  };

  return (
    <View className="items-center justify-center" style={{ width: 56, height: 56 }}>
      {active && (
        <Animated.View
          style={{
            position: 'absolute',
            height: 56,
            width: 56,
            borderRadius: 28,
            backgroundColor: colorHexMap[color] ?? palette.amber[500],
            opacity: 0.25,
            transform: [{ scale: pulseAnim }],
          }}
        />
      )}
      <View className={`h-12 w-12 items-center justify-center rounded-full ${bgMap[color] ?? 'bg-accent'}`}>
        <Text className="text-xl text-white">{getPhaseIcon(color)}</Text>
      </View>
    </View>
  );
}

function getPhaseIcon(color: string): string {
  switch (color) {
    case 'blue': return '\u{1F50A}';   // speaker
    case 'green': return '\u{1F3A4}';  // mic
    case 'amber': return '\u{2026}';   // ellipsis
    default: return '\u{1F4AC}';       // speech
  }
}

// ---------------------------------------------------------------------------
// Connection badge
// ---------------------------------------------------------------------------
function ConnectionBadge() {
  const connectionState = useConnectionStore((s) => s.connectionState);
  const networkStatus = useConnectionStore((s) => s.networkStatus);

  const isOnline = networkStatus === 'online';
  const isConnected = connectionState === 'connected';
  const isReconnecting = connectionState === 'reconnecting';

  let dotColor = 'bg-success';
  let label = 'Connected';

  if (!isOnline) {
    dotColor = 'bg-error';
    label = 'Offline';
  } else if (isReconnecting) {
    dotColor = 'bg-amber-500';
    label = 'Reconnecting...';
  } else if (!isConnected) {
    dotColor = 'bg-gray-400';
    label = 'Disconnected';
  }

  return (
    <View className="flex-row items-center rounded-full bg-bg-surface2 px-3 py-1.5">
      <View className={`mr-2 h-2.5 w-2.5 rounded-full ${dotColor}`} />
      <Text className="text-xs font-medium text-text-secondary">{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Audio level meter — real RMS amplitude from PCM chunks
// (audioLevelTracker decodes base64 PCM16, computes RMS, smooths it)
// ---------------------------------------------------------------------------
function AudioLevelMeter() {
  const level = useAudioLevelStore((s) => s.level);
  const peakDb = useAudioLevelStore((s) => s.peakDb);
  const chunksReceived = useAudioLevelStore((s) => s.chunksReceived);
  const isListening = useAudioLevelStore((s) => s.isListening);

  // Heuristics for the status label (tuned for built-in phone mics).
  // Below -55 dB is essentially silence; above -25 dB is solid speech.
  let label = 'Silent';
  if (!isListening || chunksReceived === 0) label = 'No mic data';
  else if (peakDb > -25) label = 'Audio OK';
  else if (peakDb > -45) label = 'Quiet';

  const activeColor = level > 0.05 ? palette.sage[500] : palette.terracota[500];
  const dbDisplay = isFinite(peakDb) ? `${peakDb.toFixed(0)} dB` : '—';
  const barCount = 12;

  return (
    <View className="flex-row items-center rounded-lg bg-gray-800 px-3 py-2">
      <View className="flex-row items-end mr-2" style={{ height: 22 }}>
        {Array.from({ length: barCount }).map((_, i) => {
          const threshold = i / barCount;
          const isActive = level > threshold;
          return (
            <View
              key={i}
              style={{
                width: 3,
                height: 4 + (i * 1.5),
                marginHorizontal: 1,
                borderRadius: 1,
                backgroundColor: isActive ? activeColor : palette.navy[400],
              }}
            />
          );
        })}
      </View>
      <Text className="text-xs font-mono" style={{ color: activeColor }}>
        {label} ({dbDisplay})
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Progress ring (simple bar alternative showing fraction)
// ---------------------------------------------------------------------------
function ProgressHeader({
  currentIndex,
  totalCards,
  stats,
}: {
  currentIndex: number;
  totalCards: number;
  stats: { correct: number; incorrect: number };
}) {
  const progress = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0;

  return (
    <View>
      {/* Progress bar */}
      <View className="h-1.5 w-full bg-bg-surface3">
        <View className="h-1.5 rounded-r-full bg-accent" style={{ width: `${progress}%` }} />
      </View>

      {/* Stats row */}
      <View className="flex-row items-center justify-between px-5 py-2.5">
        <Text className="text-xs font-medium text-text-tertiary">
          {currentIndex} / {totalCards} cards
        </Text>
        <View className="flex-row items-center">
          <View className="flex-row items-center mr-4">
            <View className="mr-1.5 h-2.5 w-2.5 rounded-full bg-success" />
            <Text className="text-xs font-bold text-success-text">{stats.correct}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="mr-1.5 h-2.5 w-2.5 rounded-full bg-error" />
            <Text className="text-xs font-bold text-error-text">{stats.incorrect}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Evaluation banner — slides in from top showing correct/incorrect
// ---------------------------------------------------------------------------
function EvaluationBanner() {
  const lastEvaluation = useSessionStore((s) => s.lastEvaluation);
  const [visible, setVisible] = useState(false);
  const [displayEval, setDisplayEval] = useState<'correct' | 'incorrect' | null>(null);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (lastEvaluation) {
      setDisplayEval(lastEvaluation);
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          useSessionStore.setState({ lastEvaluation: null });
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [lastEvaluation]);

  if (!visible || !displayEval) return null;

  const isCorrect = displayEval === 'correct';

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        backgroundColor: isCorrect ? themeColors.success.default : themeColors.error.default,
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: themeColors.text.onAccent, fontSize: 16, fontWeight: '800', marginRight: 8 }}>
        {isCorrect ? '\u2713' : '\u2717'}
      </Text>
      <Text style={{ color: themeColors.text.onAccent, fontSize: 16, fontWeight: '700' }}>
        {isCorrect ? 'Correct' : 'Incorrect'}
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main session screen
// ---------------------------------------------------------------------------
export default function SessionScreen() {
  const router = useRouter();
  const connectionState = useConnectionStore((s) => s.connectionState);
  const sessionPhase = useSessionStore((s) => s.phase);
  const stats = useSessionStore((s) => s.stats);
  const selectedDeck = useSettingsStore((s) => s.selectedDeck);
  const cards = useCardCacheStore((s) => s.cards);
  const currentIndex = useCardCacheStore((s) => s.currentIndex);
  const currentCard = cards[currentIndex];

  const [error, setError] = useState<string | null>(null);

  // Card fade-in animation
  const cardFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (currentCard) {
      cardFade.setValue(0);
      Animated.timing(cardFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [currentCard?.cardId]);

  const handleStartSession = useCallback(async () => {
    try {
      setError(null);
      await sessionManager.startSession();
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
    }
  }, []);

  const handleEndSession = useCallback(() => {
    sessionManager.endSession();
    router.back();
  }, [router]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleStartSession();
  }, [handleStartSession]);

  // Auto-start session on mount
  useEffect(() => {
    if (sessionPhase === 'idle') {
      handleStartSession();
    }

    return () => {
      if (sessionPhase !== 'idle' && sessionPhase !== 'session_complete') {
        sessionManager.endSession();
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Loading states
  // -------------------------------------------------------------------------
  if (sessionPhase === 'connecting' || sessionPhase === 'loading_cards') {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base px-8">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-accent/10">
          <ActivityIndicator size="large" color={palette.amber[500]} />
        </View>
        <Text className="text-center text-xl font-bold text-text-primary">
          {sessionPhase === 'connecting' ? 'Connecting to AI Tutor' : 'Loading Cards'}
        </Text>
        <Text className="mt-2 text-center text-sm text-text-tertiary">
          {sessionPhase === 'connecting'
            ? 'Setting up your voice session...'
            : `Fetching cards from ${selectedDeck}...`}
        </Text>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (sessionPhase === 'error' || error) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base px-8">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-error/10">
          <Text className="text-3xl font-bold text-error-text">!</Text>
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-text-primary">
          Something Went Wrong
        </Text>
        <Text className="mb-8 text-center text-base leading-relaxed text-text-tertiary">
          {error || 'An unexpected error occurred. Please try again.'}
        </Text>
        <View className="w-full">
          <Pressable
            onPress={handleRetry}
            className="mb-3 rounded-2xl bg-accent py-4 active:bg-blue-600"
          >
            <Text className="text-center text-base font-bold text-white">Try Again</Text>
          </Pressable>
          <Pressable
            onPress={handleEndSession}
            className="rounded-2xl border-2 border-border-subtle bg-bg-surface1 py-4 active:bg-bg-base"
          >
            <Text className="text-center text-base font-semibold text-text-secondary">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Session complete state
  // -------------------------------------------------------------------------
  if (sessionPhase === 'session_complete') {
    const total = stats.correct + stats.incorrect;
    const percentage = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

    return (
      <View className="flex-1 bg-bg-base px-6 pt-20">
        {/* Top illustration */}
        <View className="items-center">
          <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-success/10">
            <Text className="text-center text-4xl font-bold text-success-text">{'\u2713'}</Text>
          </View>
          <Text className="mb-1 text-center text-2xl font-bold text-text-primary">
            Session Complete
          </Text>
          <Text className="mb-8 text-center text-base text-text-tertiary">
            {selectedDeck}
          </Text>
        </View>

        {/* Stats card */}
        <View className="rounded-2xl border border-border-subtle bg-bg-surface1 p-5">
          {/* Accuracy ring placeholder */}
          <View className="mb-5 items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full border-4 border-accent bg-accent/10">
              <Text className="text-2xl font-bold text-accent">{percentage}%</Text>
            </View>
            <Text className="mt-2 text-sm font-medium text-text-tertiary">Accuracy</Text>
          </View>

          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-text-primary">{total}</Text>
              <Text className="text-xs font-medium text-text-tertiary">Reviewed</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-success-text">{stats.correct}</Text>
              <Text className="text-xs font-medium text-success-text">Correct</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-error-text">{stats.incorrect}</Text>
              <Text className="text-xs font-medium text-error-text">Incorrect</Text>
            </View>
          </View>
        </View>

        {/* Done button */}
        <View className="mt-auto pb-8 pt-6">
          <Pressable
            onPress={handleEndSession}
            className="rounded-2xl bg-accent py-4 active:bg-blue-600"
          >
            <Text className="text-center text-base font-bold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Paused state
  // -------------------------------------------------------------------------
  if (sessionPhase === 'paused') {
    const total = stats.correct + stats.incorrect;
    const isNetworkLoss = connectionState === 'reconnecting' || connectionState === 'failed';

    return (
      <View className="flex-1 items-center justify-center bg-bg-base px-8">
        <View className={`mb-5 h-20 w-20 items-center justify-center rounded-full ${isNetworkLoss ? 'bg-error/10' : 'bg-amber-500/15'}`}>
          {isNetworkLoss ? (
            <Text className="text-3xl font-bold text-error-text">{'!'}</Text>
          ) : (
            <Text className="text-3xl font-bold text-amber-300">{'| |'}</Text>
          )}
        </View>
        <Text className="mb-1 text-center text-2xl font-bold text-text-primary">
          {isNetworkLoss ? 'Connection Lost' : 'Session Paused'}
        </Text>
        <Text className="mb-3 text-center text-sm text-text-tertiary">
          {isNetworkLoss
            ? 'Your network connection was interrupted. The session will resume automatically when the connection is restored.'
            : selectedDeck}
        </Text>

        {/* Connection badge when network lost */}
        {isNetworkLoss && (
          <View className="mb-4">
            <ConnectionBadge />
          </View>
        )}

        {/* Mini stats */}
        {total > 0 && (
          <View className="mb-8 flex-row items-center">
            <View className="mr-6 flex-row items-center">
              <View className="mr-1.5 h-3 w-3 rounded-full bg-success" />
              <Text className="text-sm font-semibold text-text-secondary">{stats.correct} correct</Text>
            </View>
            <View className="flex-row items-center">
              <View className="mr-1.5 h-3 w-3 rounded-full bg-error" />
              <Text className="text-sm font-semibold text-text-secondary">{stats.incorrect} incorrect</Text>
            </View>
          </View>
        )}

        <View className="w-full">
          {!isNetworkLoss && (
            <Pressable
              onPress={() => sessionManager.resume()}
              className="mb-3 rounded-2xl bg-accent py-4 active:bg-blue-600"
            >
              <Text className="text-center text-base font-bold text-white">Resume Session</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleEndSession}
            className={`rounded-2xl border-2 ${isNetworkLoss ? 'border-border-subtle bg-bg-surface1' : 'border-error bg-bg-surface1'} py-4 ${isNetworkLoss ? 'active:bg-bg-base' : 'active:bg-error/10'}`}
          >
            <Text className={`text-center text-base font-semibold ${isNetworkLoss ? 'text-text-secondary' : 'text-error-text'}`}>
              End Session
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Reconnecting state (overlay-style)
  // -------------------------------------------------------------------------
  if (sessionPhase === 'reconnecting') {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base px-8">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-amber-500/15">
          <ActivityIndicator size="large" color={palette.amber[500]} />
        </View>
        <Text className="mb-1 text-center text-xl font-bold text-text-primary">
          Reconnecting...
        </Text>
        <Text className="mb-8 text-center text-sm text-text-tertiary">
          Attempting to restore your session
        </Text>
        <Pressable
          onPress={handleEndSession}
          className="rounded-2xl border-2 border-border-subtle bg-bg-surface1 px-8 py-3 active:bg-bg-base"
        >
          <Text className="text-center text-sm font-semibold text-text-secondary">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Active session UI
  // -------------------------------------------------------------------------
  const phaseVisual = getPhaseVisual(sessionPhase);

  return (
    <View className="flex-1 bg-bg-base">
      {/* Top bar */}
      <View className="bg-bg-surface1 px-5 pb-3 pt-14">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
              {selectedDeck}
            </Text>
          </View>
          <ConnectionBadge />
        </View>
      </View>

      {/* Progress + stats strip */}
      <ProgressHeader
        currentIndex={currentIndex}
        totalCards={cards.length}
        stats={stats}
      />

      {/* Evaluation banner (correct/incorrect) */}
      <EvaluationBanner />

      {/* Main content */}
      <View className="flex-1 px-5 pt-4">
        {/* Question card */}
        {currentCard && (
          <Animated.View
            style={[
              {
                opacity: cardFade,
                marginBottom: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: themeColors.border.subtle,
                backgroundColor: themeColors.bg.surface1,
                padding: 20,
              },
              Platform.OS === 'android' ? { elevation: 1 } : {},
            ]}
          >
            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
              Question
            </Text>
            <Text className="text-xl font-bold leading-relaxed text-text-primary">
              {currentCard.front}
            </Text>
          </Animated.View>
        )}

        {/* Phase indicator */}
        <View className="mb-4 flex-row items-center">
          <View className="mr-4">
            <PulsingIndicator
              active={sessionPhase === 'awaiting_answer' || sessionPhase === 'asking_question'}
              color={phaseVisual.color}
            />
          </View>
          <View>
            <Text className="text-base font-bold text-text-primary">
              {phaseVisual.label}
            </Text>
            <Text className="text-xs text-text-tertiary">
              {phaseVisual.hint}
            </Text>
          </View>
        </View>

        {/* Audio debug meter */}
        <View className="mb-4">
          <AudioLevelMeter />
        </View>
      </View>

      {/* Bottom controls */}
      <View className="bg-bg-surface1 px-5 pb-6 pt-3" style={Platform.OS === 'android' ? { elevation: 2 } : {}}>
        <View className="flex-row">
          <Pressable
            onPress={() => sessionManager.pause()}
            className="mr-3 flex-1 rounded-2xl border-2 border-border-subtle bg-bg-surface1 py-3.5 active:bg-bg-base"
          >
            <Text className="text-center text-sm font-bold text-text-secondary">Pause</Text>
          </Pressable>
          <Pressable
            onPress={handleEndSession}
            className="flex-1 rounded-2xl bg-error py-3.5 active:bg-terracota-700"
          >
            <Text className="text-center text-sm font-bold text-white">End Session</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PhaseVisual {
  label: string;
  hint: string;
  color: string;
}

function getPhaseVisual(phase: string): PhaseVisual {
  switch (phase) {
    case 'ready':
      return { label: 'Getting Ready', hint: 'Session is starting...', color: 'gray' };
    case 'asking_question':
      return { label: 'Asking Question', hint: 'Listen carefully...', color: 'blue' };
    case 'awaiting_answer':
      return { label: 'Your Turn', hint: 'Speak your answer now', color: 'green' };
    case 'evaluating':
      return { label: 'Evaluating', hint: 'Checking your answer...', color: 'amber' };
    case 'giving_feedback':
      return { label: 'Feedback', hint: 'Listen to the feedback', color: 'blue' };
    case 'advancing':
      return { label: 'Next Card', hint: 'Moving to the next card...', color: 'gray' };
    default:
      return { label: 'Studying', hint: 'Session in progress', color: 'blue' };
  }
}
