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
