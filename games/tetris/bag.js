/**
 * bag.js — 7-bag random piece generator
 *
 * Implements the 7-bag randomizer: all 7 tetromino types are placed in a bag,
 * shuffled, and dealt one at a time. When the bag is empty, a new bag is created
 * and shuffled. This ensures every piece type appears at least once per 7 pieces,
 * preventing extreme droughts or floods of any single piece type.
 *
 * Exports:
 * - createBag(): creates a new bag instance
 * - Bag.next(): returns the next piece type
 * - Bag.peek(n): returns array of next n piece types (for preview)
 * - Bag.reset(): reinitializes the bag
 */

// Import PIECE_TYPES from pieces.js (or define locally for testing)
let PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Try to import from pieces.js if in Node.js environment
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  try {
    const pieces = require('./pieces.js');
    if (pieces && pieces.PIECE_TYPES) {
      PIECE_TYPES = pieces.PIECE_TYPES;
    }
  } catch (e) {
    // Use default PIECE_TYPES defined above
  }
}

/**
 * Fisher-Yates shuffle algorithm
 * Shuffles an array in-place with uniform randomness
 * @param {Array} array - Array to shuffle
 * @returns {Array} The same array, shuffled
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Creates a new shuffled bag of all 7 piece types
 * @returns {Array} Shuffled array of piece type strings
 */
function createShuffledBag() {
  return shuffle([...PIECE_TYPES]);
}

/**
 * Create a new bag instance
 * @returns {Object} Bag object with next(), peek(n), and reset() methods
 */
function createBag() {
  // Internal state
  let queue = [];

  // Initialize with two bags to ensure we always have at least 7 pieces queued
  // (allows peek(n) to work for next piece preview)
  function fillQueue() {
    while (queue.length < 14) {
      queue.push(...createShuffledBag());
    }
  }

  // Initial fill
  fillQueue();

  return {
    /**
     * Get the next piece type from the bag
     * @returns {string} Next piece type
     */
    next: function() {
      if (queue.length === 0) {
        fillQueue();
      }

      const piece = queue.shift();
      fillQueue(); // Ensure queue stays full
      return piece;
    },

    /**
     * Peek at the next n pieces without removing them
     * @param {number} n - Number of pieces to peek at (default: 1)
     * @returns {Array} Array of next n piece types
     */
    peek: function(n) {
      if (n === undefined) {
        n = 1;
      }

      if (n <= 0) {
        return [];
      }

      // Ensure we have enough pieces in the queue
      while (queue.length < n) {
        queue.push(...createShuffledBag());
      }

      return queue.slice(0, n);
    },

    /**
     * Reset the bag to initial state with a new shuffled queue
     */
    reset: function() {
      queue = [];
      fillQueue();
    },

    /**
     * Get current queue length (for testing/debugging)
     * @returns {number} Current number of pieces in queue
     */
    _getQueueLength: function() {
      return queue.length;
    }
  };
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBag,
    shuffle // Export for testing
  };
}
