#!/usr/bin/env bash
# One-time setup: point this clone's Git hooks at scripts/git-hooks/.
# Re-running is safe — `git config` just overwrites the same key.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

git config core.hooksPath scripts/git-hooks
chmod +x scripts/git-hooks/pre-commit

echo "✓ Git hooks installed at scripts/git-hooks/"
echo "  Pre-commit will typecheck + test changed packages (worker / frontend)."
echo "  Skip in one-off cases with: git commit --no-verify"
