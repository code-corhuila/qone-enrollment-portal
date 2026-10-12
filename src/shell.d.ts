// The shell's exposed modules (Annex H), typed by hand from qone-front/src/core: a portal
// consumes the client and the session, it never owns them (norm 5.4.1).

declare module "shell/apiClient" {
  export interface RequestOptions {
    /** Required by every operation that creates (5.3.8): 8 to 128 characters, reused on retry. */
    idempotencyKey?: string;
    timeoutMs?: number;
    /** Lets a view cancel a request a newer one replaces. */
    signal?: AbortSignal;
    query?: Record<string, string | number | boolean | undefined>;
  }
  export interface ApiClient {
    get<T>(path: string, options?: RequestOptions): Promise<T>;
    post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
    put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
    patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
    del<T = undefined>(path: string, options?: RequestOptions): Promise<T>;
  }
  export const apiClient: ApiClient;
  export const DEFAULT_TIMEOUT_MS: number;
}

declare module "shell/session" {
  export type Role = "STUDENT" | "PROFESSOR" | "ADMIN" | "SERVICE";
  export interface SessionUser {
    id: string;
    role: Role;
    name: string;
  }
  export const session: {
    isAuthenticated(): boolean;
    user(): SessionUser | undefined;
    subscribe(listener: () => void): () => void;
  };
}
