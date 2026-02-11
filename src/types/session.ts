export type SessionPhase =
  | 'idle'
  | 'loading_cards'
  | 'connecting'
  | 'ready'
  | 'asking_question'
  | 'awaiting_answer'
  | 'evaluating'
  | 'giving_feedback'
  | 'advancing'
  | 'session_complete'
  | 'paused'
  | 'reconnecting'
  | 'error';

export interface SessionTransition {
  from: SessionPhase;
  to: SessionPhase;
  trigger: string;
}

export interface SessionStats {
  correct: number;
  incorrect: number;
}
