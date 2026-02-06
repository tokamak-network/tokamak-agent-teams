/**
 * scoring.js — Score, level, and line tracking
 *
 * Manages scoring system including:
 * - Line clear points (Single, Double, Triple, Tetris)
 * - T-Spin detection and scoring
 * - Back-to-Back bonus (consecutive Tetrises or T-Spins)
 * - Combo system (consecutive line clears)
 * - Soft drop and hard drop points
 * - Level progression (10 lines = 1 level)
 * - Speed curve calculation
 *
 * Exports:
 * - createScoring(): creates a new scoring instance
 * - Scoring.processLineClear(linesCleared, isTSpin, level): processes line clear and returns points
 * - Scoring.addSoftDropPoints(rows): adds soft drop points
 * - Scoring.addHardDropPoints(rows): adds hard drop points
 * - Scoring.getLevel(): returns current level
 * - Scoring.getSpeed(level): returns fall interval in ms for a level
 * - Scoring.getStats(): returns current stats object
 * - Scoring.reset(): resets all stats
 */

// Base points for line clears (multiplied by level)
const LINE_CLEAR_POINTS = {
  1: 100,   // Single
  2: 300,   // Double
  3: 500,   // Triple
  4: 800    // Tetris
};

// T-Spin points (multiplied by level)
const T_SPIN_POINTS = {
  0: 400,    // T-Spin no lines
  1: 800,    // T-Spin Single
  2: 1200,   // T-Spin Double
  3: 1600    // T-Spin Triple
};

// T-Spin Mini points (multiplied by level)
const T_SPIN_MINI_POINTS = {
  0: 100,    // T-Spin Mini no lines
  1: 200     // T-Spin Mini Single
};

// Back-to-back multiplier
const BACK_TO_BACK_MULTIPLIER = 1.5;

// Combo bonus per level
const COMBO_BONUS = 50;

/**
 * Calculate fall speed interval based on level
 * Formula from Tetris Guideline: interval = (0.8 - (level - 1) * 0.007) ^ (level - 1) seconds
 * @param {number} level - Current level (1-based)
 * @returns {number} Fall interval in milliseconds
 */
function calculateSpeed(level) {
  if (level <= 0) {
    level = 1;
  }

  // Guideline formula
  const base = 0.8 - (level - 1) * 0.007;
  const intervalSeconds = Math.pow(base, level - 1);

  // Convert to milliseconds
  let intervalMs = intervalSeconds * 1000;

  // Cap at minimum speed (very fast at high levels)
  if (intervalMs < 20) {
    intervalMs = 20;
  }

  return Math.round(intervalMs);
}

/**
 * Create a new scoring instance
 * @returns {Object} Scoring object with methods for tracking score, level, lines, etc.
 */
function createScoring() {
  // Internal state
  let score = 0;
  let lines = 0;
  let level = 1;
  let combo = -1; // Combo counter (-1 = no combo, 0+ = active combo)
  let backToBack = false; // Back-to-back bonus state
  let piecesPlaced = 0;
  let tSpins = 0;

  return {
    /**
     * Process a line clear and calculate points
     * @param {number} linesCleared - Number of lines cleared (0-4)
     * @param {boolean} isTSpin - Whether this was a T-Spin
     * @param {boolean} isTSpinMini - Whether this was a T-Spin Mini
     * @returns {number} Points awarded for this action
     */
    processLineClear: function(linesCleared, isTSpin, isTSpinMini) {
      if (linesCleared === undefined) {
        linesCleared = 0;
      }
      if (isTSpin === undefined) {
        isTSpin = false;
      }
      if (isTSpinMini === undefined) {
        isTSpinMini = false;
      }

      let points = 0;
      let isBackToBackEligible = false;

      // Handle T-Spin scoring
      if (isTSpin) {
        tSpins++;
        if (isTSpinMini) {
          // T-Spin Mini
          const basePoints = T_SPIN_MINI_POINTS[linesCleared] || 0;
          points = basePoints * level;
        } else {
          // Regular T-Spin
          const basePoints = T_SPIN_POINTS[linesCleared] || 0;
          points = basePoints * level;
        }
        isBackToBackEligible = true;
      } else if (linesCleared > 0) {
        // Regular line clear
        const basePoints = LINE_CLEAR_POINTS[linesCleared] || 0;
        points = basePoints * level;

        // Tetris (4 lines) is back-to-back eligible
        if (linesCleared === 4) {
          isBackToBackEligible = true;
        }
      }

      // Apply back-to-back bonus
      if (isBackToBackEligible && backToBack) {
        points = Math.floor(points * BACK_TO_BACK_MULTIPLIER);
      }

      // Update back-to-back state
      if (isBackToBackEligible) {
        backToBack = true;
      } else if (linesCleared > 0) {
        // Non-difficult clear breaks back-to-back
        backToBack = false;
      }

      // Handle combo
      if (linesCleared > 0) {
        combo++;
        if (combo > 0) {
          // Add combo bonus
          const comboBonus = COMBO_BONUS * combo * level;
          points += comboBonus;
        }
      } else {
        // No lines cleared, reset combo
        combo = -1;
      }

      // Update statistics
      if (linesCleared > 0) {
        lines += linesCleared;

        // Update level (every 10 lines)
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
          level = newLevel;
        }
      }

      score += points;
      return points;
    },

    /**
     * Add points for soft drop
     * @param {number} rows - Number of rows soft dropped
     */
    addSoftDropPoints: function(rows) {
      if (rows > 0) {
        const points = rows * 1; // 1 point per row
        score += points;
      }
    },

    /**
     * Add points for hard drop
     * @param {number} rows - Number of rows hard dropped
     */
    addHardDropPoints: function(rows) {
      if (rows > 0) {
        const points = rows * 2; // 2 points per row
        score += points;
      }
    },

    /**
     * Increment pieces placed counter
     */
    incrementPieces: function() {
      piecesPlaced++;
    },

    /**
     * Get current level
     * @returns {number} Current level
     */
    getLevel: function() {
      return level;
    },

    /**
     * Get fall speed for current level
     * @returns {number} Fall interval in milliseconds
     */
    getSpeed: function() {
      return calculateSpeed(level);
    },

    /**
     * Get fall speed for a specific level
     * @param {number} targetLevel - Level to get speed for
     * @returns {number} Fall interval in milliseconds
     */
    getSpeedForLevel: function(targetLevel) {
      return calculateSpeed(targetLevel);
    },

    /**
     * Get current statistics
     * @returns {Object} Stats object with score, level, lines, combo, etc.
     */
    getStats: function() {
      return {
        score: score,
        level: level,
        lines: lines,
        combo: combo >= 0 ? combo : 0,
        backToBack: backToBack,
        piecesPlaced: piecesPlaced,
        tSpins: tSpins
      };
    },

    /**
     * Reset all statistics to initial state
     */
    reset: function() {
      score = 0;
      lines = 0;
      level = 1;
      combo = -1;
      backToBack = false;
      piecesPlaced = 0;
      tSpins = 0;
    }
  };
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createScoring,
    calculateSpeed,
    LINE_CLEAR_POINTS,
    T_SPIN_POINTS,
    T_SPIN_MINI_POINTS,
    BACK_TO_BACK_MULTIPLIER,
    COMBO_BONUS
  };
}
