// Who is calling, as the synthetic services see it: from the stub token of the tests
// ("test-token.<ROLE>.<userId>") or from the claims of a real JWT the shell sends (sub, role),
// read without verifying the signature - these handlers only emulate the services.
export interface Caller {
  role: string;
  userId: string;
}

function decodeBase64Url(part: string): string {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return decodeURIComponent(Array.from(atob(padded), (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
}

export function callerOf(request: Request): Caller | undefined {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return undefined;
  const token = auth.slice(7);
  if (token.startsWith("test-token.")) {
    const [, role = "", userId = ""] = token.split(".");
    return { role, userId };
  }
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return undefined;
  try {
    const claims = JSON.parse(decodeBase64Url(parts[1])) as { sub?: string; role?: string };
    return claims.sub ? { role: claims.role ?? "STUDENT", userId: claims.sub } : undefined;
  } catch {
    return undefined;
  }
}
