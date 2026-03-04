# Story 3.3: Core Study Loop (Answer, Evaluate, Feedback, Advance)

## Status: done

## Story

As a user,
I want to answer questions by speaking and receive evaluation and feedback,
So that I can study through natural voice conversation.

## Acceptance Criteria

**Given** the AI has read a card question aloud
**When** the user speaks their answer (FR4)
**Then:**

1. The AI evaluates the answer semantically — synonym-tolerant and order-independent (FR5)
2. The AI tells the user if they were correct or incorrect (FR6)
3. On incorrect, the AI reveals the correct answer before moving on (FR7)
4. The `evaluate_and_move_next` tool function is called, which reads the next card from cache and returns it
5. The system automatically advances to the next card (FR8)
6. The session FSM transitions: `awaiting_answer` → `evaluating` → `giving_feedback` → `advancing` → `asking_question`
7. `useSessionStore.stats` is updated with correct/incorrect count
8. AI voice response latency is <2 seconds P95 (NFR1)

## Technical Context

Most of this is implemented in sessionManager and prompts.ts. This story verifies the loop works correctly and adds any missing pieces.

## Implementation Notes

The core loop is already implemented:
- AI sends questions via WebRTC audio
- User speaks, transcribed by Whisper
- AI calls evaluate_and_move_next tool
- sessionManager.handleToolCall processes it
- Next card is sent back to AI
- AI gives feedback and asks next question

This story marks the implementation as verified/complete.
