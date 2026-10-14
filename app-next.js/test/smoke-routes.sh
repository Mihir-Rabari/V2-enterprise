#!/usr/bin/env bash
#
# Route smoke harness for the Next.js App Router migration (app-next.js).
#
# Boots a server on port 3999 (default), curls the full storefront route
# matrix, and asserts the HTTP status of every route:
#
#   200s (full pages):      / /shop /categories /new-arrivals /about /contact
#                           /size-guide /privacy /returns /shipping /terms
#                           /login /signup /forgot-password /reset-password/sometoken
#   200s (client shells):   /product/1 /cat/sub /cat/sub/1 /admin/login
#   redirect:               /liked → /account/wishlist
#   404:                    /totally-bogus-route
#
# IMPORTANT — EXPECTED STATE OF THIS BRANCH (migration/regression-tests,
# based on dev @ 93b076c): only "/" exists. Every other route below is still
# owned by pending page-migration PRs, so the harness currently reports FAIL
# (404) rows for them. That is the honest, expected pre-merge state — this
# script is the post-merge gate: once the page PRs land, the same script must
# turn fully green with no modification. Do NOT fake or soften the results.
#
# API-dependent pages (/, /shop, /categories, /product/1, …) render their
# route shell server-side and fetch data client-side; without a running
# backend they degrade to loading/error states in the browser. That is
# EXPECTED and fine — this harness asserts the HTTP status of the rendered
# route shell, never page content.
#
# Usage (from anywhere; operates on the app-next.js package):
#   bash test/smoke-routes.sh              # next build && next start -p 3999
#   SKIP_BUILD=1 bash test/smoke-routes.sh # reuse the existing .next build
#   bash test/smoke-routes.sh dev          # run against next dev instead
#   SMOKE_PORT=4321 bash test/smoke-routes.sh
#
# Exit code: 0 if every route matched its expected status, 1 otherwise.

set -u

PORT="${SMOKE_PORT:-3999}"
BASE="http://127.0.0.1:${PORT}"
MODE="${1:-build}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_PID=""
SERVER_LOG="$(mktemp /tmp/v2-smoke-next-XXXXXX.log)"

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        # Kill the whole process GROUP: `npx next start` fork-spawns the actual
        # next-server as a child, and killing only the npx wrapper would
        # orphan it (verified on this repo — the server kept answering on the
        # port after the wrapper died). setsid (below) makes the server its
        # own process-group leader so `kill -- -PGID` reaps the entire tree.
        kill -- -"$SERVER_PID" 2>/dev/null || kill "$SERVER_PID" 2>/dev/null
        wait "$SERVER_PID" 2>/dev/null
    fi
    rm -f "$SERVER_LOG"
}
trap cleanup EXIT INT TERM

cd "$APP_DIR" || { echo "FAIL: cannot cd into $APP_DIR"; exit 1; }

# ── 1. Build the production bundle (unless reusing an existing one) ────────
if [ "$MODE" != "dev" ] && [ "${SKIP_BUILD:-0}" != "1" ]; then
    echo "==> Building production bundle (npm run build)…"
    if ! npm run build; then
        echo
        echo "FAIL: next build failed — smoke run aborted (see output above)"
        exit 1
    fi
fi

# ── 2. Start the server ─────────────────────────────────────────────────────
echo "==> Starting server on port $PORT (mode: $MODE)…"
# setsid ⇒ the server runs in its own process group (group leader == $!), so
# cleanup() can reap the npx wrapper AND the real next-server with one kill.
if [ "$MODE" = "dev" ]; then
    setsid npx next dev -p "$PORT" >"$SERVER_LOG" 2>&1 &
else
    setsid npx next start -p "$PORT" >"$SERVER_LOG" 2>&1 &
fi
SERVER_PID=$!

# Readiness probe: any HTTP response (even 404) means the server is up.
# next start answers immediately; next dev may compile on first request.
ready=0
for _ in $(seq 1 120); do
    if curl -s -o /dev/null --max-time 5 "$BASE/"; then
        ready=1
        break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "FAIL: server process exited during startup. Last log lines:"
        tail -n 30 "$SERVER_LOG"
        exit 1
    fi
    sleep 1
done
if [ "$ready" != "1" ]; then
    echo "FAIL: server did not become ready on $BASE within 120s. Last log lines:"
    tail -n 30 "$SERVER_LOG"
    exit 1
fi

# ── 3. Route matrix ─────────────────────────────────────────────────────────
PASS_COUNT=0
FAIL_COUNT=0
FAILED_ROUTES=()

# Assert that $BASE$1 returns HTTP status $2.
check() {
    local route="$1" expected="$2" out got
    out="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$BASE$route")"
    got="${out:-000}"
    if [ "$got" = "$expected" ]; then
        printf '  %-28s expected %-4s got %-4s PASS\n' "$route" "$expected" "$got"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf '  %-28s expected %-4s got %-4s FAIL\n' "$route" "$expected" "$got"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        FAILED_ROUTES+=("$route")
    fi
}

# Assert that $BASE$1 replies with an HTTP redirect whose Location
# contains $2 (matches how Next.js issues redirect()s: 307/308).
check_redirect() {
    local route="$1" want="$2" out got redirect ok=0
    out="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 30 "$BASE$route")"
    got="${out%% *}"
    redirect="${out#* }"
    case "$got" in
        301 | 302 | 307 | 308) case "$redirect" in *"$want"*) ok=1 ;; esac ;;
    esac
    if [ "$ok" = "1" ]; then
        printf '  %-28s expected redirect to %-22s got %s PASS\n' "$route" "$want" "$got"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        printf '  %-28s expected redirect to %-22s got %s (%s) FAIL\n' "$route" "$want" "$got" "${redirect:-no-location}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        FAILED_ROUTES+=("$route")
    fi
}

echo "==> Route matrix:"
# Full storefront pages (200)
check "/" 200
check "/shop" 200
check "/categories" 200
check "/new-arrivals" 200
check "/about" 200
check "/contact" 200
check "/size-guide" 200
check "/privacy" 200
check "/returns" 200
check "/shipping" 200
check "/terms" 200
check "/login" 200
check "/signup" 200
check "/forgot-password" 200
check "/reset-password/sometoken" 200
# Redirect
check_redirect "/liked" "/account/wishlist"
# Dynamic client shells (200)
check "/product/1" 200
check "/cat/sub" 200
check "/cat/sub/1" 200
# Admin
check "/admin/login" 200
# Unknown route must be a 404 (not a 500 / redirect)
check "/totally-bogus-route" 404

# ── 4. Summary ──────────────────────────────────────────────────────────────
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo
echo "==> Result: $PASS_COUNT/$TOTAL routes passed, $FAIL_COUNT failed"
if [ "$FAIL_COUNT" -gt 0 ]; then
    echo "    Failed routes:"
    for r in "${FAILED_ROUTES[@]}"; do
        echo "      - $r"
    done
    echo
    echo "    NOTE: until the page-migration PRs merge into dev, FAIL(404) rows for"
    echo "    routes other than / and /totally-bogus-route are the documented"
    echo "    expected state (see test/README.md). Re-run this script after those"
    echo "    PRs merge — it must then pass with no changes."
    exit 1
fi
echo "    All routes OK"
exit 0
