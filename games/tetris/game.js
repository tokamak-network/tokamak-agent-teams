/**
 * game.js — Core game logic controller
 *
 * Exports:
 *   - createGame(board, bag): factory function that returns a Game object
 *
 * Game object methods:
 *   - update(deltaTime, actions): tick game logic
 *   - getActivePiece(): get current active piece
 *   - getGhostY(): get ghost piece Y position
 *   - getHoldPiece(): get held piece type
 *   - getNextPieces(n): get next N pieces
 *   - reset(): reset game state
 */

const LOCK_DELAY_MS = 500;  // Lock delay in milliseconds
const MAX_LOCK_RESETS = 15; // Maximum number of lock delay resets

/**
 * Create a new game instance
 * @param {object} board - Board object from board.js
 * @param {object} bag - Bag object from bag.js
 * @returns {object} Game object with methods
 */
function createGame(board, bag) {
  // Legacy mode: if no arguments, return simple state object for backward compatibility
  if (!board && !bag && typeof createBoard !== 'function') {
    return {
      score: 0,
      level: 1,
      gameOver: false,
      initialized: true
    };
  }

  // Use global board and bag if not provided (for browser environment)
  if (!board && typeof createBoard === 'function') {
    board = createBoard();
  }
  if (!bag && typeof createBag === 'function') {
    bag = createBag();
  }

  if (!board || !bag) {
    // Fallback to legacy state if modules not available
    return {
      score: 0,
      level: 1,
      gameOver: false,
      initialized: true
    };
  }

  // Game state
  let activePiece = null;
  let activePieceX = 0;
  let activePieceY = 0;
  let activePieceRotation = 0;

  let holdPiece = null;
  let holdLocked = false; // Can only hold once per piece

  let gravityTimer = 0;
  let gravityInterval = 1000; // Fall interval in ms (will be set by scoring module)
  let softDropActive = false; // Track if soft drop is being held
  let softDropRows = 0; // Count rows dropped during soft drop for scoring

  let lockTimer = 0;
  let lockResets = 0;
  let isOnGround = false;

  let gameOver = false;
  let paused = false;
  let linesCleared = 0;

  // T-Spin detection state
  let lastActionWasRotation = false;
  let lastRotationUsedKick = false;

  // Last lock result (for scoring integration)
  let lastLockResult = null;

  // Last drop info (for scoring integration)
  let lastDropInfo = null;

  // Last hard drop event (for animation)
  let lastHardDropEvent = null;

  /**
   * Spawn a new piece
   * @returns {boolean} True if spawn successful, false if game over
   */
  function spawnPiece() {
    const pieceType = bag.next();
    activePiece = createPiece(pieceType);
    activePieceRotation = 0;

    // Spawn position: center of board, above visible area
    activePieceX = Math.floor(board.BOARD_WIDTH / 2) - 2;
    activePieceY = board.BOARD_HEIGHT - 2;

    // Check if spawn position is valid (block-out game over)
    if (!board.isValid(activePiece, activePieceX, activePieceY, activePieceRotation)) {
      gameOver = true;
      return false;
    }

    // Reset lock delay
    lockTimer = 0;
    lockResets = 0;
    isOnGround = false;
    holdLocked = false;

    // Reset soft drop tracking
    softDropActive = false;
    softDropRows = 0;

    // Reset T-Spin detection
    lastActionWasRotation = false;
    lastRotationUsedKick = false;

    return true;
  }

  /**
   * Move the active piece
   * @param {number} dx - X offset
   * @param {number} dy - Y offset
   * @returns {boolean} True if move successful
   */
  function movePiece(dx, dy) {
    if (!activePiece) return false;

    const newX = activePieceX + dx;
    const newY = activePieceY + dy;

    if (board.isValid(activePiece, newX, newY, activePieceRotation)) {
      activePieceX = newX;
      activePieceY = newY;

      // Reset lock delay if on ground and within reset limit
      if (isOnGround && lockResets < MAX_LOCK_RESETS) {
        lockTimer = 0;
        lockResets++;
      }

      // Moving the piece (non-rotation) resets T-Spin detection
      lastActionWasRotation = false;

      return true;
    }

    return false;
  }

  /**
   * Rotate the active piece with SRS wall kicks
   * @param {number} direction - 1 for clockwise, -1 for counter-clockwise
   * @returns {boolean} True if rotation successful
   */
  function rotatePiece(direction) {
    if (!activePiece || typeof WALL_KICKS === 'undefined') return false;

    const newRotation = (activePieceRotation + direction + 4) % 4;
    const kickKey = activePieceRotation + '->' + newRotation;
    const kicks = WALL_KICKS[activePiece.type][kickKey];

    if (!kicks) return false;

    // Try each wall kick offset
    for (let i = 0; i < kicks.length; i++) {
      const kickX = kicks[i][0];
      const kickY = -kicks[i][1]; // Invert Y because board Y increases downward

      const newX = activePieceX + kickX;
      const newY = activePieceY + kickY;

      if (board.isValid(activePiece, newX, newY, newRotation)) {
        activePieceX = newX;
        activePieceY = newY;
        activePieceRotation = newRotation;

        // Reset lock delay if on ground and within reset limit
        if (isOnGround && lockResets < MAX_LOCK_RESETS) {
          lockTimer = 0;
          lockResets++;
        }

        // Mark that a rotation occurred and whether it used a wall kick
        lastActionWasRotation = true;
        lastRotationUsedKick = (i > 0); // First kick (i=0) is no kick, others are wall kicks

        return true;
      }
    }

    return false;
  }

  /**
   * Get the ghost piece Y position (hard drop target)
   * @returns {number} Y position of ghost piece
   */
  function getGhostY() {
    if (!activePiece) return activePieceY;

    let ghostY = activePieceY;

    // Move down until collision
    while (board.isValid(activePiece, activePieceX, ghostY - 1, activePieceRotation)) {
      ghostY--;
    }

    return ghostY;
  }

  /**
   * Hard drop: instantly drop to ghost position and lock
   * @returns {number} Number of rows dropped
   */
  function hardDrop() {
    if (!activePiece) return 0;

    const startY = activePieceY;
    const targetY = getGhostY();
    const rowsDropped = startY - targetY;

    // Store hard drop event for animation
    // Get color from global COLORS object (defined in pieces.js)
    const pieceColor = (typeof COLORS !== 'undefined' && COLORS[activePiece.type])
      ? COLORS[activePiece.type]
      : '#ffffff';

    lastHardDropEvent = {
      x: activePieceX,
      startY: startY,
      endY: targetY,
      color: pieceColor,
      type: activePiece.type
    };

    activePieceY = targetY;

    // Hard drop is not a rotation, so reset T-Spin detection
    // (unless last action before hard drop was rotation, keep it)
    // Actually, hard drop immediately locks, so T-Spin state will be checked in lockPiece

    // Lock immediately
    lockPiece();

    return rowsDropped;
  }

  /**
   * Check if the current piece placement is a T-Spin
   * @returns {object} { isTSpin: boolean, isTSpinMini: boolean }
   */
  function checkTSpin() {
    // Default: no T-Spin
    const result = { isTSpin: false, isTSpinMini: false };

    // T-Spin requires: T-piece, last action was rotation
    if (!activePiece || activePiece.type !== 'T' || !lastActionWasRotation) {
      return result;
    }

    // Get the center position of the T-piece
    // T-piece center is always at the second block (index 1) in its shape definition
    const centerX = activePieceX;
    const centerY = activePieceY;

    // Define the 4 diagonal corners relative to center
    const corners = [
      { x: centerX - 1, y: centerY + 1 },  // Top-left
      { x: centerX + 1, y: centerY + 1 },  // Top-right
      { x: centerX - 1, y: centerY - 1 },  // Bottom-left
      { x: centerX + 1, y: centerY - 1 }   // Bottom-right
    ];

    // Check which corners are occupied (by blocks or out of bounds/walls)
    let occupiedCorners = 0;
    for (let i = 0; i < corners.length; i++) {
      const cx = corners[i].x;
      const cy = corners[i].y;

      // Out of bounds counts as occupied
      if (cx < 0 || cx >= board.BOARD_WIDTH || cy < 0 || cy >= board.BOARD_HEIGHT) {
        occupiedCorners++;
      } else {
        // Check if cell has a block
        const grid = board.getGrid();
        if (grid[cy][cx] !== null) {
          occupiedCorners++;
        }
      }
    }

    // T-Spin: at least 3 of 4 corners occupied
    if (occupiedCorners >= 3) {
      result.isTSpin = true;

      // T-Spin Mini: rotation used wall kick AND only 2 front corners occupied
      // Front corners depend on rotation state:
      // Rotation 0 (pointing up): top-left, top-right
      // Rotation 1 (pointing right): top-right, bottom-right
      // Rotation 2 (pointing down): bottom-left, bottom-right
      // Rotation 3 (pointing left): top-left, bottom-left
      if (lastRotationUsedKick) {
        let frontCorners = [];
        if (activePieceRotation === 0) {
          frontCorners = [corners[0], corners[1]]; // top-left, top-right
        } else if (activePieceRotation === 1) {
          frontCorners = [corners[1], corners[3]]; // top-right, bottom-right
        } else if (activePieceRotation === 2) {
          frontCorners = [corners[2], corners[3]]; // bottom-left, bottom-right
        } else if (activePieceRotation === 3) {
          frontCorners = [corners[0], corners[2]]; // top-left, bottom-left
        }

        let frontOccupied = 0;
        for (let i = 0; i < frontCorners.length; i++) {
          const cx = frontCorners[i].x;
          const cy = frontCorners[i].y;

          if (cx < 0 || cx >= board.BOARD_WIDTH || cy < 0 || cy >= board.BOARD_HEIGHT) {
            frontOccupied++;
          } else {
            const grid = board.getGrid();
            if (grid[cy][cx] !== null) {
              frontOccupied++;
            }
          }
        }

        // T-Spin Mini if only 2 corners total AND used wall kick
        if (occupiedCorners === 3 && frontOccupied < 2) {
          result.isTSpinMini = true;
        }
      }
    }

    return result;
  }

  /**
   * Lock the active piece into the board
   */
  function lockPiece() {
    if (!activePiece) return;

    // Record any remaining soft drop rows before locking
    if (softDropRows > 0) {
      if (!lastDropInfo) {
        lastDropInfo = { soft: 0, hard: 0 };
      }
      lastDropInfo.soft += softDropRows;
      softDropRows = 0;
    }

    // Check for T-Spin before locking
    const tSpinResult = checkTSpin();

    board.lock(activePiece, activePieceX, activePieceY, activePieceRotation);

    // Clear completed lines
    const clearResult = board.clearLines();
    linesCleared += clearResult.linesCleared;

    // Combine results
    const result = {
      linesCleared: clearResult.linesCleared,
      clearedRows: clearResult.clearedRows,
      isTSpin: tSpinResult.isTSpin,
      isTSpinMini: tSpinResult.isTSpinMini,
      // Add piece info for lock pulse animation
      lockedPiece: {
        type: activePiece.type,
        rotation: activePieceRotation,
        x: activePieceX,
        y: activePieceY
      }
    };

    // Check for lock-out game over
    if (board.hasBlocksAboveVisible()) {
      gameOver = true;
    }

    // Reset T-Spin detection state
    lastActionWasRotation = false;
    lastRotationUsedKick = false;

    // Store last lock result for external access
    lastLockResult = result;

    // Spawn next piece
    activePiece = null;
    if (!gameOver) {
      spawnPiece();
    }

    return result;
  }

  /**
   * Hold the current piece
   * @returns {boolean} True if hold successful
   */
  function hold() {
    if (!activePiece || holdLocked) return false;

    if (holdPiece === null) {
      // First hold: store current piece and spawn next
      holdPiece = activePiece.type;
      activePiece = null;
      spawnPiece();
    } else {
      // Swap with held piece
      const temp = holdPiece;
      holdPiece = activePiece.type;

      activePiece = createPiece(temp);
      activePieceRotation = 0;
      activePieceX = Math.floor(board.BOARD_WIDTH / 2) - 2;
      activePieceY = board.BOARD_HEIGHT - 2;

      // Check if swap position is valid
      if (!board.isValid(activePiece, activePieceX, activePieceY, activePieceRotation)) {
        gameOver = true;
        return false;
      }

      lockTimer = 0;
      lockResets = 0;
      isOnGround = false;
    }

    holdLocked = true;
    return true;
  }

  /**
   * Toggle pause state
   */
  function togglePause() {
    if (!gameOver) {
      paused = !paused;
    }
    return paused;
  }

  /**
   * Check if game is paused
   * @returns {boolean} True if paused
   */
  function isPaused() {
    return paused;
  }

  /**
   * Update game state
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @param {array} actions - Array of action strings from input
   */
  function update(deltaTime, actions) {
    if (gameOver || !activePiece) return;

    // Handle pause
    if (actions && actions.includes('PAUSE')) {
      togglePause();
      // Remove pause from actions to prevent processing it again
      actions = actions.filter(function(a) { return a !== 'PAUSE'; });
    }

    // Don't update game logic if paused
    if (paused) return;

    // Check if soft drop is active this frame
    const wasSoftDropActive = softDropActive;
    softDropActive = actions && actions.includes('SOFT_DROP');

    // Process input actions
    if (actions && actions.length > 0) {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        switch (action) {
          case 'MOVE_LEFT':
            movePiece(-1, 0);
            break;
          case 'MOVE_RIGHT':
            movePiece(1, 0);
            break;
          case 'SOFT_DROP':
            // Soft drop is now handled via accelerated gravity below
            // Don't process it here to avoid double movement
            break;
          case 'HARD_DROP':
            {
              const rowsDropped = hardDrop();
              // Record hard drop for scoring
              if (rowsDropped > 0) {
                if (!lastDropInfo) {
                  lastDropInfo = { soft: 0, hard: 0 };
                }
                lastDropInfo.hard += rowsDropped;
              }
            }
            break;
          case 'ROTATE_CW':
            rotatePiece(1);
            break;
          case 'ROTATE_CCW':
            rotatePiece(-1);
            break;
          case 'HOLD':
            hold();
            break;
        }
      }
    }

    // Reset soft drop counter if soft drop was released
    if (wasSoftDropActive && !softDropActive) {
      if (softDropRows > 0) {
        // Record soft drop for scoring via lastDropInfo
        if (!lastDropInfo) {
          lastDropInfo = { soft: 0, hard: 0 };
        }
        lastDropInfo.soft += softDropRows;
      }
      softDropRows = 0;
    }

    // Check if piece is on ground
    const wasOnGround = isOnGround;
    isOnGround = !board.isValid(activePiece, activePieceX, activePieceY - 1, activePieceRotation);

    if (!wasOnGround && isOnGround) {
      // Just landed, start lock delay
      lockTimer = 0;
      lockResets = 0;
    }

    // Update gravity
    if (!isOnGround) {
      gravityTimer += deltaTime;

      // Calculate effective gravity interval
      // Soft drop: 20x speed or 50ms, whichever is faster
      let effectiveInterval = gravityInterval;
      if (softDropActive) {
        effectiveInterval = Math.min(gravityInterval / 20, 50);
      }

      if (gravityTimer >= effectiveInterval) {
        gravityTimer -= effectiveInterval;

        if (!movePiece(0, -1)) {
          // Hit ground
          isOnGround = true;
          lockTimer = 0;
        } else if (softDropActive) {
          // Track rows dropped during soft drop for scoring
          softDropRows++;
        }
      }
    }

    // Update lock delay
    if (isOnGround) {
      lockTimer += deltaTime;

      if (lockTimer >= LOCK_DELAY_MS) {
        lockPiece();
      }
    }
  }

  /**
   * Set gravity interval (called by scoring module based on level)
   * @param {number} interval - Fall interval in milliseconds
   */
  function setGravityInterval(interval) {
    gravityInterval = interval;
  }

  /**
   * Get the active piece
   * @returns {object} Active piece or null
   */
  function getActivePiece() {
    return activePiece;
  }

  /**
   * Get active piece position and rotation
   * @returns {object} { x, y, rotation }
   */
  function getActivePieceState() {
    return {
      piece: activePiece,
      x: activePieceX,
      y: activePieceY,
      rotation: activePieceRotation
    };
  }

  /**
   * Get held piece type
   * @returns {string|null} Piece type or null
   */
  function getHoldPiece() {
    return holdPiece;
  }

  /**
   * Get next N pieces
   * @param {number} n - Number of pieces to peek
   * @returns {array} Array of piece type strings
   */
  function getNextPieces(n) {
    return bag.peek(n || 3);
  }

  /**
   * Check if game is over
   * @returns {boolean} True if game over
   */
  function isGameOver() {
    return gameOver;
  }

  /**
   * Get total lines cleared
   * @returns {number} Lines cleared
   */
  function getLinesCleared() {
    return linesCleared;
  }

  /**
   * Get last lock result (for scoring integration)
   * Returns null if no piece has been locked yet, or the result from the last lockPiece call
   * @returns {object|null} { linesCleared, clearedRows, isTSpin, isTSpinMini }
   */
  function getLastLockResult() {
    const result = lastLockResult;
    lastLockResult = null; // Clear after reading (one-time use)
    return result;
  }

  /**
   * Get last drop info (for scoring integration)
   * Returns null if no drops occurred, or the accumulated drop info since last call
   * @returns {object|null} { soft: number, hard: number }
   */
  function getLastDropInfo() {
    const result = lastDropInfo;
    lastDropInfo = null; // Clear after reading (one-time use)
    return result;
  }

  /**
   * Get last hard drop event (for animation)
   * @returns {object|null} { x, startY, endY, color, type }
   */
  function getLastHardDropEvent() {
    const event = lastHardDropEvent;
    lastHardDropEvent = null; // Clear after reading (one-time use)
    return event;
  }

  /**
   * Reset game state
   */
  function reset() {
    board.reset();
    bag.reset();

    activePiece = null;
    holdPiece = null;
    holdLocked = false;

    gravityTimer = 0;
    lockTimer = 0;
    lockResets = 0;
    isOnGround = false;

    gameOver = false;
    paused = false;
    linesCleared = 0;

    lastLockResult = null;
    lastDropInfo = null;
    lastHardDropEvent = null;

    spawnPiece();
  }

  // Initialize with first piece
  spawnPiece();

  // Return public interface (with legacy properties for backward compatibility)
  return {
    // Methods
    update: update,
    getActivePiece: getActivePiece,
    getActivePieceState: getActivePieceState,
    getGhostY: getGhostY,
    getHoldPiece: getHoldPiece,
    getNextPieces: getNextPieces,
    isGameOver: isGameOver,
    isPaused: isPaused,
    togglePause: togglePause,
    getLinesCleared: getLinesCleared,
    getLastLockResult: getLastLockResult,
    getLastDropInfo: getLastDropInfo,
    getLastHardDropEvent: getLastHardDropEvent,
    setGravityInterval: setGravityInterval,
    reset: reset,

    // Legacy properties for backward compatibility
    score: 0,
    level: 1,
    gameOver: false,
    initialized: true
  };
}

// Legacy compatibility
function updateGame(state, action) {
  // This is for backward compatibility with old index.html
  return state;
}

function isGameOver(state) {
  return state ? state.gameOver : false;
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGame, updateGame, isGameOver };

  // Import dependencies for testing
  if (typeof global !== 'undefined') {
    try {
      const pieces = require('./pieces.js');
      global.createPiece = pieces.createPiece;
      global.SHAPES = pieces.SHAPES;
      global.COLORS = pieces.COLORS;
      global.WALL_KICKS = pieces.WALL_KICKS;

      const board = require('./board.js');
      global.createBoard = board.createBoard;

      const bag = require('./bag.js');
      global.createBag = bag.createBag;
    } catch (e) {
      // Modules not available
    }
  }
}
