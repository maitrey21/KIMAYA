#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up TPTL Tamper Detection & Prevention Dashboard"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

pushd "$ROOT_DIR/backend" >/dev/null
echo "==> Installing backend dependencies"
npm install
if [ ! -f .env ]; then
  echo "==> Creating backend .env"
  cp .env.example .env
fi
echo "==> Seeding database"
npm run seed || true
popd >/dev/null

pushd "$ROOT_DIR/frontend" >/dev/null
echo "==> Installing frontend dependencies"
npm install
if [ ! -f .env ]; then
  echo "REACT_APP_API_URL=http://localhost:5000" > .env
fi
popd >/dev/null

echo "==> Setup complete"
echo "Run backend: (cd backend && npm run dev)"
echo "Run frontend: (cd frontend && npm start)"


