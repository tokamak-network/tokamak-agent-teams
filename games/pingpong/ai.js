/**
 * ai.js — CPU paddle controller
 *
 * Controls the right paddle using a simulated AI strategy with
 * configurable difficulty levels.
 */

/**
 * Difficulty presets
 */
const DIFFICULTY_PRESETS = {
  easy: {
    reactionSpeed: 0.02,
    errorMargin: 40,
    updateInterval: 15
  },
  medium: {
    reactionSpeed: 0.05,
    errorMargin: 20,
    updateInterval: 8
  },
  hard: {
    reactionSpeed: 0.09,
    errorMargin: 5,
    updateInterval: 3
  }
};

/**
 * AIController class
 */
class AIController {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.reactionSpeed = DIFFICULTY_PRESETS[difficulty].reactionSpeed;
    this.errorMargin = DIFFICULTY_PRESETS[difficulty].errorMargin;
    this.updateInterval = DIFFICULTY_PRESETS[difficulty].updateInterval;

    this.targetY = 0;
    this.frameCounter = 0;
    this.randomError = 0;
  }

  /**
   * Set difficulty level
   * @param {string} level - 'easy', 'medium', or 'hard'
   */
  setDifficulty(level) {
    if (DIFFICULTY_PRESETS[level]) {
      this.difficulty = level;
      this.reactionSpeed = DIFFICULTY_PRESETS[level].reactionSpeed;
      this.errorMargin = DIFFICULTY_PRESETS[level].errorMargin;
      this.updateInterval = DIFFICULTY_PRESETS[level].updateInterval;
    }
  }

  /**
   * Update AI paddle movement
   * @param {Ball} ball - The ball object
   * @param {Paddle} paddle - The CPU paddle to control
   * @param {number} canvasHeight - Canvas height for predictions
   */
  update(ball, paddle, canvasHeight) {
    this.frameCounter++;

    // Recalculate target position every updateInterval frames
    if (this.frameCounter >= this.updateInterval) {
      this.frameCounter = 0;

      // Predict where the ball will be at the paddle's X position
      const paddleX = paddle.x;
      const predictedY = this.predictBallY(ball, paddleX, canvasHeight);

      // Add random error to make AI imperfect
      this.randomError = (Math.random() * this.errorMargin * 2) - this.errorMargin;
      this.targetY = predictedY + this.randomError;

      // Clamp target to valid range
      this.targetY = Math.max(paddle.height / 2, Math.min(canvasHeight - paddle.height / 2, this.targetY));
    }

    // Move paddle toward target using linear interpolation
    const currentY = paddle.getCenterY();
    const diff = this.targetY - currentY;

    if (Math.abs(diff) > 1) {
      // Lerp toward target
      const moveAmount = diff * this.reactionSpeed;
      const newY = currentY + moveAmount;

      // Set paddle direction based on movement
      if (moveAmount > 0) {
        paddle.setDirection(1); // Move down
      } else if (moveAmount < 0) {
        paddle.setDirection(-1); // Move up
      }

      // Update paddle position directly for smooth AI movement
      paddle.y = newY - paddle.height / 2;

      // Clamp paddle position to canvas bounds
      if (paddle.y < 0) {
        paddle.y = 0;
      }
      if (paddle.y + paddle.height > canvasHeight) {
        paddle.y = canvasHeight - paddle.height;
      }
    } else {
      paddle.setDirection(0); // Stop
    }
  }

  /**
   * Predict ball Y position when it reaches targetX
   * @param {Ball} ball - The ball object
   * @param {number} targetX - X position to predict for
   * @param {number} canvasHeight - Canvas height for wall bounces
   * @returns {number} Predicted Y position
   */
  predictBallY(ball, targetX, canvasHeight) {
    // If ball is moving away from paddle, return center
    if ((targetX > ball.x && ball.vx < 0) || (targetX < ball.x && ball.vx > 0)) {
      return canvasHeight / 2;
    }

    // Simulate ball trajectory
    let simX = ball.x;
    let simY = ball.y;
    let simVx = ball.vx;
    let simVy = ball.vy;

    // Safety limit to prevent infinite loops
    let iterations = 0;
    const maxIterations = 1000;

    while (iterations < maxIterations) {
      // Check if we've reached target X
      if ((simVx > 0 && simX >= targetX) || (simVx < 0 && simX <= targetX)) {
        return simY;
      }

      // Move simulation forward
      simX += simVx;
      simY += simVy;

      // Handle wall bounces
      if (simY - ball.radius <= 0) {
        simY = ball.radius;
        simVy = Math.abs(simVy);
      } else if (simY + ball.radius >= canvasHeight) {
        simY = canvasHeight - ball.radius;
        simVy = -Math.abs(simVy);
      }

      iterations++;
    }

    // Fallback to center if prediction fails
    return canvasHeight / 2;
  }

  /**
   * Get current difficulty level
   * @returns {string} Current difficulty level
   */
  getDifficulty() {
    return this.difficulty;
  }
}

// Node.js exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIController, DIFFICULTY_PRESETS };
}
