# Story 3.6: Visual Companion Display

## Status: done

## Story

As a user,
I want to optionally see the current card on screen,
So that I can glance at the question if needed while primarily listening.

## Acceptance Criteria

**Given** an active study session
**When** a card question is being asked
**Then** the `CardDisplay` component shows the current card front text (FR38)
**And** after evaluation, the component shows the evaluation result (correct/incorrect badge)
**And** the display uses sufficient contrast and font size for quick glance readability (NFR11)
**And** the visual companion updates are driven by `useSessionStore` subscriptions, not independent state

## Implementation Notes

1. Create CardDisplay component in src/components/CardDisplay.tsx
2. Component subscribes to useSessionStore and useCardCacheStore
3. Shows card front during asking_question and awaiting_answer phases
4. Shows evaluation badge (correct/incorrect) during evaluating and giving_feedback phases
5. Use large font size (18-20px) and high contrast colors per NFR11
