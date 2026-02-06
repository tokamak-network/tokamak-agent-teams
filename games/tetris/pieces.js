/**
 * pieces.js — Tetromino definitions and rotation data
 *
 * Exports:
 *   PIECE_TYPES — array of piece type strings
 *   SHAPES[type][rotation] — block offset arrays
 *   WALL_KICKS[type][fromRotation][toRotation] — kick offset arrays
 *   COLORS[type] — hex color strings
 *   createPiece(type) — piece instance factory
 */

// All 7 tetromino types
const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Color mapping for each piece type
const COLORS = {
  I: '#00f0f0', // cyan
  O: '#f0f000', // yellow
  T: '#a000f0', // purple
  S: '#00f000', // green
  Z: '#f00000', // red
  J: '#0000f0', // blue
  L: '#f0a000'  // orange
};

/**
 * Tetromino shapes defined as arrays of [x, y] block offsets
 * for each rotation state (0°, 90°, 180°, 270°)
 *
 * Coordinate system: x increases right, y increases down
 * Each shape is defined relative to a center/pivot point
 */
const SHAPES = {
  I: [
    // Rotation 0 (horizontal)
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    // Rotation 90 (vertical)
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    // Rotation 180 (horizontal)
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    // Rotation 270 (vertical)
    [[1, 0], [1, 1], [1, 2], [1, 3]]
  ],
  O: [
    // O-piece doesn't rotate, same for all states
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]]
  ],
  T: [
    // Rotation 0 (T pointing up)
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    // Rotation 90 (T pointing right)
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    // Rotation 180 (T pointing down)
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    // Rotation 270 (T pointing left)
    [[1, 0], [0, 1], [1, 1], [1, 2]]
  ],
  S: [
    // Rotation 0
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    // Rotation 90
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    // Rotation 180
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    // Rotation 270
    [[0, 0], [0, 1], [1, 1], [1, 2]]
  ],
  Z: [
    // Rotation 0
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    // Rotation 90
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    // Rotation 180
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    // Rotation 270
    [[1, 0], [0, 1], [1, 1], [0, 2]]
  ],
  J: [
    // Rotation 0 (J pointing up)
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    // Rotation 90 (J pointing right)
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    // Rotation 180 (J pointing down)
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    // Rotation 270 (J pointing left)
    [[1, 0], [1, 1], [0, 2], [1, 2]]
  ],
  L: [
    // Rotation 0 (L pointing up)
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    // Rotation 90 (L pointing right)
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    // Rotation 180 (L pointing down)
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    // Rotation 270 (L pointing left)
    [[0, 0], [1, 0], [1, 1], [1, 2]]
  ]
};

/**
 * SRS Wall Kick Data
 *
 * Format: WALL_KICKS[piece_type][from_rotation][to_rotation]
 * Returns array of [dx, dy] offset pairs to try in order
 *
 * Standard pieces (J, L, T, S, Z) share the same kick table
 * I-piece and O-piece have their own tables
 */

// Standard SRS wall kick offsets for J, L, T, S, Z pieces
const STANDARD_KICKS = {
  // 0 -> 90 (clockwise from spawn)
  '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  // 90 -> 0 (counter-clockwise to spawn)
  '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  // 90 -> 180 (clockwise)
  '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  // 180 -> 90 (counter-clockwise)
  '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  // 180 -> 270 (clockwise)
  '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  // 270 -> 180 (counter-clockwise)
  '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  // 270 -> 0 (clockwise to spawn)
  '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  // 0 -> 270 (counter-clockwise from spawn)
  '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};

// I-piece specific wall kick offsets
const I_KICKS = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};

// O-piece doesn't need wall kicks (doesn't rotate effectively)
const O_KICKS = {
  '0->1': [[0, 0]],
  '1->0': [[0, 0]],
  '1->2': [[0, 0]],
  '2->1': [[0, 0]],
  '2->3': [[0, 0]],
  '3->2': [[0, 0]],
  '3->0': [[0, 0]],
  '0->3': [[0, 0]]
};

// Build complete wall kick table
const WALL_KICKS = {
  I: I_KICKS,
  O: O_KICKS,
  // Standard pieces all use the same kick table
  T: STANDARD_KICKS,
  S: STANDARD_KICKS,
  Z: STANDARD_KICKS,
  J: STANDARD_KICKS,
  L: STANDARD_KICKS
};

/**
 * Create a new piece instance
 * @param {string} type - One of PIECE_TYPES
 * @returns {Object} Piece object with type, rotation, x, y
 */
function createPiece(type) {
  if (!PIECE_TYPES.includes(type)) {
    throw new Error('Invalid piece type: ' + type);
  }

  return {
    type: type,
    rotation: 0,  // Initial rotation state (0-3)
    x: 3,         // Initial x position (spawn column, center of 10-wide board)
    y: 20         // Initial y position (spawn row, above visible area)
  };
}

/**
 * Get the block positions for a piece in a specific rotation
 * @param {string} type - Piece type
 * @param {number} rotation - Rotation state (0-3)
 * @returns {Array} Array of [x, y] offsets
 */
function getPieceBlocks(type, rotation) {
  if (!SHAPES[type]) {
    throw new Error('Unknown piece type: ' + type);
  }
  return SHAPES[type][rotation % 4];
}

/**
 * Get wall kick offsets for a rotation transition
 * @param {string} type - Piece type
 * @param {number} fromRotation - Current rotation (0-3)
 * @param {number} toRotation - Target rotation (0-3)
 * @returns {Array} Array of [dx, dy] offset pairs
 */
function getWallKicks(type, fromRotation, toRotation) {
  const key = fromRotation + '->' + toRotation;
  const kicks = WALL_KICKS[type];

  if (!kicks || !kicks[key]) {
    // Fallback: no kick (just the base position)
    return [[0, 0]];
  }

  return kicks[key];
}

// Browser environment exports (make globally available)
if (typeof window !== 'undefined') {
  window.PIECE_TYPES = PIECE_TYPES;
  window.SHAPES = SHAPES;
  window.WALL_KICKS = WALL_KICKS;
  window.COLORS = COLORS;
  window.createPiece = createPiece;
  window.getPieceBlocks = getPieceBlocks;
  window.getWallKicks = getWallKicks;
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PIECE_TYPES,
    SHAPES,
    WALL_KICKS,
    COLORS,
    createPiece,
    getPieceBlocks,
    getWallKicks
  };
}
