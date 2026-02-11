/**
 * Clean HTML and Anki-specific formatting from card text.
 * Matches the native Kotlin implementation for consistency.
 */
export function cleanAnkiText(text: string): string {
  return (
    text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove cloze deletion markers {{c1::text}} -> text
      .replace(/\{\{c\d+::|(\}\})/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extract the cloze answer from cloze deletion text.
 * Input: "The capital of France is {{c1::Paris}}"
 * Output: "Paris"
 */
export function extractClozeAnswer(text: string): string | null {
  const match = text.match(/\{\{c\d+::([^}]+)\}\}/);
  return match ? match[1] : null;
}

/**
 * Check if text contains cloze deletion markers.
 */
export function isClozeCard(text: string): boolean {
  return /\{\{c\d+::[^}]+\}\}/.test(text);
}
