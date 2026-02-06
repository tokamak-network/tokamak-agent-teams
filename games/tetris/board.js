/**
 * board.js — Playfield state and line-clearing logic
 *
 * Exports:
 *   - createBoard(): factory function that returns a Board object
 *
 * Board object methods:
 *   - isValid(piece, x, y, rotation): check if piece position is valid
 *   - lock(piece, x, y, rotation): lock piece into the grid
 *   - clearLines(): detect and clear completed lines
 *   - getGrid(): get 2D grid array for rendering
 *   - reset(): clear the entire board
 */

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 22; // 20 visible + 2 hidden rows above

/**
 * Create a new board instance
 * @returns {object} Board object with methods
 */
function createBoard() {
  // Initialize empty grid: array of rows, each row is array of cells
  // null = empty, string (color) = occupied
  let grid = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      grid[y][x] = null;
    }
  }

  /**
   * Check if a piece at given position and rotation is valid (no collision)
   * @param {object} piece - Piece object with { type, rotation, x, y }
   * @param {number} x - X position to check
   * @param {number} y - Y position to check
   * @param {number} rotation - Rotation state (0-3)
   * @returns {boolean} True if position is valid
   */
  function isValid(piece, x, y, rotation) {
    if (!piece || typeof SHAPES === 'undefined') {
      return false;
    }

    const shape = SHAPES[piece.type][rotation];
    if (!shape) {
      return false;
    }

    // Check each block of the piece
    for (let i = 0; i < shape.length; i++) {
      const blockX = x + shape[i][0];
      const blockY = y + shape[i][1];

      // Check bounds
      if (blockX < 0 || blockX >= BOARD_WIDTH || blockY < 0 || blockY >= BOARD_HEIGHT) {
        return false;
      }

      // Check collision with existing blocks
      if (grid[blockY][blockX] !== null) {
        return false;
      }
    }

    return true;
  }

  /**
   * Lock a piece into the grid
   * @param {object} piece - Piece object with { type }
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} rotation - Rotation state (0-3)
   */
  function lock(piece, x, y, rotation) {
    if (!piece || typeof SHAPES === 'undefined' || typeof COLORS === 'undefined') {
      return;
    }

    const shape = SHAPES[piece.type][rotation];
    const color = COLORS[piece.type];

    if (!shape || !color) {
      return;
    }

    // Place each block of the piece
    for (let i = 0; i < shape.length; i++) {
      const blockX = x + shape[i][0];
      const blockY = y + shape[i][1];

      if (blockX >= 0 && blockX < BOARD_WIDTH && blockY >= 0 && blockY < BOARD_HEIGHT) {
        grid[blockY][blockX] = color;
      }
    }
  }

  /**
   * Detect and clear completed lines
   * @returns {object} { linesCleared: number, clearedRows: array of row indices }
   */
  function clearLines() {
    const clearedRows = [];

    // Check each row from bottom to top
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      let isComplete = true;

      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (grid[y][x] === null) {
          isComplete = false;
          break;
        }
      }

      if (isComplete) {
        clearedRows.push(y);
      }
    }

    // Remove cleared rows and shift down
    if (clearedRows.length > 0) {
      // Sort rows bottom to top (descending) to remove from bottom up
      // This prevents index shifting issues when removing multiple rows
      clearedRows.sort(function(a, b) { return b - a; });

      // Remove each cleared row (must be done in descending order)
      for (let i = 0; i < clearedRows.length; i++) {
        const rowIndex = clearedRows[i];
        grid.splice(rowIndex, 1);
      }

      // Add empty rows at top (high Y = top of board)
      for (let i = 0; i < clearedRows.length; i++) {
        const emptyRow = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
          emptyRow[x] = null;
        }
        grid.push(emptyRow);
      }
    }

    return {
      linesCleared: clearedRows.length,
      clearedRows: clearedRows
    };
  }

  /**
   * Get the current grid state
   * @returns {array} 2D array representing the grid
   */
  function getGrid() {
    return grid;
  }

  /**
   * Reset the board to empty state
   */
  function reset() {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        grid[y][x] = null;
      }
    }
  }

  /**
   * Check if any blocks exist above the visible area
   * Used for lock-out game over detection
   * @returns {boolean} True if blocks exist above row 20
   */
  function hasBlocksAboveVisible() {
    for (let y = BOARD_HEIGHT - 2; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (grid[y][x] !== null) {
          return true;
        }
      }
    }
    return false;
  }

  // Return public interface
  return {
    isValid: isValid,
    lock: lock,
    clearLines: clearLines,
    getGrid: getGrid,
    reset: reset,
    hasBlocksAboveVisible: hasBlocksAboveVisible,
    BOARD_WIDTH: BOARD_WIDTH,
    BOARD_HEIGHT: BOARD_HEIGHT
  };
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createBoard, BOARD_WIDTH, BOARD_HEIGHT };

  // Import SHAPES and COLORS for testing environment
  if (typeof global !== 'undefined' && global.SHAPES === undefined) {
    try {
      const pieces = require('./pieces.js');
      global.SHAPES = pieces.SHAPES;
      global.COLORS = pieces.COLORS;
    } catch (e) {
      // Pieces module not available, tests will handle this
    }
  }
}
