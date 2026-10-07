#!/usr/bin/env bash
# Post-deploy smoke test: the API (through CloudFront → ALB → ECS) and the SPA
# must both answer. Retries to allow CloudFront and target registration to settle.
#   ./scripts/health-check.sh https://rentals.example.com
set -euo pipefail

BASE_URL="${1:?usage: health-check.sh <base-url>}"
ATTEMPTS="${ATTEMPTS:-20}"
DELAY="${DELAY:-6}"

check() {
  local url="$1" expect="$2"
  for i in $(seq 1 "$ATTEMPTS"); do
    body="$(curl -fsS --max-time 10 "$url" || true)"
    if [[ "$body" == *"$expect"* ]]; then
      echo "ok   $url"
      return 0
    fi
    echo "wait $url (attempt $i/$ATTEMPTS)"
    sleep "$DELAY"
  done
  echo "FAIL $url did not contain: $expect" >&2
  return 1
}

check "$BASE_URL/api/v1/health" '"status":"ok"'
check "$BASE_URL/" '<div id="root">'
# A deep link must serve the SPA (CloudFront SPA rewrite).
check "$BASE_URL/owner/bookings" '<div id="root">'
