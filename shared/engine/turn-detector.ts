export interface TurnOptions {
  /** Loudness (0 to 1) that counts as someone talking. */
  loudness?: number;
  /** How much talking counts as a real reply, not a cough. */
  minSpeechMs?: number;
  /** How long a pause means they have finished. */
  silenceMs?: number;
}

/**
 * Decides when the other person has finished a sentence, from loudness alone. Feed it one
 * reading per tick; it returns true once they have spoken and then gone quiet.
 */
export function createTurnDetector({ loudness = 0.02, minSpeechMs = 500, silenceMs = 1000 }: TurnOptions = {}) {
  let spoken = 0;
  let quiet = 0;
  return (level: number, elapsedMs: number): boolean => {
    if (level >= loudness) {
      spoken += elapsedMs;
      quiet = 0;
    } else if (spoken >= minSpeechMs) {
      quiet += elapsedMs;
    }
    return spoken >= minSpeechMs && quiet >= silenceMs;
  };
}
