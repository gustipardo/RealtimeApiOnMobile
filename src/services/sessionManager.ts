import { webrtcManager } from './webrtcManager';
import { loadDueCards, getCurrentCard, getNextCard, getRemainingCardCount, getTotalCardCount, clearCards } from './cardLoader';
import { useSessionStore } from '../stores/useSessionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useConnectionStore } from '../stores/useConnectionStore';
import { ankiBridge } from '../native/ankiBridge';
import { getSystemPrompt, allTools, getInitialMessage, formatToolResult } from '../config/prompts';
import { startForegroundService, stopForegroundService, updateForegroundNotification } from './foregroundAudioService';

/**
 * Session Manager - Orchestrates the study session
 */
class SessionManager {
  private toolCallNames: Map<string, string> = new Map();

  /**
   * Start a new study session
   */
  async startSession(): Promise<void> {
    const { transitionTo, resetSession } = useSessionStore.getState();
    const { selectedDeck } = useSettingsStore.getState();

    if (!selectedDeck) {
      throw new Error('No deck selected');
    }

    // Reset session state
    resetSession();

    try {
      // 1. Connect to WebRTC (if not already)
      const connectionState = useConnectionStore.getState().connectionState;
      if (connectionState !== 'connected') {
        transitionTo('connecting', 'startSession');
        await webrtcManager.connect();
      }

      // 2. Load cards from AnkiDroid
      transitionTo('loading_cards', 'startSession');
      const cards = await loadDueCards(selectedDeck);

      if (cards.length === 0) {
        transitionTo('error', 'no_cards');
        throw new Error('No cards due for review in this deck');
      }

      // 3. Configure AI session
      transitionTo('ready', 'cards_loaded');
      this.configureAISession(selectedDeck, cards.length);

      // 4. Register event handlers
      this.registerEventHandlers();

      // 5. Send first card to AI
      const firstCard = getCurrentCard();
      if (firstCard) {
        this.sendFirstCard(firstCard.front, firstCard.back);
        transitionTo('asking_question', 'first_card_sent');
      }

      // 6. Start foreground service for background audio
      try {
        await startForegroundService(
          'Voice Study Session',
          `Studying ${selectedDeck} — ${cards.length} cards`
        );
      } catch (fgError) {
        console.warn('[SessionManager] Failed to start foreground service:', fgError);
        // Non-fatal: session works without it, just no background audio
      }

    } catch (error) {
      transitionTo('error', 'start_failed');
      throw error;
    }
  }

  /**
   * Configure AI session with system prompt and tools
   */
  private configureAISession(deckName: string, cardCount: number): void {
    const systemPrompt = getSystemPrompt(deckName, cardCount);

    webrtcManager.updateSession({
      instructions: systemPrompt,
      tools: allTools,
      modalities: ['text', 'audio'],
    });
  }

  /**
   * Send first card to AI
   */
  private sendFirstCard(front: string, back: string): void {
    const message = getInitialMessage(front, back);
    webrtcManager.sendTextMessage(message);
  }

  /**
   * Register WebRTC event handlers
   */
  private registerEventHandlers(): void {
    const { transitionTo } = useSessionStore.getState();

    // Handle tool calls
    webrtcManager.on('response.function_call_arguments.done', this.handleToolCall.bind(this));

    // Handle AI speaking (giving feedback)
    webrtcManager.on('response.audio.delta', () => {
      const phase = useSessionStore.getState().phase;
      if (phase === 'evaluating') {
        useSessionStore.getState().transitionTo('giving_feedback', 'ai_speaking');
      }
    });

    // Handle AI finished speaking
    webrtcManager.on('response.done', () => {
      const phase = useSessionStore.getState().phase;
      if (phase === 'giving_feedback' || phase === 'asking_question') {
        useSessionStore.getState().transitionTo('awaiting_answer', 'ai_done');
      }
    });

    // Handle user speaking
    webrtcManager.on('input_audio_buffer.speech_started', () => {
      const phase = useSessionStore.getState().phase;
      if (phase === 'awaiting_answer') {
        console.log('[SessionManager] User started speaking');
      }
    });

    // Handle AI transcripts (for debugging)
    webrtcManager.on('response.audio_transcript.done', (event: any) => {
      console.log('[AI]:', event.transcript);
    });

    // Handle user transcripts
    webrtcManager.on('conversation.item.input_audio_transcription.completed', (event: any) => {
      console.log('[User]:', event.transcript);
      useSessionStore.getState().transitionTo('evaluating', 'user_answered');
    });

    // Track tool call names
    webrtcManager.on('response.output_item.added', (event: any) => {
      const item = event.item;
      if (item?.type === 'function_call') {
        this.toolCallNames.set(item.call_id, item.name);
      }
    });
  }

  /**
   * Handle tool call from AI
   */
  private async handleToolCall(event: any): Promise<void> {
    const { call_id, arguments: argsStr } = event;
    const toolName = this.toolCallNames.get(call_id);

    try {
      const args = JSON.parse(argsStr || '{}');

      switch (toolName) {
        case 'evaluate_and_move_next':
          await this.handleEvaluateAndMoveNext(call_id, args);
          break;
        case 'override_evaluation':
          await this.handleOverrideEvaluation(call_id, args);
          break;
        case 'end_session':
          await this.handleEndSessionTool(call_id);
          break;
        default:
          console.warn('[SessionManager] Unknown tool:', toolName);
      }
    } catch (error) {
      console.error('[SessionManager] Tool call error:', error);
    }
  }

  /**
   * Handle evaluate_and_move_next tool
   */
  private async handleEvaluateAndMoveNext(callId: string, args: any): Promise<void> {
    const { user_response_quality, feedback_text } = args;
    console.log(`[SessionManager] Evaluation: ${user_response_quality} - ${feedback_text}`);

    const { transitionTo, recordAnswer, advanceCard } = useSessionStore.getState();

    // Get current card's back for feedback
    const currentCard = getCurrentCard();
    const answeredCardBack = currentCard?.back || null;

    // Record answer (except for skipped)
    if (user_response_quality !== 'skipped') {
      recordAnswer(user_response_quality as 'correct' | 'incorrect');
      transitionTo('evaluating', 'tool_called');
    }

    // Advance to next card
    advanceCard();
    const nextCard = getNextCard();
    const remainingCards = getRemainingCardCount();
    const stats = useSessionStore.getState().stats;

    // Format result
    const result = formatToolResult(
      answeredCardBack,
      nextCard ? { front: nextCard.front, back: nextCard.back } : null,
      remainingCards,
      stats
    );

    // Send result back to AI
    webrtcManager.sendToolResult(callId, result);

    // Update phase and notification
    if (nextCard) {
      transitionTo('asking_question', 'next_card');
      const total = getTotalCardCount();
      const completed = stats.correct + stats.incorrect;
      updateForegroundNotification(
        'Voice Study Session',
        `Card ${completed + 1} of ${total}`
      ).catch(() => {}); // Non-fatal
    } else {
      transitionTo('session_complete', 'no_more_cards');
      await this.onSessionComplete();
    }
  }

  /**
   * Handle override_evaluation tool - correct previous answer
   */
  private async handleOverrideEvaluation(callId: string, _args: any): Promise<void> {
    console.log('[SessionManager] Override evaluation - marking previous as correct');

    const { stats } = useSessionStore.getState();

    // Only override if there was a previous incorrect answer
    if (stats.incorrect > 0) {
      // Correct the stats: remove one incorrect, add one correct
      useSessionStore.setState({
        stats: {
          correct: stats.correct + 1,
          incorrect: stats.incorrect - 1,
        },
      });

      webrtcManager.sendToolResult(callId, {
        status: 'success',
        message: 'Previous answer marked as correct',
        updated_stats: useSessionStore.getState().stats,
      });
    } else {
      webrtcManager.sendToolResult(callId, {
        status: 'no_change',
        message: 'No incorrect answer to override',
      });
    }
  }

  /**
   * Handle end_session tool
   */
  private async handleEndSessionTool(callId: string): Promise<void> {
    console.log('[SessionManager] End session requested by user');

    const stats = useSessionStore.getState().stats;
    const total = stats.correct + stats.incorrect;

    webrtcManager.sendToolResult(callId, {
      status: 'ending',
      total_reviewed: total,
      correct: stats.correct,
      incorrect: stats.incorrect,
    });

    // Trigger completion after AI gives summary
    setTimeout(async () => {
      useSessionStore.getState().transitionTo('session_complete', 'user_ended');
      await this.onSessionComplete();
    }, 5000); // Wait for AI to speak summary
  }

  /**
   * Handle session completion
   */
  private async onSessionComplete(): Promise<void> {
    const stats = useSessionStore.getState().stats;
    console.log('[SessionManager] Session complete:', stats);

    // Stop foreground service
    try {
      await stopForegroundService();
    } catch (error) {
      console.warn('[SessionManager] Failed to stop foreground service:', error);
    }

    // Trigger AnkiDroid sync
    try {
      await ankiBridge.triggerSync();
      console.log('[SessionManager] Triggered AnkiDroid sync');
    } catch (error) {
      console.warn('[SessionManager] Failed to trigger sync:', error);
    }
  }

  /**
   * End the current session
   */
  endSession(): void {
    const { transitionTo } = useSessionStore.getState();

    // Stop foreground service
    stopForegroundService().catch((error) => {
      console.warn('[SessionManager] Failed to stop foreground service:', error);
    });

    // Disconnect WebRTC
    webrtcManager.disconnect();

    // Clear cards
    clearCards();

    // Reset state
    transitionTo('idle', 'session_ended');

    console.log('[SessionManager] Session ended');
  }

  /**
   * Pause the session
   */
  pause(): void {
    const { transitionTo } = useSessionStore.getState();
    webrtcManager.setMicrophoneMuted(true);
    transitionTo('paused', 'user_paused');
  }

  /**
   * Resume the session
   */
  resume(): void {
    const { transitionTo } = useSessionStore.getState();
    webrtcManager.setMicrophoneMuted(false);
    transitionTo('asking_question', 'user_resumed');
  }
}

// Export singleton
export const sessionManager = new SessionManager();
