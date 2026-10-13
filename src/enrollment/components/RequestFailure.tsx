import { failureOf } from "../hooks/useRequest";

// The error state every view renders (Annex H): the message the shell decided, the traceId the
// person can quote, and a retry.
export function RequestFailure({ error, retry }: { error: Error; retry: () => void }) {
  const traceId = failureOf(error).traceId;
  return (
    <div role="alert">
      <p>{error.message}</p>
      {traceId ? <p>Reference: {traceId}</p> : null}
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}
