import { useCallback, useState } from "react";

// Norm 5.3.8 / 5.4.2: every creation sends an Idempotency-Key (8 to 128 characters), one per
// intention, reused while the same data is retried. A double click or a retry after a timeout
// therefore never creates two records.
export function newIdempotencyKey(intention: string): string {
  return `${intention}-${crypto.randomUUID()}`;
}

/** The key of the form's current intention; `reset()` starts a new intention after a success. */
export function useIdempotencyKey(intention: string): { key: string; reset: () => void } {
  const [key, setKey] = useState(() => newIdempotencyKey(intention));
  const reset = useCallback(() => setKey(newIdempotencyKey(intention)), [intention]);
  return { key, reset };
}
