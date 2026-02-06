#!/bin/bash
set -euo pipefail

#───────────────────────────────────────────────
# Tokamak Forge — Bootstrap Script
#
# Usage: ./forge.sh <game-name> [agent-count]
# Example: ./forge.sh tetris 3
#───────────────────────────────────────────────

GAME_NAME="${1:?Usage: ./forge.sh <game-name> [agent-count]}"
AGENT_COUNT="${2:-3}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load .env file if present
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi
REPO_BASE="/tmp/tokamak-forge-repos"
REPO_PATH="${REPO_BASE}/${GAME_NAME}.git"
WORK_DIR="/tmp/tokamak-forge-work/${GAME_NAME}"

echo "╔══════════════════════════════════════════╗"
echo "║       Tokamak Forge — Game Builder       ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Game:   ${GAME_NAME}"
echo "║  Agents: ${AGENT_COUNT}"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── Step 1: Validate prerequisites ───
echo "[1/7] Checking prerequisites..."

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ERROR: ANTHROPIC_API_KEY environment variable is required."
  echo "  export ANTHROPIC_API_KEY=sk-ant-..."
  exit 1
fi

for cmd in git docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' is required but not installed."
    exit 1
  fi
done

echo "  ✓ Prerequisites OK"

# ─── Step 2: Create bare git repo ───
echo "[2/7] Creating bare git repository..."

if [ -d "$REPO_PATH" ]; then
  echo "  Repository already exists at $REPO_PATH"
  echo "  Removing and recreating..."
  rm -rf "$REPO_PATH"
fi

mkdir -p "$REPO_BASE"
git init --bare "$REPO_PATH" 2>/dev/null
echo "  ✓ Bare repo: $REPO_PATH"

# ─── Step 3: Clone and scaffold project ───
echo "[3/7] Scaffolding project..."

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
git clone "$REPO_PATH" "$WORK_DIR/project" 2>/dev/null
cd "$WORK_DIR/project"

git config user.name "tokamak-forge"
git config user.email "forge@tokamak"

# Create directory structure
mkdir -p src tests current_tasks completed_tasks logs

touch current_tasks/.gitkeep
touch completed_tasks/.gitkeep
touch logs/.gitkeep

# Add .gitignore
cat > .gitignore <<'GITIGNORE'
logs/*.log
node_modules/
.DS_Store
*.swp
GITIGNORE

# Copy and fill templates
echo "  Generating CLAUDE.md..."
sed "s/{{GAME_NAME}}/${GAME_NAME}/g" "$SCRIPT_DIR/templates/CLAUDE.md.template" > CLAUDE.md

echo "  Copying test utilities..."
cp "$SCRIPT_DIR/templates/tests/base-test.js" tests/
cp "$SCRIPT_DIR/templates/tests/run-tests.sh" tests/
chmod +x tests/run-tests.sh

echo "  Generating index.html..."
sed "s/{{GAME_NAME}}/${GAME_NAME}/g" "$SCRIPT_DIR/templates/src/index.html" > src/index.html

# Create minimal src stubs
cat > src/game.js <<'GAMEJS'
/**
 * game.js — Game logic module
 *
 * Exports: createGame(), updateGame(state, action), isGameOver(state)
 */

// Game state factory
function createGame() {
  return {
    score: 0,
    level: 1,
    gameOver: false,
    initialized: true
  };
}

// State update handler
function updateGame(state, action) {
  if (!state || state.gameOver) return state;

  if (action && action.type === 'tick') {
    // Game tick logic - to be implemented
  }

  return state;
}

// Game over check
function isGameOver(state) {
  return state ? state.gameOver : false;
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGame, updateGame, isGameOver };
}
GAMEJS

cat > src/renderer.js <<'RENDERERJS'
/**
 * renderer.js — Canvas rendering module
 *
 * Exports: createRenderer(canvas), render(renderer, state)
 */

function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    ctx: ctx,
    width: canvas.width,
    height: canvas.height
  };
}

function render(renderer, state) {
  if (!renderer || !renderer.ctx) return;

  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;

  // Clear canvas
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  // Placeholder text
  ctx.fillStyle = '#00d4ff';
  ctx.font = '16px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('Game initializing...', w / 2, h / 2);

  if (state && state.score !== undefined) {
    ctx.fillText('Score: ' + state.score, w / 2, h / 2 + 30);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createRenderer, render };
}
RENDERERJS

cat > src/input.js <<'INPUTJS'
/**
 * input.js — Input handling module
 *
 * Exports: setupInput(callback)
 */

function setupInput(callback) {
  if (typeof document === 'undefined') return;

  document.addEventListener('keydown', function(e) {
    var action = null;

    switch (e.key) {
      case 'ArrowLeft':  action = { type: 'move', direction: 'left' }; break;
      case 'ArrowRight': action = { type: 'move', direction: 'right' }; break;
      case 'ArrowDown':  action = { type: 'move', direction: 'down' }; break;
      case 'ArrowUp':    action = { type: 'rotate' }; break;
      case ' ':          action = { type: 'drop' }; break;
      case 'r': case 'R': action = { type: 'restart' }; break;
      case 'p': case 'P': action = { type: 'pause' }; break;
    }

    if (action && callback) {
      e.preventDefault();
      callback(action);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupInput };
}
INPUTJS

# Create initial test files
cat > tests/structure.test.js <<'STRUCTTEST'
const { assert, describe, it, summary } = require('./base-test');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

describe('Project Structure', function() {
  it('should have index.html', function() {
    assert.ok(fs.existsSync(path.join(srcDir, 'index.html')), 'index.html missing');
  });

  it('should have game.js', function() {
    assert.ok(fs.existsSync(path.join(srcDir, 'game.js')), 'game.js missing');
  });

  it('should have renderer.js', function() {
    assert.ok(fs.existsSync(path.join(srcDir, 'renderer.js')), 'renderer.js missing');
  });

  it('should have input.js', function() {
    assert.ok(fs.existsSync(path.join(srcDir, 'input.js')), 'input.js missing');
  });

  it('should have CLAUDE.md', function() {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'CLAUDE.md')), 'CLAUDE.md missing');
  });

  it('should have SPEC.md', function() {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'SPEC.md')), 'SPEC.md missing');
  });
});

describe('Module Exports', function() {
  it('game.js should export createGame', function() {
    const game = require('../src/game');
    assert.strictEqual(typeof game.createGame, 'function');
  });

  it('game.js should export updateGame', function() {
    const game = require('../src/game');
    assert.strictEqual(typeof game.updateGame, 'function');
  });

  it('game.js should export isGameOver', function() {
    const game = require('../src/game');
    assert.strictEqual(typeof game.isGameOver, 'function');
  });

  it('renderer.js should export createRenderer', function() {
    const renderer = require('../src/renderer');
    assert.strictEqual(typeof renderer.createRenderer, 'function');
  });

  it('renderer.js should export render', function() {
    const renderer = require('../src/renderer');
    assert.strictEqual(typeof renderer.render, 'function');
  });

  it('input.js should export setupInput', function() {
    const input = require('../src/input');
    assert.strictEqual(typeof input.setupInput, 'function');
  });
});

process.exit(summary());
STRUCTTEST

cat > tests/game-logic.test.js <<'GAMETEST'
const { assert, describe, it, summary, createCanvasMock } = require('./base-test');

describe('Game Logic', function() {
  it('createGame should return valid initial state', function() {
    const { createGame } = require('../src/game');
    const state = createGame();
    assert.ok(state, 'state should not be null');
    assert.strictEqual(typeof state.score, 'number');
    assert.strictEqual(state.gameOver, false);
    assert.strictEqual(state.initialized, true);
  });

  it('updateGame should handle tick action', function() {
    const { createGame, updateGame } = require('../src/game');
    const state = createGame();
    const newState = updateGame(state, { type: 'tick', delta: 16 });
    assert.ok(newState, 'updateGame should return state');
  });

  it('updateGame should not update when game is over', function() {
    const { updateGame } = require('../src/game');
    const state = { score: 100, gameOver: true };
    const result = updateGame(state, { type: 'tick', delta: 16 });
    assert.strictEqual(result.score, 100);
  });

  it('isGameOver should return false for new game', function() {
    const { createGame, isGameOver } = require('../src/game');
    const state = createGame();
    assert.strictEqual(isGameOver(state), false);
  });

  it('isGameOver should handle null state', function() {
    const { isGameOver } = require('../src/game');
    assert.strictEqual(isGameOver(null), false);
  });
});

describe('Renderer', function() {
  it('createRenderer should accept canvas mock', function() {
    const { createRenderer } = require('../src/renderer');
    const { canvas } = createCanvasMock();
    const renderer = createRenderer(canvas);
    assert.ok(renderer, 'renderer should not be null');
    assert.ok(renderer.ctx, 'renderer should have ctx');
  });

  it('render should not throw with valid state', function() {
    const { createRenderer, render } = require('../src/renderer');
    const { createGame } = require('../src/game');
    const { canvas } = createCanvasMock();
    const renderer = createRenderer(canvas);
    const state = createGame();
    assert.doesNotThrow(() => render(renderer, state));
  });
});

process.exit(summary());
GAMETEST

echo "  ✓ Project scaffolded"

# ─── Step 4: Generate SPEC.md with Claude ───
echo "[4/7] Generating SPEC.md with Claude..."

if command -v claude &>/dev/null; then
  SPEC_PROMPT="You are a game design expert. Generate a detailed SPEC.md for a '${GAME_NAME}' game.

The game must be implemented in pure HTML5 Canvas + vanilla JavaScript (no libraries).

Format the document exactly like this:

# ${GAME_NAME} — Game Specification

## Overview
[Brief description of the game]

## Game Rules
[Detailed rules]

## Controls
[Keyboard controls]

## Module Breakdown

### 1. **Module Name** — description
- Detailed requirements
- Exported functions

### 2. **Module Name** — description
...

## Visual Design
[Canvas layout, colors, sizes]

## Scoring
[Score calculation rules]

## Implementation Priority
1. First thing to implement
2. Second thing
...

Keep it detailed enough that multiple developers can work on different modules independently.
Respond with ONLY the markdown content, no code fences."

  SPEC_CONTENT=$(claude --model claude-opus-4-6 --print -p "$SPEC_PROMPT" 2>/dev/null || true)

  if [ -n "$SPEC_CONTENT" ]; then
    echo "$SPEC_CONTENT" > SPEC.md
    echo "  ✓ SPEC.md generated by Claude"
  else
    echo "  ⚠ Claude unavailable, using template SPEC.md"
    sed "s/{{GAME_NAME}}/${GAME_NAME}/g" "$SCRIPT_DIR/templates/SPEC.md.template" > SPEC.md
  fi
else
  echo "  ⚠ Claude CLI not found, using template SPEC.md"
  sed "s/{{GAME_NAME}}/${GAME_NAME}/g" "$SCRIPT_DIR/templates/SPEC.md.template" > SPEC.md
fi

# ─── Step 5: Generate initial tests based on SPEC ───
echo "[5/7] Setting up tests..."
echo "  ✓ Tests ready (structure.test.js + game-logic.test.js)"

# ─── Step 6: Initial commit & push ───
echo "[6/7] Committing and pushing..."

git add -A
git commit -m "init: scaffold ${GAME_NAME} project

- CLAUDE.md: agent constitution
- SPEC.md: game specification
- src/: initial game stubs (game.js, renderer.js, input.js, index.html)
- tests/: structure and game logic tests
- current_tasks/ & completed_tasks/: task coordination directories" 2>/dev/null

git branch -M main
git push -u origin main 2>/dev/null

echo "  ✓ Initial commit pushed to bare repo"

# Verify tests pass on initial scaffold
echo "  Running initial tests..."
if bash tests/run-tests.sh >/dev/null 2>&1; then
  echo "  ✓ All initial tests pass"
else
  echo "  ⚠ Some initial tests failed (agents will fix these)"
fi

# ─── Step 7: Launch Docker agents ───
echo "[7/7] Launching ${AGENT_COUNT} agents + dashboard..."

cd "$SCRIPT_DIR"

# Generate docker-compose override for dynamic agent count
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.yml"

# Export variables for docker-compose
export GAME_NAME
export ANTHROPIC_API_KEY
export REPO_PATH

echo ""
echo "Starting docker-compose..."
echo "  Dashboard: http://localhost:3000"
echo ""

docker compose -f "$COMPOSE_FILE" up --build -d 2>&1 | while read -r line; do
  echo "  $line"
done

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║            Forge Activated!              ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║  Dashboard:  http://localhost:3000        ║"
echo "║  Bare repo:  $REPO_PATH"
echo "║  Work dir:   $WORK_DIR/project"
echo "║                                          ║"
echo "║  Agents are now autonomously building    ║"
echo "║  your ${GAME_NAME} game!                 ║"
echo "║                                          ║"
echo "║  Commands:                               ║"
echo "║    View logs:  docker compose -f \\       ║"
echo "║      docker/docker-compose.yml logs -f   ║"
echo "║    Stop:  docker compose -f \\            ║"
echo "║      docker/docker-compose.yml down      ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
