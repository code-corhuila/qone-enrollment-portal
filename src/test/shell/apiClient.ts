// Test double of `shell/apiClient` (the real one lives in qone-front). It keeps the contract
// the portal relies on: relative paths to the gateway, JSON, bearer token, X-Correlation-Id,
// Idempotency-Key, the error envelope as a thrown error with `status`, `code`, `traceId` and
// a person-facing `message`. Used only by Vitest through the alias in vite.config.ts.
import { testSession } from "./session";

export interface RequestOptions {
  idempotencyKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly traceId: string,
    readonly serverMessage: string,
    readonly details: Array<{ field: string; message: string }> = [],
  ) {
    super(status === 0 ? "Could not reach Qampus." : `Request failed (${code}).`);
    this.name = "ApiError";
  }
  fieldMessage(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message;
  }
}

async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  if (!path.startsWith("/")) throw new Error(`relative path expected, got "${path}"`);
  const url = new URL(path, "http://gateway.test");
  for (const [k, v] of Object.entries(options.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const headers = new Headers({ Accept: "application/json", "X-Correlation-Id": crypto.randomUUID() });
  const token = testSession.token();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
  let response: Response;
  try {
    // jsdom's AbortSignal is not accepted by Node's fetch; the signal is honoured after the call
    // instead, which is what the views observe (an aborted request never updates them).
    response = await fetch(url, { method, headers, body: body === undefined ? null : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "NETWORK", "", "");
  }
  if (options.signal?.aborted) throw new DOMException("aborted", "AbortError");
  const text = response.status === 204 ? "" : await response.text();
  const parsed: unknown = text ? JSON.parse(text) : undefined;
  if (response.ok) return parsed as T;
  const env = parsed as { error?: string; message?: string; traceId?: string; details?: Array<{ field: string; message: string }> } | undefined;
  if (response.status === 401) testSession.reset();
  throw new ApiError(response.status, env?.error ?? "INTERNAL_ERROR", env?.traceId ?? "", env?.message ?? "", env?.details ?? []);
}

export const DEFAULT_TIMEOUT_MS = 10_000;

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, body, options),
  del: <T = undefined>(path: string, options?: RequestOptions) => request<T>("DELETE", path, undefined, options),
};

export type ApiClient = typeof apiClient;
