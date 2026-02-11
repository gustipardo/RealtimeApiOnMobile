import { View, Text } from 'react-native';
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

  // Don't show anything if no card or in certain phases
  if (!currentCard) {
    return null;
  }

  // Determine if we should show evaluation badge
  const showEvaluationBadge =
    lastEvaluation !== null &&
    (phase === 'evaluating' || phase === 'giving_feedback');

  // Determine if we should show the back (correct answer) after incorrect
  const showCorrectAnswer =
    lastEvaluation === 'incorrect' &&
    phase === 'giving_feedback';

  return (
    <View className="w-full rounded-2xl bg-gray-50 p-5 shadow-sm">
      {/* Evaluation badge */}
      {showEvaluationBadge && (
        <View className="mb-3 flex-row justify-center">
          <View
            className={`rounded-full px-4 py-2 ${
              lastEvaluation === 'correct'
                ? 'bg-green-100'
                : 'bg-red-100'
            }`}
          >
            <Text
              className={`text-base font-bold ${
                lastEvaluation === 'correct'
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}
            >
              {lastEvaluation === 'correct' ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>
        </View>
      )}

      {/* Card front - Question */}
      <View className="mb-2">
        <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
          Question
        </Text>
        <Text className="text-lg font-semibold leading-relaxed text-gray-900">
          {currentCard.front}
        </Text>
      </View>

      {/* Card back - Correct answer (shown after incorrect evaluation) */}
      {showCorrectAnswer && (
        <View className="mt-4 border-t border-gray-200 pt-4">
          <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Correct Answer
          </Text>
          <Text className="text-lg font-semibold leading-relaxed text-green-700">
            {currentCard.back}
          </Text>
        </View>
      )}
    </View>
  );
}
