export interface EvaluateAndMoveNextResult {
  status: 'success' | 'session_complete';
  answered_card_back: string;
  evaluation: 'correct' | 'incorrect';
  next_card?: {
    front: string;
    back: string;
  };
  progress: {
    completed: number;
    total: number;
  };
}
