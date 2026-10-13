import { apiClient } from "shell/apiClient";
import type { Saga, StartEnrollStudent } from "../model/enrollment";

// The enroll-student saga of qone-workflow (ADR-008, Annex E): the only way an enrollment is
// written (D-10). Start is idempotent: the same Idempotency-Key returns the same saga (200)
// and runs no step again; the UI then reads the state until it is terminal.
const BASE = "/api/v1/sagas";

export const sagaApi = {
  /** WF-02: 201 with the saga (normally already finished), 200 on a repeated key. */
  startEnrollStudent: (body: StartEnrollStudent, idempotencyKey: string) => apiClient.post<Saga>(`${BASE}/enroll-student`, body, { idempotencyKey, timeoutMs: 30_000 }),
  /** WF-03 */
  getSaga: (id: string, signal?: AbortSignal) => apiClient.get<Saga>(`${BASE}/${encodeURIComponent(id)}`, signal ? { signal } : {}),
};

export function isTerminal(saga: Saga): boolean {
  return saga.status !== "RUNNING";
}
