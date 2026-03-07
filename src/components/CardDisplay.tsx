import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useSessionStore } from '../stores/useSessionStore';
import { useCardCacheStore } from '../stores/useCardCacheStore';

/**
 * CardDisplay - Visual companion showing current card content and evaluation result
 *
 * Per NFR11: Uses sufficient contrast and font size for quick glance readability
 * Updates driven by store subscriptions, not independent state
 */
export function CardDisplay() {
  const phase = useSessionStore((s) => s.phase);
  const lastEvaluation = useSessionStore((s) => s.lastEvaluation);
  const currentCard = useCardCacheStore((s) => s.getCurrentCard());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const showEvaluationBadge =
    lastEvaluation !== null &&
    (phase === 'evaluating' || phase === 'giving_feedback');

  const showCorrectAnswer =
    lastEvaluation === 'incorrect' && phase === 'giving_feedback';

  // Animate in when evaluation appears
  useEffect(() => {
    if (showEvaluationBadge) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showEvaluationBadge, lastEvaluation]);

  if (!showEvaluationBadge && !showCorrectAnswer) {
    return null;
  }

  const isCorrect = lastEvaluation === 'correct';

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
      className={`w-full rounded-2xl border-2 p-5 ${
        isCorrect
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      }`}
    >
      {/* Evaluation badge */}
      {showEvaluationBadge && (
        <View className="mb-2 flex-row items-center">
          <View
            className={`h-8 w-8 items-center justify-center rounded-full ${
              isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <Text className="text-base font-bold text-white">
              {isCorrect ? '\u2713' : '\u2717'}
            </Text>
          </View>
          <Text
            className={`ml-3 text-lg font-bold ${
              isCorrect ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
        </View>
      )}

      {/* Correct answer (shown after incorrect) */}
      {showCorrectAnswer && currentCard && (
        <View className="mt-2 border-t border-red-200 pt-3">
          <Text className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400">
            Correct Answer
          </Text>
          <Text className="text-lg font-semibold leading-relaxed text-gray-900">
            {currentCard.back}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
