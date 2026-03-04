# Story 2.4: Deck Listing and Selection

## Status: done

## Story

As a user,
I want to see my AnkiDroid decks and select one to study,
So that I can choose which subject to review.

## Acceptance Criteria

**Given** onboarding is complete and permissions are granted
**When** the deck selection screen loads
**Then:**

1. The system reads deck structure from AnkiDroid via ContentProvider (FR13) and displays available decks (FR33)
2. Each deck shows its name and the count of due cards (FR15)
3. If no decks are available, the system informs the user (FR34)
4. If the selected deck has no due cards, the system informs the user (FR35)
5. Selecting a deck stores it in useSettingsStore and navigates to the session screen
6. Deck data retrieval completes within 1 second (NFR2)

## Technical Context

- Uses ankiBridge.getDeckNames() - stub for now, implemented in 2-5
- Uses useSettingsStore for selectedDeck
- For now uses mock data until 2-5 implements actual ContentProvider queries

## Tasks

- [ ] Create deck list UI component
- [ ] Display deck names with due counts
- [ ] Handle empty deck list
- [ ] Handle deck with no due cards
- [ ] Save selection and navigate to session
