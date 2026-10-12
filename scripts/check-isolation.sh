#!/usr/bin/env sh
# Annex H, "Cómo se verifica": the built portal must not contain the gateway URL and must not
# handle the token itself. Run after `npm run build`; exits 1 on the first hit.
set -eu
DIST="${1:-dist}"
[ -d "$DIST" ] || { echo "no $DIST folder; run npm run build first" >&2; exit 2; }
# Only the portal's own chunks are judged: remoteEntry.js, the exposed module and its pages.
# The federation runtime and the shared libraries (react, react-router) are the shell's
# concern and are excluded by name.
OWN=$(find "$DIST" -name '*.js' ! -name '_virtual_mf*' ! -name '__virtual_mf*' ! -name 'index-*'   ! -name 'hostInit-*' ! -name 'pendingShares-*' ! -name 'vite-preload-helper-*' ! -name 'mf-entry-bootstrap-*'   ! -name '_commonjsHelpers-*' ! -name 'mockServiceWorker.js' ! -name '*mocks*' ! -name 'remote-*')
# The exposed ./mocks module (synthetic data for the shell's worker, ADR-009) reads the
# Authorization header to emulate the services and is excluded: it never runs in production.
[ -n "$OWN" ] || { echo "no portal chunks found in $DIST" >&2; exit 2; }
fail=0
# A gateway origin or API port baked into the bundle.
if echo "$OWN" | xargs grep -IlE 'localhost:8080|VITE_GATEWAY_URL|api-gateway' >/dev/null 2>&1; then
  echo "FAIL: the built portal references the gateway" >&2; fail=1
fi
# Token storage or an own Authorization header: the shell's client does that.
if echo "$OWN" | xargs grep -IlE 'localStorage|sessionStorage|"Authorization"|Bearer ' >/dev/null 2>&1; then
  echo "FAIL: the built portal handles the token itself" >&2; fail=1
fi
# A raw fetch to the API instead of shell/apiClient (allowed: none).
if echo "$OWN" | xargs grep -IlE 'fetch\("/api/|fetch\(`/api/' >/dev/null 2>&1; then
  echo "FAIL: the built portal calls fetch against the API" >&2; fail=1
fi
[ "$fail" -eq 0 ] && echo "OK: the built portal is isolated (no gateway URL, no token handling, no raw fetch)"
exit "$fail"
