import { useCallback, useEffect, useState, type DependencyList } from "react";

// The request state every view renders (Annex H): loading, error with retry, empty or data.
// A newer request replaces the older one: each run gets its own AbortSignal and the previous
// one is aborted, so a slow answer never overwrites a fresh one.
export type RequestState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error; retry: () => void }
  | { status: "data"; data: T; retry: () => void };

export function useRequest<T>(load: (signal: AbortSignal) => Promise<T>, deps: DependencyList): RequestState<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RequestState<T>>({ status: "loading" });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "data", data, retry });
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: cause instanceof Error ? cause : new Error(String(cause)), retry });
      },
    );
    return () => controller.abort();
    // The caller lists what the request depends on; `attempt` adds the manual retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return state;
}

/** Fields of an ApiError the shell throws; a plain Error has none of them. */
export interface ApiFailure {
  status?: number;
  code?: string;
  traceId?: string;
}

export function failureOf(error: Error): ApiFailure {
  return error as Error & ApiFailure;
}
