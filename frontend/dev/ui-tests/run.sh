#!/bin/bash
# Builds the app against the mock API, serves it, runs the given test script, then cleans up.
# usage: dev/ui-tests/run.sh flows.mjs|a11y.mjs
set -e
cd "$(dirname "$0")/../.."
VITE_API_BASE_URL=http://localhost:8081 VITE_DEMO_MODE=true npx vite build >/dev/null
node dev/mock-api.mjs >/dev/null 2>&1 & M=$!
npx vite preview --port 4173 --strictPort >/dev/null 2>&1 & P=$!
trap 'kill $M $P 2>/dev/null' EXIT
for i in $(seq 1 40); do curl -s localhost:4173 >/dev/null && curl -s localhost:8081/api/v1/x >/dev/null && break; sleep 0.5; done
node "dev/ui-tests/$1"
