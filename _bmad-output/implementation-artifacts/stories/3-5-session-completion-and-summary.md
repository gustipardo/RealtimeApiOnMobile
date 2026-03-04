# Story 3.5: Session Completion and Summary

## Status: done

## Story

As a user,
I want to hear a summary when all cards are reviewed,
So that I know my progress and feel closure.

## Acceptance Criteria

**Given** an active study session
**When** the last due card has been reviewed (no more cards in cache)
**Then** the `evaluate_and_move_next` tool returns `status: 'session_complete'`
**And** the AI speaks a completion summary: total cards reviewed, correct, incorrect (FR12)
**And** session FSM transitions to `session_complete`
**And** AnkiDroid sync is triggered (FR16)
**And** the UI shows a session summary screen with the stats
**And** the user can return to deck selection

## Implementation Notes

Most functionality is already implemented:
- sessionManager handles session completion in handleEvaluateAndMoveNext
- onSessionComplete triggers AnkiDroid sync
- formatToolResult returns null next_card when session is complete

Remaining work:
1. Update formatToolResult to return status: 'session_complete' when no next card
2. Update session UI to show summary screen with stats
3. Add navigation back to deck selection
