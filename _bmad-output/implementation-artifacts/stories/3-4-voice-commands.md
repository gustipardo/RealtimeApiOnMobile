# Story 3.4: Voice Commands (Repeat, Skip, Override, End)

## Status: done

## Story

As a user,
I want voice commands to control the session,
So that I can study completely hands-free.

## Acceptance Criteria

**Given** an active study session
**When** the user says "repeat" (FR9)
**Then** the AI re-reads the current card question

**Given** an active study session
**When** the user says "skip" (FR10)
**Then** the current card is skipped and the next card is presented

**Given** the AI has just evaluated an answer
**When** the user says "actually, mark that correct" or similar override phrase (FR11)
**Then** the previous evaluation is corrected in session stats and the AI acknowledges the override

**Given** an active study session
**When** the user says "end session" or similar (FR2)
**Then** the session ends and a completion summary is spoken (FR12) including cards reviewed, correct count, incorrect count
**And** AnkiDroid sync is triggered via `ankiBridge.triggerSync()` (FR16)
**And** session FSM transitions to `session_complete`

## Implementation Notes

Voice commands are handled by the AI through the system prompt. The prompt already includes:
- "repeat" -> Re-read the current question
- "skip" -> Call evaluate_and_move_next with "skipped"
- "end session" / "stop" -> End session with summary
- "mark that correct" / "override" -> Correct previous evaluation

This story verifies the prompt handles these commands correctly.
