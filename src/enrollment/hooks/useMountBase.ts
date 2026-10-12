import { useLocation } from "react-router";

// The path the shell mounted this portal at (/enrollment), taken from the first segment of
// the current location. Relative links inside a splat route resolve against the whole matched
// path in React Router 7, so navigation and cross-page links are built from this base instead.
export function useMountBase(): string {
  const { pathname } = useLocation();
  const first = pathname.split("/")[1];
  return first ? `/${first}` : "";
}
