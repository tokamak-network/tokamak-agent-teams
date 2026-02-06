/**
 * score.js — Score tracking and match logic
 *
 * Manages player and CPU scores, determines win conditions,
 * and tracks game state.
 */

// Constants
const WINNING_SCORE = 11;

/**
 * ScoreManager class
 */
class ScoreManager {
  constructor() {
    this.playerScore = 0;
    this.cpuScore = 0;
  }

  /**
   * Add a point for the player
   * @returns {boolean} True if player has reached winning score
   */
  addPlayerPoint() {
    this.playerScore++;
    return this.playerScore >= WINNING_SCORE;
  }

  /**
   * Add a point for the CPU
   * @returns {boolean} True if CPU has reached winning score
   */
  addCpuPoint() {
    this.cpuScore++;
    return this.cpuScore >= WINNING_SCORE;
  }

  /**
   * Check if the game is over
   * @returns {boolean} True if either player has reached winning score
   */
  isGameOver() {
    return this.playerScore >= WINNING_SCORE || this.cpuScore >= WINNING_SCORE;
  }

  /**
   * Get the winner
   * @returns {string|null} 'player', 'cpu', or null if no winner yet
   */
  getWinner() {
    if (this.playerScore >= WINNING_SCORE) {
      return 'player';
    }
    if (this.cpuScore >= WINNING_SCORE) {
      return 'cpu';
    }
    return null;
  }

  /**
   * Reset scores to zero
   */
  reset() {
    this.playerScore = 0;
    this.cpuScore = 0;
  }

  /**
   * Get current scores
   * @returns {{player: number, cpu: number}}
   */
  getScores() {
    return {
      player: this.playerScore,
      cpu: this.cpuScore
    };
  }
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScoreManager, WINNING_SCORE };
}
