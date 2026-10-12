#!/usr/bin/env sh
# Smoke checks of the catalog remote image (Annex H, norm 5.1). Usage:
#   deploy/smoke.sh http://localhost:5002
set -eu
BASE="${1:-http://localhost:5002}"
fail() { echo "FAIL: $1" >&2; exit 1; }
status() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
header() { curl -s -D - -o /dev/null "$1" | tr -d '\r' | grep -i "^$2:" | head -n1 | cut -d' ' -f2- ; }

[ "$(status "$BASE/health")" = "200" ] || fail "/health is not 200"
# The federation entry is served to any origin and never cached (Annex H rule 4).
[ "$(status "$BASE/remoteEntry.js")" = "200" ] || fail "remoteEntry.js is not served"
case "$(header "$BASE/remoteEntry.js" Cache-Control)" in *no-store*) ;; *) fail "remoteEntry.js is cacheable";; esac
[ "$(header "$BASE/remoteEntry.js" Access-Control-Allow-Origin)" = "*" ] || fail "remoteEntry.js has no CORS header"
# The exposed module chunk exists and hashed assets are immutable.
ASSET=$(curl -s "$BASE/remoteEntry.js" | grep -oE '[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.js' | head -n1)
[ -n "$ASSET" ] || fail "remoteEntry.js references no chunk"
[ "$(status "$BASE/assets/$ASSET")" = "200" ] || fail "chunk $ASSET is not served"
case "$(header "$BASE/assets/$ASSET" Cache-Control)" in *immutable*) ;; *) fail "chunk $ASSET is not immutable";; esac
# No SPA fallback: an unknown path is a 404, not the standalone page.
[ "$(status "$BASE/catalog/anything")" = "404" ] || fail "unknown path did not answer 404"
echo "OK: catalog remote smoke checks passed against $BASE"
