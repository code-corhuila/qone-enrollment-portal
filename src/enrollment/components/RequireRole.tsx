import { useSyncExternalStore, type ReactNode } from "react";
import { session, type Role, type SessionUser } from "shell/session";

// Authorization inside the portal (07-api/authentication.md, access matrix): the role comes
// from shell/session, never from the token. A wrong role sees a notice in place; the shell
// owns navigation and the sign-in.
// `session.user()` builds a new object on every call; useSyncExternalStore needs a stable
// snapshot or it re-renders forever, so the last value is kept while the person does not change.
let snapshot: SessionUser | undefined;
function readUser(): SessionUser | undefined {
  const user = session.user();
  if (user?.id !== snapshot?.id || user?.role !== snapshot?.role || user?.name !== snapshot?.name) snapshot = user;
  return snapshot;
}

export function useSessionUser() {
  return useSyncExternalStore(session.subscribe, readUser, readUser);
}

export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const user = useSessionUser();
  if (!user || !roles.includes(user.role)) {
    return (
      <p role="alert">You do not have permission for this section.</p>
    );
  }
  return <>{children}</>;
}
