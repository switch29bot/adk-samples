#!/bin/bash
# Installs the Motion animation library (github.com/motiondivision/motion)
# next to this repo in Claude Code cloud sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

MOTION_DIR="$(dirname "$CLAUDE_PROJECT_DIR")/motion"

if [ ! -d "$MOTION_DIR/.git" ]; then
  git clone --depth 50 https://github.com/motiondivision/motion.git "$MOTION_DIR"
fi

cd "$MOTION_DIR"

# The Cypress binary download fails behind the session proxy; it is only
# needed for Cypress tests.
CYPRESS_INSTALL_BINARY=0 yarn install

if [ ! -f packages/motion/dist/motion.js ]; then
  yarn build
fi

echo "export MOTION_DIR=\"$MOTION_DIR\"" >> "${CLAUDE_ENV_FILE:-/dev/null}"
