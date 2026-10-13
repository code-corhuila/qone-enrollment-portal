// Test double of `shell/session`: the portal only reads who is signed in (role, name) and never
// touches the token. Tests sign a user in with `testSession.signInAs(...)`.
export type Role = "STUDENT" | "PROFESSOR" | "ADMIN" | "SERVICE";
export interface SessionUser {
  id: string;
  role: Role;
  name: string;
}

let current: SessionUser | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const session = {
  isAuthenticated: () => current !== undefined,
  // Like the real shell: a fresh object on every call, so a component that forgets to cache its snapshot loops in tests too.
  user: () => (current ? { ...current } : undefined),
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const testSession = {
  signInAs(user: SessionUser): void {
    current = user;
    notify();
  },
  reset(): void {
    current = undefined;
    notify();
  },
  /** The bearer the stub client sends: an opaque test token naming the user and role. */
  token(): string | undefined {
    return current ? `test-token.${current.role}.${current.id}` : undefined;
  },
};
