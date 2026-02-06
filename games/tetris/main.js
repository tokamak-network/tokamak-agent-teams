/**
 * main.js — Entry point and game loop orchestrator
 *
 * Initializes the canvas, creates module instances, and starts the game loop.
 * Manages the top-level game state machine: MENU → PLAYING → PAUSED → GAME_OVER.
 * Runs requestAnimationFrame loop that calls update(deltaTime) and render() on each frame.
 */

(function() {
  'use strict';

  // Game state enum
  const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  };

  // Main game controller
  let currentState = GameState.MENU;
  let board = null;
  let bag = null;
  let scoring = null;
  let game = null;
  let renderer = null;
  let input = null;
  let canvas = null;
  let lastTime = 0;

  /**
   * Initialize all game modules
   */
  function initModules() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      console.error('Canvas element not found');
      return false;
    }

    // Initialize modules
    board = typeof createBoard === 'function' ? createBoard() : null;
    bag = typeof createBag === 'function' ? createBag() : null;
    scoring = typeof createScoring === 'function' ? createScoring() : null;
    game = (typeof createGame === 'function' && board && bag) ? createGame(board, bag) : null;
    renderer = typeof createRenderer === 'function' ? createRenderer(canvas) : null;
    input = typeof createInput === 'function' ? createInput() : null;

    if (!game || !renderer || !input) {
      console.error('Failed to initialize game modules');
      return false;
    }

    return true;
  }

  /**
   * Start or restart the game
   */
  function startGame() {
    if (game && typeof game.reset === 'function') {
      game.reset();
    }
    if (scoring && typeof scoring.reset === 'function') {
      scoring.reset();
    }
    if (input && typeof input.reset === 'function') {
      input.reset();
    }
    currentState = GameState.PLAYING;
    lastTime = performance.now();
    updateUI();
  }

  /**
   * Toggle pause state
   */
  function togglePause() {
    if (currentState === GameState.PLAYING) {
      currentState = GameState.PAUSED;
    } else if (currentState === GameState.PAUSED) {
      currentState = GameState.PLAYING;
      lastTime = performance.now(); // Reset timer to prevent huge delta
    }
    updateUI();
  }

  /**
   * Get current game state
   */
  function getState() {
    return currentState;
  }

  /**
   * Render current game state to canvas
   * @param {number} deltaTime - Time elapsed since last frame
   */
  function renderGameState(deltaTime) {
    if (!renderer || !game || !board) return;

    // Construct state object for renderer
    const state = {
      grid: board.getGrid ? board.getGrid() : null,
      activePiece: null,
      holdPiece: null,
      nextPieces: [],
      ghostY: null,
      stats: {}
    };

    // Get active piece state
    if (typeof game.getActivePieceState === 'function') {
      const pieceState = game.getActivePieceState();
      if (pieceState && pieceState.piece) {
        state.activePiece = {
          type: pieceState.piece.type,
          rotation: pieceState.rotation,
          x: pieceState.x,
          y: pieceState.y
        };
      }
    }

    // Get ghost Y position
    if (typeof game.getGhostY === 'function') {
      state.ghostY = game.getGhostY();
    }

    // Get hold piece
    if (typeof game.getHoldPiece === 'function') {
      state.holdPiece = game.getHoldPiece();
    }

    // Get next pieces
    if (typeof game.getNextPieces === 'function') {
      state.nextPieces = game.getNextPieces(3);
    }

    // Get stats from scoring
    if (scoring && typeof scoring.getStats === 'function') {
      state.stats = scoring.getStats();
    }

    // Render the state (pass deltaTime for animations)
    if (typeof renderer.render === 'function') {
      renderer.render(state, deltaTime);
    }
  }

  /**
   * Update UI elements (score, status)
   */
  function updateUI() {
    const scoreDisplay = document.getElementById('score-display');
    const statusDisplay = document.getElementById('status');

    if (!scoreDisplay || !statusDisplay) return;

    // Update score display
    if (scoring) {
      const stats = scoring.getStats();
      scoreDisplay.textContent = 'Score: ' + stats.score + ' | Level: ' + stats.level + ' | Lines: ' + stats.lines;
    } else if (game && game.score !== undefined) {
      scoreDisplay.textContent = 'Score: ' + game.score;
    }

    // Update status display
    if (currentState === GameState.MENU) {
      statusDisplay.textContent = 'Press any key to start';
    } else if (currentState === GameState.GAME_OVER) {
      statusDisplay.textContent = 'Game Over! Press Enter to restart';
    } else if (currentState === GameState.PAUSED) {
      statusDisplay.textContent = 'PAUSED - Press ESC or P to resume';
    } else {
      statusDisplay.textContent = 'Arrow keys to move, Space to drop, C to hold, ESC to pause';
    }
  }

  /**
   * Main game loop
   */
  function gameLoop(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    // Update input timers (DAS/ARR)
    if (input && typeof input.update === 'function') {
      input.update(delta);
    }

    // Get input actions
    const actions = input && typeof input.getActions === 'function' ? input.getActions() : [];

    // Handle system actions and state transitions
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (action === 'PAUSE') {
        if (currentState === GameState.PLAYING || currentState === GameState.PAUSED) {
          togglePause();
        }
      } else if (action === 'RESTART') {
        if (currentState === GameState.GAME_OVER) {
          startGame();
        }
      } else if (currentState === GameState.MENU) {
        // Any action starts the game from menu
        startGame();
        break;
      }
    }

    // Filter out system actions
    const gameActions = actions.filter(function(a) {
      return a !== 'PAUSE' && a !== 'RESTART';
    });

    // Update game logic (only when playing)
    if (currentState === GameState.PLAYING && game && typeof game.update === 'function') {
      game.update(delta, gameActions);

      // Update gravity speed based on scoring level
      if (scoring) {
        const speed = scoring.getSpeed();
        if (typeof game.setGravityInterval === 'function') {
          game.setGravityInterval(speed);
        }

        // Check for line clears and update scoring with T-Spin information
        if (typeof game.getLastLockResult === 'function') {
          const lockResult = game.getLastLockResult();
          if (lockResult !== null) {
            // Increment pieces placed counter
            if (typeof scoring.incrementPieces === 'function') {
              scoring.incrementPieces();
            }

            // Trigger lock pulse animation
            if (renderer && typeof renderer.triggerLockPulse === 'function' && lockResult.lockedPiece) {
              renderer.triggerLockPulse(lockResult.lockedPiece);
            }

            // Process line clear with T-Spin information
            // Always call processLineClear to handle combo reset when no lines cleared
            scoring.processLineClear(
              lockResult.linesCleared,
              lockResult.isTSpin,
              lockResult.isTSpinMini
            );

            // Trigger line clear flash animation (only if lines were cleared)
            if (lockResult.linesCleared > 0 && renderer && typeof renderer.triggerLineClearFlash === 'function' && lockResult.clearedRows) {
              renderer.triggerLineClearFlash(lockResult.clearedRows);
            }
          }
        }

        // Check for drop actions and update scoring
        if (typeof game.getLastDropInfo === 'function') {
          const dropInfo = game.getLastDropInfo();
          if (dropInfo !== null) {
            if (dropInfo.soft > 0 && typeof scoring.addSoftDropPoints === 'function') {
              scoring.addSoftDropPoints(dropInfo.soft);
            }
            if (dropInfo.hard > 0 && typeof scoring.addHardDropPoints === 'function') {
              scoring.addHardDropPoints(dropInfo.hard);
            }
          }
        }
      }

      // Check for hard drop events and trigger animation
      if (typeof game.getLastHardDropEvent === 'function') {
        const hardDropEvent = game.getLastHardDropEvent();
        if (hardDropEvent !== null && renderer && typeof renderer.triggerHardDropTrail === 'function') {
          renderer.triggerHardDropTrail(
            hardDropEvent.x,
            hardDropEvent.startY,
            hardDropEvent.endY,
            hardDropEvent.color
          );
        }
      }

      // Check for game over
      if (game.isGameOver && game.isGameOver()) {
        currentState = GameState.GAME_OVER;
        // Trigger game over curtain animation
        if (renderer && typeof renderer.triggerGameOverCurtain === 'function') {
          renderer.triggerGameOverCurtain();
        }
        updateUI();
      }
    }

    // Render current state
    if (renderer) {
      if (currentState === GameState.MENU) {
        if (typeof renderer.renderMenu === 'function') {
          renderer.renderMenu();
        }
      } else if (currentState === GameState.PAUSED) {
        renderGameState(delta);
        if (typeof renderer.renderPause === 'function') {
          renderer.renderPause();
        }
      } else if (currentState === GameState.GAME_OVER) {
        renderGameState(delta);
        if (typeof renderer.renderGameOver === 'function' && scoring) {
          renderer.renderGameOver(scoring.getStats());
        }
      } else {
        renderGameState(delta);
      }
    }

    // Update UI every frame
    updateUI();

    requestAnimationFrame(gameLoop);
  }

  /**
   * Initialize and start the game
   */
  function init() {
    if (!initModules()) {
      const statusDisplay = document.getElementById('status');
      if (statusDisplay) {
        statusDisplay.textContent = 'Error: Failed to initialize game modules';
      }
      return;
    }

    // Start the game loop
    requestAnimationFrame(gameLoop);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export functions for external access (if needed)
  window.TetrisGame = {
    startGame: startGame,
    togglePause: togglePause,
    getState: getState
  };

})();
